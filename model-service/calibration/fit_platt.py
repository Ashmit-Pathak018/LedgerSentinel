"""
Fit Platt scaling layer over Gemma 3n E4B raw label scores.

Usage:
    python calibration/fit_platt.py

Reads:
    data/processed/holdout.jsonl   — labelled holdout set
    (each line: {"text": ..., "labels": {"urgency": 0/1, ...}, "gemma_raw": {"urgency": 0.82, ...}})

Writes:
    calibration/scaler.pkl         — one LogisticRegression per label

The holdout is NEVER used for prompt iteration.
Contaminate it and the calibration slide is a lie.
"""

from __future__ import annotations

import json
import logging
import os
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss

# ── Config ────────────────────────────────────────────────────────────────────
HOLDOUT_PATH = Path("data/processed/holdout.jsonl")
SCALER_OUTPUT = Path("calibration/scaler.pkl")
EIGHT_LABELS = [
    "urgency",
    "authority_impersonation",
    "secrecy_request",
    "remote_access_request",
    "payment_redirect",
    "otp_request",
    "threat",
    "investment_lure",
]

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)


def load_holdout(path: Path) -> tuple[dict[str, np.ndarray], dict[str, np.ndarray]]:
    """Load holdout JSONL → per-label arrays of raw scores and ground truth."""
    raw_scores: dict[str, list[float]] = {l: [] for l in EIGHT_LABELS}
    y_true:     dict[str, list[int]]   = {l: [] for l in EIGHT_LABELS}

    with open(path, encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            gemma_raw = row.get("gemma_raw", {})
            labels    = row.get("labels", {})
            for label in EIGHT_LABELS:
                raw_scores[label].append(float(gemma_raw.get(label, 0.0)))
                y_true[label].append(int(labels.get(label, 0)))

    return (
        {l: np.array(v) for l, v in raw_scores.items()},
        {l: np.array(v) for l, v in y_true.items()},
    )


def fit_one(x: np.ndarray, y: np.ndarray) -> LogisticRegression:
    """Platt scaling proper, for one label: sigmoid(a·score + b), fit as Platt described it.

    Two things sklearn's defaults get wrong for this job, both of which bit us:

      No regularisation.   LogisticRegression defaults to C=1.0, an L2 penalty sized for
                           many features and many rows. On one feature and twenty rows it
                           crushes the slope toward the base rate: a raw 0.95 for
                           remote_access_request came out as 0.24. The API drops any signal
                           under PRESENCE_FLOOR (0.50), so that scaler would have silently
                           erased the two labels that force an escalation. C is set very
                           large, which is the unregularised fit Platt scaling means.

      Smoothed targets.    With this few points the classes are near-separable and an
                           unregularised fit goes vertical - every positive becomes 0.999.
                           Platt's own fix: train on t+ = (N+ + 1)/(N+ + 2) and
                           t- = 1/(N- + 2) instead of 1 and 0. sklearn only takes hard
                           labels, so each row is entered twice, as a positive weighted t
                           and a negative weighted 1 - t, which is the same likelihood.

    The evaluator in eval/evaluators.py imports this function so that what it measures is
    exactly what the service applies. Change it here, not there.
    """
    n_pos = int(y.sum())
    n_neg = int(len(y) - n_pos)
    t_pos = (n_pos + 1.0) / (n_pos + 2.0)
    t_neg = 1.0 / (n_neg + 2.0)
    t = np.where(y == 1, t_pos, t_neg)

    X2 = np.concatenate([x, x]).reshape(-1, 1)
    y2 = np.concatenate([np.ones_like(y), np.zeros_like(y)])
    w2 = np.concatenate([t, 1.0 - t])

    lr = LogisticRegression(C=1e6, solver="lbfgs", max_iter=5000)
    lr.fit(X2, y2, sample_weight=w2)
    return lr


def fit_platt(
    raw_scores: dict[str, np.ndarray],
    y_true:     dict[str, np.ndarray],
) -> dict[str, LogisticRegression]:
    """Fit one logistic regression per label (Platt scaling)."""
    scalers: dict[str, LogisticRegression] = {}

    for label in EIGHT_LABELS:
        X = raw_scores[label]
        y = y_true[label]

        n_pos = int(y.sum())
        n_neg = int(len(y) - n_pos)

        if n_pos == 0 or n_neg == 0:
            logger.warning(
                "Label '%s' has %d positives, %d negatives — skipping fit (will use pass-through).",
                label, n_pos, n_neg,
            )
            continue

        lr = fit_one(X, y)
        scalers[label] = lr

        # Calibration quality check. In-sample, so optimistic - the honest number is the
        # leave-one-out ECE that eval/run.py reports.
        cal_probs = lr.predict_proba(X.reshape(-1, 1))[:, 1]
        brier = brier_score_loss(y, cal_probs)
        logger.info(
            "  %-25s  pos=%3d  neg=%3d  brier=%.4f   raw 0.9 -> %.2f, raw 0.0 -> %.2f",
            label, n_pos, n_neg, brier,
            lr.predict_proba([[0.9]])[0][1], lr.predict_proba([[0.0]])[0][1],
        )

    return scalers


def main() -> None:
    if not HOLDOUT_PATH.exists():
        logger.error(
            "Holdout file not found at '%s'. "
            "Generate labelled data first (see data/provenance.md).",
            HOLDOUT_PATH,
        )
        logger.info(
            "TIP: Create a JSONL file where each line has:\n"
            '  {"text": "...", "labels": {"urgency": 1, ...}, "gemma_raw": {"urgency": 0.82, ...}}\n'
            "  gemma_raw = Gemma's raw scores BEFORE calibration.\n"
            "  labels    = ground truth (0 or 1) per label."
        )
        sys.exit(1)

    logger.info("Loading holdout from %s", HOLDOUT_PATH)
    raw_scores, y_true = load_holdout(HOLDOUT_PATH)

    n_samples = len(next(iter(y_true.values())))
    logger.info("Holdout size: %d samples", n_samples)

    if n_samples < 30:
        logger.warning(
            "Only %d samples — calibration will be noisy. Target 150+.",
            n_samples,
        )

    logger.info("Fitting Platt scalers:")
    scalers = fit_platt(raw_scores, y_true)

    SCALER_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(SCALER_OUTPUT, "wb") as f:
        pickle.dump(scalers, f)
    logger.info("Saved %d scalers to %s", len(scalers), SCALER_OUTPUT)

    # A scaler is only valid for the model whose raw scores it was fit on (rule 8). Record
    # which, so a Gemma scaler is never quietly applied to Qwen output or vice versa.
    try:
        # Run as `python calibration/fit_platt.py`, sys.path[0] is calibration/, not the
        # service root, so `app` is not importable without this.
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from app.config import get_settings  # the service's own view of .env

        model_version = get_settings().MODEL_VERSION
    except Exception:  # noqa: BLE001 - run from outside model-service/, or field renamed
        model_version = os.getenv("MODEL_VERSION", "unknown")
    meta = {
        "model_version": model_version,
        "holdout_rows": n_samples,
        "labels_fitted": sorted(scalers),
        "fitted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    SCALER_OUTPUT.with_suffix(".meta.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )
    logger.info("Scaler metadata: %s", meta)


if __name__ == "__main__":
    main()
