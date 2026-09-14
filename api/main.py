"""LedgerSentinel API - :8080

    uvicorn main:app --reload --port 8080

Flow for every analysis:

    redact -> score signals -> normalise to evidence -> fuse -> POLICY GATE -> audit

The gate is the only step that produces an action. Everything before it produces evidence.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dotenv import load_dotenv

# Load api/.env before anything reads os.getenv. Without this, SUPABASE_URL is invisible
# and the store silently falls back to memory - which looks like a Supabase failure but
# is really just an unloaded env file.
load_dotenv()

import _contracts_path  # noqa: F401
from contracts import (
    ActionType,
    Decision,
    IdentityAssurance,
    load_fixture,
)

import fusion
import models_client
import store as store_mod
from policy.gate import evaluate
from policy.thresholds import DEFAULT, POLICY_VERSION
from redaction import redact

app = FastAPI(title="LedgerSentinel API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("WEB_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase when SUPABASE_URL is set, in-memory otherwise. See store.py.
STORE = store_mod.get_store()


class AnalyzeRequest(BaseModel):
    transaction_id: str
    customer_id: str
    amount: float
    currency: str = "USD"
    destination_country: str | None = None
    communication_ids: list[str] = Field(default_factory=list)

    # Transaction-level context. Phase 3 derives these from account history in Supabase;
    # until then the caller supplies them so nothing is silently hardcoded.
    first_time_beneficiary: bool = False
    identity_assurance: IdentityAssurance = IdentityAssurance.BASIC
    home_countries: list[str] = Field(default_factory=lambda: ["IN"])

    scenario: str | None = Field(
        default=None,
        description="Fixture to draw mock signals from while MODELS_MOCK=true.",
    )


@app.get("/v1/health")
def health() -> dict:
    try:
        models = models_client.health()
    except models_client.ModelsUnavailable as e:
        models = {"status": "unavailable", "detail": str(e)}
    return {
        "status": "ok",
        "policy_version": POLICY_VERSION,
        "models_mock": models_client.mock_enabled(),
        "store": STORE.backend,
        "models": models,
    }


@app.post("/v1/transactions/analyze")
def analyze(req: AnalyzeRequest) -> dict:
    now = datetime.now(timezone.utc)
    trace_id = f"prism-{uuid.uuid4().hex[:8]}"
    degraded = False

    # 1. Score each linked communication. Redaction runs first, always (rule 6).
    signals = []
    for comm_id in req.communication_ids or ["comm_771"]:
        text, redactions = redact(_load_comm_text(comm_id, req.scenario))
        try:
            signals += models_client.score_text(comm_id, text, scenario=req.scenario)
        except models_client.ModelsUnavailable:
            # Rule 5: a dead model service degrades the analysis. It does not fail it,
            # and it certainly does not approve anything.
            degraded = True
        except models_client.ContractViolation as e:
            raise HTTPException(status_code=422, detail=str(e)) from e

    # 2. Normalise to evidence, then fuse. Neither step decides anything.
    evidence = fusion.signals_to_evidence(signals, now=now)
    assessment = fusion.assess(
        transaction_id=req.transaction_id,
        signals=signals,
        evidence=evidence,
        identity_assurance=req.identity_assurance,
        unusual_destination=bool(req.destination_country)
        and req.destination_country not in set(req.home_countries),
        first_time_beneficiary=req.first_time_beneficiary,
        advisory_match=any(s.signal_type.value == "authority_impersonation" for s in signals),
        degraded=degraded,
        model_version="gemma3n-e4b@mock" if models_client.mock_enabled() else "gemma3n-e4b",
        now=now,
    )

    # 3. The gate. The only step that produces an action.
    high_impact = req.amount >= DEFAULT.high_impact_amount
    time_pressure = any(s.signal_type.value in ("urgency", "threat") for s in signals)
    action = evaluate(
        fusion_input := _policy_input(assessment, high_impact, time_pressure), now=now
    )

    decision = Decision(
        decision_id=f"dec_{uuid.uuid4().hex[:8]}",
        transaction_id=req.transaction_id,
        assessment_id=assessment.assessment_id,
        action=action.type,
        human_required=action.type.requires_human,
        policy_version=POLICY_VERSION,
        rationale_refs=tuple(action.rationale_refs)
        + tuple(e.evidence_id for e in evidence if e.critical),
        trace_id=trace_id,
        cool_off_seconds=getattr(action, "delay_seconds", None),
        hold_expires_at=getattr(action, "expires_at", None),
        verification_channel=getattr(action, "channel", None),
        created_at=now,
    )

    # 4. Audit. Written on every decision, from the very first commit (rule 8).
    STORE.append_audit(
        {
            "event_id": f"evt_{uuid.uuid4().hex[:8]}",
            "actor": "system",
            "object_id": req.transaction_id,
            "action": decision.action.value,
            "timestamp": now.isoformat(),
            "trace_id": trace_id,
            "policy_version": POLICY_VERSION,
            "model_version": assessment.model_version,
            "degraded": degraded,
        }
    )

    payload = {
        "decision": decision.model_dump(mode="json"),
        "assessment": assessment.model_dump(mode="json"),
        "evidence": [e.model_dump(mode="json") for e in evidence],
        "signals": [s.model_dump(mode="json") for s in signals],
    }
    STORE.save_analysis(req.transaction_id, payload)

    # Anything that stopped the transaction becomes a case a human can pick up.
    if action.type.pauses_transaction:
        STORE.open_case(
            {
                "case_id": f"case_{uuid.uuid4().hex[:8]}",
                "transaction_id": req.transaction_id,
                "decision_id": decision.decision_id,
                "status": "open",
            }
        )
    return payload


@app.get("/v1/transactions/{transaction_id}")
def get_transaction(transaction_id: str) -> dict:
    found = STORE.get_analysis(transaction_id)
    if found is None:
        raise HTTPException(404, f"No analysis for {transaction_id}")
    return found


@app.get("/v1/transactions/{transaction_id}/evidence")
def get_evidence(transaction_id: str) -> list[dict]:
    return get_transaction(transaction_id)["evidence"]


@app.get("/v1/audit")
def get_audit() -> list[dict]:
    return STORE.list_audit()


@app.get("/v1/cases")
def get_cases(status: str | None = None) -> list[dict]:
    return STORE.list_cases(status)


@app.get("/v1/consent/{customer_id}")
def get_consent(customer_id: str) -> dict:
    return {"customer_id": customer_id, "channels": STORE.get_consent(customer_id)}


class ConsentUpdate(BaseModel):
    channel: str
    granted: bool


@app.patch("/v1/consent/{customer_id}")
def set_consent(customer_id: str, body: ConsentUpdate) -> dict:
    """Revoking must actually cut off access, not just hide a button.

    The next analysis for this customer will skip the revoked channel, and by rule 5 the
    resulting loss of context lowers confidence - which moves the decision UP the ladder.
    """
    STORE.set_consent(customer_id, body.channel, body.granted)
    return {"customer_id": customer_id, "channels": STORE.get_consent(customer_id)}


def _policy_input(assessment, high_impact: bool, time_pressure: bool):
    from contracts import PolicyInput

    return PolicyInput.from_assessment(
        assessment, high_impact=high_impact, time_pressure=time_pressure
    )


def _load_comm_text(comm_id: str, scenario: str | None) -> str:
    """Stand-in for the comms store. Phase 3 reads this from Supabase."""
    try:
        fx = load_fixture(scenario or "s01")
    except FileNotFoundError:
        return ""
    for s in fx.get("signals", []):
        if s["source_ref"] == comm_id and s.get("redacted_quote"):
            return s["redacted_quote"]
    return "This is Rajesh from HDFC security. Your account is compromised."
