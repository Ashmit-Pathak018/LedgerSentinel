"""End-to-end test of the two-model architecture on Scenario S01.

Flow:
  Raw Communication
      ↓ (PII Redaction)
  Sanitized Text
      ↓ (Gemma 3n E4B - Perception Layer)
  Signal[]
      ↓ (Qwen3-4B-Q8 - Reasoning / Fusion Layer)
  Grounded Rationale + Evidence Synthesis
      ↓ (Deterministic Policy Gate)
  Final Action: ESCALATE (with evidence citation)

Run:
  model-service\\.venv\\Scripts\\python.exe model-service/eval/test_two_model_s01.py
"""

from __future__ import annotations

import asyncio
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "model-service"))
sys.path.insert(0, str(ROOT / "api"))
sys.path.insert(0, str(ROOT / "contracts" / "py"))

import _contracts_path  # noqa: F401
from contracts import (
    ActionType,
    IdentityAssurance,
    PolicyInput,
    Signal as ContractSignal,
    SignalType,
)

from app.inference.gemma_client import extract_signals_from_text
from app.inference.qwen_client import synthesise_rationale
from app.inference.redaction import redact
from app.models.signal import Signal
import fusion
from policy.gate import evaluate
from policy.thresholds import DEFAULT


async def run_two_model_s01_pipeline():
    print("=" * 65)
    print("LEDGERSENTINEL — TWO-MODEL ARCHITECTURE S01 END-TO-END VERIFICATION")
    print("=" * 65)

    raw_communication = (
        "This is Officer Sharma from RBI security. "
        "Your account is compromised. Transfer Rs 8,00,000 within the hour to safe account 9876543210123456 "
        "or your account will be frozen. Do not discuss this with branch staff."
    )

    t_start = time.perf_counter()

    # ── Stage 0: PII Redaction ──────────────────────────────────────────────
    print("\n[STAGE 0: PII Redaction]")
    sanitized_text, was_redacted = redact(raw_communication)
    print(f"  Redaction ran: {was_redacted}")
    print(f"  Sanitized text: {sanitized_text}")
    assert "9876543210123456" not in sanitized_text, "PII account number leaked!"

    # ── Stage 1: Perception Layer (Gemma 3n E4B) ───────────────────────────
    print("\n[STAGE 1: Perception Layer — Gemma 3n E4B]")
    t_gemma_0 = time.perf_counter()
    signals, redaction_ran, gemma_latency_ms = await extract_signals_from_text(
        text=sanitized_text,
        source_ref="comm_771",
    )
    gemma_wall_ms = (time.perf_counter() - t_gemma_0) * 1000

    print(f"  Extracted {len(signals)} signals in {gemma_latency_ms:.1f} ms (wall: {gemma_wall_ms:.1f} ms):")
    for s in signals:
        span_str = f"[{s.evidence_span.start}, {s.evidence_span.end}]" if s.evidence_span else "None"
        print(f"    - {s.signal_type}: value={s.value:.2f}, conf={s.confidence:.2f}, span={span_str}")
        print(f"      quote: {s.redacted_quote!r}")

        # Invariant checks
        assert isinstance(s, Signal)
        assert s.signal_type not in {"APPROVE", "VERIFY", "COOL_OFF", "HOLD", "ESCALATE"}
        if s.evidence_span:
            assert 0 <= s.evidence_span.start < s.evidence_span.end <= len(sanitized_text)

    # ── Stage 2: Reasoning Layer (Qwen3-4B-Q8) ─────────────────────────────
    print("\n[STAGE 2: Reasoning / Fusion Layer — Qwen3-4B-Q8]")
    signal_dicts = [s.model_dump(mode="json") for s in signals]
    t_qwen_0 = time.perf_counter()
    rationale, qwen_latency_ms = await synthesise_rationale(signal_dicts)
    qwen_wall_ms = (time.perf_counter() - t_qwen_0) * 1000

    print(f"  Synthesised rationale in {qwen_latency_ms:.1f} ms (wall: {qwen_wall_ms:.1f} ms):")
    print(f"  \"{rationale}\"")

    # Invariant checks: Qwen must NEVER output decision actions
    for forbidden in ["APPROVE", "VERIFY", "COOL_OFF", "HOLD", "ESCALATE"]:
        assert forbidden not in rationale, f"Forbidden action '{forbidden}' leaked into rationale!"

    # ── Stage 3: Deterministic Policy Gate ─────────────────────────────────
    print("\n[STAGE 3: Deterministic Policy Gate — Action Authority]")
    # Convert model-service signals to contract signals for api/policy gate
    contract_signals = [
        ContractSignal(
            signal_type=SignalType(s.signal_type),
            value=s.value,
            confidence=s.confidence,
            source_ref=s.source_ref,
            evidence_span=(s.evidence_span.start, s.evidence_span.end) if s.evidence_span else None,
            redacted_quote=s.redacted_quote,
            model_version="gemma3n-e4b-v1.0",
        )
        for s in signals
    ]

    from datetime import datetime, timezone
    now_dt = datetime.now(timezone.utc)
    evidence = fusion.signals_to_evidence(contract_signals, now=now_dt)
    assessment = fusion.assess(
        transaction_id="txn_s01",
        signals=contract_signals,
        evidence=evidence,
        identity_assurance=IdentityAssurance.BASIC,
        unusual_destination=True,
        first_time_beneficiary=True,
        advisory_match=True,
        degraded=False,
        model_version="gemma3n-e4b-v1.0",
        now=now_dt,
    )

    high_impact = 800000 >= DEFAULT.high_impact_amount
    time_pressure = any(s.signal_type.value in ("urgency", "threat") for s in contract_signals)

    policy_input = PolicyInput(
        risk_score=assessment.risk_score,
        confidence=assessment.confidence,
        critical_evidence=assessment.critical_evidence_present,
        critical_evidence_ids=tuple(e.evidence_id for e in evidence if e.critical),
        high_impact=high_impact,
        time_pressure=time_pressure,
        degraded=assessment.degraded,
    )

    action = evaluate(policy_input)
    total_pipeline_ms = (time.perf_counter() - t_start) * 1000

    print(f"  Assessment Risk Score: {assessment.risk_score}/100")
    print(f"  Assessment Confidence: {assessment.confidence:.2f}")
    print(f"  Critical Evidence Present: {assessment.critical_evidence_present}")
    print(f"  High Impact: {high_impact}")
    print(f"  Time Pressure: {time_pressure}")
    print(f"  Authorised Action: {action.type.value} (severity={action.type.severity})")
    print(f"  Rationale Refs: {action.rationale_refs}")

    print("\n" + "=" * 65)
    print("LATENCY SUMMARY:")
    print(f"  Gemma 3n Perception: {gemma_latency_ms:.1f} ms")
    print(f"  Qwen3 Reasoning:     {qwen_latency_ms:.1f} ms")
    print(f"  Total Pipeline:      {total_pipeline_ms:.1f} ms")
    print("=" * 65)

    # Invariants
    assert action.type is ActionType.ESCALATE, f"Expected ESCALATE for S01, got {action.type}"
    print("\nSUCCESS: End-to-end two-model pipeline verified!")


if __name__ == "__main__":
    asyncio.run(run_two_model_s01_pipeline())
