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
import pickle
import sys
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


def fit_platt(
    raw_scores: dict[str, np.ndarray],
    y_true:     dict[str, np.ndarray],
) -> dict[str, LogisticRegression]:
    """Fit one logistic regression per label (Platt scaling)."""
    scalers: dict[str, LogisticRegression] = {}

    for label in EIGHT_LABELS:
        X = raw_scores[label].reshape(-1, 1)
        y = y_true[label]

        n_pos = int(y.sum())
        n_neg = int(len(y) - n_pos)

        if n_pos == 0 or n_neg == 0:
            logger.warning(
                "Label '%s' has %d positives, %d negatives — skipping fit (will use pass-through).",
                label, n_pos, n_neg,
            )
            continue

        lr = LogisticRegression(solver="lbfgs", max_iter=1000)
        lr.fit(X, y)
        scalers[label] = lr

        # Calibration quality check
        cal_probs = lr.predict_proba(X)[:, 1]
        brier = brier_score_loss(y, cal_probs)
        logger.info(
            "  %-25s  pos=%3d  neg=%3d  brier=%.4f",
            label, n_pos, n_neg, brier,
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


if __name__ == "__main__":
    main()
