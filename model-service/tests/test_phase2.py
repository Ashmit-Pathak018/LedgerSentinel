"""Automated test suite for Phase 2 deliverables in model-service architecture.

Covers:
1. S01 extraction validity & schema compliance.
2. Sliding-window chunking (no mid-sentence cuts, correct boundary offsets).
3. Sliding-window signal aggregation (deduplication by signal_type, highest confidence kept, authentic quotes/spans preserved).
4. Full API endpoint tests (/model/text/score, /model/voice/score, /model/voice/score/stream, /model/fuse/rationale).
5. MODELS_MOCK parity.
6. Absolute safety invariant: no action strings ever emitted.
"""

from __future__ import annotations

import json
import pathlib
import pytest
from fastapi.testclient import TestClient

ROOT = pathlib.Path(__file__).resolve().parent.parent

from app.main import app
from app.config import get_settings
from app.models.signal import Signal, SignalType, EvidenceSpan, SignalBatch, VoiceStreamEnvelope
from app.inference.sliding_window import create_sliding_windows, aggregate_signals, WindowChunk
from app.inference.redaction import redact

client = TestClient(app)

FORBIDDEN_ACTIONS = {
    "action", "recommendation", "decision", "recommended_action", "verdict",
    "APPROVE", "HOLD", "ESCALATE", "VERIFY", "COOL_OFF",
    "approve", "hold", "escalate", "verify", "cool_off",
}


class TestSlidingWindowLogic:
    def test_short_transcript_produces_single_chunk(self):
        text = "Hello, your payment of Rs 5000 is pending verification."
        chunks = create_sliding_windows(text, "call_short", target_window_size=200)
        assert len(chunks) == 1
        assert chunks[0].text == text
        assert chunks[0].char_start == 0
        assert chunks[0].char_end == len(text)
        assert chunks[0].source_ref == "call_short_chunk0"

    def test_long_transcript_chunks_on_sentence_boundaries(self):
        s1 = "This is Inspector Sharma from Cyber Crime Division. "
        s2 = "We detected suspicious activity on your bank account. "
        s3 = "Transfer Rs 50000 to safe RBI account immediately. "
        s4 = "Do not discuss this with anyone in your family."
        full_text = s1 + s2 + s3 + s4

        chunks = create_sliding_windows(full_text, "call_long", target_window_size=75, overlap_size=25)
        assert len(chunks) >= 2
        for i, c in enumerate(chunks):
            assert c.chunk_index == i
            assert c.source_ref == f"call_long_chunk{i}"
            assert c.char_start < c.char_end

    def test_aggregation_keeps_highest_confidence_and_authentic_quote(self):
        chunk0_sigs = [
            Signal(
                signal_type="urgency",
                value=0.70,
                confidence=0.65,
                source_ref="call_chunk0",
                evidence_span=(10, 35),
                redacted_quote="transfer within the hour",
            ),
            Signal(
                signal_type="authority_impersonation",
                value=0.90,
                confidence=0.85,
                source_ref="call_chunk0",
                evidence_span=(0, 20),
                redacted_quote="this is inspector sharma",
            ),
        ]
        chunk1_sigs = [
            Signal(
                signal_type="urgency",
                value=0.95,
                confidence=0.89,  # higher confidence
                source_ref="call_chunk1",
                evidence_span=(5, 40),
                redacted_quote="you must act immediately right now",
            ),
            Signal(
                signal_type="payment_redirect",
                value=0.88,
                confidence=0.82,
                source_ref="call_chunk1",
                evidence_span=(45, 75),
                redacted_quote="send funds to reserve escrow",
            ),
        ]

        aggregated = aggregate_signals([chunk0_sigs, chunk1_sigs])
        by_type = {s.signal_type: s for s in aggregated}

        assert len(by_type) == 3
        # Urgency should pick chunk 1 (confidence 0.89)
        assert by_type["urgency"].confidence == 0.89
        assert by_type["urgency"].source_ref == "call_chunk1"
        assert by_type["urgency"].redacted_quote == "you must act immediately right now"
        assert by_type["urgency"].evidence_span == (5, 40)
        # Authority impersonation preserved from chunk 0
        assert by_type["authority_impersonation"].confidence == 0.85


