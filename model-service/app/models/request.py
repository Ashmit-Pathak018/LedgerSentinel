"""Request schemas for model service endpoints."""

from pydantic import BaseModel


class TextScoreRequest(BaseModel):
    """
    Input for POST /model/text/score

    text       — the raw communication body (SMS, email, chat message).
                 PII redaction is applied server-side before any LLM call.
    source_ref — identifier that traces back to the original message record
                 (e.g. Supabase row ID). Passed through into every Signal.
    session_id — optional PRISM trajectory identifier from the API.
    """
    text: str
    source_ref: str
    session_id: str | None = None


class VoiceScoreRequest(BaseModel):
    """
    Input for POST /model/voice/score (JSON variant for testing).
    The production endpoint also accepts multipart audio upload.

    transcript — optional pre-transcribed text (for fallback / testing).
    source_ref — call recording identifier.
    chunk_index — sliding-window chunk number (0-based).
    """
    transcript: str | None = None
    source_ref: str
    chunk_index: int = 0
    session_id: str | None = None


class ImageScoreRequest(BaseModel):
    """
    Input for POST /model/image/score (JSON variant).
    Production endpoint accepts multipart image upload.

    source_ref — screenshot / attachment identifier.
    """
    source_ref: str
