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

## V1 → V2 — 2026-09-14

**V1: 6/8 evaluators pass. V2: 7/8.** Same cohort, same scenario ids, one fix between them.

| Evaluator | V1 | V2 | Δ |
|---|---|---|---|
| **critical_evidence_coverage** | **0.0%** | **100.0%** | **▲ 100.0pp** |
| decision_correctness | 100.0% | 100.0% | = |
| policy_adherence | 100.0% | 100.0% | = |
| grounded_rationale | 100.0% | 100.0% | = |
| escalation_safety | 100.0% | 100.0% | = |
| loop_discipline | 100.0% | 100.0% | = |
| latency_under_10s | 100.0% | 100.0% | = |
| calibration | 74.8% | 74.8% | = |

**The part worth saying out loud: every one of the 8 actions is identical between V1 and V2.**

```
S01 ESCALATE → ESCALATE    S05 VERIFY   → VERIFY
S02 HOLD     → HOLD        S06 ESCALATE → ESCALATE
S03 ESCALATE → ESCALATE    S07 HOLD     → HOLD
S04 VERIFY   → VERIFY      S08 HOLD     → HOLD
```

Nothing was re-tuned to make a number go up. The system made the same calls before and after; it
just became able to *show its work*. A threshold tweak would have moved decisions — this didn't,
which is what makes the improvement real rather than cosmetic.

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

## Finding 2 — the calibration metric was measuring the wrong thing

V1 and V2 reported ECE 0.252 (74.8%) from an 8-scenario proxy:

```
stated 0.43  →  observed 1.00  (n=2)     ← S06, S07
stated 0.85  →  observed 1.00  (n=6)
```

Read literally that says "under-confident". Read properly it says the proxy is wrong. S06 and
S07 state low confidence **by design** - the evidence genuinely conflicts, the advisory index
is genuinely down - and their actions are correct **because** that low confidence moved them up
the ladder. The proxy scored the thesis working as a calibration failure. With every action
correct and no negatives, "1 − ECE" over the cohort collapses to "mean confidence", which just
rewards saying 0.9.

**V4 measures calibration where it can be measured.** `model-service/data/processed/holdout.jsonl`
has ground truth for all 8 labels across 20 texts, including 10 benign ones. The evaluator fits
Platt scaling **leave-one-out** - every row is scored by a scaler that never saw it - and takes
ECE over all 160 (row, label) pairs, using the service's own `fit_one()` so it measures exactly
the scaler that ships:

```
holdout LOO n=160 | ECE 0.078 | 0.06->0.01 (n=122), 0.62->0.73 (n=11), 0.81->0.96 (n=26)
calibration   92.2%   target 80%   PASS
```

When the extractor says ~0.8 it is right ~96% of the time; when it says ~0.06 it is right ~1%.
That is the sentence for the slide. The cohort proxy still runs when there is no holdout, and
its detail string now says `cohort PROXY` so nobody puts it on a slide again.

**Two caveats, say both.** Twenty rows is small - the script warns at under 150 - and the ten
benign texts all scored exactly 0.0 on every label, so the only hard negatives are the scam
scenarios where a label was present but a different one fired. And the scaler is Qwen's:
`calibration/scaler.meta.json` records the model it was fit on, and a different extractor
needs a refit (`python calibration/fit_platt.py` from `model-service/`).

**What the refit found.** Ashmit's `fit_platt.py` used sklearn's default `C=1.0`, an L2
penalty sized for many features and rows. On one feature and twenty rows it crushed the slope:
raw 0.95 for `remote_access_request` calibrated to **0.24**. The API drops anything under
`PRESENCE_FLOOR = 0.50`, so the first scaler would have erased the two labels that force an
escalation and S03 would have stopped escalating - silently, on the real-inference path only.
Now unregularised with Platt's smoothed targets, as Platt scaling is defined.

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
| `calibration` | 1 − ECE, leave-one-out Platt over the labelled holdout (cohort proxy if absent) | ≥ 80% |

Every evaluator names the scenarios that failed. A bare percentage is not something you can act
on at hour 19.

## Modes

**in-process** (default) — imports fusion and the gate directly. Deterministic, no services
needed, milliseconds. Use while iterating.

**`--live`** — posts to the running API. Exercises redaction, the model client and persistence.
Use for the number that goes on a slide.

Note the two can disagree, and when they do that is information, not noise — Finding 1 is exactly
such a disagreement.
