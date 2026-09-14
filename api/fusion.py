"""Evidence fusion: signals + transaction facts -> Evidence[] -> Assessment.

Two things this deliberately does NOT do:

  It does not decide.        Fusion produces an Assessment. The gate turns that into an Action.
  It does not merge risk     risk_score answers "how bad does this look", confidence answers
  and confidence.            "how sure are we". They are computed separately, from different
                             inputs, and never multiplied together (rule 2).
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from enum import StrEnum

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

# Some labels are only critical in combination. Impersonating the bank AND telling the customer
# not to speak to the bank is one label defeating the other's only remedy - its entire purpose
# is to stop the check that would catch it. S08 has impersonation plus a redirect and is a HOLD;
# S01 adds the secrecy instruction, and that is not something an analyst queue should sit on.
CRITICAL_COMBINATIONS: tuple[frozenset[SignalType], ...] = (
    frozenset({SignalType.AUTHORITY_IMPERSONATION, SignalType.SECRECY_REQUEST}),
)


def _is_critical(present: set[SignalType]) -> bool:
    return bool(present & CRITICAL) or any(c <= present for c in CRITICAL_COMBINATIONS)


class BeneficiaryHistory(StrEnum):
    """What the account knows about the counterparty - the half of "high impact" that is not
    the amount."""

    UNKNOWN = "unknown"  # nothing supplied. Treated neutrally, never as a reassurance.
    FIRST_SEEN = "first_seen"  # never paid before
    RECENT = "recent"  # paid a handful of times, all recently
    ESTABLISHED = "established"  # a counterparty this account pays as a matter of course
    DETAILS_CHANGED = "details_changed"  # known name, new account - the invoice-fraud signature
    MERCHANT = "merchant"  # a retail merchant, not a transfer beneficiary at all

    @property
    def expected(self) -> bool:
        return self in (BeneficiaryHistory.ESTABLISHED, BeneficiaryHistory.MERCHANT)


def derive_beneficiary_history(destination_ref: str | None) -> BeneficiaryHistory:
    """Stand-in for the account-history lookup. Phase 3 reads this from Supabase.

    Until then the reference itself carries the history, in the vocabulary the fixtures already
    use, so nothing is silently hardcoded and the demo can change it live.
    """
    ref = (destination_ref or "").lower()
    if not ref:
        return BeneficiaryHistory.UNKNOWN
    if ref.startswith("merchant"):
        return BeneficiaryHistory.MERCHANT
    if "changed" in ref:
        return BeneficiaryHistory.DETAILS_CHANGED
    if "first" in ref:
        return BeneficiaryHistory.FIRST_SEEN
    if m := re.search(r"seen_(\d+)x", ref):
        return BeneficiaryHistory.RECENT if int(m.group(1)) < 5 else BeneficiaryHistory.ESTABLISHED
    return BeneficiaryHistory.UNKNOWN


def escalating_pattern(prior_amounts: list[float], amount: float) -> bool:
    """Every transfer larger than the last, and this one larger still.

    The pattern is the case (S02): no single transfer is alarming, the sequence is. Two points
    are not a pattern.
    """
    seq = [*prior_amounts, amount]
    return len(seq) >= 3 and all(b > a for a, b in zip(seq, seq[1:]))


def is_high_impact(high_value: bool, history: BeneficiaryHistory) -> bool:
    """High impact = high VALUE and an UNEXPECTED counterparty.

    Value alone is not an anomaly: a business paying its supplier 45,000 every month is not a
    case, it is a Tuesday (S05). The gate holds and escalates on this flag, so it has to mean
    anomaly, not magnitude - magnitude is scored separately, as risk.
    """
    return high_value and not history.expected


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
                critical=_is_critical({s.signal_type for s in group}),
            )
        )
    return out


def transaction_evidence(
    *,
    transaction_id: str,
    amount: float,
    currency: str,
    history: BeneficiaryHistory,
    prior_amounts: list[float],
    now: datetime,
) -> list[Evidence]:
    """The account's own facts as citable evidence - the fixtures' ev_62xx / ev_96xx rows.

    Fusion was counting these in the score long before anyone could cite them, so a HOLD driven
    by an escalating transfer pattern had nothing to point at (rule 4).
    """
    claims: list[tuple[str, str, float]] = []  # (key, claim, confidence)
    if escalating_pattern(prior_amounts, amount):
        seq = ", ".join(f"{a:g}" for a in prior_amounts)
        claims.append((
            "escalating",
            f"Transfer {len(prior_amounts) + 1} to the same beneficiary, each larger than the "
            f"last: {seq}, now {amount:g} {currency}.",
            0.95,
        ))
    if history is BeneficiaryHistory.DETAILS_CHANGED:
        claims.append((
            "details_changed",
            "Beneficiary name is unchanged but the account details changed shortly before "
            "this payment.",
            0.90,
        ))
    if history is BeneficiaryHistory.FIRST_SEEN:
        claims.append(("first_seen", "First payment to this beneficiary from this account.", 0.95))
    if history.expected:
        claims.append((
            "expected",
            "Counterparty is one this account pays as a matter of course; the amount is "
            "consistent with that history.",
            0.90,
        ))
    return [
        Evidence(
            evidence_id=_id("ev", transaction_id, key),
            source_type=SourceType.TRANSACTION,
            source_ref=transaction_id,
            claim=claim,
            confidence=conf,
            timestamp=now,
            signal_refs=(),
            redacted_quote=None,
            critical=False,
        )
        for key, claim, conf in claims
    ]


def assess(
    *,
    transaction_id: str,
    signals: list[Signal],
    evidence: list[Evidence],
    identity_assurance: IdentityAssurance = IdentityAssurance.BASIC,
    unusual_destination: bool = False,
    first_time_beneficiary: bool = False,
    advisory_match: bool = False,
    beneficiary_history: BeneficiaryHistory = BeneficiaryHistory.UNKNOWN,
    escalating_transfer_pattern: bool = False,
    high_value: bool = False,
    unusual_location: bool = False,
    device_known: bool | None = None,
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

    history = beneficiary_history
    first_time = first_time_beneficiary or history is BeneficiaryHistory.FIRST_SEEN
    # A counterparty this account pays every month is, by definition, a usual destination, and
    # paying a merchant in the country you are standing in is not an unusual one either. Both
    # stay visible to the analyst as factors - they just do not count against the customer.
    dest_is_unusual = unusual_destination and not history.expected

    # Illustrative weights, like everything in thresholds.py. The one worth defending to a judge:
    # high_value puts any large payment in the step-up band on magnitude alone. It only becomes
    # an anomaly the gate can hold or escalate on when the counterparty is unexpected too.
    for flag, weight, name in (
        (dest_is_unusual, 12.0, "unusual_destination"),
        (unusual_location, 32.0, "unusual_location"),
        (first_time, 10.0, "first_time_beneficiary"),
        (history is BeneficiaryHistory.RECENT, 8.0, "new_beneficiary"),
        (history is BeneficiaryHistory.DETAILS_CHANGED, 14.0, "bank_details_changed"),
        (escalating_transfer_pattern, 12.0, "escalating_transfer_pattern"),
        (high_value, 34.0, "high_value"),
        (device_known is False, 8.0, "new_device"),
        (advisory_match, 18.0, "advisory_match"),
    ):
        if flag:
            risk += weight
            factors.append(name)

    # Reassurance is a reason too (rule 4). An analyst should see WHY a 45,000 payment only
    # warranted a step-up, not merely that it did.
    if history.expected:
        factors.append("expected_counterparty")
    if device_known:
        factors.append("known_device")

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

    # Contradictory evidence: the counterparty is known but its account changed, and a message
    # asked for exactly that redirect. Invoice fraud and a genuine banking migration look
    # identical from here (S06). Two plausible readings means we are materially less sure than
    # either label's confidence claims - and on a high-impact payment it is that uncertainty,
    # not the risk score, that sends it to a human (rule.high_impact_low_confidence).
    contradiction = history is BeneficiaryHistory.DETAILS_CHANGED and any(
        s.signal_type is SignalType.PAYMENT_REDIRECT and s.confidence >= PRESENCE_FLOOR
        for s in signals
    )
    if contradiction:
        confidence *= 0.7
        factors.append("contradictory_evidence")

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
