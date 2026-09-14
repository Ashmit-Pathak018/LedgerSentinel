"""
Gemma 3n E4B inference client.

Calls Ollama's OpenAI-compatible endpoint.
Handles:
  - JSON parsing of structured output (with fallback for partial output)
  - Calibration application
  - PII redaction (always runs before the LLM call)
  - MODELS_MOCK bypass
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from openai import OpenAI

from app.config import get_settings
from app.inference.redaction import redact
from app.inference.calibration import apply_calibration
from app.models.signal import Signal
from app.prompts.extraction import build_extraction_messages

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        _client = OpenAI(
            base_url=f"{settings.OLLAMA_BASE_URL}/v1",
            api_key="ollama",  # Ollama ignores the key but the client requires it
        )
    return _client


def _parse_signal_json(raw: str) -> list[dict[str, Any]]:
    """
    Robustly parse Gemma's JSON output.
    Handles:
      - Clean JSON array
      - JSON wrapped in markdown code fences
      - Partial arrays (truncated at token limit)
    """
    text = raw.strip()
    # Clean SentencePiece tokens like   (\u2581) which Gemma 3n emits into whitespace
    text = text.replace("\u2581", " ")

    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    def _normalize_signal_dicts(items: list) -> list[dict[str, Any]]:
        cleaned = []
        for item in items:
            if not isinstance(item, dict):
                continue
            # Convert string numbers to float/int if needed
            if "value" in item and isinstance(item["value"], str):
                try:
                    item["value"] = float(item["value"])
                except ValueError:
                    pass
            if "confidence" in item and isinstance(item["confidence"], str):
                try:
                    item["confidence"] = float(item["confidence"])
                except ValueError:
                    pass
            raw_span = item.get("evidence_span")
            if isinstance(raw_span, (list, tuple)) and len(raw_span) == 2:
                # The contract shape. Normalise to the internal object.
                item["evidence_span"] = {"start": raw_span[0], "end": raw_span[1]}
            if "evidence_span" in item and isinstance(item["evidence_span"], dict):
                span = item["evidence_span"]
                for k in ["start", "end"]:
                    if k in span and isinstance(span[k], str):
                        try:
                            span[k] = int(span[k])
                        except ValueError:
                            pass
            cleaned.append(item)
        return cleaned

    # Attempt direct parse
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return _normalize_signal_dicts(result)
        if isinstance(result, dict):
            # Sometimes the model wraps in {"signals": [...]}
            return _normalize_signal_dicts(result.get("signals", [result]))
    except json.JSONDecodeError:
        pass

    # Attempt to extract the first complete JSON array with regex
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return _normalize_signal_dicts(parsed)
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse Gemma output as JSON array. Raw: %s", text[:200])
    return []


async def extract_signals_from_text(
    text: str,
    source_ref: str,
) -> tuple[list[Signal], bool, float]:
    """
    Run Gemma 3n E4B on redacted text, apply calibration, return signals.

    Returns:
        (signals, redaction_ran, latency_ms)
    """
    settings = get_settings()

    # ── Redact before ANY LLM call ─────────────────────────────────────────────
    redacted_text, redaction_ran = redact(text)

    messages = build_extraction_messages(redacted_text, source_ref)

    t0 = time.perf_counter()
    response = _get_client().chat.completions.create(
        model=settings.GEMMA_MODEL,
        messages=messages,
        temperature=0.1,       # Low temp for deterministic structured output
        max_tokens=2048,
    )
    latency_ms = (time.perf_counter() - t0) * 1000

    raw_output = response.choices[0].message.content or ""
    raw_signals = _parse_signal_json(raw_output)

    logger.info(
        "Gemma extraction: %d raw signals, %.0f ms, redaction=%s",
        len(raw_signals), latency_ms, redaction_ran,
    )

    # ── Apply Platt calibration ────────────────────────────────────────────────
    calibrated_dicts = apply_calibration(raw_signals)

    # ── Parse into validated Signal objects ───────────────────────────────────
    signals: list[Signal] = []
    for s in calibrated_dicts:
        try:
            signals.append(Signal(**s))
        except Exception as exc:
            logger.warning("Dropping malformed signal: %s — %s", s, exc)

    return signals, redaction_ran, latency_ms


async def extract_signals_from_audio(
    audio_bytes: bytes,
    source_ref: str,
    chunk_index: int = 0,
) -> tuple[list[Signal], bool, float]:
    """
    Run Gemma 3n E4B on audio input (multimodal).

    NOTE: Ollama's multimodal audio support for Gemma 3n is still maturing.
    If audio input fails, this falls back to requesting a text transcript
    from the caller and running the text path.

    Returns:
        (signals, redaction_ran, latency_ms)
    """
    # TODO (Phase 3): Implement direct audio multimodal path once
    # Ollama stable audio support for gemma3n:e4b is confirmed.
    # For Phase 1–2: the voice endpoint accepts a transcript field and
    # routes through extract_signals_from_text.
    raise NotImplementedError(
        "Direct audio path not yet implemented. "
        "Use VoiceScoreRequest.transcript for Phase 1–2."
    )
