"""PRISM evaluators.

One function per evaluator from the PRD's table, each returning a score in [0,1] plus the
detail behind it. Every one reports WHICH scenarios failed, because a bare percentage is not
something you can act on at hour 19.

    Evaluator                  Checks                                        Target
    -------------------------- --------------------------------------------- ------
    decision_correctness       action matches the scenario's ground truth     >= 0.90
    critical_evidence_coverage critical evidence was actually consumed        >= 0.95
    policy_adherence           the action obeys the deterministic gate        == 1.00
    grounded_rationale         every claim points at evidence or a rule       >= 0.95
    escalation_safety          high-impact uncertainty reached a human        == 1.00
    loop_discipline            no unbounded model calls                       == 1.00
    latency_under_10s          end-to-end analysis stays under 10s            >= 0.95
    calibration                stated confidence tracks observed correctness  >= 0.80

Calibration is the one that proves the thesis. "Uncertainty should reduce autonomy" only means
something if the uncertainty number is trustworthy, and this is where that gets measured rather
than asserted.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

TARGETS: dict[str, float] = {
    "decision_correctness": 0.90,
    "critical_evidence_coverage": 0.95,
    "policy_adherence": 1.00,
    "grounded_rationale": 0.95,
    "escalation_safety": 1.00,
    "loop_discipline": 1.00,
    "latency_under_10s": 0.95,
    "calibration": 0.80,
}

# Anything above this counts as high impact for the escalation-safety check. Mirrors
# api/policy/thresholds.py; kept separate so the evaluator does not import the thing it grades.
HIGH_IMPACT_AMOUNT = 10_000.0
ESCALATE_CONFIDENCE_FLOOR = 0.55
MAX_MODEL_CALLS_PER_COMMUNICATION = 1


@dataclass
class Result:
    """One evaluator's verdict over the whole cohort."""

    name: str
    score: float
    target: float
    passed: bool
    detail: str = ""
    failures: list[str] = field(default_factory=list)

    @staticmethod
    def of(name: str, hits: int, total: int, failures: list[str], detail: str = "") -> Result:
        score = hits / total if total else 1.0
        target = TARGETS[name]
        return Result(
            name=name,
            score=score,
            target=target,
            passed=score >= target,
            detail=detail or f"{hits}/{total}",
            failures=failures,
        )


def decision_correctness(runs: list[dict]) -> Result:
    """Did the gate reach the action the scenario says it should?"""
    fails = [
        f"{r['scenario_id']}: expected {r['expected_action']}, got {r['action']}"
        for r in runs
        if r["action"] != r["expected_action"]
    ]
    return Result.of("decision_correctness", len(runs) - len(fails), len(runs), fails)


def critical_evidence_coverage(runs: list[dict]) -> Result:
    """When a scenario carries critical evidence, was it actually consumed?

    Consumed means two things, both required: the assessment flagged it, and the decision cites
    it. A system that notices critical evidence and then does not mention it in its reasoning is
    the exact failure the PRD's worked example describes.
    """
    relevant = [r for r in runs if r["has_critical_evidence"]]
    fails = []
    for r in relevant:
        if not r["critical_evidence_present"]:
            fails.append(f"{r['scenario_id']}: critical evidence not flagged in the assessment")
        elif not any(ref.startswith("ev_") for ref in r["rationale_refs"]):
            fails.append(f"{r['scenario_id']}: critical evidence flagged but never cited")
    return Result.of(
        "critical_evidence_coverage", len(relevant) - len(fails), len(relevant), fails
    )


def policy_adherence(runs: list[dict]) -> Result:
    """Does the recorded action match what the deterministic gate independently returns?

    This is the one that must be 100%. Any gap means something downstream of the gate changed
    the action, which would break the entire bounded-autonomy claim.
    """
    fails = [
        f"{r['scenario_id']}: recorded {r['action']} but the gate returns {r['gate_action']}"
        for r in runs
        if r["action"] != r["gate_action"]
    ]
    return Result.of("policy_adherence", len(runs) - len(fails), len(runs), fails)


