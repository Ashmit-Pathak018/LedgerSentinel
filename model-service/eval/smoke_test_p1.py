"""
Phase 1 Smoke Test & Latency Benchmarking Harness.
Tests live inference against Ollama (gemma3n:e4b and qwen3:4b-q8_0).
Calculates min, p50, p90, p95, max latencies and outputs a summary.
"""

import time
import json
import numpy as np
import httpx
from pydantic import ValidationError

BASE_URL = "http://localhost:8001"

SAMPLE_SMS = [
    "URGENT: Your HDFC account 4532 is suspended due to KYC. Transfer Rs 50,000 to safe reserve account 9876543210 immediately or police FIR will be filed within 1 hour.",
    "Dear customer, SBI OTP for transaction of Rs 85,000 is 492018. If you did not request this, call Officer Sharma immediately at 9876543210 to stop the arrest warrant.",
    "Congratulations! You won Rs 25,00,000 in Tata Lucky Draw. Pay processing fee Rs 4,999 to UPI account win@paytm to claim funds today.",
    "Security Alert: Someone logged into your ICICI account from London. Click http://secure-icici-auth.xyz and input your netbanking password to verify identity.",
    "Hi mom, I lost my phone and this is my new temporary number. I need Rs 20,000 urgently for medical bills. Please transfer to UPI 9876543210@upi right now, do not call."
]

SAMPLE_VOICE_TRANSCRIPT = (
    "Hello Mr. Ashmit, this is Senior Inspector Rathore calling from the CBI cyber branch Mumbai. "
    "We have a non-bailable arrest warrant in your name for money laundering of 15 lakhs. "
    "Do not disconnect or inform anyone in your family, this is a state secret under official secrets act. "
    "To clear your name, transfer 3 lakh rupees to the supreme court escrow account immediately. "
    "Tell me the OTP coming to your mobile right now."
)

def test_health():
    resp = httpx.get(f"{BASE_URL}/health", timeout=10.0)
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    data = resp.json()
    print(f"Health check OK: {data}")
    return data

def run_latency_benchmark(num_runs=10):
    print(f"\n--- Running Latency Benchmark on /model/text/score ({num_runs} runs) ---")
    latencies = []
    signal_counts = []
    
    for i in range(num_runs):
        text = SAMPLE_SMS[i % len(SAMPLE_SMS)]
        payload = {
            "text": text,
            "source_ref": f"sms_bench_{i:02d}"
        }
        
        t0 = time.perf_counter()
        try:
            resp = httpx.post(f"{BASE_URL}/model/text/score", json=payload, timeout=120.0)
            elapsed = (time.perf_counter() - t0) * 1000
            
            if resp.status_code == 200:
                data = resp.json()
                signals = data.get("signals", [])
                latencies.append(elapsed)
                signal_counts.append(len(signals))
                print(f"Run {i+1:02d}/{num_runs}: Latency = {elapsed:.0f}ms | Signals found = {len(signals)} | Redacted = {data.get('redaction_ran')}")
            else:
                print(f"Run {i+1:02d}/{num_runs}: FAILED with status {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"Run {i+1:02d}/{num_runs}: Exception: {e}")

    if not latencies:
        print("All benchmark runs failed!")
        return None

    stats = {
        "count": len(latencies),
        "min_ms": round(float(np.min(latencies)), 1),
        "p50_ms": round(float(np.percentile(latencies, 50)), 1),
        "p90_ms": round(float(np.percentile(latencies, 90)), 1),
        "p95_ms": round(float(np.percentile(latencies, 95)), 1),
        "max_ms": round(float(np.max(latencies)), 1),
        "avg_signals": round(float(np.mean(signal_counts)), 1)
    }
    
    print("\n--- Benchmark Summary ---")
    for k, v in stats.items():
        print(f"  {k}: {v}")
        
    return stats

def test_voice_endpoint():
    print("\n--- Testing /model/voice/score with Call Transcript ---")
    payload = {
        "transcript": SAMPLE_VOICE_TRANSCRIPT,
        "source_ref": "call_sample_cbi_coercive",
        "chunk_index": 0
    }
    t0 = time.perf_counter()
    resp = httpx.post(f"{BASE_URL}/model/voice/score", json=payload, timeout=120.0)
    elapsed = (time.perf_counter() - t0) * 1000
    
    assert resp.status_code == 200, f"Voice score failed: {resp.text}"
    data = resp.json()
    signals = data.get("signals", [])
    print(f"Voice Test Latency: {elapsed:.0f}ms")
    print(f"Signals Detected: {len(signals)}")
    for s in signals:
        print(f"  [{s['signal_type']}] conf={s['confidence']} quote='{s['redacted_quote']}'")
    return data

if __name__ == "__main__":
    test_health()
    stats = run_latency_benchmark(num_runs=10)
    test_voice_endpoint()
