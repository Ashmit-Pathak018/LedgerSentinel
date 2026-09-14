"""Scenario S01 live validation script — adapted for model-service/ architecture.

Validates that real inference on Scenario S01 (coercive scam + large transfer)
extracts the required fraud signals conforming to the frozen contract.
Text is sanitized/redacted before inference (rule 6).

Run from the repository root:
    model-service\\.venv\\Scripts\\python.exe model-service/eval/eval_s01.py
"""

from __future__ import annotations

import asyncio
import json
import sys
import pathlib

# ── Path bootstrap ─────────────────────────────────────────────────────────────
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "model-service"))

from app.inference.gemma_client import extract_signals_from_text
from app.inference.redaction import redact
from app.models.signal import Signal, SignalType


async def run_s01_validation():
    print("--- Scenario S01 Live Validation (model-service/) ---")

    raw_s01_text = (
        "This is Officer Sharma from RBI security. "
        "Your account is compromised. Transfer Rs 8,00,000 within the hour to safe account 9876543210123456 "
        "or your account will be frozen. Do not discuss this with branch staff."
    )

    # 1. PII Redaction step (Rule 6)
    sanitized_text, was_redacted = redact(raw_s01_text)
    print(f"Redaction ran: {was_redacted}")
    print(f"Sanitized text for model:\n{sanitized_text}\n")

    assert "9876543210123456" not in sanitized_text, "Account number leaked through redaction!"

    # 2. Extract signals using real Gemma 3n
    source_ref = "comm_771"
    signals, redaction_ran, latency_ms = await extract_signals_from_text(
        text=sanitized_text, source_ref=source_ref
    )

    print(f"Extracted {len(signals)} signals from Gemma 3n (latency: {latency_ms:.1f}ms):")
    found_types: set[str] = set()
    for sig in signals:
        found_types.add(sig.signal_type)
        span = None
        if sig.evidence_span:
            span = [sig.evidence_span.start, sig.evidence_span.end]
        print(f"  [{sig.signal_type}] value={sig.value:.2f} confidence={sig.confidence:.2f}")
        print(f"    span={span} quote={sig.redacted_quote!r}")

        # Validate frozen contract
        assert isinstance(sig, Signal)
        assert 0.0 <= sig.value <= 1.0
        assert 0.0 <= sig.confidence <= 1.0
        if sig.redacted_quote:
            assert "9876543210123456" not in sig.redacted_quote, "PII in redacted_quote!"

    # 3. Semantic signal presence check for S01
    critical_signals = {"authority_impersonation", "urgency", "payment_redirect"}
    present_critical = critical_signals.intersection(found_types)
    print(f"\nCritical S01 signals present: {sorted(present_critical)} "
          f"(out of {sorted(critical_signals)})")
    assert len(present_critical) >= 2, (
        f"Expected >=2 critical signals for S01, found: {present_critical}"
    )

    # 4. Export as verified fixture
    eval_dir = pathlib.Path(__file__).resolve().parent
    out_path = eval_dir / "s01_live_signals.json"
    dumpable = [s.model_dump(mode="json") for s in signals]
    out_path.write_text(json.dumps(dumpable, indent=2), encoding="utf-8")
    print(f"\nSaved live S01 signals to: {out_path}")
    print("S01 Validation: PASSED.")
    return signals


if __name__ == "__main__":
    asyncio.run(run_s01_validation())
