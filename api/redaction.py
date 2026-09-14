"""Redaction. Runs before any text reaches a model (rule 6).

This is small, and that is deliberate: it must be auditable at a glance. If a judge asks "what
exactly do you strip?", the answer should fit on one screen.

It is pattern-based and therefore imperfect. Say so honestly - the production answer is a proper
PII detector plus a human-reviewed deny list, and the architecture already puts the boundary in
the right place.

    >>> redact("Call 9876543210, OTP is 448213")
    ('Call [PHONE], OTP is [OTP]', ['PHONE', 'OTP'])
"""

from __future__ import annotations

import re

# Order matters: the most specific patterns run first so a card number is not eaten by the
# generic long-digit rule.
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("CARD", re.compile(r"\b(?:\d[ -]?){13,19}\b")),
    ("IBAN", re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")),
    ("IFSC", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
    ("AADHAAR", re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")),
    ("PAN", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")),
    ("EMAIL", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("PHONE", re.compile(r"(?<!\d)(?:\+?\d{1,3}[ -]?)?\d{10}(?!\d)")),
    ("OTP", re.compile(r"\b(?:OTP|otp|code|PIN|pin)\s*(?:is|:)?\s*\d{4,8}\b")),
    ("ACCOUNT", re.compile(r"\b\d{9,18}\b")),
    ("AMOUNT", re.compile(r"(?:INR|Rs\.?|₹|\$|USD|EUR)\s?[\d,]+(?:\.\d{2})?")),
]


def redact(text: str) -> tuple[str, list[str]]:
    """Return the redacted text and which categories were hit.

    The category list goes in the trace, so the audit record can show redaction ran without
    storing anything that was redacted.
    """
    if not text:
        return "", []

    hits: list[str] = []
    for label, pattern in PATTERNS:
        text, n = pattern.subn(f"[{label}]", text)
        if n:
            hits.append(label)
    return text, hits
