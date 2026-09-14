
from __future__ import annotations

import json
import pathlib
import time
import urllib.request

BASE_URL = "http://localhost:8000"
SCENARIOS_PATH = pathlib.Path("eval/scenarios.json")
CACHE_PATH = pathlib.Path("fixtures/demo_cache.json")
HOLDOUT_PATH = pathlib.Path("data/processed/holdout.jsonl")

LABELS = [
    "urgency",
    "authority_impersonation",
    "secrecy_request",
    "remote_access_request",
    "payment_redirect",
    "otp_request",
    "threat",
    "investment_lure",
]

BENIGN_TEXTS = [
    ("NEG01", "Your order has been shipped and will arrive by Thursday. You can track the delivery from the official order page."),
    ("NEG02", "Team, the sprint review is scheduled for 4 PM today. Please update your Jira tickets before the meeting."),
    ("NEG03", "Reminder: your electricity bill of Rs 1,240 is due on 20 September. You can pay through the official provider application."),
    ("NEG04", "Your doctor appointment is confirmed for 16 September at 10:30 AM. Please bring your previous reports."),
    ("NEG05", "Your PF statement for FY 2025-26 is now available on the official EPFO portal."),
    ("NEG06", "Congratulations on completing the training module. Your certificate is ready for download."),
    ("NEG07", "This is a reminder that your gym membership renews on 1 October. No action is required today."),
    ("NEG08", "Your railway ticket is confirmed. The train departs at 06:45 on 18 September."),
    ("NEG09", "Hi Priya, could you please review the attached proposal and share your feedback by the end of the day?"),
    ("NEG10", "Your return request has been approved. The refund will appear in your account within 3 to 5 business days."),
]

def post_score(source_ref: str, text: str) -> dict:
    payload = json.dumps({
        "source_ref": source_ref,
        "text": text
    }).encode()

    req = urllib.request.Request(
        f"{BASE_URL}/model/text/score",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read())

def signal_scores(signals):
    scores = {label: 0.0 for label in LABELS}

    for signal in signals:
        label = signal.get("signal_type")
        if label in scores:
            scores[label] = float(signal.get("value", 0.0))

    return scores

def main():
    scenarios = json.loads(
        SCENARIOS_PATH.read_text(encoding="utf-8")
    )

    cache = json.loads(
        CACHE_PATH.read_text(encoding="utf-8")
    )

    rows = []

    print("=" * 65)
    print("CALIBRATION HOLDOUT BUILD")
    print("=" * 65)
    print()
    print("Reusing cached PRISM scenarios: 10")
    print("New Gemma inference calls: 10 benign examples ONLY")
    print()

    # ------------------------------------------------------------
    # Reuse existing cached scenarios.
    # NO MODEL CALLS HERE.
    # ------------------------------------------------------------

    print("Loading cached PRISM outputs...")

    for scenario in scenarios:
        sid = scenario["id"]

        if sid not in cache:
            raise RuntimeError(
                f"Missing cached scenario: {sid}"
            )

        signals = cache[sid]

        rows.append({
            "source_ref": sid,
            "text": scenario["text"],
            "labels": scenario["expected_labels"],
            "gemma_raw": signal_scores(signals),
        })

        print(
            f"  {sid}: {len(signals)} cached signals"
        )

    # ------------------------------------------------------------
    # Only new inference: benign examples.
    # ------------------------------------------------------------

    print()
    print("Running 10 NEW benign examples...")
    print()

    zero_labels = {label: 0 for label in LABELS}

    for i, (sid, text) in enumerate(BENIGN_TEXTS, 1):
        print(
            f"  [{i}/10] {sid} ...",
            end="",
            flush=True,
        )

        start = time.perf_counter()

        try:
            response = post_score(sid, text)
            signals = response.get("signals", [])

            elapsed = (time.perf_counter() - start) * 1000

            rows.append({
                "source_ref": sid,
                "text": text,
                "labels": zero_labels.copy(),
                "gemma_raw": signal_scores(signals),
            })

            print(
                f" {len(signals)} signals "
                f"({elapsed:.0f} ms)"
            )

        except Exception as exc:
            print(f" ERROR: {exc}")
            raise

    # ------------------------------------------------------------
    # Write holdout.
    # ------------------------------------------------------------

    HOLDOUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with HOLDOUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as f:
        for row in rows:
            f.write(
                json.dumps(
                    row,
                    ensure_ascii=False,
                ) + "\n"
            )

    print()
    print("=" * 65)
    print(
        f"Wrote {HOLDOUT_PATH} "
        f"({len(rows)} rows)"
    )
    print("=" * 65)

    print()
    print("Per-label distribution:")

    for label in LABELS:
        positives = sum(
            row["labels"].get(label, 0) == 1
            for row in rows
        )
        negatives = sum(
            row["labels"].get(label, 0) == 0
            for row in rows
        )

        print(
            f"  {label:<28} "
            f"POS={positives:2d} NEG={negatives:2d}"
        )

if __name__ == "__main__":
    main()
