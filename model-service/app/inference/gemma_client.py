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
from app.inference import prism
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


def _parse_signal_json(raw: str, source_text: str = "") -> list[dict[str, Any]]:
    """
    Robustly parse Gemma's JSON output.
    Handles:
      - Clean JSON array
      - JSON wrapped in markdown code fences
      - Partial arrays (truncated at token limit)
      - Text provenance matching for quotes and messy evidence_span formats
    """
    raw_clean = raw.strip()
    # Clean SentencePiece tokens like   (\u2581) which Gemma 3n emits into whitespace
    raw_clean = raw_clean.replace("\u2581", " ")

    # Strip markdown code fences if present
    raw_clean = re.sub(r"^```(?:json)?\s*", "", raw_clean)
    raw_clean = re.sub(r"\s*```$", "", raw_clean)
    raw_clean = raw_clean.strip()

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

            # Quote normalization
            if "quote" in item and "redacted_quote" not in item:
                item["redacted_quote"] = item["quote"]
            raw_quote = item.get("redacted_quote") or item.get("quote") or ""
            quote = str(raw_quote).replace("\u2581", " ").strip()
            if quote:
                item["redacted_quote"] = quote

            # Robust evidence_span handling
            span_resolved = False
            raw_span = item.get("evidence_span")

            # 1. If quote is in source text, derive exact text span for genuine provenance
            if source_text and quote and quote in source_text:
                start = source_text.index(quote)
                item["evidence_span"] = {"start": start, "end": start + len(quote)}
                span_resolved = True

            # 2. Try parsing list/tuple
            if not span_resolved and isinstance(raw_span, (list, tuple)):
                if len(raw_span) == 1 and isinstance(raw_span[0], str) and "," in raw_span[0]:
                    parts = [p.strip() for p in raw_span[0].split(",") if p.strip()]
                    if len(parts) >= 2:
                        raw_span = parts[:2]
                if len(raw_span) >= 2:
                    try:
                        s = int(str(raw_span[0]).strip())
                        e = int(str(raw_span[1]).strip())
                        item["evidence_span"] = {"start": s, "end": e}
                        span_resolved = True
                    except (ValueError, TypeError):
                        pass

            # 3. Try parsing dict with start and end
            if not span_resolved and isinstance(raw_span, dict) and "start" in raw_span and "end" in raw_span:
                try:
                    s_val = str(raw_span["start"]).split(",")[0].strip()
                    e_val = str(raw_span["end"]).split(",")[-1].strip()
                    item["evidence_span"] = {"start": int(s_val), "end": int(e_val)}
                    span_resolved = True
                except (ValueError, TypeError):
                    pass

            if not span_resolved:
                item["evidence_span"] = None

            cleaned.append(item)
        return cleaned

    # Attempt direct parse
    try:
        result = json.loads(raw_clean)
        if isinstance(result, list):
            return _normalize_signal_dicts(result)
        if isinstance(result, dict):
            # Sometimes the model wraps in {"signals": [...]}
            return _normalize_signal_dicts(result.get("signals", [result]))
    except json.JSONDecodeError:
        pass

    # Attempt to extract the first complete JSON array with regex
    match = re.search(r"\[.*\]", raw_clean, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return _normalize_signal_dicts(parsed)
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse Gemma output as JSON array. Raw: %s", raw_clean[:200])
    return []


async def extract_signals_from_text(
    text: str,
    source_ref: str,
    session_id: str | None = None,
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
    try:
        response = _get_client().chat.completions.create(
            model=settings.GEMMA_MODEL,
            messages=messages,
            temperature=0.1,       # Low temp for deterministic structured output
            max_tokens=2048,
        )
    except Exception as exc:
        prism.trace(
            session_id=session_id or source_ref,
            model=settings.GEMMA_MODEL,
            input_summary="Classify this redacted intercepted communication for scam-intent signals: "
                          f"<communication>{redacted_text[:400]}</communication>",
            output_summary="Gemma extraction failed; no signals produced.",
            latency_ms=(time.perf_counter() - t0) * 1000,
            operation="execute_tool",
            agent_name="gemma_signal_extractor",
            error=str(exc),
            metadata={"source_ref": source_ref, "degraded": True},
        )
        raise
    latency_ms = (time.perf_counter() - t0) * 1000

    raw_output = response.choices[0].message.content or ""
    raw_signals = _parse_signal_json(raw_output, source_text=redacted_text)

    logger.info(
        "Gemma extraction: %d raw signals, %.0f ms, redaction=%s",
        len(raw_signals), latency_ms, redaction_ran,
    )

    # ── Apply Platt calibration ────────────────────────────────────────────────
    calibrated_dicts = apply_calibration(raw_signals)

    # ── Parse into validated Signal objects ───────────────────────────────────
    # NOTE: Gemma frequently omits source_ref from individual signal objects
    # even though the prompt instructs it. We inject it as a fallback here so
    # signals are never silently dropped due to this missing required field.
    signals: list[Signal] = []
    for s in calibrated_dicts:
        try:
            # Ensure source_ref is present (Gemma may omit it)
            if "source_ref" not in s or not s["source_ref"]:
                s = {**s, "source_ref": source_ref}
            signals.append(Signal(**s))
        except Exception as exc:
            logger.warning("Dropping malformed signal: %s — %s", s, exc)

    prism.trace(
        session_id=session_id or source_ref,
        model=settings.GEMMA_MODEL,
        input_summary="Classify this redacted intercepted communication for scam-intent signals: "
                      f"<communication>{redacted_text[:400]}</communication>",
        output_summary=(
            f"Detected {len(signals)} scam-intent signal(s): "
            + ", ".join(
                f"{getattr(s.signal_type, 'value', s.signal_type)} ({s.confidence:.2f})"
                for s in signals
            )
        ),
        latency_ms=latency_ms,
        operation="execute_tool",
        agent_name="gemma_signal_extractor",
        metadata={"source_ref": source_ref, "signal_count": len(signals), "redaction_ran": redaction_ran},
    )
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
