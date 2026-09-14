"""Fire-and-forget PRISM tracing for model-service inference calls."""

from __future__ import annotations

import os
import threading
from typing import Any

import httpx

API_KEY = os.getenv("PRISMTRACE_API_KEY", "").strip()
PROJECT_ID = os.getenv("PRISMTRACE_PROJECT_ID", "").strip()
HOST = os.getenv("PRISMTRACE_HOST", "https://prism-api-prod.up.railway.app").rstrip("/")
TIMEOUT = float(os.getenv("PRISMTRACE_TIMEOUT_SECONDS", "5"))


def enabled() -> bool:
    return bool(API_KEY and PROJECT_ID)


def _post(payload: dict[str, Any]) -> None:
    try:
        httpx.post(
            f"{HOST}/api/traces",
            json=payload,
            headers={"X-PRISMtrace-Key": API_KEY, "Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
    except Exception:
        # Observability must never delay or fail model inference.
        pass


def trace(
    *,
    session_id: str,
    model: str,
    input_summary: str,
    output_summary: str,
    latency_ms: float,
    operation: str,
    agent_name: str,
    metadata: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    if not enabled():
        return

    payload: dict[str, Any] = {
        "project_id": PROJECT_ID,
        "session_id": session_id,
        "model": model,
        "input_messages": [{"role": "user", "content": input_summary[:500]}],
        "output_message": output_summary[:500],
        "latency_ms": round(latency_ms),
        "metadata": {
            "gen_ai.operation.name": operation,
            "gen_ai.agent.name": agent_name,
            "service": "ledgersentinel-model-service",
            **(metadata or {}),
        },
    }
    if error:
        payload["error"] = error[:300]
        payload["metadata"]["status"] = "ERROR"

    threading.Thread(target=_post, args=(payload,), daemon=True).start()
