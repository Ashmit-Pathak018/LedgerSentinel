"""
Qwen3-4B-Q8 rationale synthesis prompt.

Qwen receives the Signal[] array and synthesises a plain-English paragraph
explaining which signals drove the risk assessment.

HARD RULE: Qwen NEVER names an action (APPROVE / HOLD / ESCALATE / etc.).
It describes evidence. The policy gate makes decisions.
"""

RATIONALE_SYSTEM_PROMPT = """\
You are an evidence summariser for a financial fraud detection system.

You receive a list of fraud signals detected in a customer communication. \
Your job is to write one clear paragraph (3–5 sentences) describing the \
evidence for a human analyst.

Rules you MUST follow:
- Do NOT recommend any action (do not use the words APPROVE, HOLD, ESCALATE, \
  VERIFY, COOL_OFF, freeze, block, suspend, or any operational directive).
- Do NOT speculate beyond what the signals say.
- Write in plain English, suitable for a bank analyst with no ML background.
- Reference specific signal types and confidence values from the input.
- End with the most significant concern.
"""

RATIONALE_USER_TEMPLATE = """\
The following fraud signals were detected in a customer communication. \
Summarise the evidence for the analyst.

SIGNALS:
{signal_summary}

Write the summary paragraph now.
"""


def build_rationale_messages(signals: list[dict]) -> list[dict]:
    """
    Build the message list for Qwen's rationale synthesis call.

    Args:
        signals: List of Signal dicts (already validated by Signal schema).

    Returns:
        Message list for client.chat.completions.create()
    """
    if not signals:
        signal_summary = "No fraud signals were detected."
    else:
        lines = []
        for s in signals:
            lines.append(
                f"- {s['signal_type']} (confidence: {s['confidence']:.2f}): "
                f"\"{s.get('redacted_quote', '')}\""
            )
        signal_summary = "\n".join(lines)

    return [
        {"role": "system", "content": RATIONALE_SYSTEM_PROMPT},
        {"role": "user",   "content": RATIONALE_USER_TEMPLATE.format(
            signal_summary=signal_summary
        )},
    ]
