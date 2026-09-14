"""Published fraud-advisory lookup.

The missing third evidence source. `SourceType.ADVISORY` has been in the frozen contract since
the start and nothing produced it, which quietly broke three things:

  - `advisory_match` was faked in main.py as "is there an authority_impersonation signal?".
    That is not an advisory match, it is one label wearing an advisory's name.
  - S07 ("the advisory index is down mid-analysis") could never actually degrade, so the one
    scenario that tests rule 5 end to end was passing for the wrong reason.
  - An analyst reading a decision could not see that the pattern was already published and
    known, only that some labels fired.

What this is NOT. A real deployment queries a maintained index of institution and regulator
advisories. This is a small in-repo table with the same interface, so the pipeline shape is
honest even though the corpus is illustrative. Say that out loud if a judge asks - the same
caveat as thresholds.py.

Availability is an input, not a global. `AnalyzeRequest.advisory_index_available` lets the
caller simulate an outage, which is what makes rule 5 demonstrable on stage rather than
theoretical: flip it off and watch the same transaction move UP the ladder.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime

import _contracts_path  # noqa: F401  (puts contracts/py on sys.path)
from contracts import Evidence, Signal, SignalType, SourceType

__all__ = ["Advisory", "AdvisoryUnavailable", "ADVISORIES", "lookup"]


class AdvisoryUnavailable(Exception):
    """The advisory index did not answer.

    Rule 5: callers must treat this as degraded - lower confidence, move up the ladder.
    Never as a reason to approve. It is not an error the customer should pay for.
    """


@dataclass(frozen=True, slots=True)
class Advisory:
    """One published advisory, matched by the combination of labels it describes."""

    advisory_id: str
    pattern: frozenset[SignalType]
    claim: str

    def matches(self, present: set[SignalType]) -> bool:
        # Every label the advisory names must be present. A partial match is not a match -
        # "impersonation alone" describes a cold call, not this documented scam.
        return self.pattern <= present


# Deliberately small and pattern-based rather than keyword-based: the point is that a
# *combination* of labels is a known scam shape, which is exactly what a single label is not.
ADVISORIES: tuple[Advisory, ...] = (
    Advisory(
        "adv_0032",
        frozenset({SignalType.AUTHORITY_IMPERSONATION, SignalType.PAYMENT_REDIRECT}),
        "Published advisory describes this exact pattern: someone impersonating bank "
        "security directing a transfer to a so-called safe account.",
    ),
    Advisory(
        "adv_0041",
        frozenset({SignalType.INVESTMENT_LURE, SignalType.URGENCY}),
        "Published advisory describes this exact pattern: a time-limited investment "
        "opportunity pressed on the customer by an unsolicited contact.",
    ),
    Advisory(
        "adv_0055",
        frozenset({SignalType.REMOTE_ACCESS_REQUEST, SignalType.OTP_REQUEST}),
        "Published advisory describes this exact pattern: remote-access software installed "
        "under a support pretext, followed by a request for a one-time passcode.",
    ),
    Advisory(
        "adv_0068",
        frozenset({SignalType.AUTHORITY_IMPERSONATION, SignalType.SECRECY_REQUEST}),
        "Published advisory describes this exact pattern: an impersonated official "
        "instructing the customer not to discuss the transfer with branch staff.",
    ),
)

# Only labels the model was actually confident about can match an advisory. Same floor fusion
# uses, imported there rather than duplicated - see fusion.PRESENCE_FLOOR.
_PRESENCE_FLOOR = 0.50


def _id(*parts: str) -> str:
    """Deterministic ids, so re-running a scenario produces identical output."""
    return "ev_" + hashlib.sha1("|".join(parts).encode()).hexdigest()[:8]


def lookup(
    signals: list[Signal], *, available: bool = True, now: datetime
) -> list[Evidence]:
    """Return ADVISORY evidence for every published pattern these signals match.

    Raises AdvisoryUnavailable when the index is down. Callers degrade (rule 5); they do not
    swallow it, because an unchecked transaction is not the same as a clean one.
    """
    if not available:
        raise AdvisoryUnavailable("advisory index unavailable")

    present = {s.signal_type for s in signals if s.confidence >= _PRESENCE_FLOOR}

    out: list[Evidence] = []
    for adv in ADVISORIES:
        if not adv.matches(present):
            continue
        refs = tuple(sorted(s.value for s in adv.pattern))
        out.append(
            Evidence(
                evidence_id=_id(adv.advisory_id, *refs),
                source_type=SourceType.ADVISORY,
                source_ref=adv.advisory_id,
                claim=adv.claim,
                # An advisory is a published document, not an inference. Our confidence that it
                # matches is bounded by our confidence in the labels that matched it.
                confidence=round(
                    min(
                        s.confidence
                        for s in signals
                        if s.signal_type in adv.pattern
                        and s.confidence >= _PRESENCE_FLOOR
                    ),
                    3,
                ),
                timestamp=now,
                signal_refs=refs,
                # Deliberately NOT critical. `critical` forces ESCALATE unconditionally, and it
                # is reserved for labels that are unambiguous on their own (fusion.CRITICAL:
                # remote access, OTP requests). A published pattern raises risk sharply and is
                # highly citable, but plenty of advisories describe shapes that a step-up
                # verification resolves - S02 and S08 both match one and are meant to HOLD, not
                # escalate. Marking these critical would collapse three rungs of the ladder
                # into one, which is the opposite of bounded autonomy.
                critical=False,
            )
        )
    return out
