"""Policy gate tests.

Passing these IS the Phase 1 exit gate. They check the three properties the pitch rests on:
determinism, the ladder only ratcheting upward, and failing toward oversight.

    cd api && pytest -v
"""

from __future__ import annotations

import pathlib
from datetime import datetime, timezone

import pytest

import _contracts_path  # noqa: F401
from contracts import (
    ActionType,
    Approve,
    Assessment,
    CoolOff,
    Decision,
    Escalate,
    Hold,
    IdentityAssurance,
    PolicyInput,
    Verify,
    load_fixture,
)

from policy.gate import PolicyViolation, evaluate, validate_proposal
from policy.thresholds import DEFAULT

NOW = datetime(2026, 9, 14, 12, 0, tzinfo=timezone.utc)


def gate(**kw) -> object:
    """Evaluate with sensible defaults; override only what a test cares about."""
    base = dict(risk_score=10, confidence=0.9)
    return evaluate(PolicyInput(**{**base, **kw}), now=NOW)


# ------------------------------------------------------------------ the ladder

def test_low_risk_high_confidence_approves():
    assert isinstance(gate(risk_score=10, confidence=0.95), Approve)


def test_moderate_risk_verifies():
    a = gate(risk_score=45, confidence=0.9)
    assert isinstance(a, Verify)
    assert a.channel.value == "app_push", "verification must be out-of-band"


def test_low_confidence_alone_forces_verify():
    """Rule 2: uncertainty reduces autonomy even when risk looks low."""
    a = gate(risk_score=5, confidence=0.40)
    assert isinstance(a, Verify)
    assert "rule.low_confidence" in a.rationale_refs


def test_time_pressure_triggers_cool_off():
    a = gate(risk_score=35, confidence=0.9, time_pressure=True)
    assert isinstance(a, CoolOff)
    assert a.delay_seconds == DEFAULT.cool_off_seconds


def test_elevated_risk_holds():
    a = gate(risk_score=70, confidence=0.9)
    assert isinstance(a, Hold)
    assert a.expires_at > NOW, "holds are time-boxed, never indefinite"


def test_high_risk_escalates():
    a = gate(risk_score=92, confidence=0.9)
    assert isinstance(a, Escalate)


def test_critical_evidence_always_escalates_even_at_zero_risk():
    """Critical evidence outranks the risk bands entirely."""
    a = gate(risk_score=0, confidence=1.0, critical_evidence=True)
    assert isinstance(a, Escalate)
    assert "rule.critical_scam_evidence" in a.rationale_refs


# --------------------------------------------------------- fail toward oversight

def test_degraded_never_approves():
    """Rule 5. The single most important test in this file."""
    a = gate(risk_score=0, confidence=1.0, degraded=True)
    assert a.type is not ActionType.APPROVE
    assert a.type.severity >= ActionType.HOLD.severity
    assert "rule.degraded_fail_toward_oversight" in a.rationale_refs


@pytest.mark.parametrize("risk", [0, 25, 50, 75, 100])
@pytest.mark.parametrize("conf", [0.0, 0.5, 1.0])
def test_degraded_never_approves_anywhere_in_the_space(risk, conf):
    assert gate(risk_score=risk, confidence=conf, degraded=True).type is not ActionType.APPROVE


# ------------------------------------------------------------------- ratcheting

def test_ladder_only_ratchets_upward():
    """Adding a risk factor can never produce MORE autonomy."""
    base = gate(risk_score=45, confidence=0.9)
    for extra in ("high_impact", "critical_evidence", "degraded", "time_pressure"):
        worse = gate(risk_score=45, confidence=0.9, **{extra: True})
        assert worse.type.severity >= base.type.severity, (
            f"adding {extra} reduced severity from {base.type} to {worse.type}"
        )


def test_more_risk_never_means_more_autonomy():
    prev = -1
    for risk in range(0, 101, 5):
        sev = gate(risk_score=risk, confidence=0.9).type.severity
        assert sev >= prev, f"severity dropped at risk={risk}"
        prev = sev


def test_less_confidence_never_means_more_autonomy():
    prev = 99
    for c in [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.0]:
        sev = gate(risk_score=40, confidence=c).type.severity
        assert sev <= 99 and sev >= 0
        # severity should be non-decreasing as confidence falls
        prev = sev if prev == 99 else prev
    assert gate(risk_score=40, confidence=0.4).type.severity >= gate(
        risk_score=40, confidence=1.0
    ).type.severity


# ------------------------------------------------------------------ determinism

