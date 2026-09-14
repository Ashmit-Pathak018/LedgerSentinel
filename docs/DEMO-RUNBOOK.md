# Demo runbook

Rehearsed 2026-09-14 against the live path (`eval/runs/v3-live.json`, 8/8 decisions). Everything
below was clicked, not assumed. Budget: **4 minutes** for the console, leaving time for questions.

## Before you walk on

```bash
# terminal 1 - API (mock models; the demo's fallback and the path that was measured)
cd api && python -m uvicorn main:app --port 8080 --log-level warning

# terminal 2 - console
cd web && npx vite --port 5176 --strictPort

# terminal 3 - prove it, in front of nobody
python eval/run.py --live --base http://localhost:8080 --label rehearsal
```

Expect `8/8` decisions. If anything else, do not go on stage with the console; fall back to
the eval table (it is the same evidence, printed).

Open `http://localhost:5176`, click **Transactions** in the sidebar, and leave it there.
Do **not** open the floating "Interactive Demo" sparkle. See *Hazards*.

## The four minutes

| t | Click | Say |
|---|---|---|
| 0:00 | Row **txn_018** (top of the table) | "Fifteen thousand dollars to Singapore, first-time beneficiary. Verified customer. Looks like a normal payment." |
| 0:20 | *(Overview tab is open)* Point at the four signals | "The model read the two messages around it. Impersonation, urgency, secrecy, redirect. Those are the only quotes we keep - redacted, never the message." |
| 0:50 | **Evidence** tab | "Three sources fused. What was said, what the account knows - first payment to this beneficiary - and a published advisory that describes this exact scam. One item is marked CRITICAL." |
| 1:20 | **Policy Decision** tab | "This is the only thing that decides. It is code, not a model. It cites `ev_af7b120a` - the evidence, not just the rule. In V1 it couldn't do that. That's the fix PRISM found." |
| 1:50 | Sidebar **Transactions** → row **txn_031** | "Same customer type, different story. Florence, Italy, 890 euros, at a merchant. The location is abnormal. A naive geo-rule blocks this." |
| 2:15 | **Policy Decision** tab | "Risk 32, so it steps up to VERIFY - a push notification, thirty seconds of friction - and never blocks. The system is not paranoid, it is bounded." |
| 2:45 | *(stay here)* | "Five rungs. Approve, verify, cool-off, hold, escalate. Every rule proposes; the most restrictive wins. Uncertainty can only move you **up**." |
| 3:15 | Terminal 3 | Run the S07 line below and read the result. |

### The rule-5 moment (terminal)

```bash
python - <<'EOF'
import httpx
body = {"transaction_id": "txn_089", "customer_id": "cust_7712", "amount": 6200, "currency": "USD",
        "destination_country": "TH", "communication_ids": ["comm_1380"], "destination_ref": "benef_first_seen",
        "identity_assurance": "BASIC", "device_known": False, "scenario": "s07"}
for up in (True, False):
    r = httpx.post("http://localhost:8080/v1/transactions/analyze", json={**body, "advisory_index_available": up}).json()
    print(f"advisory index {'UP  ' if up else 'DOWN'} -> {r['decision']['action']:8} conf={r['assessment']['confidence']}")
EOF
```

Rehearsed output:

```
advisory index UP   -> VERIFY   conf=0.456  ['rule.low_confidence', 'rule.risk_30_59']
advisory index DOWN -> HOLD     conf=0.274  ['rule.degraded_fail_toward_oversight']
```

Say: "Same transaction twice. The second time the advisory index is down. Confidence drops,
and the system moves *up* the ladder to HOLD. A component failing makes us more careful, never
less. It cannot approve blind - that is asserted in code, and a test would crash if it did."

## If a judge asks

- **"The AI reads all my messages?"** No. Consent per channel, revocable, evaluated in SQL.
  Redaction runs before inference. We store the redacted quote and the label - never the
  body. Show **Consent & Privacy** if pushed.
- **"Who set these thresholds?"** We did, and they are illustrative. `thresholds.py` says so
  in its first docstring. Production values need historical validation and model-risk sign-off.
- **"Why is confidence 79% on a certain scam?"** Because confidence is *not* risk. Risk is 100.
  Confidence is how sure the extractor was about its labels. Keeping them separate is rule 2;
  combining them is how you get a system that is confidently wrong.
- **"What did PRISM actually find?"** V1 escalated S01 correctly but cited no evidence - the gate
  fired `rule.critical_scam_evidence` with nothing behind it. `critical_evidence_coverage` went
  0% → 100% with every action unchanged: a reasoning fix, not threshold tuning. Then the live
  run found the API dropping beneficiary history entirely (`v3-live.json`).

## Hazards - things on screen that are not real

The console still carries Yash's original mock walkthrough, and it is mixed in with the live rows.

- **Rows below txn_031** (`TXN-88xxx-IN`) are hardcoded. Their Investigation screens show a
  fabricated rule (`RULE-SE-HOLD-802`), policy `v1.3.1`, and contradict themselves
  ("5 critical signals" / "0 total signals"). **Do not click them.**
- **The floating sparkle button** (Interactive Demo, bottom right) drives `TXN-88204-IN` -
  the mock - through 14 steps. Every number in its script is invented. Leave it closed.
- **Evidence Timeline** at the bottom of every Investigation screen is static: "Voice analyzed",
  "Risk increased (82)" - even on the live rows. Do not scroll down to it.
- **Dashboard tiles** ("142,850 transactions analysed") are static.
- Small copy on the live screens is still template text: "High velocity anomaly detected",
  "Bayesian signal consensus", "Known Device (Pixel 8)", "Mobile RTGS Instant".

All of the above is a frontend decision (Yash's lane): either point the walkthrough at
`txn_018` and hide the mock rows when the API is up, or leave them and steer around them.
Steering is what this runbook does.
