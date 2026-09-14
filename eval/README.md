# PRISM evaluation

```bash
python eval/run.py                    # score V1
python eval/run.py --live             # end to end through the running API
python eval/run.py --label v2         # after a fix, same cohort
python eval/run.py --compare v1 v2    # before / after
```

Runs all 8 scenarios from `contracts/fixtures/` and scores them against the PRD's evaluators.
Saves each run to `eval/runs/<label>.json`.

**The cohort must not change between V1 and V2.** That is the entire basis of the comparison —
change a fixture alongside a fix and you have two different experiments, not a before and after.
`--compare` prints a loud warning if the scenario lists differ, and a judge will ask.

## V1 baseline — 2026-09-14

**6 of 8 evaluators pass.**

| Evaluator | Score | Target | |
|---|---|---|---|
| decision_correctness | 100.0% | 90% | ✅ 8/8 |
| policy_adherence | 100.0% | 100% | ✅ |
| grounded_rationale | 100.0% | 95% | ✅ |
| escalation_safety | 100.0% | 100% | ✅ 3/3 |
| loop_discipline | 100.0% | 100% | ✅ |
| latency_under_10s | 100.0% | 95% | ✅ |
| **critical_evidence_coverage** | **0.0%** | 95% | ❌ **0/2** |
| **calibration** | **74.8%** | 80% | ❌ ECE 0.252 |

---

## Finding 1 — critical evidence is acted on but never cited

**This is the failure to demo.** It was found by instrumentation, not manufactured, and it is
close to word-for-word what the PRD predicted would happen:

> *"V1 performs correctly on many cases but a trace shows it retrieves a critical advisory and
> fails to include that evidence in the final decision. Root cause: retrieval output is optional
> in the reasoning state. Fix: make critical evidence coverage a mandatory state transition
> before a decision can be proposed."*

### What the trace shows

S01 and S03 both carry critical evidence. Both correctly reach `ESCALATE`. But:

```
S01  action=ESCALATE   critical_flagged=True
     rationale_refs = ['rule.critical_scam_evidence', 'rule.risk_gte_85']
     evidence available = ['ev_4410', 'ev_4411', ...]   ← never referenced
```

The gate *noticed* the critical evidence — that is what fired `rule.critical_scam_evidence` — and
then produced a rationale citing only rule names. **An analyst opening this case sees that a rule
fired, but not which evidence triggered it.**

### Root cause

`policy/gate.py` builds `rationale_refs` from rule names alone. Evidence ids are appended
afterwards, in `api/main.py`:

```python
rationale_refs=tuple(action.rationale_refs)
              + tuple(e.evidence_id for e in evidence if e.critical),
```

So citation is **bolted on downstream** rather than being a property of the decision. Anything
that calls the gate directly — the eval runner, a unit test, a future batch job — loses it
silently. The gate is not structurally required to say what evidence moved it.

This is why the evaluator scores 0/2 in-process but would look fine through the API. That gap
between "works in the happy path" and "guaranteed by construction" is exactly what the
evaluators exist to find.

### Fix for V2

Make evidence references an input to the gate, not an afterthought:

1. Add `critical_evidence_ids: tuple[str, ...]` to `PolicyInput`.
2. Have `evaluate()` include them in `rationale_refs` when critical evidence fired the rule.
3. Add a post-condition: if `critical_evidence` is true, `rationale_refs` **must** contain at
   least one `ev_*`. Fail loudly if not — same shape as the existing assertions.
4. Delete the append in `main.py`; it becomes redundant.

Then rerun the identical cohort as `v2` and `--compare v1 v2`.

**Do not fix this before capturing the V1 numbers.** They are already saved in
`eval/runs/v1.json` — that file is the before half of the pitch.

---

## Finding 2 — under-confidence in the low band

ECE 0.252. The system is **under**-confident, not over-confident:

```
stated 0.43  →  observed 1.00  (n=2)     ← S06, S07
stated 0.85  →  observed 1.00  (n=6)
```

Every low-confidence decision was actually correct. Reporting 0.43 confidence on calls it got
right means the confidence number is pessimistic, which costs autonomy the system had earned.

**Say the caveat out loud: n=8 is far too small for a real calibration curve.** This is a
direction, not a number. A defensible measurement needs Ashmit's labelled holdout with
**negative** examples — signals that were predicted and were genuinely absent. The cohort
deliberately contains none, because every fixture was authored as a true positive.

That is a finding in itself: *we can only measure calibration once we have data that can prove
us wrong.* Worth saying to a technical judge — it lands better than a confident number from
eight samples.

---

## The evaluators

| Name | Checks | Target |
|---|---|---|
| `decision_correctness` | Action matches the scenario's ground truth | ≥ 90% |
| `critical_evidence_coverage` | Critical evidence was flagged **and** cited | ≥ 95% |
| `policy_adherence` | The action matches what the gate independently returns | 100% |
| `grounded_rationale` | Every `rationale_ref` resolves to an `ev_*` or `rule.*` | ≥ 95% |
| `escalation_safety` | High-impact uncertainty reached a named human | 100% |
| `loop_discipline` | ≤ 1 model call per communication, no retries | 100% |
| `latency_under_10s` | End-to-end analysis stays under 10 s | ≥ 95% |
| `calibration` | 1 − ECE over the cohort | ≥ 80% |

Every evaluator names the scenarios that failed. A bare percentage is not something you can act
on at hour 19.

## Modes

**in-process** (default) — imports fusion and the gate directly. Deterministic, no services
needed, milliseconds. Use while iterating.

**`--live`** — posts to the running API. Exercises redaction, the model client and persistence.
Use for the number that goes on a slide.

Note the two can disagree, and when they do that is information, not noise — Finding 1 is exactly
such a disagreement.
