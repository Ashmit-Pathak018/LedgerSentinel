# LedgerSentinel — instructions for coding agents

Read [`README.md`](README.md) first. Its **ten non-negotiable rules** are invariants for this
repository, not style preferences. The two that get broken most easily:

- **Rule 1** — models emit `Signal[]`. Only the deterministic policy gate emits an `Action`.
- **Rule 2** — `risk_score` (0–100) and `confidence` (0–1) are separate and never combined.

The frozen contracts live in [`contracts/`](contracts/). Import them; never redeclare them
locally. Two teammates have already lost time to exactly that.

Run before you finish:

```bash
python contracts/validate.py            # schemas, fixtures, Pydantic round-trip
cd api && python -m pytest -q           # policy gate, fusion + boundary tests
python eval/run.py --label dev          # the 8-scenario PRISM cohort, in-process
python eval/run.py --live --label dev   # the SAME cohort through the running API
```

**Calibration is measured on the holdout, not the cohort.** `eval/evaluators.py` fits Platt
leave-one-out over `model-service/data/processed/holdout.jsonl` using the service's own
`fit_one()`. If you change the extractor model or the holdout, refit the shipped scaler
(`cd model-service && python calibration/fit_platt.py`) - `calibration/scaler.meta.json` records
which model it belongs to. A scaler fit on one model's raw scores is wrong for another (rule 8).

**Run the cohort both ways.** In-process feeds the gate the fixture's hand-authored assessment
and only proves the gate. `--live` is the path the dashboard and the demo actually use - it
recomputes the assessment from signals and account facts through `api/advisory.py` and
`api/fusion.py`. `v1.json` and `v2.json` were both in-process; the live path was first
measured in `v3-live.json`, where it disagreed with the gate on 5 of 8 scenarios, because the
request was dropping beneficiary history and had no advisory lookup at all. Nobody noticed for
weeks because nobody ran it. If the two runs disagree, the live one is the bug.

## PRISM tracing (do not remove)

This project sends traces to PRISM. Env vars: `PRISMTRACE_API_KEY`,
`PRISMTRACE_PROJECT_ID`, `PRISMTRACE_HOST`.

Tracing is currently wired at: `api/prism.py` (the tracer), `api/main.py` (agent-run span per
analysis, plus a tool span around the policy gate), `api/models_client.py` (a model-call span
per extraction call, success and failure).

Reading back: `prism.read_summary()` behind `GET /v1/observability/prism`, which the console's
PRISM Observability screen uses (`web/src/views/PrismObservabilityView.tsx`). The key stays in
`api/.env`; the browser only ever sees the proxied summary. `GET /v1/eval/runs` serves the
saved cohort runs so the screen can show V1 → current next to the live numbers.

**Standing rule.** Whenever you add or change an agent, chain, graph, tool,
retriever, or any entry point that calls a model, wire it to PRISM before you
finish. Unwired code is invisible in the dashboard. If you are unsure whether
something is covered, assume it is not and wire it.

### Tracing conventions for this repo

- `session_id` is the `trace_id` minted in `analyze()` (`prism-xxxxxxxx`). One transaction
  analysis is one PRISM session, so its model calls and its gate decision form one trajectory.
  Reuse it rather than inventing a new id.
- `operation` follows the GenAI convention: `execute_tool` for the policy gate and for signal
  extraction (it is a classifier call, not a conversation), `invoke_agent` for a whole analysis.
  Note that PRISM's trace list does not surface `metadata`, so you cannot filter on this from
  the API — group by the `model` field instead.
- **Never trace an unredacted message.** Rule 6 redacts before inference and rule 7 forbids
  storing message bodies — so traces carry the redacted excerpt and the derived signals, never
  a raw body. `api/prism.py` is the only place that talks to PRISM; keep it that way.
- Tracing is fire-and-forget on a daemon thread and swallows every exception. PRISM being down
  must never delay or fail a fraud decision. Do not make it blocking.
- With no API key set, tracing is a no-op. A fresh clone runs untraced rather than erroring.

### Reading PRISM's scores for this project — read this before acting on them

**The ~74% flag rate is a rubric mismatch, not a quality problem. Do not "fix" it.**

PRISM's evaluator grades `input_messages`/`output_message` as a **customer-service
conversation** and scores customer satisfaction. LedgerSentinel is a classifier plus a policy
gate, so the rubric does not fit — and it fails in one specific, dangerous direction. Grouping
our own gate spans by what the gate actually did:

| Gate spans | n | avg satisfaction | flagged |
|---|---|---|---|
| high risk → escalated | 15 | **26.3** | 14/15 |
| low risk → approved | 17 | **60.3** | 3/17 |

**A correct escalation costs 34 points.** The evaluator's own reasons say why: an intercepted
scam line (`"send it to the safe account instead"`) is read as *the customer's clear request*,
and a correct ESCALATE is flagged as *"immediately escalates without attempting to address the
customer's transaction inquiry, resulting in poor user experience."* Optimising this metric
means missing fraud. Do not optimise this metric.

Measured attempts to re-point the rubric from the client, so nobody repeats them:

| Attempt | Result |
|---|---|
| Prepend a system message framing the task (`_FRAMING` in `api/prism.py`) | **Strictly worse.** Gate spans scored **0**, flagged as *"a policy gate system prompt attempting to override the evaluator's instructions"*. Reverted — see the `_framed()` docstring. |
| Natural-language payloads: wrap evidence in `<communication>`, describe outputs in prose | Extraction 18.4 → 22.5, **still 100% flagged**. Kept: marginal, but the traces are more readable. |
| Retype extraction from `chat` to `execute_tool` | No measurable effect — `metadata` is not surfaced in the trace list, and grading was unchanged. Kept anyway, because it is simply the correct span type. |

The conclusion after three attempts: **the evaluator applies a fixed rubric that cannot be
re-pointed from the trace payload.** Stop trying.

**What to trust instead.** Latency, trace volume, session/trajectory assembly, error and
guardrail status are all accurate and genuinely useful — that is what PRISM is earning its
place for here. For quality, use `eval/run.py`: it scores the 8-scenario cohort against
*this* system's contract (correct action, evidence citation, calibration), which is what the
V1 → V2 critical-evidence fix was found and proven with.

**Do not spend credits on RCA clustering of these flags.** It would cluster a rubric mismatch
and produce confident findings about a customer-service agent nobody built.

### Not yet wired

`model-service/` (the Gemma/Qwen inference service) is **not** instrumented yet. Its
`app/inference/gemma_client.py` and `app/inference/qwen_client.py` make the actual model calls
and should get spans — see the standing rule above.
