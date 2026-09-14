"""
PII redaction pass.

This module MUST run before any text is sent to a language model.
It is both a privacy control and an architectural claim:
  "On the phone, the classifier runs on-device. What leaves is the signal —
   coercive language detected, 0.82 — not your message."

Patterns are conservative (prefer false positives over false negatives).
"""

from __future__ import annotations

import re
import logging

logger = logging.getLogger(__name__)

# ── Redaction rules (order matters — most specific first) ─────────────────────
_RULES: list[tuple[str, str]] = [
    # 16-digit card numbers (with or without spaces/dashes)
    (r"\b(?:\d[ -]?){15}\d\b", "****-****-****-****"),
    # Indian mobile numbers
    (r"\b[6-9]\d{9}\b", "**********"),
    # Aadhaar (12 digits)
    (r"\b\d{4}\s?\d{4}\s?\d{4}\b", "xxxx xxxx xxxx"),
    # PAN card
    (r"\b[A-Z]{5}\d{4}[A-Z]\b", "XXXXX0000X"),
    # OTP / PIN (4–8 isolated digits)
    (r"(?<!\d)\b\d{4,8}\b(?!\d)", "****"),
    # Bank account numbers (9–18 digits)
    (r"\b\d{9,18}\b", "***"),
    # IFSC codes
    (r"\b[A-Z]{4}0[A-Z0-9]{6}\b", "XXXXXXX"),
    # Email addresses
    (r"\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b", "***@***.***"),
    # UPI IDs
    (r"\b[\w.+-]+@[a-zA-Z]+\b", "***@***"),
    # Generic proper names preceded by salutation (rough heuristic)
    (r"\b(?:Mr|Mrs|Ms|Dr|Sir)\.?\s+[A-Z][a-z]{2,}\b", "Mr. ***"),
]

_COMPILED: list[tuple[re.Pattern, str]] = [
    (re.compile(pattern), replacement)
    for pattern, replacement in _RULES
]


def redact(text: str) -> tuple[str, bool]:
    """
    Apply all redaction rules to *text*.

    Returns:
        (redacted_text, was_redacted)
        was_redacted is True if any substitution was made.
        Log this flag on every inference call for the audit trail.
    """
    result = text
    was_redacted = False

    for pattern, replacement in _COMPILED:
        new = pattern.sub(replacement, result)
        if new != result:
            was_redacted = True
            logger.debug("Redaction rule matched: %s", pattern.pattern)
        result = new

    if was_redacted:
        logger.info("PII redaction applied before LLM call")
    else:
        logger.debug("No PII detected — text passed through unchanged")

    return result, was_redacted
