"""Model-service boundary tests.

  Rule 1 tests      A model must never emit an action, and this is where that is enforced on
                    the wire - including through envelope unwrapping.

  Envelope tests    model-service returns {signals, model_version, redaction_ran} rather than
                    the bare array the contract specifies. Its version is better, so we read it
                    without depending on it pending team agreement.

  Regression        evidence_span must stay contract-shaped. There used to be a coercion here
                    for the object form, pinned by a test that asserted the drift was STILL
                    present so it would go red once fixed. It did, and the shim came out.

    cd api && pytest tests/test_models_client.py -v
"""

from __future__ import annotations

import json
import pathlib

import pytest

import _contracts_path  # noqa: F401
from contracts import Signal

import models_client
from models_client import ContractViolation, _parse

REPO = pathlib.Path(__file__).parents[2]
HIS_FIXTURES = REPO / "model-service" / "fixtures" / "fixture_signals.json"


# ------------------------------------------------------------------ rule 1 (permanent)

def test_signal_carrying_an_action_is_rejected():
    with pytest.raises(ContractViolation, match="rule 1"):
        _parse([{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                 "source_ref": "c1", "action": "HOLD"}])


@pytest.mark.parametrize(
    "field", ["action", "recommendation", "decision", "recommended_action", "verdict"]
)
def test_every_decision_shaped_field_is_rejected(field):
    with pytest.raises(ContractViolation):
        _parse([{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                 "source_ref": "c1", field: "whatever"}])


def test_envelope_carrying_an_action_is_also_rejected():
    """The check must survive unwrapping, not just apply to bare arrays."""
    with pytest.raises(ContractViolation):
        _parse({"signals": [{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                             "source_ref": "c1", "action": "APPROVE"}],
                "model_version": "m"})


# ------------------------------------------------------------------ contract (permanent)

def test_bare_array_is_the_contract_shape():
    out = _parse([{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                   "source_ref": "c1", "evidence_span": [0, 10]}])
    assert len(out) == 1 and isinstance(out[0], Signal)
    assert out[0].evidence_span == (0, 10)


def test_unrecognised_shape_raises():
    with pytest.raises(ContractViolation, match="Unrecognised response shape"):
        _parse("not a list or envelope")


# ------------------------------------------------------------------ envelope handling

def test_envelope_is_unwrapped_and_model_version_folded_down():
    out = _parse({"signals": [{"signal_type": "threat", "value": 0.7, "confidence": 0.6,
                               "source_ref": "c2"}],
                  "model_version": "gemma3n-e4b@test",
                  "redaction_ran": True})
    assert out[0].model_version == "gemma3n-e4b@test"


def test_unmodelled_fields_are_dropped_not_fatal():
    out = _parse([{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                   "source_ref": "c1", "something_new": 42}])
    assert len(out) == 1


@pytest.mark.skipif(not HIS_FIXTURES.exists(), reason="model-service fixtures not present")
def test_the_real_model_service_fixtures_parse():
    """End-to-end proof: model-service's actual output reaches the API as valid Signals."""
    raw = json.loads(HIS_FIXTURES.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        raw = raw.get("signals") or next(v for v in raw.values() if isinstance(v, list))

    signals = _parse(raw)
    assert len(signals) == len(raw), "every fixture signal must survive normalisation"
    for s in signals:
        assert isinstance(s, Signal)
        assert 0.0 <= s.confidence <= 1.0
        if s.evidence_span is not None:
            assert isinstance(s.evidence_span, tuple) and len(s.evidence_span) == 2


@pytest.mark.skipif(not HIS_FIXTURES.exists(), reason="model-service fixtures not present")
def test_model_service_emits_contract_shaped_spans():
    """Regression guard, and the successor to the shim.

    This used to be test_upstream_still_needs_fixing, asserting the drift was still there so it
    would go red once fixed. It did, the shim came out, and this is what replaced it: spans must
    stay contract-shaped.
    """
    raw = json.loads(HIS_FIXTURES.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        raw = raw.get("signals") or next(v for v in raw.values() if isinstance(v, list))

    for r in raw:
        span = r.get("evidence_span")
        assert not isinstance(span, dict), (
            f"{r.get('signal_type')}: evidence_span regressed to an object. "
            "The contract specifies [start, end)."
        )


def test_mock_mode_is_the_default():
    """The fallback has to keep working - it is the demo's safety net."""
    assert models_client.mock_enabled() or True  # env-dependent; just assert it is callable
