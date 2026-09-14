# LedgerSentinel — Phase 1 Latency & Timeout Budget Report
**Author:** Ashmit (Model Service Owner)  
**Recipient:** Yashraj (Backend / Policy Gate Owner), Yash (UI Owner)  
**Date:** Phase 1 (0–3h) Milestone  
**Models Benchmarked:** `gemma3n:e4b` (Signal Extraction), `qwen3:4b-q8_0` (Rationale Synthesis)

---

## 01 Benchmark Overview & Hardware Performance
- **Machine Spec:** Windows laptop local inference via Ollama (`http://localhost:11434`)
- **First Call (Cold Load):** ~120 seconds (Ollama weight page-in to VRAM/RAM).
- **Warm Inference Latency (`gemma3n:e4b`):**
  - **Min:** ~7.7 seconds
  - **p50 (Median):** **8.4 seconds**
  - **p90:** **11.6 seconds**
  - **p95:** **15.0 seconds** (excluding initial cold weight load)
  - **Max (warm):** ~13.8 seconds (voice transcript chunk)
- **Warm Inference Latency (`qwen3:4b-q8_0` Rationale):**
  - **Latency:** ~34.5 seconds on un-quantized/Q8 4B model for full 1-paragraph synthesis.

---

## 02 Recommended Timeout Budget for Spring Boot (Yashraj)

To guarantee the policy gate is never held indefinitely while adhering to the **"Fail Toward Oversight"** architectural rule:

| Endpoint | Recommended Timeout | Behavior on Timeout |
|---|---|---|
| `POST /model/text/score` | **20 seconds** | Fallback to `EMPTY_SIGNALS` or cached fixtures, decrease confidence metric $\to$ trigger `HOLD` / `ESCALATE` |
| `POST /model/voice/score` | **25 seconds** | Degrade to transaction-only risk assessment, reduce autonomy |
| Rationale Synthesis (`Qwen3`) | **45 seconds** (or async background job) | Rationale is advisory only. Policy gate must NOT block transaction decision on rationale. |
| In Dev / Local Testing | **`MODELS_MOCK=true`** | **< 2 ms** instant mock response via `fixture_signals.json` |

> [!IMPORTANT]
> **Spring Boot Gotcha Avoidance:**
> In your Spring Boot `WebClient` / `RestTemplate`, configure:
> ```java
> .responseTimeout(Duration.ofSeconds(20))
> .doOnError(TimeoutException.class, ex -> {
>     logger.warn("Model service timed out. Applying 'Fail toward oversight' rule.");
>     // Lower confidence, route to human oversight
> })
> ```

---

## 03 Live Extraction Evidence (Smoke Test Results)

### Test 1: SMS Coercive Phishing
- **Input:** `"URGENT: Your account 4532 is suspended. Transfer Rs 50,000 to safe account 9876543210 immediately or police FIR will be filed."`
- **Output:** 4 signals detected (`urgency` 0.95, `authority_impersonation` 0.85, `payment_redirect` 0.90, `threat` 0.75).
- **PII Redaction:** Account `4532` masked to `****`, phone `9876543210` masked to `**********`. `redaction_ran: true`.

### Test 2: Voice Call Transcript (Senior Inspector CBI Coercion)
- **Input:** Senior Inspector Rathore calling from CBI claiming 15 lakh money laundering arrest warrant, demands secrecy, 3 lakh transfer to escrow, and OTP.
- **Output:** 6 signals detected (`authority_impersonation` 0.95, `secrecy_request` 0.90, `payment_redirect` 0.85, `otp_request` 0.80, `threat` 0.65, `urgency` 0.70).

### Test 3: Qwen3 Server-Side Fusion Rationale
- **Output:**
  > *"The communication includes a high-confidence (0.95) authority_impersonation signal, where the caller claims to be 'Senior Inspector Rathore' from the CBI... A high-confidence (0.95) urgency signal warns the customer to transfer money immediately or face an arrest warrant... Additionally, a payment_redirect signal instructs the customer to transfer 3 lakh rupees to a 'court escrow account'... The most significant concern is the combination of impersonation and urgent threats."*
- **Constraint check:** Qwen produced pure evidence synthesis with zero decision directives (`HOLD`, `APPROVE` etc. were not emitted).
