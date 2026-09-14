"""Voice scoring endpoint — POST /model/voice/score"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.inference.fixtures import get_fixture_signals, get_demo_cache_signals
from app.inference.gemma_client import extract_signals_from_text
from app.models.request import VoiceScoreRequest
from app.models.signal import Signal, SignalBatch

logger = logging.getLogger(__name__)
router = APIRouter(tags=["voice"])


@router.post("/voice/score", response_model=SignalBatch)
async def score_voice(req: VoiceScoreRequest) -> SignalBatch:
    """
    Extract fraud signals from a voice communication.

    Phase 1–2: Accepts a pre-transcribed text via VoiceScoreRequest.transcript.
    Phase 3+:  Will accept raw audio bytes via /voice/score/upload.

    The transcript is routed through the same text extraction pipeline
    (redaction → Gemma → calibration → Signal[]).
    """
    settings = get_settings()

    # ── Demo cache ─────────────────────────────────────────────────────────────
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

    # ── Mock mode ──────────────────────────────────────────────────────────────
    if settings.MODELS_MOCK:
        signals = get_fixture_signals(req.source_ref)
        return SignalBatch(
            signals=signals,
            model_version=f"{settings.MODEL_VERSION}-MOCK",
            source_ref=req.source_ref,
            redaction_ran=True,
            latency_ms=0.0,
        )

    # ── Real inference (text transcript path for Phase 1–2) ───────────────────
    if not req.transcript:
        raise HTTPException(
            status_code=422,
            detail="transcript field is required for voice scoring in Phase 1–2. "
                   "Audio upload path is available at /model/voice/score/upload (Phase 3+).",
        )

    try:
        signals, redaction_ran, latency_ms = await extract_signals_from_text(
            text=req.transcript,
            source_ref=f"{req.source_ref}_chunk{req.chunk_index}",
        )
    except Exception as exc:
        logger.exception("Inference error on voice/score: %s", exc)
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    return SignalBatch(
        signals=signals,
        model_version=settings.MODEL_VERSION,
        source_ref=req.source_ref,
        redaction_ran=redaction_ran,
        latency_ms=latency_ms,
    )


@router.post("/voice/score/upload", response_model=SignalBatch)
async def score_voice_upload(
    source_ref: str = Form(...),
    chunk_index: int = Form(0),
    audio: UploadFile = File(...),
) -> SignalBatch:
    """
    Phase 3+ endpoint: accept raw audio bytes.
    Currently raises 501 until Gemma 3n audio path is confirmed working.
    """
    raise HTTPException(
        status_code=501,
        detail="Direct audio upload path not yet implemented (Phase 3). "
               "Use /model/voice/score with a transcript field.",
    )
