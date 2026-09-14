"""
Signal and related Pydantic schemas.

CONTRACT (frozen with team in Phase 0 — do not modify solo):
  Signal = {
    signal_type, value, confidence, source_ref, evidence_span, redacted_quote
  }

HARD RULE:
  signal_type is NEVER an action string.
  Actions (APPROVE / VERIFY / COOL_OFF / HOLD / ESCALATE) are emitted ONLY
  by Yashraj's deterministic policy gate. If signal_type ever equals one of
  those strings, this validator will raise immediately.
"""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, field_serializer, field_validator, model_validator

# ── Eight frozen fraud signal labels ─────────────────────────────────────────
SignalType = Literal[
    "urgency",
    "authority_impersonation",
    "secrecy_request",
    "remote_access_request",
    "payment_redirect",
    "otp_request",
    "threat",
    "investment_lure",
]

# Guard against architecture violations at the schema level
_FORBIDDEN_SIGNAL_VALUES = {
    "approve", "verify", "cool_off", "hold", "escalate"
}


class EvidenceSpan(BaseModel):
    """Character offsets into the (redacted) source text."""
    start: int
    end: int


class Signal(BaseModel):
    """
    A single fraud signal emitted by the model service.

    Invariants:
    - value and confidence are in [0.0, 1.0]
    - signal_type is one of the eight frozen labels
    - redacted_quote contains no raw PII (enforced upstream by redaction pass)
    """
    signal_type: SignalType
    value: float           # calibrated label score
    confidence: float      # calibrated confidence (post Platt scaling)
    source_ref: str        # e.g. "sms_msg_id_xyz", "voice_chunk_12"
    evidence_span: EvidenceSpan | None = None
    redacted_quote: str | None = None   # <=25 words, PII replaced with ***

    # The frozen contract (contracts/json/signal.schema.json) specifies evidence_span as
    # [start, end) - a two-element array, which is what the UI indexes to highlight in place.
    # EvidenceSpan stays as the internal type because it is pleasanter to work with; this
    # serialiser makes the wire format match the contract.
    @field_serializer("evidence_span")
    def _span_as_array(self, v: "EvidenceSpan | None") -> list[int] | None:
        return None if v is None else [v.start, v.end]

    @field_validator("value", "confidence")
    @classmethod
    def clamp_to_unit_interval(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError(f"Score must be in [0.0, 1.0], got {v}")
        return round(v, 4)

    @field_validator("signal_type")
    @classmethod
    def reject_action_strings(cls, v: str) -> str:
        if v.lower() in _FORBIDDEN_SIGNAL_VALUES:
            raise ValueError(
                f"signal_type '{v}' is an action string. "
                "Models emit signals, never decisions. "
                "Only the policy gate emits actions."
            )
        return v

    @field_validator("redacted_quote")
    @classmethod
    def check_quote_length(cls, v: str) -> str:
        words = v.split()
        if len(words) > 30:
            # Truncate silently rather than hard-fail — quote may be slightly over
            return " ".join(words[:30]) + " …"
        return v


class SignalBatch(BaseModel):
    """The full response from both /text/score and /voice/score endpoints."""
    signals: list[Signal]
    model_version: str
    source_ref: str
    redaction_ran: bool
    latency_ms: float | None = None
