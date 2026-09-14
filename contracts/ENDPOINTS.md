# Endpoints

Two services. The frontend only ever talks to Spring Boot; only Spring Boot talks to the model
service. **Every endpoint below is part of the frozen contract** — same rules as the data shapes.

| Service | Port | Owner |
|---|---|---|
| Spring Boot API | `8080` | Yashraj |
| Model service (FastAPI) | `8000` | Ashmit |

---

## Spring Boot — `:8080`

What React calls.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/transactions/analyze` | Analyse a transaction, return a decision |
| `GET` | `/v1/transactions/{id}` | Transaction plus its assessment |
| `GET` | `/v1/transactions/{id}/evidence` | Evidence behind the decision |
| `POST` | `/v1/decisions/validate` | Check a proposed action against policy |
| `POST` | `/v1/cases` | Create a human-review case |
| `PATCH` | `/v1/cases/{id}` | Update status / assignment |
| `GET` | `/v1/cases/{id}/audit` | Audit history |
| `GET` | `/v1/consent/{customerId}` | Current per-channel consent state |
| `PATCH` | `/v1/consent/{customerId}` | Grant or revoke a channel |
| `GET` | `/v1/health` | Liveness |

### `POST /v1/transactions/analyze`

```jsonc
// request
{
  "transaction_id": "txn_018",
  "customer_id": "cust_1042",
  "amount": 15000,
  "currency": "USD",
  "destination_country": "SG",
  "communication_ids": ["comm_771"]
}
```

```jsonc
// 200 response
{
  "decision": {
    "decision_id": "dec_0912",
    "transaction_id": "txn_018",
    "assessment_id": "as_0912",
    "action": "ESCALATE",
    "human_required": true,
    "policy_version": "policy-1.2",
    "rationale_refs": ["ev_4410", "ev_4411", "rule.critical_scam_evidence"],
    "trace_id": "prism-abc123",
    "proposal_rejected": false
  },
  "assessment": { /* Assessment */ },
  "evidence": [ /* Evidence[] */ ]
}
```

**Idempotent** on `(transaction_id, analysis_version)` — re-analysing returns the stored result
rather than re-running inference. This is what makes the PRISM cohort reruns reproducible.

### Errors

Uniform shape, and note what the status codes do **not** include: there is no "failed open" path.

```jsonc
{ "error": "retrieval_unavailable", "message": "Advisory index did not respond", "trace_id": "prism-abc123" }
```

| Status | When |
|---|---|
| `400` | Schema validation failed |
| `404` | Unknown transaction or case |
| `409` | Consent revoked for a requested channel |
| `422` | Contract violation — e.g. the model service returned an `action` field |
| `503` | A dependency is down |

> **Fail toward oversight (rule 5).** A `503` from retrieval or the model service does **not**
> fail the analysis. It returns a decision with `degraded: true`, reduced confidence, and an
> action at or above `HOLD`. A component failure must never produce `APPROVE`.

---

## Model service — `:8000`

What Spring Boot calls. **These endpoints return `Signal[]` and nothing else.** If a response
ever carries an `action`, `recommendation`, or `decision` field, Spring rejects it with `422` —
that is rule 1 enforced on the wire.

| Method | Path | In | Out |
|---|---|---|---|
| `POST` | `/model/text/score` | text | `Signal[]` |
| `POST` | `/model/voice/score` | audio | `Signal[]` |
| `POST` | `/model/image/score` | image | `Signal[]` |
| `POST` | `/model/fuse/rationale` | evidence | prose rationale (Qwen) |
| `GET` | `/model/health` | — | model + calibration versions |

### `POST /model/text/score`

```jsonc
// request — text is ALREADY REDACTED by Spring before it gets here (rule 6)
{
  "source_ref": "comm_771",
  "text": "This is [NAME] from [BANK] security. Your account is compromised...",
  "locale": "en-IN"
}
```

```jsonc
// 200 response — a bare array, no envelope, no action field
[
  {
    "signal_type": "authority_impersonation",
    "value": 0.91,
    "confidence": 0.84,
    "source_ref": "comm_771",
    "evidence_span": [8, 41],
    "redacted_quote": "from [BANK] security",
    "model_version": "gemma3n-e4b@2026-09-14"
  }
]
```

### `POST /model/voice/score`

`multipart/form-data` with `audio` (wav/mp3) and `source_ref`. Same `Signal[]` response.

For the live path, chunk the audio and post a sliding window; emit signals as they firm up rather
than waiting for the call to end.

### `GET /model/health`

```jsonc
{
  "status": "ok",
  "extract_model": "gemma3n-e4b@2026-09-14",
  "rationale_model": "qwen3-4b-q8@2026-09-14",
  "calibration_version": "platt-2026-09-14",
  "p95_latency_ms": 1840
}
```

Spring reads `p95_latency_ms` to set its timeout budget. Ashmit: publish this number early — it is
what stops Yashraj from guessing.

---

## Mocks

`MODELS_MOCK=true` makes Spring serve fixture signals from `contracts/fixtures/` instead of calling
`:8000` at all. Same shapes, same code path, no model service required.

**Keep this working for the entire build.** It is how Yash and Yashraj stay unblocked while Ashmit
is still training, and it is the demo's fallback if anything fails on stage.

```bash
MODELS_MOCK=true   ./mvnw spring-boot:run   # fixtures
MODELS_MOCK=false  ./mvnw spring-boot:run   # real inference on :8000
```
