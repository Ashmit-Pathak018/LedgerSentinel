"""Confidence calibration - Platt scaling.

This is the small piece of code the whole thesis rests on.

"Uncertainty should reduce autonomy" is only meaningful if the uncertainty number means
something. An LLM writing "confidence": 0.9 has produced a token, not a probability - it is wrong
about as often at 0.9 as at 0.7. Platt scaling fixes that: fit a one-dimensional logistic
regression mapping raw model scores to observed correctness on a labelled holdout set.

    calibrated = 1 / (1 + exp(A * raw + B))

Fit per label, because Gemma is not equally trustworthy across all eight - it is far better at
spotting an OTP request than at judging investment lure.

    python calibrate.py fit holdout.jsonl     # writes calibration.json
    python calibrate.py report                # reliability table for the pitch

Until a fit exists, IDENTITY is used and calibrated == raw. The report will say so rather than
quietly pretending the numbers are meaningful.
"""

from __future__ import annotations

import json
import math
import pathlib
import sys

import _contracts_path  # noqa: F401
from contracts import SignalType

CALIBRATION_FILE = pathlib.Path(__file__).parent / "calibration.json"

# A=-1, B=0 is the identity map: 1/(1+exp(-raw)) is monotonic in raw, so ordering is preserved
# even before a fit exists.
IDENTITY = (-1.0, 0.0)

_params: dict[str, tuple[float, float]] | None = None


def _load() -> dict[str, tuple[float, float]]:
    global _params
    if _params is None:
        if CALIBRATION_FILE.exists():
            raw = json.loads(CALIBRATION_FILE.read_text())
            _params = {k: tuple(v) for k, v in raw.get("params", {}).items()}
        else:
            _params = {}
    return _params


def is_fitted() -> bool:
    return bool(_load())


def version() -> str:
    if not CALIBRATION_FILE.exists():
        return "uncalibrated"
    return json.loads(CALIBRATION_FILE.read_text()).get("version", "unknown")


def calibrate(label: SignalType, raw_score: float) -> float:
    """Map a raw model score to a calibrated probability."""
    a, b = _load().get(label.value, IDENTITY)
    return round(1.0 / (1.0 + math.exp(a * raw_score + b)), 4)


# ------------------------------------------------------------------------ fitting

def fit(samples: list[tuple[str, float, int]], *, iterations: int = 500, lr: float = 0.1) -> dict:
    """Fit A and B per label by gradient descent on log-loss.

    `samples` is (label, raw_score, was_actually_present). Plain gradient descent keeps this
    dependency-free; sklearn's LogisticRegression would do the same thing.
    """
    by_label: dict[str, list[tuple[float, int]]] = {}
    for label, score, truth in samples:
        by_label.setdefault(label, []).append((score, truth))

    params: dict[str, tuple[float, float]] = {}
    for label, rows in by_label.items():
        if len(rows) < 10:
            print(f"  skip  {label}: only {len(rows)} samples, need >= 10")
            continue
        a, b = IDENTITY
        for _ in range(iterations):
            ga = gb = 0.0
            for score, truth in rows:
                p = 1.0 / (1.0 + math.exp(a * score + b))
                err = p - truth
                ga += err * -score * p * (1 - p) / max(p * (1 - p), 1e-9)
                gb += err * -1.0 * p * (1 - p) / max(p * (1 - p), 1e-9)
            a -= lr * ga / len(rows)
            b -= lr * gb / len(rows)
        params[label] = (round(a, 5), round(b, 5))
        print(f"  fit   {label}: A={a:.4f} B={b:.4f}  ({len(rows)} samples)")
    return params


def reliability(samples: list[tuple[str, float, int]], bins: int = 5) -> str:
    """Reliability table: predicted confidence vs observed accuracy.

    This is the artefact to put on a slide. Well-calibrated means the two columns track each
    other - of the cases we called 0.8, about 80% were genuinely present.
    """
    buckets: dict[int, list[int]] = {}
    for label, score, truth in samples:
        c = calibrate(SignalType(label), score)
        buckets.setdefault(min(int(c * bins), bins - 1), []).append(truth)

    lines = ["  predicted    observed    n", "  ---------    --------    ---"]
    for i in range(bins):
        rows = buckets.get(i, [])
        if not rows:
            continue
        lo, hi = i / bins, (i + 1) / bins
        lines.append(
            f"  {lo:.2f}-{hi:.2f}    {sum(rows) / len(rows):.2f}        {len(rows)}"
        )
    return "\n".join(lines)


def _read(path: str) -> list[tuple[str, float, int]]:
    out = []
    for line in pathlib.Path(path).read_text().splitlines():
        if line.strip():
            d = json.loads(line)
            out.append((d["signal_type"], float(d["raw_score"]), int(d["present"])))
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    if sys.argv[1] == "fit":
        samples = _read(sys.argv[2])
        params = fit(samples)
        CALIBRATION_FILE.write_text(
            json.dumps(
                {"version": f"platt-{len(samples)}n", "params": params}, indent=2
            )
        )
        print(f"\nwrote {CALIBRATION_FILE}")
    elif sys.argv[1] == "report":
        print(f"calibration: {version()}\n")
        print(reliability(_read(sys.argv[2])))