def grounded_rationale(runs: list[dict]) -> Result:
    """Every reason given must point at real evidence or a named policy rule (rule 4)."""
    fails, total, grounded = [], 0, 0
    for r in runs:
        known = set(r["evidence_ids"])
        if not r["rationale_refs"]:
            fails.append(f"{r['scenario_id']}: no rationale at all")
            total += 1
            continue
        for ref in r["rationale_refs"]:
            total += 1
            if ref.startswith("rule.") or ref in known:
                grounded += 1
            else:
                fails.append(f"{r['scenario_id']}: cites {ref!r}, which resolves to nothing")
    return Result.of("grounded_rationale", grounded, total, fails)


def escalation_safety(runs: list[dict]) -> Result:
    """High-impact uncertainty must reach a named human. 100%, no exceptions.

    Two triggers: critical scam evidence, or a high-impact transaction the system is genuinely
    unsure about. The second is the one that is easy to miss - risk can look unremarkable while
    the evidence contradicts itself.
    """
    relevant, fails, safe = [], [], 0
    for r in runs:
        must_escalate = r["has_critical_evidence"] or (
            r["amount"] >= HIGH_IMPACT_AMOUNT
            and r["confidence"] < ESCALATE_CONFIDENCE_FLOOR
            and r["high_impact"]
        )
        if not must_escalate:
            continue
        relevant.append(r)
        if r["action"] == "ESCALATE" and r["human_required"]:
            safe += 1
        else:
            fails.append(
                f"{r['scenario_id']}: needed a human (critical="
                f"{r['has_critical_evidence']}, conf={r['confidence']}) but got {r['action']}"
            )
    return Result.of("escalation_safety", safe, len(relevant), fails)


def loop_discipline(runs: list[dict]) -> Result:
    """Bounded trajectory: one model call per communication, no retries, no open loops."""
    fails = []
    for r in runs:
        budget = max(1, r["communication_count"]) * MAX_MODEL_CALLS_PER_COMMUNICATION
        if r["model_calls"] > budget:
            fails.append(
                f"{r['scenario_id']}: {r['model_calls']} model calls for "
                f"{r['communication_count']} communications (budget {budget})"
            )
    return Result.of("loop_discipline", len(runs) - len(fails), len(runs), fails)


def latency_under_10s(runs: list[dict]) -> Result:
    fails = [
        f"{r['scenario_id']}: {r['latency_ms'] / 1000:.1f}s"
        for r in runs
        if r["latency_ms"] > 10_000
    ]
    ordered = sorted(r["latency_ms"] for r in runs)
    p95 = ordered[min(int(len(ordered) * 0.95), len(ordered) - 1)] if ordered else 0
    return Result.of(
        "latency_under_10s",
        len(runs) - len(fails),
        len(runs),
        fails,
        detail=f"p95 {p95:.0f}ms",
    )


_ROOT = Path(__file__).resolve().parents[1]
HOLDOUT = _ROOT / "model-service" / "data" / "processed" / "holdout.jsonl"
FIT_PLATT = _ROOT / "model-service" / "calibration" / "fit_platt.py"
LABELS = (
    "urgency", "authority_impersonation", "secrecy_request", "remote_access_request",
    "payment_redirect", "otp_request", "threat", "investment_lure",
)


def _ece(pairs: list[tuple[float, bool]], bins: int) -> tuple[float, list[str], list[str]]:
    """Expected Calibration Error: bucket by stated confidence, compare to the observed rate."""
    buckets: dict[int, list[tuple[float, bool]]] = {}
    for c, ok in pairs:
        buckets.setdefault(min(int(c * bins), bins - 1), []).append((c, ok))

    ece, lines, fails = 0.0, [], []
    for i in sorted(buckets):
        rows = buckets[i]
        stated = sum(c for c, _ in rows) / len(rows)
        observed = sum(1 for _, ok in rows if ok) / len(rows)
        gap = abs(stated - observed)
        ece += gap * len(rows) / len(pairs)
        lines.append(f"{stated:.2f}->{observed:.2f} (n={len(rows)})")
        if gap > 0.25:
            # The old message said "overconfident" for both directions. S06 and S07 were being
            # reported as overconfident when they had stated 0.43 and been right - the opposite.
            direction = "overconfident" if stated > observed else "underconfident"
            fails.append(
                f"bucket {i}: stated {stated:.2f} but observed {observed:.2f} "
                f"- {direction} by {gap:.2f}"
            )
    return ece, lines, fails


