"""Client for the model service, with a fixture-backed mock.

MODELS_MOCK=true serves signals straight from contracts/fixtures/ and never touches :8000.
Keep that path working for the whole build - it is how the other lanes stay unblocked while the
models are still downloading, and it is the demo's fallback if anything dies on stage.

This module is also where rule 1 is enforced on the wire: a response carrying an action field is
rejected rather than parsed.
"""

from __future__ import annotations

import os

import httpx

import _contracts_path  # noqa: F401
from contracts import Signal, load_fixture

MODELS_URL = os.getenv("MODELS_URL", "http://localhost:8000")
TIMEOUT = float(os.getenv("MODELS_TIMEOUT_SECONDS", "12"))

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


def _parse(raw: list[dict]) -> list[Signal]:
    for item in raw:
        if leaked := FORBIDDEN & set(item):
            raise ContractViolation(
                f"Model service returned {sorted(leaked)}. Models emit evidence, never "
                f"decisions - only the policy gate produces an action (rule 1)."
            )
    # Pydantic's extra="forbid" is the second line of defence behind the check above.
    return [Signal(**item) for item in raw]


def score_text(source_ref: str, text: str, *, scenario: str | None = None) -> list[Signal]:
    """Score already-redacted text. Redaction happens before this is called (rule 6)."""
    if mock_enabled():
        return _from_fixture(scenario or "s01", source_ref)

    try:
        r = httpx.post(
            f"{MODELS_URL}/model/text/score",
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
    try:
        r = httpx.get(f"{MODELS_URL}/model/health", timeout=5)
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise ModelsUnavailable(str(e)) from e
    return r.json()
