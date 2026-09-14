#!/usr/bin/env python3
"""PRISM cohort runner.

    python eval/run.py                      # score V1 in-process
    python eval/run.py --label v2           # after a fix, same cohort
    python eval/run.py --compare v1 v2      # before / after
    python eval/run.py --live               # end to end through the running API
    python eval/run.py --json               # machine-readable, for CI

Runs all 8 scenarios and scores them against the PRD's evaluators. Saves each run to
eval/runs/<label>.json so V1 and V2 can be compared on the IDENTICAL cohort - which is the
whole point. Change the fixtures alongside a fix and the comparison means nothing; a sharp
judge will ask, so don't.

Two modes:

  in-process (default)  imports fusion and the gate directly. Deterministic, no services
                        needed, runs in milliseconds. This is what you use while iterating.

  --live                posts to the running API. Slower, needs api/ up, but exercises the
                        real path including redaction, the model client and persistence.
                        Use this for the number you put on a slide.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import time
from datetime import datetime, timezone

# Windows consoles default to cp1252 and choke on the box-drawing characters below. Reconfigure
# rather than dumbing the output down - this has to look right on three different machines.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "contracts" / "py"))
sys.path.insert(0, str(ROOT / "api"))
sys.path.insert(0, str(pathlib.Path(__file__).parent))

from contracts import Assessment, PolicyInput  # noqa: E402
import evaluators  # noqa: E402

FIXTURES = ROOT / "contracts" / "fixtures"
RUNS = pathlib.Path(__file__).parent / "runs"


# --------------------------------------------------------------------------- execution

def _scenarios() -> list[dict]:
    return [
        json.loads(p.read_text(encoding="utf-8")) for p in sorted(FIXTURES.glob("*.json"))
    ]


def _run_in_process(fx: dict) -> dict:
    """Score one scenario by calling fusion and the gate directly."""
    from policy.gate import evaluate
    from policy.thresholds import DEFAULT, POLICY_VERSION

    pi_decl = fx.get("policy_input", {})
    assessment = Assessment(**fx["assessment"])
    high_impact = pi_decl.get(
        "high_impact", fx["transaction"]["amount"] >= DEFAULT.high_impact_amount
    )
    time_pressure = pi_decl.get(
        "time_pressure",
        any(s["signal_type"] in ("urgency", "threat") for s in fx["signals"]),
    )

    critical_ids = tuple(e["evidence_id"] for e in fx["evidence"] if e.get("critical"))

    t0 = time.perf_counter()
    action = evaluate(
        PolicyInput.from_assessment(
            assessment,
            high_impact=high_impact,
            time_pressure=time_pressure,
            critical_evidence_ids=critical_ids,
        )
    )
    latency_ms = (time.perf_counter() - t0) * 1000

    return _record(
        fx,
        action=action.type.value,
        human_required=action.type.requires_human,
        rationale_refs=list(action.rationale_refs),
        confidence=assessment.confidence,
        risk_score=assessment.risk_score,
        critical_evidence_present=assessment.critical_evidence_present,
        high_impact=high_impact,
        latency_ms=latency_ms,
        model_calls=len(fx["transaction"].get("communication_ids", [])),
        policy_version=POLICY_VERSION,
    )


def _run_live(fx: dict, base: str) -> dict:
    """Score one scenario end to end through the running API."""
    import httpx

    txn = fx["transaction"]
    body = {
        "transaction_id": txn["transaction_id"],
        "customer_id": txn["customer_id"],
        "amount": txn["amount"],
        "currency": txn.get("currency", "USD"),
        "destination_country": txn.get("destination_country"),
        "communication_ids": txn.get("communication_ids", []),
        "first_time_beneficiary": txn.get("destination_ref") == "benef_first_seen",
        "identity_assurance": fx["customer"].get("identity_assurance", "BASIC"),
        "scenario": fx["scenario_id"].lower(),
        # The account's own facts, in the fixture's vocabulary. Dropping these is how the live
        # path came to disagree with the gate on five of eight scenarios: a fixture that says
        # "fourth transfer, each larger than the last" was reaching the API as a bare amount.
        "destination_ref": txn.get("destination_ref"),
        "prior_transfers_same_beneficiary": txn.get("prior_transfers_same_beneficiary", []),
        "origin_country": (txn.get("location") or "").rsplit(",", 1)[-1].strip() or None,
        "device_known": (
            txn["device"].startswith("dev_known") if txn.get("device") else None
        ),
        # The scenario's own premise. S07 is "the advisory index is down mid-analysis" - if the
        # runner does not pass that through, the one scenario that tests rule 5 end to end runs
        # against a healthy system and passes for the wrong reason.
        "advisory_index_available": not fx["assessment"].get("degraded", False),
    }

    t0 = time.perf_counter()
    r = httpx.post(f"{base}/v1/transactions/analyze", json=body, timeout=180)
    r.raise_for_status()
    latency_ms = (time.perf_counter() - t0) * 1000

    payload = r.json()
    d, a = payload["decision"], payload["assessment"]
    return _record(
        fx,
        action=d["action"],
        human_required=d["human_required"],
        rationale_refs=d["rationale_refs"],
        confidence=a["confidence"],
        risk_score=a["risk_score"],
        critical_evidence_present=a.get("critical_evidence_present", False),
        high_impact=txn["amount"] >= evaluators.HIGH_IMPACT_AMOUNT,
        latency_ms=latency_ms,
        model_calls=len(txn.get("communication_ids", [])),
        policy_version=d["policy_version"],
        evidence_ids=[e["evidence_id"] for e in payload.get("evidence", [])],
    )


def _record(fx: dict, *, evidence_ids: list[str] | None = None, **kw) -> dict:
    """Normalise one scenario's outcome into the shape the evaluators consume."""
    from policy.gate import evaluate
    from policy.thresholds import DEFAULT

    assessment = Assessment(**fx["assessment"])
    pi_decl = fx.get("policy_input", {})
    gate_action = evaluate(
        PolicyInput.from_assessment(
            assessment,
            high_impact=pi_decl.get(
                "high_impact", fx["transaction"]["amount"] >= DEFAULT.high_impact_amount
            ),
            time_pressure=pi_decl.get(
                "time_pressure",
                any(s["signal_type"] in ("urgency", "threat") for s in fx["signals"]),
            ),
            critical_evidence_ids=tuple(
                e["evidence_id"] for e in fx["evidence"] if e.get("critical")
            ),
        )
    ).type.value

    return {
        "scenario_id": fx["scenario_id"],
        "expected_action": fx["expected_action"],
        "gate_action": gate_action,
        "amount": fx["transaction"]["amount"],
        "communication_count": len(fx["transaction"].get("communication_ids", [])),
        "has_critical_evidence": any(e.get("critical") for e in fx["evidence"]),
        "evidence_ids": evidence_ids
        if evidence_ids is not None
        else [e["evidence_id"] for e in fx["evidence"]],
        **kw,
    }