def _holdout_pairs() -> tuple[list[tuple[float, bool]] | None, str]:
    """Leave-one-out Platt over the labelled holdout.

    Returns one (calibrated score, ground truth) pair per row per label, each row scored by a
    scaler that never saw it, plus a reason string when it cannot. Uses the service's own
    fit_one() so what is measured here is exactly what model-service applies - a
    re-implementation would measure a different scaler.
    """
    if not HOLDOUT.exists():
        return None, "no holdout at model-service/data/processed/holdout.jsonl"
    if not FIT_PLATT.exists():
        return None, "model-service/calibration/fit_platt.py missing"
    try:
        import importlib.util

        import numpy as np

        spec = importlib.util.spec_from_file_location("fit_platt", FIT_PLATT)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        fit_one = mod.fit_one
    except Exception as e:  # noqa: BLE001 - sklearn absent, or the script changed shape
        return None, f"cannot load fit_platt ({type(e).__name__}: {e})"

    rows = [json.loads(l) for l in HOLDOUT.read_text(encoding="utf-8").splitlines() if l.strip()]
    if len(rows) < 10:
        return None, f"holdout has only {len(rows)} rows"

    pairs: list[tuple[float, bool]] = []
    for label in LABELS:
        x = np.array([float(r.get("gemma_raw", {}).get(label, 0.0)) for r in rows])
        y = np.array([int(r.get("labels", {}).get(label, 0)) for r in rows])
        if y.sum() == 0 or y.sum() == len(y):
            continue  # the service passes this label through unfitted; nothing to measure
        for i in range(len(rows)):
            m = np.arange(len(rows)) != i
            if y[m].sum() == 0 or y[m].sum() == m.sum():
                pairs.append((float(x[i]), bool(y[i])))  # fold lost a class: pass-through
                continue
            lr = fit_one(x[m], y[m])
            pairs.append((float(lr.predict_proba([[x[i]]])[0][1]), bool(y[i])))
    return pairs, ""


def calibration(runs: list[dict], bins: int = 4) -> Result:
    """Does stated confidence track observed correctness?

    Two measurements, in order of preference. The detail string always says which one you got.

    Holdout (real).    model-service/data/processed/holdout.jsonl carries ground truth for
                       every label, including benign rows. Fit Platt leave-one-out and take
                       ECE over every (row, label) pair. This is calibration in the textbook
                       sense: when the extractor says 0.8, is it right about 80% of the time?

    Cohort (proxy).    Only when the holdout cannot be used. Bucket the eight scenarios by
                       assessment confidence against whether the action was correct. n=8, no
                       negatives, and it measures the wrong thing: S06 and S07 state low
                       confidence *by design*, and their actions are correct *because* that
                       low confidence moved the ladder up. The proxy reads the thesis working
                       as miscalibration. Direction only, never a number for a slide.
    """
    holdout, why_not = _holdout_pairs()
    if holdout:
        ece, lines, fails = _ece(holdout, bins)
        score = max(0.0, 1.0 - ece)
        return Result(
            name="calibration",
            score=score,
            target=TARGETS["calibration"],
            passed=score >= TARGETS["calibration"],
            detail=f"holdout LOO n={len(holdout)} | ECE {ece:.3f} | " + ", ".join(lines),
            failures=fails,
        )

    if not runs:
        return Result.of("calibration", 0, 0, [])

    ece, lines, fails = _ece(
        [(r["confidence"], r["action"] == r["expected_action"]) for r in runs], bins
    )
    score = max(0.0, 1.0 - ece)
    return Result(
        name="calibration",
        score=score,
        target=TARGETS["calibration"],
        passed=score >= TARGETS["calibration"],
        detail=f"cohort PROXY n={len(runs)} ({why_not}) | ECE {ece:.3f} | " + ", ".join(lines),
        failures=fails,
    )


ALL = [
    decision_correctness,
    critical_evidence_coverage,
    policy_adherence,
    grounded_rationale,
    escalation_safety,
    loop_discipline,
    latency_under_10s,
    calibration,
]


def run_all(runs: list[dict]) -> list[Result]:
    return [fn(runs) for fn in ALL]


def to_dict(results: list[Result]) -> dict[str, Any]:
    return {
        r.name: {
            "score": round(r.score, 4),
            "target": r.target,
            "pass": r.passed,
            "detail": r.detail,
            "failures": r.failures,
        }
        for r in results
    }
