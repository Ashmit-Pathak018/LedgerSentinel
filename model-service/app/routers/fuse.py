"""Rationale synthesis endpoint — POST /model/fuse/rationale"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.inference.qwen_client import synthesise_rationale
from app.models.signal import Signal

logger = logging.getLogger(__name__)
router = APIRouter(tags=["fuse"])

_FORBIDDEN_ACTIONS = {"APPROVE", "VERIFY", "COOL_OFF", "HOLD", "ESCALATE"}


class RationaleRequest(BaseModel):
    """Request body for /fuse/rationale.

    Accepts a list of Signal dicts (or partial dicts for flexibility).
    The model service synthesises a plain-text narrative explaining why
    the signals suggest fraud — it never emits an action decision.
    """
    evidence: list[dict[str, Any]]
    source_ref: str = ""
    session_id: str | None = None


class RationaleResponse(BaseModel):
    rationale: str
    model_version: str
    latency_ms: float | None = None


@router.post("/fuse/rationale", response_model=RationaleResponse)
async def fuse_rationale(req: RationaleRequest) -> RationaleResponse:
    """
    Synthesise a plain-text fraud rationale from a list of signals.

    The Qwen model analyses the signals and produces a narrative that can
    be surfaced to human reviewers.  It NEVER emits an action string —
    that is strictly the domain of Yashraj's deterministic policy gate.
    """
    settings = get_settings()

    # ── Mock / fixture mode ────────────────────────────────────────────────────
    if settings.MODELS_MOCK:
        return RationaleResponse(
            rationale=(
                "Multiple fraud indicators detected: authority impersonation combined with "
                "urgency and payment redirection are consistent with a coercive financial scam. "
                "Human review is advised."
            ),
            model_version=f"{settings.MODEL_VERSION}-MOCK",
            latency_ms=0.0,
        )

    # ── Coerce evidence dicts to Signal objects where possible ─────────────────
    signals: list[Signal] = []
    for item in req.evidence:
        try:
            signals.append(Signal(**item))
        except Exception:
            # Partial evidence items (claim/confidence only) are tolerated
            pass

    if not signals and not req.evidence:
        raise HTTPException(status_code=422, detail="evidence list is empty.")

    try:
        # synthesise_rationale accepts Signal[] — pass empty list if coercion failed
        # but evidence dicts were provided (Qwen will see an empty signal list)
        rationale_text, latency_ms = await synthesise_rationale(
            signals, session_id=req.session_id or req.source_ref or None
        )
    except Exception as exc:
        logger.exception("Qwen rationale synthesis error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Rationale synthesis error: {exc}")

    # Hard invariant: rationale must not contain action words
    for action in _FORBIDDEN_ACTIONS:
        if action in rationale_text:
            logger.warning(
                "Rationale contained action word '%s'; stripping from output.", action
            )
            rationale_text = rationale_text.replace(action, "[action-redacted]")

    return RationaleResponse(
        rationale=rationale_text,
        model_version=settings.MODEL_VERSION,
        latency_ms=round(latency_ms, 2),
    )
