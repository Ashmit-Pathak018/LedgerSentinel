"""LedgerSentinel frozen contracts - Python mirror.

Authoritative source is contracts/json/*.schema.json. Keep this file in sync by hand; if you
change one, change both in the same commit and bump CONTRACTS_VERSION.

Two invariants this module enforces at runtime, not just by convention:

  rule 1  Models emit Signal[]. Only the policy gate emits a Decision. Every wire model sets
          extra="forbid", so a Signal that arrives carrying an `action` field raises instead of
          being silently accepted.

  rule 2  risk_score (0-100, int) and confidence (0-1, float) are separate and mean different
          things. Never combine them into one number.

Shared by api/ and models/ - both import from here so drift is impossible.
"""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Annotated, assert_never

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CONTRACTS_VERSION = "1.0.0"

__all__ = [
    "CONTRACTS_VERSION",
    "SignalType", "ActionType", "IdentityAssurance", "SourceType", "VerificationChannel",
    "Signal", "Evidence", "Assessment", "Decision",
    "Action", "Approve", "Verify", "CoolOff", "Hold", "Escalate", "describe",
    "PolicyInput", "load_fixture",
]


# --------------------------------------------------------------------------- enums

class SignalType(StrEnum):
    """The eight frozen scam-intent labels.

    Adding a ninth is a contract change: agree it with all three owners, update the JSON
    schema and contracts/ts/contracts.ts in the same commit, bump CONTRACTS_VERSION.
    """

    URGENCY = "urgency"
    AUTHORITY_IMPERSONATION = "authority_impersonation"
    SECRECY_REQUEST = "secrecy_request"
    REMOTE_ACCESS_REQUEST = "remote_access_request"
    PAYMENT_REDIRECT = "payment_redirect"
    OTP_REQUEST = "otp_request"
    THREAT = "threat"
    INVESTMENT_LURE = "investment_lure"

    @property
    def label(self) -> str:
        """Human readable. Never show a raw enum value to an analyst."""
        return _SIGNAL_LABELS[self]


_SIGNAL_LABELS: dict[SignalType, str] = {
    SignalType.URGENCY: "Time pressure",
    SignalType.AUTHORITY_IMPERSONATION: "Impersonating authority",
    SignalType.SECRECY_REQUEST: "Asked to keep it secret",
    SignalType.REMOTE_ACCESS_REQUEST: "Remote access requested",
    SignalType.PAYMENT_REDIRECT: "Payment redirected",
    SignalType.OTP_REQUEST: "OTP requested",
    SignalType.THREAT: "Threat or intimidation",
    SignalType.INVESTMENT_LURE: "Investment lure",
}


class ActionType(StrEnum):
    """The ladder, declared in DESCENDING order of AI autonomy.

    HOLD and ESCALATE both pause the transaction. The difference is who may release it: an
    analyst can release a HOLD; an ESCALATE requires a named human and the system may never
    release it on its own.
    """

    APPROVE = "APPROVE"
    VERIFY = "VERIFY"
    COOL_OFF = "COOL_OFF"
    HOLD = "HOLD"
    ESCALATE = "ESCALATE"

    @property
    def severity(self) -> int:
        """0 (APPROVE) to 4 (ESCALATE). Higher means less AI autonomy."""
        return _LADDER.index(self)

    @property
    def requires_human(self) -> bool:
        return self is ActionType.ESCALATE

    @property
    def pauses_transaction(self) -> bool:
        return self.severity >= ActionType.COOL_OFF.severity

    @staticmethod
    def most_restrictive(a: ActionType, b: ActionType) -> ActionType:
        """The ladder only ratchets upward.

        Use this when combining rules, so a system that is uncertain can never end up with
        more autonomy than one that is certain.
        """
        return a if a.severity >= b.severity else b


_LADDER: tuple[ActionType, ...] = (
    ActionType.APPROVE,
    ActionType.VERIFY,
    ActionType.COOL_OFF,
    ActionType.HOLD,
    ActionType.ESCALATE,
)


class IdentityAssurance(StrEnum):
    """Feeds confidence, never risk.

    A weakly verified customer does not make a transaction more dangerous; it makes us less
    sure about it.
    """

    NONE = "NONE"
    BASIC = "BASIC"
    VERIFIED = "VERIFIED"
    STRONG = "STRONG"

    @property
    def confidence_multiplier(self) -> float:
        """Applied during fusion. Illustrative values - tune in config, never in prompts."""
        return {"NONE": 0.60, "BASIC": 0.80, "VERIFIED": 1.00, "STRONG": 1.00}[self.value]


