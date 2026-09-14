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

import advisory
import fusion
import models_client
import prism
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

    # The account's own facts about the counterparty and the session. Dropping these is how the
    # live path came to disagree with the gate on five of eight scenarios: a fixture that says
    # "fourth transfer, each larger than the last" was reaching the API as a bare amount.
    # Phase 3 derives them from Supabase; until then the caller supplies them.
    destination_ref: str | None = None
    prior_transfers_same_beneficiary: list[float] = Field(default_factory=list)
    origin_country: str | None = None
    device_known: bool | None = None

    # Whether the published-advisory index answered. False simulates the outage S07 describes,
    # which is how rule 5 gets demonstrated live instead of merely asserted: the same
    # transaction, with the index down, must move UP the ladder and never approve.
    advisory_index_available: bool = True

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
        "prism_tracing": prism.enabled(),
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
            signals += models_client.score_text(
                comm_id, text, scenario=req.scenario, session_id=trace_id
            )
        except models_client.ModelsUnavailable:
            # Rule 5: a dead model service degrades the analysis. It does not fail it,
            # and it certainly does not approve anything.
            degraded = True
        except models_client.ContractViolation as e:
            raise HTTPException(status_code=422, detail=str(e)) from e

    # 2. Check the signals against published advisories. A known scam shape is evidence in its
    #    own right, and the index being down is a rule-5 degradation, not a clean result.
    advisory_evidence = []
    try:
        advisory_evidence = advisory.lookup(
            signals, available=req.advisory_index_available, now=now
        )
    except advisory.AdvisoryUnavailable:
        degraded = True

    # 3. The account's own facts. Beneficiary history is the half of "high impact" that is not
    #    the amount, and the transfer pattern is evidence in its own right (S02: the pattern is
    #    the case). Then normalise everything to evidence and fuse. Neither step decides anything.
    history = fusion.derive_beneficiary_history(req.destination_ref)
    if req.first_time_beneficiary and history is fusion.BeneficiaryHistory.UNKNOWN:
        history = fusion.BeneficiaryHistory.FIRST_SEEN
    high_value = req.amount >= DEFAULT.high_impact_amount
    home = set(req.home_countries)

    evidence = (
        fusion.signals_to_evidence(signals, now=now)
        + advisory_evidence
        + fusion.transaction_evidence(
            transaction_id=req.transaction_id,
            amount=req.amount,
            currency=req.currency,
            history=history,
            prior_amounts=req.prior_transfers_same_beneficiary,
            now=now,
        )
    )
    assessment = fusion.assess(
        transaction_id=req.transaction_id,
        signals=signals,
        evidence=evidence,
        identity_assurance=req.identity_assurance,
        unusual_destination=bool(req.destination_country) and req.destination_country not in home,
        unusual_location=bool(req.origin_country) and req.origin_country not in home,
        first_time_beneficiary=req.first_time_beneficiary,
        beneficiary_history=history,
        escalating_transfer_pattern=fusion.escalating_pattern(
            req.prior_transfers_same_beneficiary, req.amount
        ),
        high_value=high_value,
        device_known=req.device_known,
        # A real match against a published advisory - not "an impersonation label fired",
        # which is what this used to mean.
        advisory_match=bool(advisory_evidence),
        degraded=degraded,
        model_version="gemma3n-e4b@mock" if models_client.mock_enabled() else "gemma3n-e4b",
        now=now,
    )

    # 4. The gate. The only step that produces an action.
    # High impact is value AND an unexpected counterparty - not the amount alone, which used to
    # hold every large supplier payment on magnitude (S05). See fusion.is_high_impact.
    high_impact = fusion.is_high_impact(high_value, history)
    time_pressure = any(s.signal_type.value in ("urgency", "threat") for s in signals)
    # PRISM: the policy gate is the decision point, so it gets its own span. Not a model
    # call - operation is execute_tool, which is what it is.
    policy_input = _policy_input(
        assessment,
        high_impact,
        time_pressure,
        critical_evidence_ids=tuple(e.evidence_id for e in evidence if e.critical),
    )
    with prism.span(
        session_id=trace_id,
        model=f"policy-gate@{POLICY_VERSION}",
        operation="execute_tool",
        agent_name="policy_gate",
        input_messages=[{
            "role": "user",
            "content": "Authorise an action for this transaction. Decision inputs \u2014 "
                       f"risk score {assessment.risk_score}/100, confidence "
                       f"{assessment.confidence:.2f}, critical evidence "
                       f"{assessment.critical_evidence_present}, high impact "
                       f"{high_impact}, degraded analysis {assessment.degraded}.",
        }],
        metadata={
            "risk_score": assessment.risk_score,
            "confidence": assessment.confidence,
            "degraded": assessment.degraded,
            "policy_version": POLICY_VERSION,
        },
    ) as gate_span:
        action = evaluate(policy_input, now=now)
        gate_span.output = (
            f"Authorised action: {action.type.value}. "
            f"Rationale: {', '.join(action.rationale_refs)}."
        )


    decision = Decision(
        decision_id=f"dec_{uuid.uuid4().hex[:8]}",
        transaction_id=req.transaction_id,
        assessment_id=assessment.assessment_id,
        action=action.type,
        human_required=action.type.requires_human,
        policy_version=POLICY_VERSION,
        # V2: the gate cites critical evidence itself. Appending it here was the V1 bug -
        # citation was bolted on downstream, so anything calling the gate directly lost it.
        rationale_refs=tuple(action.rationale_refs),
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

    prism.trace(
        session_id=trace_id,
        # The whole-analysis span, not the gate. It used to carry the gate's model name, which
        # made every span in PRISM read as policy-gate@... - and `model` is the only field the
        # trace list exposes that distinguishes span types (metadata is not surfaced), so that
        # one label collapsed all three kinds of span into one bucket.
        model=f"ledgersentinel@{POLICY_VERSION}",
        input_messages=[{
            "role": "user",
            "content": f"Analyse transaction {req.transaction_id} for social-engineering "
                       f"fraud: {req.amount} {req.currency} to "
                       f"{req.destination_country or 'domestic'}, with "
                       f"{len(req.communication_ids)} linked communication(s).",
        }],
        output_message=(
            f"Decision: {decision.action.value}. Risk {assessment.risk_score}/100, "
            f"confidence {assessment.confidence:.2f}. "
            + ("Routed to a human analyst." if decision.human_required
               else "No human review required.")
        ),
        latency_ms=(datetime.now(timezone.utc) - now).total_seconds() * 1000,
        operation="invoke_agent",
        agent_name="ledgersentinel",
        metadata={
            "transaction_id": req.transaction_id,
            "action": decision.action.value,
            "risk_score": assessment.risk_score,
            "confidence": assessment.confidence,
            "degraded": degraded,
            "signal_count": len(signals),
        },
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


def _policy_input(
    assessment, high_impact: bool, time_pressure: bool, critical_evidence_ids=()
):
    from contracts import PolicyInput

    return PolicyInput.from_assessment(
        assessment,
        high_impact=high_impact,
        time_pressure=time_pressure,
        critical_evidence_ids=critical_evidence_ids,
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
