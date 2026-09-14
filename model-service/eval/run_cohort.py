"""
Run the full eval cohort against the model service.

Usage:
    python eval/run_cohort.py --version v1
    python eval/run_cohort.py --version v2

Produces:
    eval/results/{version}/cohort_results.json
    eval/results/{version}/confusion_matrix.json
    eval/results/{version}/per_scenario_scores.json

Uses the SAME scenario IDs for both v1 and v2 runs.
Changing the cohort between runs invalidates the PRISM comparison.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8001"
SCENARIOS_PATH = Path("eval/scenarios.json")
RESULTS_DIR = Path("eval/results")

EIGHT_LABELS = [
    "urgency", "authority_impersonation", "secrecy_request",
    "remote_access_request", "payment_redirect", "otp_request",
    "threat", "investment_lure",
]


def load_scenarios(path: Path) -> list[dict]:
    if not path.exists():
        print(f"ERROR: Scenarios file not found at {path}")
        print("Create eval/scenarios.json with the 8 eval scenarios + adversarial set.")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def score_text(text: str, source_ref: str) -> dict:
    resp = httpx.post(
        f"{BASE_URL}/model/text/score",
        json={"text": text, "source_ref": source_ref},
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()


def run_cohort(version: str) -> None:
    scenarios = load_scenarios(SCENARIOS_PATH)
    out_dir = RESULTS_DIR / version
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for i, scenario in enumerate(scenarios):
        sid = scenario.get("id", f"S{i:02d}")
        text = scenario["text"]
        expected_labels = scenario.get("expected_labels", {})

        print(f"  [{i+1}/{len(scenarios)}] {sid}...", end=" ", flush=True)
        t0 = time.time()

        try:
            result = score_text(text, source_ref=sid)
            elapsed = time.time() - t0
            result["scenario_id"] = sid
            result["expected_labels"] = expected_labels
            result["elapsed_s"] = round(elapsed, 2)
            results.append(result)
            n_signals = len(result.get("signals", []))
            print(f"{n_signals} signals, {elapsed:.1f}s")
        except Exception as exc:
            print(f"ERROR: {exc}")
            results.append({
                "scenario_id": sid,
                "error": str(exc),
                "expected_labels": expected_labels,
            })

    # Save results
    with open(out_dir / "cohort_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {out_dir / 'cohort_results.json'}")

    # Compute per-scenario confusion entries
    confusion = compute_confusion(results)
    with open(out_dir / "confusion_matrix.json", "w", encoding="utf-8") as f:
        json.dump(confusion, f, indent=2)
    print(f"Confusion matrix saved to {out_dir / 'confusion_matrix.json'}")


def compute_confusion(results: list[dict]) -> dict:
    """Compute per-label TP/FP/TN/FN across scenarios."""
    counts = {label: {"tp": 0, "fp": 0, "tn": 0, "fn": 0} for label in EIGHT_LABELS}
    threshold = 0.5

    for r in results:
        if "error" in r:
            continue

        expected = r.get("expected_labels", {})
        detected = {}
        for sig in r.get("signals", []):
            st = sig["signal_type"]
            detected[st] = max(detected.get(st, 0), sig["confidence"])

        for label in EIGHT_LABELS:
            exp = int(expected.get(label, 0))
            det = 1 if detected.get(label, 0) >= threshold else 0

            if exp == 1 and det == 1:
                counts[label]["tp"] += 1
            elif exp == 0 and det == 1:
                counts[label]["fp"] += 1
            elif exp == 0 and det == 0:
                counts[label]["tn"] += 1
            elif exp == 1 and det == 0:
                counts[label]["fn"] += 1

    return counts


def main():
    parser = argparse.ArgumentParser(description="Run eval cohort")
    parser.add_argument("--version", required=True, help="Version tag (v1 or v2)")
    args = parser.parse_args()

    print(f"Running cohort for version: {args.version}")
    print(f"Base URL: {BASE_URL}")
    run_cohort(args.version)


if __name__ == "__main__":
    main()