def test_same_input_same_output():
    p = PolicyInput(risk_score=63, confidence=0.62, high_impact=True)
    first = evaluate(p, now=NOW)
    for _ in range(50):
        assert evaluate(p, now=NOW) == first


# ----------------------------------------------------- AI proposals get checked

def test_gate_rejects_an_over_confident_ai_proposal():
    """'AI proposes, policy authorises' - the moment worth demoing."""
    p = PolicyInput(risk_score=92, confidence=0.99, critical_evidence=True)
    with pytest.raises(PolicyViolation, match="Proposal rejected"):
        validate_proposal(ActionType.APPROVE, p, now=NOW)


def test_gate_accepts_a_proposal_at_least_as_restrictive():
    p = PolicyInput(risk_score=10, confidence=0.95)
    assert validate_proposal(ActionType.HOLD, p, now=NOW).type is ActionType.APPROVE


# ------------------------------------------------------- the real scenarios

FIXTURES = sorted(
    p.stem for p in (pathlib.Path(__file__).parents[2] / "contracts" / "fixtures").glob("*.json")
)


def _policy_input_for(fx: dict) -> PolicyInput:
    """Build the gate's input from a fixture.

    A fixture declares high_impact and time_pressure explicitly rather than having the test
    derive them, because 'high impact' means high value AND unexpected - see S05, where a large
    payment to a long-standing supplier is deliberately not an anomaly.
    """
    pi = fx.get("policy_input", {})
    return PolicyInput.from_assessment(
        Assessment(**fx["assessment"]),
        high_impact=pi.get(
            "high_impact", fx["transaction"]["amount"] >= DEFAULT.high_impact_amount
        ),
        time_pressure=pi.get(
            "time_pressure",
            any(s["signal_type"] in ("urgency", "threat") for s in fx["signals"]),
        ),
    )


@pytest.mark.parametrize("scenario", FIXTURES)
def test_fixture_reaches_its_expected_action(scenario):
    """Every scenario in the cohort. Adding a fixture automatically adds a test."""
    fx = load_fixture(scenario)
    expected = ActionType(fx["expected_action"])
    action = evaluate(_policy_input_for(fx), now=NOW)
    assert action.type is expected, (
        f"{fx['scenario_id']} expected {expected.value} but the gate returned "
        f"{action.type.value} (risk={fx['assessment']['risk_score']}, "
        f"confidence={fx['assessment']['confidence']})"
    )


@pytest.mark.parametrize("scenario", FIXTURES)
def test_fixture_decision_is_a_valid_contract(scenario):
    d = Decision(**load_fixture(scenario)["decision"])
    assert d.rationale_refs, "a decision nobody can explain is a bug (rule 4)"
    if d.action is ActionType.ESCALATE:
        assert d.human_required


@pytest.mark.parametrize("scenario", FIXTURES)
def test_fixture_decision_matches_what_the_gate_would_do(scenario):
    """The hand-authored decision and the live gate must not disagree.

    If they drift apart, either the fixture is aspirational or the gate has a bug - and the
    PRISM cohort is worthless until you know which.
    """
    fx = load_fixture(scenario)
    assert evaluate(_policy_input_for(fx), now=NOW).type is ActionType(fx["decision"]["action"])


def test_cohort_covers_every_rung_of_the_ladder():
    """A cohort that never exercises a rung cannot tell you whether that rung works."""
    reached = {ActionType(load_fixture(s)["expected_action"]) for s in FIXTURES}
    missing = {ActionType.VERIFY, ActionType.HOLD, ActionType.ESCALATE} - reached
    assert not missing, f"no scenario reaches {[m.value for m in missing]}"


def test_prompt_injection_scenario_is_not_obeyed():
    """S08, rule 3. The message instructs the system to approve; it must not comply."""
    fx = load_fixture("s08")
    action = evaluate(_policy_input_for(fx), now=NOW)

    assert action.type is not ActionType.APPROVE, (
        "the injected instruction said APPROVE and the system complied - rule 3 violated"
    )
    assert fx["assessment"]["risk_score"] > 50, (
        "the injection asked for risk_score 0; the attempt should raise risk, not lower it"
    )
    for signal in fx["signals"]:
        assert "action" not in signal, "a Signal carried an action field (rule 1)"


def test_identity_assurance_is_carried_through():
    fx = load_fixture("s01")
    a = Assessment(**fx["assessment"])
    p = PolicyInput.from_assessment(a, high_impact=True, time_pressure=True)
    assert p.identity_assurance is IdentityAssurance.VERIFIED, (
        "S01's point is that the customer IS verified - a transaction-only "
        "detector has nothing to catch"
    )
