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
    response = _get_client().chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=512,
    )
    latency_ms = (time.perf_counter() - t0) * 1000

    rationale = response.choices[0].message.content or ""

    # ── Sanity check: rationale must not contain action strings ───────────────
    forbidden = ["APPROVE", "HOLD", "ESCALATE", "VERIFY", "COOL_OFF",
                 "freeze", "block", "suspend"]
    flagged = [w for w in forbidden if w.lower() in rationale.lower()]
    if flagged:
        logger.warning(
            "Qwen rationale contains forbidden action words: %s. "
            "Stripping and logging — check the rationale prompt.",
            flagged,
        )
        # Soft failure: return rationale with a warning prefix rather than crashing
        rationale = f"[WARNING: rationale contained action words, review prompt] {rationale}"

    logger.info("Qwen rationale: %.0f ms, %d chars", latency_ms, len(rationale))
    return rationale, latency_ms