class SourceType(StrEnum):
    COMMUNICATION = "communication"
    TRANSACTION = "transaction"
    ADVISORY = "advisory"
    IDENTITY = "identity"


class VerificationChannel(StrEnum):
    """Out-of-band channels. A channel the scammer is already sitting on is not out-of-band."""

    APP_PUSH = "app_push"
    BRANCH_CALLBACK = "branch_callback"
    REGISTERED_EMAIL = "registered_email"
    IN_PERSON = "in_person"


Unit = Annotated[float, Field(ge=0.0, le=1.0)]


# ----------------------------------------------------------------- wire contracts

class _Frozen(BaseModel):
    """Base for every wire contract.

    extra="forbid" is doing real work here: it is what makes a Signal carrying an `action`
    field raise instead of being quietly accepted. Rule 1, enforced at the boundary.
    """

    model_config = ConfigDict(extra="forbid", frozen=True, use_enum_values=False)


class Signal(_Frozen):
    """One scam-intent indicator extracted from a single communication.

    A Signal describes evidence. There is deliberately nowhere in this model to put an action,
    a recommendation, or a decision.
    """

    signal_type: SignalType
    value: Unit = Field(description="Raw pre-calibration score. Debugging only.")
    confidence: Unit = Field(description="CALIBRATED, post-Platt. This is the one you use.")
    source_ref: str = Field(min_length=1)
    evidence_span: tuple[int, int] | None = None
    redacted_quote: str | None = Field(default=None, max_length=200)
    model_version: str | None = None

    @field_validator("evidence_span")
    @classmethod
    def _span_ordered(cls, v: tuple[int, int] | None) -> tuple[int, int] | None:
        if v is not None and v[0] >= v[1]:
            raise ValueError(f"evidence_span must be [start, end) with start < end, got {v}")
        return v


class Evidence(_Frozen):
    """A normalised, storable claim.

    Note what this cannot hold: a message body. Only a claim, a pointer back to the source,
    and at most one short redacted quote.
    """

    evidence_id: str = Field(pattern=r"^ev_[A-Za-z0-9_-]+$")
    source_type: SourceType
    source_ref: str = Field(min_length=1)
    claim: str = Field(min_length=1, max_length=400)
    confidence: Unit
    timestamp: datetime
    signal_refs: tuple[str, ...] = ()
    redacted_quote: str | None = Field(default=None, max_length=200)
    critical: bool = Field(
        default=False,
        description="Strong enough alone to force the top of the ladder. Critical evidence "
                    "MUST be consumed before a decision can be proposed.",
    )


class Assessment(_Frozen):
    """Fusion output, and the input the policy gate reasons over.

    Not a decision - it has no action field, by design.
    """

    assessment_id: str = Field(pattern=r"^as_[A-Za-z0-9_-]+$")
    transaction_id: str = Field(min_length=1)
    risk_score: int = Field(ge=0, le=100, description="How bad this looks.")
    confidence: Unit = Field(description="How sure we are. Independent of risk_score.")
    factors: tuple[str, ...] = Field(min_length=1)
    evidence_ids: tuple[str, ...] = ()
    identity_assurance: IdentityAssurance | None = None
    critical_evidence_present: bool = False
    degraded: bool = Field(
        default=False,
        description="A component failed. Must lower confidence; can never yield APPROVE.",
    )
    model_version: str = Field(min_length=1)
    created_at: datetime | None = None


class Decision(_Frozen):
    """The authorised outcome.

    ONLY the deterministic policy gate constructs one of these. Given the same Assessment and
    the same policy_version the gate returns the same action - that reproducibility is what
    makes the PRISM V1 vs V2 comparison meaningful.
    """

    decision_id: str = Field(pattern=r"^dec_[A-Za-z0-9_-]+$")
    transaction_id: str = Field(min_length=1)
    assessment_id: str | None = None
    action: ActionType
    human_required: bool
    policy_version: str = Field(min_length=1)
    rationale_refs: tuple[str, ...] = Field(
        min_length=1,
        description="ev_* and rule.* ids. Empty means a decision nobody can explain.",
    )
    trace_id: str = Field(min_length=1)
    proposal_rejected: bool = False
    cool_off_seconds: int | None = Field(default=None, ge=1)
    hold_expires_at: datetime | None = None
    verification_channel: VerificationChannel | None = None
    created_at: datetime | None = None

    @model_validator(mode="after")
    def _action_specific_rules(self) -> Decision:
        """Mirrors the conditional `allOf` rules in decision.schema.json.

        This has to be a model validator rather than three field validators: a field validator
        does not run for a field that was never supplied, so an absent verification_channel
        would slip through unchecked.
        """
        if self.action is ActionType.ESCALATE and not self.human_required:
            raise ValueError(
                "ESCALATE requires human_required=True - high-impact uncertainty always "
                "reaches a person (rule 5)"
            )
        if self.action is ActionType.COOL_OFF and self.cool_off_seconds is None:
            raise ValueError("COOL_OFF requires cool_off_seconds")
        if self.action is ActionType.VERIFY and self.verification_channel is None:
            raise ValueError(
                "VERIFY requires an out-of-band verification_channel - a channel the scammer "
                "is already sitting on is not out-of-band"
            )
        return self


