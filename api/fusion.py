"""Evidence fusion: signals + transaction facts -> Evidence[] -> Assessment.

Two things this deliberately does NOT do:

  It does not decide.        Fusion produces an Assessment. The gate turns that into an Action.
  It does not merge risk     risk_score answers "how bad does this look", confidence answers
  and confidence.            "how sure are we". They are computed separately, from different
                             inputs, and never multiplied together (rule 2).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import _contracts_path  # noqa: F401
from contracts import (
    Assessment,
    Evidence,
    IdentityAssurance,
    Signal,
    SignalType,
    SourceType,
)

# How much each scam-intent label contributes to risk. Config, not prompts (rule 9).
# remote_access and payment_redirect are weighted hardest because they are the two that show up
# in advisories as the point of no return.
WEIGHTS: dict[SignalType, float] = {
    SignalType.REMOTE_ACCESS_REQUEST: 34.0,
    SignalType.PAYMENT_REDIRECT: 30.0,
    SignalType.AUTHORITY_IMPERSONATION: 26.0,
    SignalType.OTP_REQUEST: 26.0,
    SignalType.SECRECY_REQUEST: 20.0,
    SignalType.THREAT: 20.0,
    SignalType.URGENCY: 16.0,
    SignalType.INVESTMENT_LURE: 16.0,
}

# Labels that on their own justify going straight to a human.
CRITICAL: frozenset[SignalType] = frozenset(
    {SignalType.REMOTE_ACCESS_REQUEST, SignalType.OTP_REQUEST}
)

# A label is only treated as present at all above this calibrated confidence.
PRESENCE_FLOOR = 0.50


def _id(prefix: str, *parts: str) -> str:
    """Deterministic ids, so re-running a scenario produces identical output."""
    h = hashlib.sha1("|".join(parts).encode()).hexdigest()[:8]
    return f"{prefix}_{h}"


def signals_to_evidence(signals: list[Signal], *, now: datetime) -> list[Evidence]:
    """Group signals by source into human-readable claims.

    One claim per communication, not one per signal - an analyst wants to read
    "caller impersonated bank security and pressured an immediate transfer", not four rows.
    """
    by_source: dict[str, list[Signal]] = {}
    for s in signals:
        if s.confidence >= PRESENCE_FLOOR:
            by_source.setdefault(s.source_ref, []).append(s)

    out: list[Evidence] = []
    for source_ref, group in sorted(by_source.items()):
        group.sort(key=lambda s: s.confidence, reverse=True)
        claim = "Detected " + ", ".join(s.signal_type.label.lower() for s in group)
        quote = next((s.redacted_quote for s in group if s.redacted_quote), None)
        out.append(
            Evidence(
                evidence_id=_id("ev", source_ref, *(s.signal_type.value for s in group)),
                source_type=SourceType.COMMUNICATION,
                source_ref=source_ref,
                claim=claim,
                confidence=max(s.confidence for s in group),
                timestamp=now,
                signal_refs=tuple(s.signal_type.value for s in group),
                redacted_quote=quote,
                critical=any(s.signal_type in CRITICAL for s in group),
            )
        )
    return out


def assess(
    *,
    transaction_id: str,
    signals: list[Signal],
    evidence: list[Evidence],
    identity_assurance: IdentityAssurance = IdentityAssurance.BASIC,
    unusual_destination: bool = False,
    first_time_beneficiary: bool = False,
    advisory_match: bool = False,
    degraded: bool = False,
    model_version: str = "mock",
    now: datetime | None = None,
) -> Assessment:
    """Fuse everything into one Assessment."""
    now = now or datetime.now(timezone.utc)

    # ---- risk: how bad does this look ----------------------------------------
    risk = 0.0
    factors: list[str] = []

    for s in signals:
        if s.confidence >= PRESENCE_FLOOR:
            risk += WEIGHTS.get(s.signal_type, 10.0) * s.confidence
            factors.append(s.signal_type.value)

    for flag, weight, name in (
        (unusual_destination, 12.0, "unusual_destination"),
        (first_time_beneficiary, 10.0, "first_time_beneficiary"),
        (advisory_match, 18.0, "advisory_match"),
    ):
        if flag:
            risk += weight
            factors.append(name)

    risk_score = max(0, min(100, round(risk)))

    # ---- confidence: how sure are we -----------------------------------------
    # Computed from entirely different inputs than risk. Note it is NOT "1 - risk".
    if signals:
        # Confident when the model was confident and the signals agree with each other.
        confidences = [s.confidence for s in signals]
        confidence = sum(confidences) / len(confidences)
    else:
        # No signals is itself informative, but less so than positive evidence.
        confidence = 0.80

    confidence *= identity_assurance.confidence_multiplier

    if degraded:
        # Rule 5: we could not see clearly, and we say so rather than papering over it.
        confidence *= 0.6
        factors.append("degraded_analysis")

    confidence = round(max(0.0, min(1.0, confidence)), 3)

    if not factors:
        factors.append("no_risk_indicators")

    return Assessment(
        assessment_id=_id("as", transaction_id, str(risk_score)),
        transaction_id=transaction_id,
        risk_score=risk_score,
        confidence=confidence,
        factors=tuple(dict.fromkeys(factors)),  # dedupe, preserve order
        evidence_ids=tuple(e.evidence_id for e in evidence),
        identity_assurance=identity_assurance,
        critical_evidence_present=any(e.critical for e in evidence),
        degraded=degraded,
        model_version=model_version,
        created_at=now,
    )