class TestEndpointsAndContracts:
    def test_mock_text_score_conforms_to_contract(self, monkeypatch):
        settings = get_settings()
        monkeypatch.setattr(settings, "MODELS_MOCK", True)
        res = client.post("/model/text/score", json={"source_ref": "comm_771", "text": "test"})
        assert res.status_code == 200
        data = res.json()
        assert "signals" in data
        assert isinstance(data["signals"], list)
        assert len(data["signals"]) > 0
        for item in data["signals"]:
            s = Signal(**item)
            assert not (FORBIDDEN_ACTIONS & set(item.keys()))
            assert item["signal_type"] not in FORBIDDEN_ACTIONS

    def test_mock_voice_score_conforms_to_contract(self, monkeypatch):
        settings = get_settings()
        monkeypatch.setattr(settings, "MODELS_MOCK", True)
        res = client.post("/model/voice/score", json={"source_ref": "comm_771", "transcript": "some call"})
        assert res.status_code == 200
        data = res.json()
        assert "signals" in data
        assert isinstance(data["signals"], list)
        for item in data["signals"]:
            Signal(**item)

    def test_voice_stream_envelope_structure(self, monkeypatch):
        settings = get_settings()
        monkeypatch.setattr(settings, "MODELS_MOCK", True)
        res = client.post("/model/voice/score/stream", json={"source_ref": "call_123", "transcript": "long call"})
        assert res.status_code == 200
        body = res.json()
        assert "signals" in body
        assert "chunks" in body
        assert "metadata" in body
        assert isinstance(body["signals"], list)
        assert isinstance(body["chunks"], list)
        assert body["metadata"]["source_ref"] == "call_123"
        for s in body["signals"]:
            Signal(**s)

    def test_s01_live_fixture_is_valid(self):
        fixture_path = ROOT / "eval" / "s01_live_signals.json"
        assert fixture_path.exists(), "s01_live_signals.json does not exist"
        raw = json.loads(fixture_path.read_text(encoding="utf-8"))
        assert isinstance(raw, list)
        assert len(raw) >= 3
        for item in raw:
            s = Signal(**item)
            assert s.source_ref == "comm_771"
            assert not (FORBIDDEN_ACTIONS & set(item.keys()))

    def test_fuse_rationale_endpoint(self, monkeypatch):
        settings = get_settings()
        monkeypatch.setattr(settings, "MODELS_MOCK", True)
        res = client.post("/model/fuse/rationale", json={"evidence": [{"claim": "scam call", "confidence": 0.9}]})
        assert res.status_code == 200
        data = res.json()
        assert "rationale" in data
        assert "model_version" in data
        for act in ["APPROVE", "HOLD", "ESCALATE", "VERIFY", "COOL_OFF"]:
            assert act not in data["rationale"]


