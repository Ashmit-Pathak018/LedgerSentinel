"""
Platt scaling calibration layer.

Raw label scores from Gemma 3n E4B are model vibes, not probabilities.
This module applies a fitted Platt scaler (one logistic regression per label)
to produce calibrated confidence values.

Fitting: see calibration/fit_platt.py
Usage:   apply_calibration(raw_signals) → calibrated signal dicts
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

from app.config import get_settings
from app.prompts.extraction import EIGHT_LABELS

logger = logging.getLogger(__name__)

# Module-level scaler cache (loaded once)
_scalers: dict[str, Any] | None = None
_scaler_missing_warned = False


def _load_scalers() -> dict[str, Any] | None:
    """Load the fitted Platt scalers from disk. Returns None if not fitted yet."""
    global _scalers, _scaler_missing_warned
    if _scalers is not None:
        return _scalers

    settings = get_settings()
    path = Path(settings.CALIBRATION_SCALER_PATH)

    if not path.exists():
        if not _scaler_missing_warned:
            logger.warning(
                "Calibration scaler not found at '%s'. "
                "Running WITHOUT calibration — raw model scores will be used. "
                "Run calibration/fit_platt.py to fix this.",
                path,
            )
            _scaler_missing_warned = True
        return None

    with open(path, "rb") as f:
        _scalers = pickle.load(f)

    logger.info("Calibration scalers loaded from '%s'", path)
    return _scalers


def apply_calibration(raw_signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Apply Platt scaling to raw label scores.

    For each signal in raw_signals:
      - raw signal.value  → calibrated signal.value
      - raw signal.confidence → calibrated signal.confidence
      (both are set to the same calibrated value;
       the policy gate uses confidence, the UI shows value)

    If scalers are not yet fitted, raw scores pass through unchanged
    (with a warning). This keeps the service runnable before P0 calibration.

    Args:
        raw_signals: List of signal dicts straight from Gemma JSON parse.

    Returns:
        Same list with value/confidence fields replaced by calibrated scores.
    """
    scalers = _load_scalers()
    calibrated = []

    for sig in raw_signals:
        label = sig.get("signal_type")
        raw_score = float(sig.get("value", 0.0))

        if scalers is not None and label in scalers:
            scaler = scalers[label]
            # Platt: fit a logistic regression on [[raw_score]] → P(label=1)
            cal_score = float(
                scaler.predict_proba(np.array([[raw_score]]))[0][1]
            )
            cal_score = round(min(max(cal_score, 0.0), 1.0), 4)
        else:
            # Pass-through: no calibration fitted for this label yet
            cal_score = round(min(max(raw_score, 0.0), 1.0), 4)

        calibrated.append({
            **sig,
            "value":      cal_score,
            "confidence": cal_score,
        })

    return calibrated


def reload_scalers() -> None:
    """Force reload scalers from disk (e.g. after re-fitting in Phase 6)."""
    global _scalers
    _scalers = None
    _load_scalers()
