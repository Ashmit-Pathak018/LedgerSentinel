"""
Qwen3-4B-Q8 inference client — fusion rationale synthesis.

Qwen receives the validated Signal[] array and returns a plain-English
paragraph for the analyst. It NEVER names an action.
"""

from __future__ import annotations

import logging
import time

from openai import OpenAI

from app.config import get_settings
from app.prompts.rationale import build_rationale_messages

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        _client = OpenAI(
            base_url=f"{settings.OLLAMA_BASE_URL}/v1",
            api_key="ollama",
        )
    return _client


import httpx

async def synthesise_rationale(
    signals: list[dict],
) -> tuple[str, float]:
    """
    Call Qwen3-4B-Q8 to synthesise a plain-English rationale paragraph.

    Args:
        signals: List of Signal dicts (model_dump() from validated Signal objects)

    Returns:
        (rationale_text, latency_ms)
    """
    settings = get_settings()
    messages = build_rationale_messages(signals)

    t0 = time.perf_counter()
    rationale = ""

    # 1. Primary path: native Ollama API with configurable thinking toggle
    try:
        payload = {
            "model": settings.QWEN_MODEL,
            "messages": messages,
            "stream": False,
            "think": settings.QWEN_THINKING,
            "options": {
                "temperature": 0.2,
                "num_predict": 300,
            },
        }
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            res = await http_client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            res.raise_for_status()
            data = res.json()
            msg = data.get("message", {})
            rationale = msg.get("content", "").strip()
    except Exception as primary_exc:
        logger.warning(
            "Primary Ollama native call for Qwen rationale failed (%s); trying fallback",
            primary_exc,
        )
        try:
            # Fallback to OpenAI-compatible endpoint
            response = _get_client().chat.completions.create(
                model=settings.QWEN_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=300,
            )
            rationale = (response.choices[0].message.content or "").strip()
        except Exception as fallback_exc:
            logger.error("Both Qwen rationale paths failed: %s", fallback_exc)
            # Extractive fallback if model is unreachable (preserves service continuity)
            if signals:
                claims = [f"{s.get('signal_type', 'signal')} (confidence: {s.get('confidence', 0.0):.2f})" for s in signals]
                rationale = f"Detected fraud indicators: {', '.join(claims)}. Evidence patterns suggest potential financial scam."
            else:
                rationale = "No fraud indicators detected in this communication."

    latency_ms = (time.perf_counter() - t0) * 1000

    # ── Sanity check: rationale must not contain action strings ───────────────
    forbidden = ["APPROVE", "HOLD", "ESCALATE", "VERIFY", "COOL_OFF",
                 "freeze", "block", "suspend"]
    flagged = [w for w in forbidden if w.lower() in rationale.lower()]
    if flagged:
        logger.warning(
            "Qwen rationale contains forbidden action words: %s. "
            "Redacting action words to uphold Rule 1.",
            flagged,
        )
        for act in ["APPROVE", "HOLD", "ESCALATE", "VERIFY", "COOL_OFF"]:
            rationale = rationale.replace(act, "[action-redacted]")

    logger.info("Qwen rationale: %.0f ms, %d chars", latency_ms, len(rationale))
    return rationale, latency_ms
