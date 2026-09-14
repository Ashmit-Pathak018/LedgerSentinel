"""PRISM live tracing.

Sends model calls, tool calls and agent runs to PRISM over HTTP ingest. No SDK required -
httpx is already a dependency, so this adds no new package.

    PRISMTRACE_API_KEY      pt-sk-...
    PRISMTRACE_PROJECT_ID   the project uuid
    PRISMTRACE_HOST         https://prism-api-prod.up.railway.app

Three properties this must keep:

  Never breaks a decision.  Every send is fire-and-forget on a daemon thread and every
                            exception is swallowed. PRISM being slow, down or misconfigured
                            must never delay or fail a fraud analysis. An observability tool
                            that can take the system down is worse than no observability.

  Never leaks a message.    Rule 7: we do not store message bodies, so we do not ship them
                            either. Only REDACTED text reaches this module, and redact()
                            already ran upstream (rule 6). Traces carry the redacted excerpt
                            and the derived signals, never a raw body.

  Off by default.           With no API key set, enabled() is False and every call returns
                            immediately. A fresh clone runs untraced rather than erroring.

session_id groups traces into one trajectory. We reuse the trace_id the analyze endpoint
already mints (prism-xxxxxxxx), so one transaction analysis is one PRISM session covering
its model calls and its gate decision.
"""

from __future__ import annotations

import os
import threading
import time
from typing import Any

import httpx

API_KEY = os.getenv("PRISMTRACE_API_KEY", "").strip()
PROJECT_ID = os.getenv("PRISMTRACE_PROJECT_ID", "").strip()
HOST = os.getenv("PRISMTRACE_HOST", "https://prism-api-prod.up.railway.app").rstrip("/")
TIMEOUT = float(os.getenv("PRISMTRACE_TIMEOUT_SECONDS", "5"))

_warned = False


def enabled() -> bool:
    return bool(API_KEY and PROJECT_ID)


def _post(payload: dict[str, Any]) -> None:
    """Runs on a daemon thread. Swallows everything."""
    global _warned
    try:
        httpx.post(
            f"{HOST}/api/traces",
            json=payload,
            headers={"X-PRISMtrace-Key": API_KEY, "Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
    except Exception as e:  # noqa: BLE001 - observability must never raise into the caller
        if not _warned:
            _warned = True
            print(f"[prism] trace send failed ({type(e).__name__}); continuing untraced")


def trace(
    *,
    session_id: str,
    model: str,
    input_messages: list[dict[str, str]],
    output_message: str,
    latency_ms: float,
    operation: str = "chat",
    agent_name: str | None = None,
    error: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Record one span. Returns immediately; the send happens on a background thread."""
    if not enabled():
        return

    payload: dict[str, Any] = {
        "project_id": PROJECT_ID,
        "session_id": session_id,
        "model": model,
        "input_messages": input_messages,
        "output_message": output_message,
        "latency_ms": round(latency_ms),
        "metadata": {
            "gen_ai.operation.name": operation,
            "service": "ledgersentinel-api",
            **({"gen_ai.agent.name": agent_name} if agent_name else {}),
            **(metadata or {}),
        },
    }
    if error:
        payload["error"] = error
        payload["metadata"]["status"] = "ERROR"

    threading.Thread(target=_post, args=(payload,), daemon=True).start()


class span:
    """Context manager that times a block and traces it, including on exception.

        with prism.span(session_id=trace_id, model="policy-gate",
                        operation="execute_tool", agent_name="policy_gate") as sp:
            action = evaluate(policy_input)
            sp.output = action.type.value
    """

    def __init__(
        self,
        *,
        session_id: str,
        model: str,
        operation: str = "chat",
        agent_name: str | None = None,
        input_messages: list[dict[str, str]] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.session_id = session_id
        self.model = model
        self.operation = operation
        self.agent_name = agent_name
        self.input_messages = input_messages or []
        self.metadata = metadata or {}
        self.output: str = ""
        self._t0 = 0.0

    def __enter__(self) -> "span":
        self._t0 = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        trace(
            session_id=self.session_id,
            model=self.model,
            input_messages=self.input_messages,
            output_message=self.output or ("" if exc is None else f"{exc_type.__name__}: {exc}"),
            latency_ms=(time.perf_counter() - self._t0) * 1000,
            operation=self.operation,
            agent_name=self.agent_name,
            error=None if exc is None else f"{exc_type.__name__}: {exc}",
            metadata=self.metadata,
        )
        return False  # never suppress the caller's exception
