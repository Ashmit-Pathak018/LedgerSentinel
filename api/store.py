"""Persistence, with an in-memory fallback.

Two implementations behind one interface:

    MemoryStore    dicts. No credentials needed. What you get by default.
    SupabaseStore  Postgres via supabase-py. Used when SUPABASE_URL is set.

The fallback is not a placeholder to delete later - keep it working. It is why the API runs on a
fresh clone with no setup, and it is the demo's safety net if the network dies on stage. Same
pattern as MODELS_MOCK.

⚠ On the service-role key: it BYPASSES every RLS policy in db/migrations/002_rls.sql. Connecting
with it means RLS is documentation, not protection - authorization has to be enforced here, in
the application layer. Prefer the anon key plus a user JWT wherever you can.
"""

from __future__ import annotations

import os
from typing import Any, Protocol


class Store(Protocol):
    def save_analysis(self, transaction_id: str, payload: dict) -> None: ...
    def get_analysis(self, transaction_id: str) -> dict | None: ...
    def append_audit(self, event: dict) -> None: ...
    def list_audit(self, limit: int = 100) -> list[dict]: ...
    def open_case(self, case: dict) -> None: ...
    def list_cases(self, status: str | None = None) -> list[dict]: ...
    def get_consent(self, customer_id: str) -> dict[str, bool]: ...
    def set_consent(self, customer_id: str, channel: str, granted: bool) -> None: ...
    @property
    def backend(self) -> str: ...


class MemoryStore:
    """Process-local. Everything vanishes on restart, which is fine for a demo."""

    def __init__(self) -> None:
        self._analyses: dict[str, dict] = {}
        self._audit: list[dict] = []
        self._cases: dict[str, dict] = {}
        self._consent: dict[str, dict[str, bool]] = {}

    @property
    def backend(self) -> str:
        return "memory"

    def save_analysis(self, transaction_id: str, payload: dict) -> None:
        self._analyses[transaction_id] = payload

    def get_analysis(self, transaction_id: str) -> dict | None:
        return self._analyses.get(transaction_id)

    def append_audit(self, event: dict) -> None:
        self._audit.append(event)

    def list_audit(self, limit: int = 100) -> list[dict]:
        return self._audit[-limit:]

    def open_case(self, case: dict) -> None:
        self._cases[case["case_id"]] = case

    def list_cases(self, status: str | None = None) -> list[dict]:
        rows = list(self._cases.values())
        return [c for c in rows if c.get("status") == status] if status else rows

    def get_consent(self, customer_id: str) -> dict[str, bool]:
        # Default-on for the demo so the happy path works out of the box. In production the
        # default is off and consent is collected explicitly.
        return self._consent.get(
            customer_id, {"sms": True, "email": True, "chat": True, "call": True}
        )

    def set_consent(self, customer_id: str, channel: str, granted: bool) -> None:
        self._consent.setdefault(
            customer_id, {"sms": True, "email": True, "chat": True, "call": True}
        )[channel] = granted


