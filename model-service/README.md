# LedgerSentinel Model Service

Fraud signal extraction via **Gemma 3n E4B** (multimodal, on-device) and rationale synthesis via **Qwen3-4B-Q8** (server).

Models emit `Signal[]` objects with calibrated confidences. They **never** emit action strings — only the deterministic policy gate (Java) does that.

## Quick Start

```bash
# 1. Create virtualenv and install
cd model-service
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt

# 2. Copy env
copy .env.example .env

# 3. Ensure Ollama is running with both models
ollama list   # Should show gemma3n:e4b and qwen3:4b-q8_0

# 4. Run the service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# 5. Health check
curl http://localhost:8001/health

# 6. Score text (mock mode)
# Set MODELS_MOCK=true in .env, then:
curl -X POST http://localhost:8001/model/text/score \
  -H "Content-Type: application/json" \
  -d '{"text": "test message", "source_ref": "test_001"}'

# 7. Run tests
pytest tests/ -v
```

## Modes

| Env Var | Effect |
|---|---|
| `MODELS_MOCK=true` | Returns fixture signals (Yashraj never blocked) |
| `DEMO_CACHE_MODE=true` | Returns pre-cached demo signals (zero latency on stage) |
| Both `false` | Real Gemma + Qwen inference |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check with model version |
| `POST` | `/model/text/score` | Extract fraud signals from text |
| `POST` | `/model/voice/score` | Extract fraud signals from voice (transcript path) |
| `POST` | `/model/voice/score/upload` | Voice via audio upload (Phase 3+) |

## Architecture Rule

```
Signal.signal_type ∈ {urgency, authority_impersonation, secrecy_request,
                       remote_access_request, payment_redirect, otp_request,
                       threat, investment_lure}

Signal.signal_type ∉ {APPROVE, VERIFY, COOL_OFF, HOLD, ESCALATE}
```

If a Signal contains an action string, the Pydantic validator raises immediately.
This is enforced at the schema level — not a convention, a hard constraint.

## Calibration

```bash
# Fit Platt scaling (after collecting holdout data)
python calibration/fit_platt.py

# This creates calibration/scaler.pkl
# The service loads it automatically on startup
```