# --------------------------------------------------------------------------- reporting

BAR = "─" * 74


def _render(run: dict) -> None:
    print(f"\n{BAR}\n  PRISM cohort · {run['label']} · {run['mode']}")
    print(f"  policy {run['policy_version']} · {len(run['scenarios'])} scenarios · "
          f"{run['timestamp'][:19]}Z\n{BAR}\n")

    print(f"  {'':4} {'SCENARIO':26} {'EXPECTED':10} {'GOT':10} {'RISK':>5} {'CONF':>6}")
    for s in run["scenarios"]:
        ok = s["action"] == s["expected_action"]
        print(f"  {'✓' if ok else '✗':4} {s['scenario_id'] + ' ' + _name(s):26} "
              f"{s['expected_action']:10} {s['action']:10} "
              f"{s['risk_score']:>5} {s['confidence']:>6.2f}")

    print(f"\n{BAR}\n  {'EVALUATOR':28} {'SCORE':>8} {'TARGET':>8}  DETAIL\n{BAR}")
    for name, ev in run["evaluators"].items():
        mark = "PASS" if ev["pass"] else "FAIL"
        print(f"  {name:28} {ev['score'] * 100:>7.1f}% {ev['target'] * 100:>7.0f}%  "
              f"{mark}  {ev['detail']}")

    failures = [(n, f) for n, ev in run["evaluators"].items() for f in ev["failures"]]
    if failures:
        print(f"\n{BAR}\n  FAILURES\n{BAR}")
        for name, detail in failures:
            print(f"  {name}: {detail}")

    passed = sum(1 for ev in run["evaluators"].values() if ev["pass"])
    total = len(run["evaluators"])
    print(f"\n{BAR}\n  {passed}/{total} evaluators pass"
          f"{'  — cohort GREEN' if passed == total else '  — see failures above'}\n{BAR}\n")


