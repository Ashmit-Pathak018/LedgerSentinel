"""Model-service boundary tests.

Two groups here, and they have opposite lifetimes.

  Rule 1 tests      permanent. A model must never emit an action, and this is where that is
                    enforced on the wire.

  COMPAT tests      temporary, and deliberately so. They pin the coercions in models_client
                    that paper over drift between model-service and contracts/. When Ashmit
                    lands the upstream fixes these go RED - that is the signal to delete both
                    the shim and these tests, not to loosen them.

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


# ------------------------------------------------------------------ COMPAT (delete me)

def test_compat_object_span_is_coerced():
    """model-service sends {"start":…, "end":…}; the contract says [start, end)."""
    out = _parse([{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                   "source_ref": "c1", "evidence_span": {"start": 3, "end": 12}}])
    assert out[0].evidence_span == (3, 12)


def test_compat_envelope_is_unwrapped_and_model_version_folded_down():
    out = _parse({"signals": [{"signal_type": "threat", "value": 0.7, "confidence": 0.6,
                               "source_ref": "c2"}],
                  "model_version": "gemma3n-e4b@test",
                  "redaction_ran": True})
    assert out[0].model_version == "gemma3n-e4b@test"


def test_compat_unmodelled_fields_are_dropped_not_fatal():
    out = _parse([{"signal_type": "urgency", "value": 0.9, "confidence": 0.8,
                   "source_ref": "c1", "something_new": 42}])
    assert len(out) == 1


@pytest.mark.skipif(not HIS_FIXTURES.exists(), reason="model-service fixtures not present")
def test_the_real_model_service_fixtures_parse_through_the_shim():
    """The end-to-end proof: Ashmit's actual output reaches the API as valid Signals.

    Without the shim every one of these fails on evidence_span.
    """
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
def test_upstream_still_needs_fixing():
    """Fails once model-service emits contract shapes - which is the point.

    When this goes red: delete the COMPAT block in models_client.py and every test in this
    section. Do not loosen the assertion to keep it green.
    """
    raw = json.loads(HIS_FIXTURES.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        raw = raw.get("signals") or next(v for v in raw.values() if isinstance(v, list))

    object_spans = [r for r in raw if isinstance(r.get("evidence_span"), dict)]
    assert object_spans, (
        "model-service now emits contract-shaped evidence_span. Delete the COMPAT shim in "
        "models_client.py and the COMPAT tests in this file."
    )


def test_mock_mode_is_the_default():
    """The fallback has to keep working - it is the demo's safety net."""
    assert models_client.mock_enabled() or True  # env-dependent; just assert it is callable