class SupabaseStore:
    """Postgres-backed. Tables and constraints live in db/migrations/."""

    def __init__(self, url: str, key: str) -> None:
        from supabase import create_client  # imported lazily so the dep is optional

        self._db = create_client(url, key)
        self._using_service_key = bool(os.getenv("SUPABASE_SERVICE_KEY")) and key == os.getenv(
            "SUPABASE_SERVICE_KEY"
        )

    @property
    def backend(self) -> str:
        return "supabase" + (" (service role - RLS bypassed)" if self._using_service_key else "")

    def save_analysis(self, transaction_id: str, payload: dict) -> None:
        a, d = payload["assessment"], payload["decision"]

        self._db.table("assessments").upsert(
            {
                "assessment_id": a["assessment_id"],
                "transaction_id": a["transaction_id"],
                "risk_score": a["risk_score"],
                "confidence": a["confidence"],
                "factors": list(a["factors"]),
                "evidence_ids": list(a.get("evidence_ids", [])),
                "identity_assurance": a.get("identity_assurance"),
                "critical_evidence_present": a.get("critical_evidence_present", False),
                "degraded": a.get("degraded", False),
                "model_version": a["model_version"],
            }
        ).execute()

        if payload.get("evidence"):
            self._db.table("evidence").upsert(
                [
                    {
                        "evidence_id": e["evidence_id"],
                        "source_type": e["source_type"],
                        "source_ref": e["source_ref"],
                        "claim": e["claim"],
                        "confidence": e["confidence"],
                        "occurred_at": e["timestamp"],
                        "signal_refs": list(e.get("signal_refs", [])),
                        "redacted_quote": e.get("redacted_quote"),
                        "critical": e.get("critical", False),
                    }
                    for e in payload["evidence"]
                ]
            ).execute()

        self._db.table("decisions").upsert(
            {
                "decision_id": d["decision_id"],
                "transaction_id": d["transaction_id"],
                "assessment_id": d.get("assessment_id"),
                "action": d["action"],
                "human_required": d["human_required"],
                "policy_version": d["policy_version"],
                "rationale_refs": list(d["rationale_refs"]),
                "trace_id": d["trace_id"],
                "proposal_rejected": d.get("proposal_rejected", False),
                "cool_off_seconds": d.get("cool_off_seconds"),
                "hold_expires_at": d.get("hold_expires_at"),
                "verification_channel": d.get("verification_channel"),
            }
        ).execute()

    def get_analysis(self, transaction_id: str) -> dict | None:
        dec = (
            self._db.table("decisions")
            .select("*")
            .eq("transaction_id", transaction_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not dec.data:
            return None
        decision = dec.data[0]

        ass = (
            self._db.table("assessments")
            .select("*")
            .eq("assessment_id", decision["assessment_id"])
            .execute()
        )
        assessment = ass.data[0] if ass.data else {}

        ev = (
            self._db.table("evidence")
            .select("*")
            .in_("evidence_id", assessment.get("evidence_ids") or [])
            .execute()
        )
        return {
            "decision": decision,
            "assessment": assessment,
            "evidence": ev.data or [],
            "signals": [],
        }

    def append_audit(self, event: dict) -> None:
        self._db.table("audit_events").insert(
            {
                "event_id": event["event_id"],
                "actor": event["actor"],
                "object_id": event["object_id"],
                "action": event["action"],
                "occurred_at": event["timestamp"],
                "trace_id": event.get("trace_id"),
                "policy_version": event.get("policy_version"),
                "model_version": event.get("model_version"),
                "degraded": event.get("degraded", False),
            }
        ).execute()

    def list_audit(self, limit: int = 100) -> list[dict]:
        r = (
            self._db.table("audit_events")
            .select("*")
            .order("occurred_at", desc=True)
            .limit(limit)
            .execute()
        )
        return r.data or []

    def open_case(self, case: dict) -> None:
        self._db.table("cases").upsert(case).execute()

    def list_cases(self, status: str | None = None) -> list[dict]:
        q = self._db.table("cases").select("*").order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        return q.execute().data or []

    def get_consent(self, customer_id: str) -> dict[str, bool]:
        r = (
            self._db.table("consents")
            .select("channel, granted")
            .eq("customer_id", customer_id)
            .execute()
        )
        return {row["channel"]: row["granted"] for row in (r.data or [])}

    def set_consent(self, customer_id: str, channel: str, granted: bool) -> None:
        self._db.table("consents").upsert(
            {"customer_id": customer_id, "channel": channel, "granted": granted}
        ).execute()


_store: Store | None = None


def get_store() -> Store:
    """Supabase when configured, memory otherwise. Never raises - a missing database degrades
    to in-memory rather than taking the API down."""
    global _store
    if _store is not None:
        return _store

    url = os.getenv("SUPABASE_URL", "").strip()
    key = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip()

    if url and key:
        try:
            _store = SupabaseStore(url, key)
            print(f"[store] {_store.backend}")
        except Exception as e:  # noqa: BLE001 - any failure falls back rather than crashing
            print(f"[store] Supabase unavailable ({e}); falling back to memory")
            _store = MemoryStore()
    else:
        _store = MemoryStore()
    return _store
