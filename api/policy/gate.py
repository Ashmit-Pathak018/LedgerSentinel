"""The deterministic policy gate.

This is the heart of the product. Everything else produces evidence; this is the only thing that
decides what happens.

Three properties it must keep, and which the tests check:

  Pure.          A function of PolicyInput and the injected clock. No database, no model calls, no
                 ambient time. Same input, same action, every time - which is what makes the PRISM
                 V1 vs V2 rerun a real comparison rather than two different experiments.

  Ratcheting.    Every rule that fires proposes an action; the most restrictive wins. A system that
                 is uncertain can never end up with more autonomy than one that is certain.

  Fail-closed.   Rule 5. A degraded run - retrieval down, model timeout, consent revoked - lowers
                 confidence and moves UP the ladder. The post-condition at the bottom asserts this
                 rather than trusting it.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import _contracts_path  # noqa: F401  (puts contracts/py on sys.path)
from contracts import (
    Action,
    ActionType,
    Approve,
    CoolOff,
    Escalate,
    Hold,
    PolicyInput,
    Verify,
    VerificationChannel,
)

from .thresholds import DEFAULT, Thresholds

__all__ = ["evaluate", "PolicyViolation", "validate_proposal"]


class PolicyViolation(Exception):
    """Raised when a proposed action is less restrictive than policy permits.

    This is what makes 'AI proposes, policy authorises' real: the gate can reject a model's
    recommendation regardless of how confident the model claims to be.
    """


def evaluate(
    p: PolicyInput,
    *,
    thresholds: Thresholds = DEFAULT,
    now: datetime | None = None,
) -> Action:
    """Return the most restrictive action any rule demands.

    `now` is injected rather than read from the clock so the function stays pure and testable.
    """
    now = now or datetime.now(timezone.utc)
    t = thresholds

    # Each rule independently proposes (action, why). Nothing short-circuits: we want the full
    # set of reasons in the audit trail, not just the first one that matched.
    proposals: list[tuple[ActionType, str]] = []

    if p.critical_evidence:
        proposals.append((ActionType.ESCALATE, "rule.critical_scam_evidence"))
        # V2: cite the evidence itself, not just the rule that noticed it. In V1 this was
        # appended downstream in main.py, so anything calling the gate directly produced a
        # decision an analyst could not trace back to a piece of evidence.
        for ev_id in p.critical_evidence_ids:
            proposals.append((ActionType.ESCALATE, ev_id))
    if p.risk_score >= t.escalate_at:
        proposals.append((ActionType.ESCALATE, "rule.risk_gte_85"))
    if p.high_impact and p.confidence < t.escalate_confidence_floor:
        # High impact plus genuine uncertainty. Risk alone may look unremarkable - that is
        # precisely why this rule exists. Conflicting evidence on a large transaction is a
        # human's call, not a queue item an analyst can quietly release.
        proposals.append((ActionType.ESCALATE, "rule.high_impact_low_confidence"))

    if p.risk_score >= t.hold_at:
        proposals.append((ActionType.HOLD, "rule.risk_60_84"))
    if p.high_impact:
        proposals.append((ActionType.HOLD, "rule.high_impact_anomaly"))
    if p.degraded:
        # Rule 5. We could not see clearly, so we hand over to someone who can.
        proposals.append((ActionType.HOLD, "rule.degraded_fail_toward_oversight"))

    if p.time_pressure:
        # Manufactured urgency is the scammer's main tool. Friction is the counter.
        proposals.append((ActionType.COOL_OFF, "rule.time_pressure"))

    if p.risk_score >= t.verify_at:
        proposals.append((ActionType.VERIFY, "rule.risk_30_59"))
    if p.confidence < t.min_confidence:
        proposals.append((ActionType.VERIFY, "rule.low_confidence"))

    if not proposals:
        action = _approve(p, t)
    else:
        # Key on severity, NOT the enum itself: ActionType is a StrEnum, so a bare max() would
        # compare alphabetically and cheerfully rank VERIFY above ESCALATE.
        winner = max((a for a, _ in proposals), key=lambda a: a.severity)
        why = tuple(sorted(r for a, r in proposals if a == winner))
        action = _build(winner, why, t, now)

    _assert_invariants(p, action)
    return action


def _approve(p: PolicyInput, t: Thresholds) -> Action:
    return Approve(rationale_refs=("rule.low_risk_high_confidence",))


def _build(
    which: ActionType, why: tuple[str, ...], t: Thresholds, now: datetime
) -> Action:
    match which:
        case ActionType.APPROVE:
            return Approve(rationale_refs=why)
        case ActionType.VERIFY:
            # Out-of-band by definition: a channel the scammer is not already sitting on.
            return Verify(channel=VerificationChannel.APP_PUSH, rationale_refs=why)
        case ActionType.COOL_OFF:
            return CoolOff(delay_seconds=t.cool_off_seconds, rationale_refs=why)
        case ActionType.HOLD:
            return Hold(
                expires_at=now + timedelta(seconds=t.hold_duration_seconds),
                rationale_refs=why,
            )
        case ActionType.ESCALATE:
            return Escalate(reason=why[0], rationale_refs=why)
    raise AssertionError(f"unreachable: {which!r}")


def _assert_invariants(p: PolicyInput, action: Action) -> None:
    """Post-conditions. Cheap, and they turn a silent policy bug into a loud crash."""
    if p.degraded and action.type is ActionType.APPROVE:
        raise AssertionError(
            "fail-toward-oversight violated: a degraded run produced APPROVE (rule 5)"
        )
    if p.critical_evidence and action.type is not ActionType.ESCALATE:
        raise AssertionError(
            "critical evidence must reach a human (rule 5), got " f"{action.type}"
        )
    if p.critical_evidence and not any(
        r.startswith("ev_") for r in action.rationale_refs
    ):
        # The V1 failure, now impossible by construction. An analyst must be able to see WHICH
        # evidence forced the escalation, not merely that a rule fired (rule 4).
        raise AssertionError(
            "critical evidence drove this decision but the rationale cites no ev_* reference"
        )
    if (
        p.high_impact
        and p.confidence < DEFAULT.escalate_confidence_floor
        and action.type is not ActionType.ESCALATE
    ):
        raise AssertionError(
            "escalation safety violated: high-impact uncertainty must reach a human, "
            f"got {action.type}"
        )
    if action.type is ActionType.ESCALATE and not action.rationale_refs:
        raise AssertionError("every decision must be explainable (rule 4)")


def validate_proposal(
    proposed: ActionType,
    p: PolicyInput,
    *,
    thresholds: Thresholds = DEFAULT,
    now: datetime | None = None,
) -> Action:
    """Check an AI-proposed action against policy. Backs POST /v1/decisions/validate.

    Returns the authorised action. Raises PolicyViolation if the proposal asked for more autonomy
    than the evidence supports - which is the single most demonstrable moment in the pitch.
    """
    authorised = evaluate(p, thresholds=thresholds, now=now)
    if proposed.severity < authorised.type.severity:
        raise PolicyViolation(
            f"AI proposed {proposed.value} but policy authorises {authorised.type.value}. "
            f"Proposal rejected: {', '.join(authorised.rationale_refs)}"
        )
    return authorised
