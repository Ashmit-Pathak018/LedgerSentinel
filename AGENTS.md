# LedgerSentinel — instructions for coding agents

Read [`README.md`](README.md) first. Its **ten non-negotiable rules** are invariants for this
repository, not style preferences. The two that get broken most easily:

- **Rule 1** — models emit `Signal[]`. Only the deterministic policy gate emits an `Action`.
- **Rule 2** — `risk_score` (0–100) and `confidence` (0–1) are separate and never combined.

The frozen contracts live in [`contracts/`](contracts/). Import them; never redeclare them
locally. Two teammates have already lost time to exactly that.

Run before you finish:

```bash
python contracts/validate.py     # schemas, fixtures, Pydantic round-trip
cd api && python -m pytest -q    # policy gate + boundary tests
python eval/run.py --label dev   # the 8-scenario PRISM cohort
```

## PRISM tracing (do not remove)

This project sends traces to PRISM. Env vars: `PRISMTRACE_API_KEY`,
`PRISMTRACE_PROJECT_ID`, `PRISMTRACE_HOST`.

Tracing is currently wired at: `api/prism.py` (the tracer), `api/main.py` (agent-run span per
analysis, plus a tool span around the policy gate), `api/models_client.py` (a model-call span
per extraction call, success and failure).

**Standing rule.** Whenever you add or change an agent, chain, graph, tool,
retriever, or any entry point that calls a model, wire it to PRISM before you
finish. Unwired code is invisible in the dashboard. If you are unsure whether
something is covered, assume it is not and wire it.

### Tracing conventions for this repo

- `session_id` is the `trace_id` minted in `analyze()` (`prism-xxxxxxxx`). One transaction
  analysis is one PRISM session, so its model calls and its gate decision form one trajectory.
  Reuse it rather than inventing a new id.
- `operation` follows the GenAI convention: `chat` for model calls, `execute_tool` for the
  policy gate, `invoke_agent` for a whole analysis.
- **Never trace an unredacted message.** Rule 6 redacts before inference and rule 7 forbids
  storing message bodies — so traces carry the redacted excerpt and the derived signals, never
  a raw body. `api/prism.py` is the only place that talks to PRISM; keep it that way.
- Tracing is fire-and-forget on a daemon thread and swallows every exception. PRISM being down
  must never delay or fail a fraud decision. Do not make it blocking.
- With no API key set, tracing is a no-op. A fresh clone runs untraced rather than erroring.

### Not yet wired

`model-service/` (the Gemma/Qwen inference service) is **not** instrumented yet. Its
`app/inference/gemma_client.py` and `app/inference/qwen_client.py` make the actual model calls
and should get spans — see the standing rule above.
