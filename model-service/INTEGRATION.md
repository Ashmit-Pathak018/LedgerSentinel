# Integration fixes for model-service

**For Ashmit.** The service is good work — structure, calibration, prompts, provenance, contract
tests all solid, and nothing in it emits an action, which is the rule that mattered most.

But **the API cannot consume its output today.** I ran `fixtures/fixture_signals.json` through the
frozen `Signal` contract: **0 of 6 parse.** There's a compatibility shim in
`api/models_client.py` holding integration together right now — these four fixes let us delete it.

Roughly 20 minutes.

---

## 1. Import the contracts, don't redeclare them

This is the root cause of everything below.

```bash
rm model-service/schemas/signal.schema.json
```

`contracts/json/signal.schema.json` is the frozen source of truth, and `contracts/py/contracts.py`
is the Python mirror. Import it:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "contracts" / "py"))
from contracts import Signal, SignalType   # the frozen models
```

`api/_contracts_path.py` does exactly this — copy that file across rather than reinventing it.

Your local schema also makes `evidence_span` and `redacted_quote` **required**. The contract has
them optional, deliberately: when Gemma returns no quote your service currently errors where it
should emit a signal with `redacted_quote: null`.

## 2. `evidence_span` is a two-element array, not an object

**This is the blocker.** Every signal fails on it.

```diff
- "evidence_span": {"start": 0, "end": 45}
+ "evidence_span": [0, 45]
```

The contract says: *character offsets `[start, end)` into the REDACTED text*. The UI uses them to
highlight in place, and it indexes an array.

## 3. Port 8000, and prefix the routes with `/model`

`contracts/ENDPOINTS.md` is frozen on both.

```diff
- PORT=8001
+ PORT=8000
```

```diff
- @router.post("/text/score")
+ @router.post("/model/text/score")

- @router.post("/voice/score")
+ @router.post("/voice/score")   # -> /model/voice/score
```

Easiest is `APIRouter(prefix="/model")` once, rather than editing each route. Health should answer
at `/model/health` (keep `/health` too if you like — the client tries both).

## 4. The envelope — your call, but raise it with the team

You return:

```jsonc
{ "signals": [...], "model_version": "...", "redaction_ran": true, "latency_ms": 812 }
```

The contract says a bare array. **Your version is better** — `model_version` satisfies rule 8 and
`redaction_ran` is evidence rule 6 actually executed. I'd like to adopt it.

But the contract is frozen, which means it changes by agreement, not unilaterally. Post it in the
group; if all three agree I'll update `contracts/json`, `contracts/py`, `contracts/ts` and
`ENDPOINTS.md` in one commit and bump `CONTRACTS_VERSION`.

Until then the client accepts both, and `model_version` gets folded down onto each signal.

---

## Verifying you're done

From `api/`:

```bash
python -m pytest tests/test_models_client.py -v
```

`test_upstream_still_needs_fixing` is designed to **fail once you've fixed this**. When it goes
red, delete the `COMPAT` block in `api/models_client.py` and the COMPAT tests. Don't loosen the
assertion to keep it green — going red is the whole point.

Then end-to-end, with the service running:

```bash
cd api && MODELS_MOCK=false uvicorn main:app --reload --port 8080
curl -X POST http://localhost:8080/v1/transactions/analyze \
  -H 'Content-Type: application/json' \
  -d '{"transaction_id":"txn_018","customer_id":"cust_1042","amount":15000,
       "destination_country":"SG","communication_ids":["comm_771"]}'
```

A `422` back means a contract violation, and the message names the field.

---

## One heads-up on Gemma

`gemma3n:e4b` is **broken on Ollama 0.33.3** — every prompt returns repeated `<unused25>` tokens,
via CLI and API alike. The download is fine (7.5 GB, right architecture); the runtime can't drive
it. `ollama show` also reports `Capabilities: completion` only, so there's no vision support in
this build either.

Don't burn 40 minutes re-pulling on a guess. `qwen3:4b` is well-supported and was already in the
plan for rationale — one model, two jobs. It's a one-line change because the model sits behind a
frozen contract, which is itself worth saying on stage.