_NAMES = {
    "S01": "coercive scam", "S02": "investment scam", "S03": "remote access",
    "S04": "legit travel", "S05": "known supplier", "S06": "conflicting",
    "S07": "retrieval down", "S08": "prompt injection",
}


def _name(s: dict) -> str:
    return _NAMES.get(s["scenario_id"], "")


def _compare(a: str, b: str) -> int:
    pa, pb = RUNS / f"{a}.json", RUNS / f"{b}.json"
    for p in (pa, pb):
        if not p.exists():
            sys.exit(f"No run named {p.stem!r}. Available: "
                     f"{', '.join(x.stem for x in RUNS.glob('*.json')) or 'none'}")

    ra, rb = json.loads(pa.read_text()), json.loads(pb.read_text())

    ids_a = [s["scenario_id"] for s in ra["scenarios"]]
    ids_b = [s["scenario_id"] for s in rb["scenarios"]]
    print(f"\n{BAR}\n  {a} → {b}\n{BAR}\n")
    if ids_a != ids_b:
        print("  ⚠ THE COHORTS DIFFER. This comparison is not valid.")
        print(f"    {a}: {ids_a}\n    {b}: {ids_b}\n")

    print(f"  {'EVALUATOR':28} {a:>9} {b:>9} {'Δ':>9}")
    for name in ra["evaluators"]:
        sa = ra["evaluators"][name]["score"]
        sb = rb["evaluators"].get(name, {}).get("score", 0.0)
        d = sb - sa
        arrow = "▲" if d > 0.0001 else ("▼" if d < -0.0001 else "=")
        print(f"  {name:28} {sa * 100:>8.1f}% {sb * 100:>8.1f}% {arrow} {abs(d) * 100:>6.1f}pp")

    print(f"\n  {'SCENARIO':12} {a:>10} {b:>10}")
    by_b = {s["scenario_id"]: s for s in rb["scenarios"]}
    for s in ra["scenarios"]:
        o = by_b.get(s["scenario_id"], {})
        changed = "  ← changed" if o.get("action") != s["action"] else ""
        print(f"  {s['scenario_id']:12} {s['action']:>10} {o.get('action', '-'):>10}{changed}")
    print(f"\n{BAR}\n")
    return 0


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description="Run the PRISM evaluation cohort.")
    # Default used to be "v1", so a bare `python eval/run.py` silently overwrote the V1 baseline -
    # the "before" half of the PRISM story - with whatever the code does today. It happened.
    ap.add_argument("--label", default="dev", help="name this run (default: dev)")
    ap.add_argument("--force", action="store_true",
                    help="overwrite an existing run file (the versioned ones are the record)")
    ap.add_argument("--live", action="store_true", help="go through the running API")
    ap.add_argument("--base", default="http://localhost:8080", help="API base for --live")
    ap.add_argument("--compare", nargs=2, metavar=("A", "B"), help="diff two saved runs")
    ap.add_argument("--json", action="store_true", help="print JSON instead of a table")
    args = ap.parse_args()

    if args.compare:
        return _compare(*args.compare)

    scenarios = _scenarios()
    if not scenarios:
        sys.exit("No fixtures in contracts/fixtures/")

    runs = []
    for fx in scenarios:
        try:
            runs.append(_run_live(fx, args.base) if args.live else _run_in_process(fx))
        except Exception as e:  # noqa: BLE001
            sys.exit(f"{fx['scenario_id']} failed: {type(e).__name__}: {e}")

    results = evaluators.run_all(runs)
    record = {
        "label": args.label,
        "mode": "live (through the API)" if args.live else "in-process",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "policy_version": runs[0]["policy_version"],
        "cohort": [r["scenario_id"] for r in runs],
        "scenarios": runs,
        "evaluators": evaluators.to_dict(results),
    }

    RUNS.mkdir(parents=True, exist_ok=True)
    out = RUNS / f"{args.label}.json"
    if out.exists() and args.label != "dev" and not args.force:
        sys.exit(
            f"{out} already exists and is part of the record. Pick another --label, or pass "
            f"--force if you really mean to replace it."
        )
    out.write_text(json.dumps(record, indent=2), encoding="utf-8")

    if args.json:
        print(json.dumps(record["evaluators"], indent=2))
    else:
        _render(record)
        print(f"  saved → {out.relative_to(ROOT)}\n")

    return 0 if all(r.passed for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
