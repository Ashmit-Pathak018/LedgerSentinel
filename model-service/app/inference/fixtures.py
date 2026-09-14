"""
Fixture loader — returns pre-defined Signal[] for MODELS_MOCK mode
and demo cache mode.

Yashraj's mock endpoints also return this fixture format.
The shape here is the canonical reference — if you change it,
tell Yashraj so he can update the Spring Boot mocks.
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from app.config import get_settings
from app.models.signal import Signal

logger = logging.getLogger(__name__)

_FIXTURE_PATH = Path(__file__).parent.parent.parent / "fixtures" / "fixture_signals.json"
_DEMO_CACHE_PATH_DEFAULT = Path(__file__).parent.parent.parent / "fixtures" / "demo_cache.json"


@lru_cache(maxsize=None)
def _load_json(path: Path) -> list[dict]:
    if not path.exists():
        logger.error("Fixture file not found: %s", path)
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_fixture_signals(source_ref: str = "fixture") -> list[Signal]:
    """Return fixture Signal[] for MODELS_MOCK mode."""
    raw = _load_json(_fixture_PATH_resolved())
    return _parse_signals(raw, source_ref)


def get_demo_cache_signals(source_ref: str) -> list[Signal] | None:
    """
    Return pre-cached Signal[] for a specific source_ref.
    Returns None if source_ref not found in cache.
    """
    settings = get_settings()
    cache_path = Path(settings.DEMO_CACHE_PATH)
    cache = _load_json(cache_path)

    # Cache format: {"source_ref": [...signals...], ...}
    if isinstance(cache, dict):
        raw = cache.get(source_ref)
        if raw is None:
            logger.warning("Demo cache miss for source_ref='%s'", source_ref)
            return None
        return _parse_signals(raw, source_ref)

    # Fallback: cache is a flat array → return all
    return _parse_signals(cache, source_ref)


def _fixture_PATH_resolved() -> Path:
    return _FIXTURE_PATH


def _parse_signals(raw: list[dict], source_ref: str) -> list[Signal]:
    signals = []
    for s in raw:
        try:
            s["source_ref"] = source_ref  # override with caller's ref
            signals.append(Signal(**s))
        except Exception as exc:
            logger.warning("Skipping invalid fixture signal: %s — %s", s, exc)
    return signals
