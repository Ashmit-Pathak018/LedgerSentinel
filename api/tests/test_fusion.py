"""Fusion: the account's own facts, and what they may and may not do to the score.

These are the scenarios the live path got wrong before it could see beneficiary history. Each
test names the fixture whose premise it encodes, so a future weight change that breaks one
breaks a named story rather than an anonymous number.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import _contracts_path  # noqa: F401,E402
from contracts import Signal, load_fixture  # noqa: E402

import fusion  # noqa: E402
import models_client  # noqa: E402
from fusion import BeneficiaryHistory as BH  # noqa: E402

NOW = datetime(2026, 9, 14, tzinfo=timezone.utc)


def _signals(scenario: str) -> list[Signal]:
    return [Signal(**s) for s in load_fixture(scenario)["signals"]]


def _assess(scenario: str, **kw):
    sigs = _signals(scenario)
    ev = fusion.signals_to_evidence(sigs, now=NOW)
    return fusion.assess(transaction_id="txn_test", signals=sigs, evidence=ev, now=NOW, **kw)


# ── high impact = value AND an unexpected counterparty (S05) ──────────────────


def test_value_alone_is_not_an_anomaly():
    assert fusion.is_high_impact(True, BH.ESTABLISHED) is False
    assert fusion.is_high_impact(True, BH.MERCHANT) is False


def test_value_to_an_unexpected_counterparty_is():
    assert fusion.is_high_impact(True, BH.FIRST_SEEN) is True
    assert fusion.is_high_impact(True, BH.DETAILS_CHANGED) is True
    # Nothing known about the counterparty is never a reassurance.
    assert fusion.is_high_impact(True, BH.UNKNOWN) is True


def test_low_value_is_never_high_impact():
    assert all(fusion.is_high_impact(False, h) is False for h in BH)


# ── the reference carries the history until Phase 3 ──────────────────────────


def test_beneficiary_history_is_derived_from_the_reference():
    assert fusion.derive_beneficiary_history("benef_first_seen") is BH.FIRST_SEEN
    assert fusion.derive_beneficiary_history("benef_seen_3x") is BH.RECENT
    assert fusion.derive_beneficiary_history("benef_seen_14x") is BH.ESTABLISHED
    assert fusion.derive_beneficiary_history("benef_changed_details") is BH.DETAILS_CHANGED
    assert fusion.derive_beneficiary_history("merchant_retail") is BH.MERCHANT
    assert fusion.derive_beneficiary_history(None) is BH.UNKNOWN


# ── the pattern is the case (S02) ─────────────────────────────────────────────


def test_escalating_pattern_needs_every_step_larger():
    assert fusion.escalating_pattern([1200, 3000, 5500], 8500) is True
    assert fusion.escalating_pattern([1200, 6000, 5500], 8500) is False
    assert fusion.escalating_pattern([1200], 8500) is False  # two points are not a pattern
    assert fusion.escalating_pattern([], 8500) is False


def test_escalating_pattern_is_citable_evidence():
    ev = fusion.transaction_evidence(
        transaction_id="txn_044",
        amount=8500,
        currency="USD",
        history=BH.RECENT,
        prior_amounts=[1200, 3000, 5500],
        now=NOW,
    )
    assert any("each larger than the last" in e.claim for e in ev)
    assert all(e.source_type.value == "transaction" and not e.critical for e in ev)


# ── contradiction lowers confidence, not risk (S06) ───────────────────────────


def test_changed_details_plus_a_redirect_request_is_a_contradiction():
    plain = _assess("s06", high_value=True)
    contra = _assess("s06", high_value=True, beneficiary_history=BH.DETAILS_CHANGED)
    assert "contradictory_evidence" in contra.factors
    assert contra.confidence < plain.confidence
    assert contra.risk_score >= plain.risk_score  # uncertainty never buys autonomy


def test_contradiction_drops_below_the_escalation_floor_on_s06():
    from policy.thresholds import DEFAULT

    a = _assess(
        "s06",
        high_value=True,
        beneficiary_history=BH.DETAILS_CHANGED,
        unusual_destination=True,
    )
    assert a.confidence < DEFAULT.escalate_confidence_floor


# ── critical in combination (S01 vs S08) ─────────────────────────────────────


def test_impersonation_plus_secrecy_is_critical():
    ev = fusion.signals_to_evidence(_signals("s01"), now=NOW)
    assert any(e.critical for e in ev)


def test_impersonation_plus_redirect_alone_is_not():
    ev = fusion.signals_to_evidence(_signals("s08"), now=NOW)
    assert not any(e.critical for e in ev)


# ── expected counterparties do not count against the customer (S04, S05) ─────


def test_established_counterparty_is_not_an_unusual_destination():
    a = _assess(
        "s05", high_value=True, unusual_destination=True, beneficiary_history=BH.ESTABLISHED
    )
    assert "unusual_destination" not in a.factors
    assert "expected_counterparty" in a.factors
    assert 30 <= a.risk_score < 60  # a step-up, not a hold


# ── the mock must not borrow another communication's signals ─────────────────


def test_mock_returns_nothing_for_a_clean_communication():
    assert models_client._from_fixture("s06", "comm_1256") == []
    assert len(models_client._from_fixture("s06", "comm_1255")) == 1
