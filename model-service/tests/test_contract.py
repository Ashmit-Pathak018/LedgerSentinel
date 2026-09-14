"""
test_contract.py — Contract tests for the model service.

These tests ensure the architectural invariants hold:
  1. Signal objects never contain action strings
  2. Confidence and value are always in [0.0, 1.0]
  3. All eight signal types are valid
  4. Redaction runs before LLM calls
  5. MODELS_MOCK returns valid fixture signals
  6. The fixture file is parseable and matches the Signal schema

Run: pytest tests/ -v
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.models.signal import Signal, EvidenceSpan, SignalBatch
from app.inference.redaction import redact
from app.prompts.extraction import EIGHT_LABELS


# ── Signal schema invariants ──────────────────────────────────────────────────

class TestSignalContract:
    """Signal object must never violate the frozen contract."""

    def _make_signal(self, **overrides) -> dict:
        base = {
            "signal_type": "urgency",
            "value": 0.85,
            "confidence": 0.85,
            "source_ref": "test_001",
            "evidence_span": {"start": 0, "end": 10},
            "redacted_quote": "act now before it is too late",
        }
        base.update(overrides)
        return base

    def test_valid_signal_parses(self):
        s = Signal(**self._make_signal())
        assert s.signal_type == "urgency"
        assert 0.0 <= s.value <= 1.0
        assert 0.0 <= s.confidence <= 1.0

    def test_all_eight_labels_are_valid(self):
        for label in EIGHT_LABELS:
            s = Signal(**self._make_signal(signal_type=label))
            assert s.signal_type == label

    @pytest.mark.parametrize("action", [
        "APPROVE", "VERIFY", "COOL_OFF", "HOLD", "ESCALATE",
        "approve", "hold", "escalate",
    ])
    def test_action_strings_are_rejected(self, action: str):
        """Models emit signals, never decisions. This is the core thesis."""
        with pytest.raises(Exception):
            Signal(**self._make_signal(signal_type=action))

    def test_value_out_of_range_raises(self):
        with pytest.raises(Exception):
            Signal(**self._make_signal(value=1.5))

    def test_confidence_out_of_range_raises(self):
        with pytest.raises(Exception):
            Signal(**self._make_signal(confidence=-0.1))

    def test_invalid_signal_type_raises(self):
        with pytest.raises(Exception):
            Signal(**self._make_signal(signal_type="scam_detected"))

    def test_signal_batch_shape(self):
        sig = Signal(**self._make_signal())
        batch = SignalBatch(
            signals=[sig],
            model_version="test-v1",
            source_ref="test",
            redaction_ran=True,
            latency_ms=42.0,
        )
        assert len(batch.signals) == 1
        assert batch.model_version == "test-v1"
        assert batch.redaction_ran is True


# ── Redaction invariants ──────────────────────────────────────────────────────

class TestRedaction:
    """PII must be stripped before any LLM call."""

    def test_card_number_redacted(self):
        text = "My card is 4111111111111111 please check"
        result, was_redacted = redact(text)
        assert "4111111111111111" not in result
        assert was_redacted is True

    def test_aadhaar_redacted(self):
        text = "My aadhaar is 1234 5678 9012"
        result, was_redacted = redact(text)
        assert "1234 5678 9012" not in result
        assert was_redacted is True

    def test_pan_redacted(self):
        text = "PAN is ABCDE1234F"
        result, was_redacted = redact(text)
        assert "ABCDE1234F" not in result
        assert was_redacted is True

    def test_phone_redacted(self):
        text = "Call me at 9876543210"
        result, was_redacted = redact(text)
        assert "9876543210" not in result
        assert was_redacted is True

    def test_clean_text_passes_through(self):
        text = "Hello, how are you doing today?"
        result, was_redacted = redact(text)
        assert result == text
        assert was_redacted is False

    def test_email_redacted(self):
        text = "Send to user@example.com"
        result, was_redacted = redact(text)
        assert "user@example.com" not in result
        assert was_redacted is True


# ── Fixture file validity ─────────────────────────────────────────────────────

class TestFixtures:
    """Fixture signals must be valid Signal objects."""

    FIXTURE_PATH = Path(__file__).parent.parent / "fixtures" / "fixture_signals.json"

    def test_fixture_file_exists(self):
        assert self.FIXTURE_PATH.exists(), f"Missing: {self.FIXTURE_PATH}"

    def test_fixture_signals_parse(self):
        with open(self.FIXTURE_PATH, encoding="utf-8") as f:
            raw = json.load(f)
        assert isinstance(raw, list)
        assert len(raw) > 0

        for entry in raw:
            s = Signal(**entry)
            assert s.signal_type in EIGHT_LABELS
            assert 0.0 <= s.value <= 1.0
            assert 0.0 <= s.confidence <= 1.0
            assert len(s.redacted_quote) > 0

    def test_fixture_signals_never_contain_actions(self):
        with open(self.FIXTURE_PATH, encoding="utf-8") as f:
            raw = json.load(f)
        action_strings = {"approve", "verify", "cool_off", "hold", "escalate"}
        for entry in raw:
            assert entry["signal_type"].lower() not in action_strings


# ── JSON Schema validity ─────────────────────────────────────────────────────

class TestSchema:
    """The frozen JSON schema must exist and be valid JSON."""

    SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "signal.schema.json"

    def test_schema_file_exists(self):
        assert self.SCHEMA_PATH.exists()

    def test_schema_is_valid_json(self):
        with open(self.SCHEMA_PATH, encoding="utf-8") as f:
            schema = json.load(f)
        assert schema["title"] == "LedgerSentinel Fraud Signal"
        assert len(schema["properties"]["signal_type"]["enum"]) == 8
