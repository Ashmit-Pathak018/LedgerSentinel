"""LedgerSentinel model service - :8000

    uvicorn main:app --reload --port 8000

Returns Signal[] and nothing else. There is no endpoint here that returns an action, and there
must never be one: models describe evidence, the policy gate decides (rule 1).

Runs as its own process so that reloading api/ does not reload the models - Gemma takes 10-30s
to warm up and you will restart api/ a hundred times today.
"""

from __future__ import annotations

import os
import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import _contracts_path  # noqa: F401
from contracts import Signal, load_fixture

import calibrate
import extract

app = FastAPI(title="LedgerSentinel Models", version="0.1.0")

FIXTURES_ONLY = os.getenv("FIXTURES_ONLY", "false").lower() in {"1", "true", "yes"}
_latencies: list[float] = []


class TextRequest(BaseModel):
    source_ref: str
    text: str
    locale: str = "en-IN"


class ImageRequest(BaseModel):
    source_ref: str
    image_b64: str
    caption: str = ""


class RationaleRequest(BaseModel):
    evidence: list[dict] = Field(default_factory=list)


@app.get("/model/health")
def health() -> dict:
    return {
        "status": "ok",
        "extract_model": extract.EXTRACT_MODEL,
        "model_version": extract.MODEL_VERSION,
        "calibration_version": calibrate.version(),
        "calibrated": calibrate.is_fitted(),
        "fixtures_only": FIXTURES_ONLY,
        "p95_latency_ms": _p95(),
    }


@app.post("/model/text/score")
def score_text(req: TextRequest) -> list[Signal]:
    if FIXTURES_ONLY:
        return _fixture_signals(req.source_ref)
    t0 = time.perf_counter()
    try:
        signals = extract.score_text(req.source_ref, req.text)
    except extract.ExtractionError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    _record(t0)
    return signals


@app.post("/model/image/score")
def score_image(req: ImageRequest) -> list[Signal]:
    if FIXTURES_ONLY:
        return _fixture_signals(req.source_ref)
    t0 = time.perf_counter()
    try:
        signals = extract.score_image(req.source_ref, req.image_b64, req.caption)
    except extract.ExtractionError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    _record(t0)
    return signals


@app.post("/model/voice/score")
def score_voice() -> list[Signal]:
    raise HTTPException(
        status_code=501,
        detail="Voice path lands in Phase 3. Use /model/text/score on a transcript until then.",
    )


def _fixture_signals(source_ref: str) -> list[Signal]:
    fx = load_fixture("s01")
    rows = [s for s in fx["signals"] if s["source_ref"] == source_ref] or fx["signals"]
    return [Signal(**r) for r in rows]


def _record(t0: float) -> None:
    _latencies.append((time.perf_counter() - t0) * 1000)
    del _latencies[:-200]


def _p95() -> int:
    if not _latencies:
        return 0
    ordered = sorted(_latencies)
    return int(ordered[min(int(len(ordered) * 0.95), len(ordered) - 1)])
