# LedgerSentinel — the pitch

Five minutes spoken, timed to the clicks in [DEMO-RUNBOOK.md](DEMO-RUNBOOK.md). Every number
below was measured on 2026-09-14/15 and lives in `eval/runs/` or PRISM. Say them plainly; do
not round up.

Speaker in **bold** is a suggestion - one voice for the story, one for the live clicks works.

---

## 0:00 — Hook (20 s) · *slide or landing page on screen*

> A fraud system that looks at a transaction sees fifteen thousand dollars going to Singapore
> from a verified customer with twelve years of clean history. It approves it. The fraud wasn't
> in the transaction. It was in the phone call twenty minutes earlier.
>
> LedgerSentinel reads the communications around a payment - and then *doesn't let the AI
> decide what to do about it.*

## 0:20 — The problem (40 s)

> Social-engineering fraud is the fastest-growing loss category for retail banks, and it beats
> transaction monitoring for a simple reason: the customer authorises the payment themselves.
> The signal is in what they were told, not what they did.
>
> Banks have two bad options today. Ignore the communications - and miss it. Or put a model in
> charge of freezing accounts - and nobody, including the bank, can explain why a payment was
> blocked. We built the third option.

## 1:00 — What we built (60 s) · *Transactions → txn_018*

> **Yashraj:** Click. This is a real decision, made seconds ago by the running system.
>
> On-device models read the two messages around this payment. They found four things: someone
> impersonating the bank, urgency, a request for secrecy, and a redirect to a "safe account".
> Those are *signals*. The models are not allowed to do anything with them.
>
> *(Evidence tab)* Three sources are fused: what was said, what the account itself knows -
> first ever payment to this beneficiary - and a published fraud advisory that describes this
> exact pattern. One item is marked critical.
>
> *(Policy Decision tab)* And this is the only thing in the system that decides. It is code, not
> a model. Five rungs: approve, verify, cool-off, hold, escalate. Every rule proposes; the most
> restrictive wins. Uncertainty can only move a payment *up*. And it cites the evidence itself -
> `ev_af7b120a` - not just the rule that noticed it.

## 2:00 — It's bounded, not paranoid (30 s) · *Transactions → txn_031*

> Same system, different story. Florence, Italy, 890 euros at a merchant. A naive geo-rule blocks
> this. Ours reads it as a risk of 32 with nothing coercive in the communications, and steps up
> to VERIFY - a push notification, thirty seconds of the customer's time. It never blocks a
> legitimate customer on location alone. Bounded means bounded in both directions.

## 2:30 — What PRISM found (60 s) · *PRISM Observability*

> Every model call, gate decision and analysis is traced to PRISM - the gate runs in under a
> millisecond, because it's code.
>
> This table is the same eight scenarios re-run after each fix, and it's the honest history of
> this build. V1 escalated the coercive scam correctly - but cited *no evidence*. The gate
> fired the rule with nothing behind it. PRISM's evaluator caught it: critical-evidence coverage
> zero. We fixed the reasoning, not a threshold: coverage went to one hundred percent with
> **every action unchanged**.
>
> Then we ran the cohort through the live API instead of in-process - and it disagreed with the
> gate on five of eight. The legitimate-travel case *approved*. The request had been dropping
> the account's history and there was no advisory lookup at all. That's the `v3-pre` column.
> Today: eight of eight, in-process and live, calibration ninety-two percent on a held-out set.

## 3:30 — The uncertainty moment (30 s) · *terminal, S07 twice*

> Same transaction, twice. Second time, the advisory index is down. Watch: confidence drops, and
> the decision moves *up* the ladder from VERIFY to HOLD. A component failing makes the system
> more careful, never less. It cannot approve blind - that's asserted in code, and a test crashes
> if it ever does.

## 4:00 — Privacy (30 s) · *stay on screen, or Consent & Privacy*

> The question everyone asks: does the AI read all my messages? No. Consent is per channel and
> revocable - it's evaluated in the database, not in the app. Redaction runs *before* any model
> sees text. And we never store a message body: only the redacted quote and the label. There is
> nothing to breach.

## 4:30 — Close (30 s)

> Three people, one rule that never bent: models emit evidence, only the policy gate emits an
> action. The console is live at **ledgersentinel-hq.web.app** with real login. The eval
> harness, the contracts, the PRISM history - it's all in the repo, and it's all measured.
>
> The transaction is not always the whole story. We built the system that reads the rest of it.

---

## If a judge asks

**"Does the AI read all my messages?"**
No. Event-triggered, not continuous - it pulls the communications around *one* payment, with
per-channel consent the customer can revoke. On-device inference: the signal travels, the
message doesn't. Storage is claim-plus-pointer: redacted quote, label, confidence. Show Consent
& Privacy if pushed.

**"Who set the thresholds? Isn't 85 arbitrary?"**
Yes, illustrative - `thresholds.py` says so in its first docstring. Production values need
historical validation and model-risk sign-off. What's *not* arbitrary is the structure: risk and
confidence are separate numbers, never combined, and every rule proposes independently.

**"Why is confidence 79% on an obvious scam?"**
Because confidence is not risk. Risk is 100. Confidence is how sure the *extractor* was about
its labels - it's calibrated: when it says 0.8 it's right about 96% of the time on the holdout.
Keeping them apart is what stops a system being confidently wrong.

**"What did PRISM actually do for you?"**
Found the V1 evidence-citation bug before we knew to look for it. Then the live-path finding.
And it also mis-graded us: its satisfaction rubric treats a correct escalation as poor customer
service - escalating cost us 34 points on average. We documented that instead of optimising it,
because a fraud system that optimises for customer satisfaction is one that misses fraud.

**"Is the hosted link running the real model?"**
The hosted API serves the fixture path - `MODELS_MOCK=true` - which is the exact path we
measured. Real inference runs on Ashmit's GPU with Gemma 3n; it isn't hosted because it needs
a GPU, not because it doesn't work.

**"How is this different from a rules engine?"**
The rules engine is the *last* step, on purpose. The hard part - reading a phone call for
coercion - is a model. The part that must be explainable and auditable - the decision - is
rules. Each does what it's good at, and the boundary between them is a frozen contract that
rejects a model output carrying an "action" field.

**"What breaks it?"**
A scam with no communication trail - a customer coached in person. We'd see only the
transaction, and we'd behave like a normal monitoring system. We don't claim otherwise.

**"What's next?"**
Real Gemma on the customer's device, not the analyst's server. Hard negatives in the calibration
holdout - today's benign set scores 0.0 on everything, which is too easy. And a real advisory
feed instead of our four-entry table.

---

## Before you say any of this

- **The hosted link shows real data only once the API is deployed.** Until Yash's Cloud Run
  URL is baked in, `ledgersentinel-hq.web.app` shows mock rows behind a real login. If that's
  still true on the day, say "the console is hosted; decisions are live on this machine" - and
  don't send judges to click rows on the hosted site.
- Don't say "live inference" about anything that isn't Ashmit's laptop.
- Say "illustrative thresholds" before a judge says "arbitrary thresholds".
