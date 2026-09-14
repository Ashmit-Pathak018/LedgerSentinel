"""
Extraction prompt templates for Gemma 3n E4B.

The extraction prompt is the core of the model service.
Key invariants (enforced by the prompt, validated by Signal schema):
  - Eight labels, multi-label scoring (not binary scam/not-scam)
  - Per-label raw score 0.0–1.0
  - One redacted quoted span per signal (max 25 words)
  - NEVER asks the model to recommend an action
  - Output is a JSON array only — no prose
"""

# ── Eight frozen fraud signal labels (match SignalType in signal.py exactly) ──
EIGHT_LABELS = [
    "urgency",
    "authority_impersonation",
    "secrecy_request",
    "remote_access_request",
    "payment_redirect",
    "otp_request",
    "threat",
    "investment_lure",
]

LABEL_DESCRIPTIONS = {
    "urgency":                  "pressure to act immediately, time limits, countdown language, 'act now or lose everything'",
    "authority_impersonation":  "claiming to be a bank, police, RBI, government body, or any official institution",
    "secrecy_request":          "asking the target not to tell family, bank staff, or authorities about this interaction",
    "remote_access_request":    "asking to install software, share screen, hand over device, or provide remote access",
    "payment_redirect":         "instructions to transfer money to a new, unexpected, or 'safe' account",
    "otp_request":              "asking for one-time passwords, PINs, CVV, or any authentication credentials",
    "threat":                   "threats of arrest, legal action, account suspension, asset seizure, or physical harm",
    "investment_lure":          "promises of guaranteed returns, exclusive investment opportunities, prizes, or windfall gains",
}

# ── System prompt (sent as the system role message) ───────────────────────────
SYSTEM_PROMPT = """\
You are a financial fraud signal extractor. Your only job is to identify \
fraud signals in a communication and return them as a JSON array.

You NEVER recommend what action to take. You NEVER output the words APPROVE, \
VERIFY, HOLD, ESCALATE, or COOL_OFF. You extract signals only.

Output format: a valid JSON array (no markdown, no code fences, no prose). \
If no signals are detected, return an empty array: []
"""

# ── User prompt template ───────────────────────────────────────────────────────
# {label_block}  → rendered from build_label_block()
# {source_ref}   → caller-provided identifier
# {text}         → redacted communication text
EXTRACTION_PROMPT_TEMPLATE = """\
Analyse the following communication and extract fraud signals.

For each of the eight signal types below, assign a score from 0.0 to 1.0 \
indicating how strongly that signal is present. Only include signals with \
score > 0.10.

SIGNAL TYPES:
{label_block}

For each detected signal, return one JSON object:
{{
  "signal_type": "<type from list above>",
  "value": <score 0.0–1.0, two decimal places>,
  "confidence": <same as value — raw model confidence before calibration>,
  "source_ref": "{source_ref}",
  "evidence_span": [<char_start>, <char_end>],
  "redacted_quote": "<direct quote, max 25 words, replace any PII with ***>"
}}

Rules:
- Return ONLY a JSON array. No explanation, no prose, no markdown.
- redacted_quote must be a verbatim excerpt from the text below, with PII masked.
- char_start and char_end are byte offsets into the INPUT TEXT below (0-indexed).
- If a signal type is not present, omit it entirely.
- Do NOT invent quotes. If you cannot find a verbatim span, set evidence_span \
to {{"start": 0, "end": 0}} and redacted_quote to "".

SOURCE_REF: {source_ref}

INPUT TEXT:
{text}
"""


def build_label_block() -> str:
    """Render the eight-label description block for the prompt."""
    lines = []
    for label in EIGHT_LABELS:
        lines.append(f"- {label}: {LABEL_DESCRIPTIONS[label]}")
    return "\n".join(lines)


def build_extraction_messages(text: str, source_ref: str) -> list[dict]:
    """
    Build the message list for the Ollama/OpenAI chat completion call.

    Args:
        text:       Redacted communication text (PII already stripped).
        source_ref: Identifier for the source message/recording.

    Returns:
        List of message dicts ready for client.chat.completions.create()
    """
    user_content = EXTRACTION_PROMPT_TEMPLATE.format(
        label_block=build_label_block(),
        source_ref=source_ref,
        text=text,
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_content},
    ]