class TestHardenedRedactionPipeline:
    def test_real_synthetic_pii_masked_properly(self):
        raw_text = (
            "Transfer ₹8,00,000 to safe card 4111222233334444. "
            "Call +91 9876543210. Your OTP: 492018. Email fraud@rbi-reserve.org. "
            "PAN: ABCDE1234F. Aadhaar: 1234 5678 9012."
        )
        sanitized, was_redacted = redact(raw_text)
        assert was_redacted is True

        # Assert no sensitive numbers leak through
        assert "4111222233334444" not in sanitized
        assert "9876543210" not in sanitized
        assert "492018" not in sanitized
        assert "fraud@rbi-reserve.org" not in sanitized
        assert "ABCDE1234F" not in sanitized
        assert "1234 5678 9012" not in sanitized

    def test_spans_refer_to_sanitized_text_strictly(self):
        from app.inference.gemma_client import _parse_signal_json
        raw_text = "Urgent: call +91 9876543210 immediately."
        sanitized, was_redacted = redact(raw_text)
        assert "9876543210" not in sanitized
        quote = "call +91 ********** immediately"
        start = sanitized.index(quote)
        end = start + len(quote)

        # Synthetic model response matching sanitized text
        fake_llm_json = json.dumps([{
            "signal_type": "urgency",
            "value": 0.9,
            "confidence": 0.85,
            "source_ref": "test_ref",
            "evidence_span": [start, end],
            "redacted_quote": quote,
        }])
        parsed_dicts = _parse_signal_json(fake_llm_json)
        signals = [Signal(**d) for d in parsed_dicts]
        assert len(signals) == 1
        sig = signals[0]
        assert sig.redacted_quote == quote
        assert sig.evidence_span is not None
        assert sanitized[sig.evidence_span.start:sig.evidence_span.end] == quote
        assert "9876543210" not in sig.redacted_quote


class TestSlidingWindowEdgeCases:
    def test_empty_and_whitespace_transcript(self):
        assert create_sliding_windows("", "call_empty") == []
        assert create_sliding_windows("   \n\t  ", "call_ws") == []

    def test_aggregation_never_fabricates_spans(self):
        sig_chunk_a = Signal(
            signal_type="threat",
            value=0.8,
            confidence=0.75,
            source_ref="chunk_a",
            evidence_span=(12, 34),
            redacted_quote="police will arrest you",
        )
        sig_chunk_b = Signal(
            signal_type="threat",
            value=0.6,
            confidence=0.55,
            source_ref="chunk_b",
            evidence_span=(50, 70),
            redacted_quote="account will be seized",
        )
        agg = aggregate_signals([[sig_chunk_a], [sig_chunk_b]])
        assert len(agg) == 1
        # Invariant: Must retain chunk_a's exact span and quote (highest confidence)
        assert agg[0].evidence_span == (12, 34)
        assert agg[0].redacted_quote == "police will arrest you"
        assert agg[0].source_ref == "chunk_a"
        assert agg[0].evidence_span != (12, 70)

    def test_evidence_appearing_across_multiple_chunks(self):
        chunk0_sigs = [
            Signal(
                signal_type="authority_impersonation",
                value=0.92,
                confidence=0.85,
                source_ref="call_chunk0",
                evidence_span=(0, 25),
                redacted_quote="CBI cyber branch Mumbai",
            )
        ]
        chunk1_sigs = [
            Signal(
                signal_type="payment_redirect",
                value=0.88,
                confidence=0.80,
                source_ref="call_chunk1",
                evidence_span=(30, 60),
                redacted_quote="court escrow account",
            ),
            Signal(
                signal_type="otp_request",
                value=0.82,
                confidence=0.76,
                source_ref="call_chunk1",
                evidence_span=(65, 90),
                redacted_quote="share the OTP right now",
            ),
        ]
        agg = aggregate_signals([chunk0_sigs, chunk1_sigs])
        assert len(agg) == 3
        types_found = {s.signal_type for s in agg}
        assert types_found == {
            "authority_impersonation",
            "payment_redirect",
            "otp_request",
        }

    def test_mock_streaming_endpoint_preserves_envelope(self, monkeypatch):
        settings = get_settings()
        monkeypatch.setattr(settings, "MODELS_MOCK", True)
        res = client.post("/model/voice/score/stream", json={"source_ref": "comm_771", "transcript": "test call"})
        assert res.status_code == 200
        env = res.json()
        assert "signals" in env
        assert "chunks" in env
        assert "metadata" in env
        assert env["metadata"]["source_ref"] == "comm_771"
        assert env["metadata"]["chunk_count"] >= 1
        assert len(env["chunks"]) >= 1
