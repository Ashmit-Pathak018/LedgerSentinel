"""Text/image scoring endpoint — POST /model/text/score"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.inference.fixtures import get_fixture_signals, get_demo_cache_signals
from app.inference.gemma_client import extract_signals_from_text
from app.models.request import TextScoreRequest
from app.models.signal import Signal, SignalBatch

logger = logging.getLogger(__name__)
router = APIRouter(tags=["text"])


@router.post("/text/score", response_model=SignalBatch)
async def score_text(req: TextScoreRequest) -> SignalBatch:
    """
    Extract fraud signals from a text communication.

    - Redaction runs before any LLM call (logged in response).
    - MODELS_MOCK=true returns fixture signals instantly.
    - DEMO_CACHE_MODE=true returns pre-cached signals for the demo.
    """
    settings = get_settings()
    t0 = time.perf_counter()

    # ── Demo cache (stage mode, zero latency) ─────────────────────────────────
    if settings.DEMO_CACHE_MODE:
        cached = get_demo_cache_signals(req.source_ref)
        if cached is not None:
            return SignalBatch(
                signals=cached,
                model_version=settings.MODEL_VERSION,
                source_ref=req.source_ref,
                redaction_ran=True,
                latency_ms=0.0,
            )

    # ── Mock mode (Yashraj never blocked) ─────────────────────────────────────
    if settings.MODELS_MOCK:
        signals = get_fixture_signals(req.source_ref)
        return SignalBatch(
            signals=signals,
            model_version=f"{settings.MODEL_VERSION}-MOCK",
            source_ref=req.source_ref,
            redaction_ran=True,
            latency_ms=0.0,
        )

    # ── Real inference ─────────────────────────────────────────────────────────
    try:
        signals, redaction_ran, latency_ms = await extract_signals_from_text(
            text=req.text,
            source_ref=req.source_ref,
            session_id=req.session_id,
        )
    except Exception as exc:
        logger.exception("Inference error on text/score: %s", exc)
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    return SignalBatch(
        signals=signals,
        model_version=settings.MODEL_VERSION,
        source_ref=req.source_ref,
        redaction_ran=redaction_ran,
        latency_ms=latency_ms,
    )
