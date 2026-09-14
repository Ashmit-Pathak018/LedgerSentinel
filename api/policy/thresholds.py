"""Policy thresholds.

Rule 9: thresholds live in config, never in prompts. This module is the config.

These are illustrative prototype values, NOT banking rules. Production thresholds would require
historical validation, institution-specific policy, model-risk governance and compliance approval.
Say that out loud if a judge asks.

Bump POLICY_VERSION whenever a value here changes - the PRISM V1/V2 comparison is only meaningful
if every Decision records which ruleset produced it.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

POLICY_VERSION = "policy-1.2"


@dataclass(frozen=True, slots=True)
class Thresholds:
    """Every number the gate is allowed to consult."""

    # Risk bands, 0-100.
    approve_below: int = 30
    verify_at: int = 30
    hold_at: int = 60
    escalate_at: int = 85

    # Below this confidence we step up to VERIFY regardless of how low risk looks.
    min_confidence: float = 0.75

    # Below this confidence, a HIGH-IMPACT transaction goes straight to a human - even when risk
    # looks unremarkable. This is the "escalation safety" evaluator in the PRD: high-impact
    # uncertainty must reach a person 100% of the time. Without this rule, a case with genuinely
    # conflicting evidence lands on HOLD and an analyst can release it without anyone having
    # weighed the contradiction. That is the exact shape of an expensive mistake.
    escalate_confidence_floor: float = 0.55

    # A transaction at or above this is high-impact and cannot be quietly approved.
    high_impact_amount: float = 10_000.0

    # How long COOL_OFF delays a transaction. Long enough to outlast a scammer on the phone,
    # short enough that a legitimate customer is not badly inconvenienced.
    cool_off_seconds: int = 1_800  # 30 minutes

    # Holds are time-boxed and reversible by design - they are never indefinite.
    hold_duration_seconds: int = 86_400  # 24 hours

    @classmethod
    def from_env(cls) -> Thresholds:
        """Override any threshold from the environment, for eval sweeps and the V2 rerun."""

        def _i(name: str, default: int) -> int:
            return int(os.getenv(f"POLICY_{name.upper()}", default))

        def _f(name: str, default: float) -> float:
            return float(os.getenv(f"POLICY_{name.upper()}", default))

        return cls(
            approve_below=_i("approve_below", cls.approve_below),
            verify_at=_i("verify_at", cls.verify_at),
            hold_at=_i("hold_at", cls.hold_at),
            escalate_at=_i("escalate_at", cls.escalate_at),
            min_confidence=_f("min_confidence", cls.min_confidence),
            escalate_confidence_floor=_f(
                "escalate_confidence_floor", cls.escalate_confidence_floor
            ),
            high_impact_amount=_f("high_impact_amount", cls.high_impact_amount),
            cool_off_seconds=_i("cool_off_seconds", cls.cool_off_seconds),
            hold_duration_seconds=_i("hold_duration_seconds", cls.hold_duration_seconds),
        )


DEFAULT = Thresholds()