# ------------------------------------------------------- internal domain model

# The Python equivalent of a Java sealed interface. Each rung carries its own data, and
# `assert_never` below makes mypy fail the build on a match that misses one - so adding a
# sixth rung breaks every incomplete match until somebody decides what it means.


@dataclass(frozen=True, slots=True)
class Approve:
    rationale_refs: tuple[str, ...]
    type: ActionType = ActionType.APPROVE


@dataclass(frozen=True, slots=True)
class Verify:
    channel: VerificationChannel
    rationale_refs: tuple[str, ...]
    type: ActionType = ActionType.VERIFY


@dataclass(frozen=True, slots=True)
class CoolOff:
    delay_seconds: int
    rationale_refs: tuple[str, ...]
    type: ActionType = ActionType.COOL_OFF


@dataclass(frozen=True, slots=True)
class Hold:
    expires_at: datetime
    rationale_refs: tuple[str, ...]
    type: ActionType = ActionType.HOLD


@dataclass(frozen=True, slots=True)
class Escalate:
    reason: str
    rationale_refs: tuple[str, ...]
    type: ActionType = ActionType.ESCALATE


Action = Approve | Verify | CoolOff | Hold | Escalate


def describe(a: Action) -> str:
    """Reference for the exhaustiveness pattern - copy this shape in the policy gate.

    Delete a `case` and mypy reports the match as non-exhaustive at the assert_never line.
    That is the safety property: an unhandled rung fails the build, not production.
    """
    match a:
        case Approve():
            return "proceeding"
        case Verify(channel=c):
            return f"step-up challenge via {c.value}"
        case CoolOff(delay_seconds=s):
            return f"delayed {s}s"
        case Hold(expires_at=t):
            return f"held until {t.isoformat()}"
        case Escalate(reason=r):
            return f"human decision required: {r}"
        case _:
            assert_never(a)


@dataclass(frozen=True, slots=True)
class PolicyInput:
    """Everything the policy gate is allowed to look at.

    Deliberately small. The gate must be a pure function of these fields - no database reads,
    no model calls, no ambient clock - so the same input always yields the same action and the
    whole thing is trivially unit-testable.

    If you want to add a field, ask whether the gate needs it or whether it belongs in fusion.
    The smaller this stays, the more defensible the gate is.
    """

    risk_score: int
    confidence: float
    critical_evidence: bool = False
    high_impact: bool = False
    time_pressure: bool = False
    degraded: bool = False
    identity_assurance: IdentityAssurance | None = None

    def __post_init__(self) -> None:
        if not 0 <= self.risk_score <= 100:
            raise ValueError(f"risk_score must be in [0,100], got {self.risk_score}")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"confidence must be in [0,1], got {self.confidence}")

    @classmethod
    def from_assessment(
        cls, a: Assessment, *, high_impact: bool, time_pressure: bool
    ) -> PolicyInput:
        return cls(
            risk_score=a.risk_score,
            confidence=a.confidence,
            critical_evidence=a.critical_evidence_present,
            high_impact=high_impact,
            time_pressure=time_pressure,
            degraded=a.degraded,
            identity_assurance=a.identity_assurance,
        )


# ----------------------------------------------------------------------- helpers

_FIXTURES = pathlib.Path(__file__).resolve().parent.parent / "fixtures"


def load_fixture(scenario: str) -> dict:
    """Load a scenario fixture by id or filename stem, e.g. load_fixture("s01").

    Both api/ and models/ build against these before anything real exists.
    """
    stem = scenario.lower().removesuffix(".json")
    for path in sorted(_FIXTURES.glob("*.json")):
        if path.stem.lower().startswith(stem):
            return json.loads(path.read_text(encoding="utf-8"))
    available = ", ".join(p.stem for p in sorted(_FIXTURES.glob("*.json")))
    raise FileNotFoundError(f"No fixture matching {scenario!r}. Available: {available}")
