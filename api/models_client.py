"""Client for the model service, with a fixture-backed mock and a compatibility shim.

MODELS_MOCK=true serves signals straight from contracts/fixtures/ and never touches the model
service. Keep that path working for the whole build - it is how the other lanes stay unblocked,
and it is the demo's fallback if anything dies on stage.

Two jobs beyond fetching:

  Rule 1 on the wire.  A response carrying an action field is rejected, not parsed. Models emit
                       evidence; only the policy gate decides.

  Compatibility.       The model service currently emits a couple of shapes that differ from the
                       frozen contract. Rather than block integration, we normalise at this
                       boundary and log loudly. See COMPAT below - every one of those coercions
                       should be deleted once model-service is emitting contract shapes.
"""

from __future__ import annotations

import logging
import os

import httpx

import _contracts_path  # noqa: F401
from contracts import Signal, load_fixture

log = logging.getLogger("models_client")

# Defaults follow contracts/ENDPOINTS.md. Overridable so we can point at the model service
# wherever it currently listens without editing code.
MODELS_URL = os.getenv("MODELS_URL", "http://localhost:8000")
MODELS_PREFIX = os.getenv("MODELS_PREFIX", "/model")
TIMEOUT = float(os.getenv("MODELS_TIMEOUT_SECONDS", "120"))

# Fields a model service must never return. Rule 1.
FORBIDDEN = {"action", "recommendation", "decision", "recommended_action", "verdict"}


class ContractViolation(Exception):
    """The model service returned something only the policy gate may produce."""


class ModelsUnavailable(Exception):
    """The model service did not answer.

    Callers must treat this as degraded (rule 5) - lower confidence, move up the ladder.
    Never as a reason to approve.
    """


def mock_enabled() -> bool:
    return os.getenv("MODELS_MOCK", "true").lower() in {"1", "true", "yes"}


# --------------------------------------------------------------------------- COMPAT
#
# Temporary coercions for drift between model-service and contracts/. Each one is a bug
# upstream, not a feature here. tests/test_models_client.py asserts they still fire, so when
# Ashmit lands the fixes those tests go red and you delete the shim.

_warned: set[str] = set()


def _warn_once(key: str, msg: str) -> None:
    if key not in _warned:
        _warned.add(key)
        log.warning("COMPAT SHIM: %s", msg)


def _unwrap(body) -> tuple[list[dict], dict]:
    """Accept either a bare array (the contract) or an envelope (what the service sends).

    The envelope carries model_version, redaction_ran and latency_ms, which are genuinely
    useful - model_version satisfies rule 8 and redaction_ran evidences rule 6. It is a good
    idea that has not been agreed into the contract yet, so we read it without depending on it.
    """
    if isinstance(body, list):
        return body, {}
    if isinstance(body, dict) and isinstance(body.get("signals"), list):
        _warn_once(
            "envelope",
            "model service returned an envelope; the contract specifies a bare array. "
            "Worth adopting the envelope into contracts/ - it carries model_version and "
            "redaction_ran - but agree it with all three owners first.",
        )
        meta = {k: v for k, v in body.items() if k != "signals"}
        return body["signals"], meta
    raise ContractViolation(f"Unrecognised response shape: {type(body).__name__}")


def _normalise(item: dict, meta: dict) -> dict:
    """Coerce one raw signal into the frozen Signal shape."""
    item = dict(item)

    # evidence_span: the contract says [start, end); the service sends {"start":…, "end":…}.
    span = item.get("evidence_span")
    if isinstance(span, dict):
        _warn_once(
            "span",
            'evidence_span arrived as {"start":…, "end":…}; the contract specifies [start, end). '
            "Coercing. Fix in model-service so this shim can be deleted.",
        )
        if "start" in span and "end" in span:
            item["evidence_span"] = [span["start"], span["end"]]
        else:
            item["evidence_span"] = None

    # model_version lives on the envelope rather than each signal. Rule 8 wants it on the
    # record, so fold it down.
    if not item.get("model_version") and meta.get("model_version"):
        item["model_version"] = meta["model_version"]

    # Drop anything the contract does not define, so extra="forbid" does not reject an
    # otherwise-valid signal over a field we simply do not model yet.
    known = set(Signal.model_fields)
    for k in [k for k in item if k not in known]:
        _warn_once(f"extra:{k}", f"dropping unmodelled field {k!r} from signal")
        item.pop(k)

    return item


# ---------------------------------------------------------------------------


def _parse(body) -> list[Signal]:
    rows, meta = _unwrap(body)

    for item in rows:
        if leaked := FORBIDDEN & set(item):
            raise ContractViolation(
                f"Model service returned {sorted(leaked)}. Models emit evidence, never "
                f"decisions - only the policy gate produces an action (rule 1)."
            )

    # Pydantic's extra="forbid" is the second line of defence behind the check above.
    return [Signal(**_normalise(item, meta)) for item in rows]


def score_text(source_ref: str, text: str, *, scenario: str | None = None) -> list[Signal]:
    """Score already-redacted text. Redaction happens before this is called (rule 6)."""
    if mock_enabled():
        return _from_fixture(scenario or "s01", source_ref)

    try:
        r = httpx.post(
            f"{MODELS_URL}{MODELS_PREFIX}/text/score",
            json={"source_ref": source_ref, "text": text},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise ModelsUnavailable(str(e)) from e
    return _parse(r.json())


def _from_fixture(scenario: str, source_ref: str) -> list[Signal]:
    fx = load_fixture(scenario)
    sigs = [s for s in fx["signals"] if s["source_ref"] == source_ref]
    return _parse(sigs or fx["signals"])


def health() -> dict:
    if mock_enabled():
        return {"status": "mock", "extract_model": "fixtures", "p95_latency_ms": 0}

    # The service exposes /health at the root; the contract puts it under the prefix. Try both.
    last: Exception | None = None
    for path in (f"{MODELS_PREFIX}/health", "/health"):
        try:
            r = httpx.get(f"{MODELS_URL}{path}", timeout=5)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            last = e
    raise ModelsUnavailable(str(last))
