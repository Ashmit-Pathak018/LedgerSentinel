# Frozen contracts

**This folder is the single source of truth for every data shape that crosses a boundary in
LedgerSentinel.** JSON Schema is authoritative; the TypeScript and Java files mirror it by hand.

## The rule

**These shapes are frozen. Do not add, rename, retype, or remove a field on your own.**

A change here breaks the other two lanes silently — Yashraj's records stop deserialising, Yash's UI
renders blank — and you find out hours later. If you need a change:

1. Say so in the group chat.
2. All three agree.
3. Update the JSON Schema **and** `ts/contracts.ts` **and** the Java records in the same commit.
4. Bump `CONTRACTS_VERSION` below.

`CONTRACTS_VERSION = 1.0.0`

## Why this exists

Once these shapes are agreed, all three of you build in parallel without waiting on each other:

| Who | Relationship to `Signal` | Blocked by others? |
|---|---|---|
| Ashmit | **Produces** it from Gemma 3n | No |
| Yashraj | **Consumes** it in fusion + the policy gate | No |
| Yash | **Displays** it in the evidence list | No |

## Layout

```
contracts/
├─ ENDPOINTS.md          # every HTTP endpoint, with request/response examples
├─ json/                 # JSON Schema — authoritative
│  ├─ signal.schema.json
│  ├─ evidence.schema.json
│  ├─ assessment.schema.json
│  └─ decision.schema.json
├─ ts/contracts.ts       # frontend types + guards   (import into web/)
├─ java/                 # Spring records + sealed Action  (copy into api/)
└─ fixtures/             # complete, self-consistent scenario data
   ├─ s01-coercive-scam.json
   └─ s04-legitimate-travel.json
```

## The four shapes, and who touches them

| Shape | Produced by | Consumed by | Never contains |
|---|---|---|---|
| `Signal` | Model service | Fusion | An action. Ever. |
| `Evidence` | Fusion | Policy gate, UI | The raw message body |
| `Assessment` | Fusion | Policy gate, UI | A decision |
| `Decision` | **Policy gate only** | UI, audit | Anything unsourced |

## Frozen enums

**Signal types — exactly eight.** Adding a ninth is a contract change.

```
urgency  authority_impersonation  secrecy_request  remote_access_request
payment_redirect  otp_request  threat  investment_lure
```

**Actions — exactly five**, ordered by descending AI autonomy:

| Action | Transaction | Who can release it |
|---|---|---|
| `APPROVE` | Proceeds | — |
| `VERIFY` | Proceeds after a step-up identity challenge | Customer, out-of-band |
| `COOL_OFF` | Delayed by a timer | Auto-releases when the timer expires |
| `HOLD` | Paused, queued for review | An analyst |
| `ESCALATE` | Paused, human decision **mandatory** | A named human only — never the AI |

`HOLD` vs `ESCALATE`: both pause the transaction. `HOLD` goes to the review queue and an analyst can
release it. `ESCALATE` requires a named human to decide before anything moves; the system may not
release it on its own under any circumstances.

**Identity assurance** — feeds confidence, never risk:

```
NONE  BASIC  VERIFIED  STRONG
```

**Evidence source types:**

```
communication  transaction  advisory  identity
```

## Two invariants the schemas enforce

1. **`Signal` has no action field.** If you find yourself wanting one, the model is trying to decide.
   That is rule 1 in the root README and it is not negotiable.
2. **`risk_score` and `confidence` are separate and never multiplied together.** Risk is 0-100
   (integer). Confidence is 0-1 (float). They mean different things: risk is *how bad this looks*,
   confidence is *how sure we are*. Low confidence moves you up the ladder; it does not change risk.

## Validating

```bash
python -m pip install jsonschema
python contracts/validate.py          # checks every fixture against its schema
```

Run this after any contract change. It is the cheapest test in the repo.
