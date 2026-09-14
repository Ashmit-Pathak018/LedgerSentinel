"""
LedgerSentinel Model Service
============================

FastAPI wrapper around Gemma 3n E4B and Qwen3-4B-Q8.
Models emit Signal[] objects with calibrated confidences.
They NEVER emit action strings — only the policy gate does that.
"""

from __future__ import annotations

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import text, voice

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="LedgerSentinel Model Service",
    description=(
        "Fraud signal extraction via Gemma 3n E4B (multimodal) "
        "and rationale synthesis via Qwen3-4B-Q8. "
        "Emits Signal[] — never actions."
    ),
    version="1.0.0",
)

# CORS — Yash's React frontend needs this during dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(text.router,  prefix="/model")
app.include_router(voice.router, prefix="/model")


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "model_version": settings.MODEL_VERSION,
        "models_mock": settings.MODELS_MOCK,
        "demo_cache_mode": settings.DEMO_CACHE_MODE,
    }


@app.on_event("startup")
async def startup():
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("LedgerSentinel Model Service starting")
    logger.info("  MODEL_VERSION    = %s", settings.MODEL_VERSION)
    logger.info("  MODELS_MOCK      = %s", settings.MODELS_MOCK)
    logger.info("  DEMO_CACHE_MODE  = %s", settings.DEMO_CACHE_MODE)
    logger.info("  OLLAMA_BASE_URL  = %s", settings.OLLAMA_BASE_URL)
    logger.info("  GEMMA_MODEL      = %s", settings.GEMMA_MODEL)
    logger.info("  QWEN_MODEL       = %s", settings.QWEN_MODEL)
    logger.info("=" * 60)
