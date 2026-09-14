"""Benchmark live inference latency for model-service.

Records: min, p50, p90, p95, p99 across real inference runs.

Run from repository root:
    model-service\\.venv\\Scripts\\python.exe model-service/eval/benchmark_latency.py
"""

from __future__ import annotations

import asyncio
import pathlib
import sys
import time
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "model-service"))

from app.inference.gemma_client import extract_signals_from_text
from app.inference.sliding_window import create_sliding_windows, aggregate_signals

SAMPLE_TEXTS = [
    "Sir, this is Inspector Sharma from Cyber Crime Division. Transfer Rs 8,00,000 immediately to safe account or face arrest.",
    "Your SBI account has been suspended due to KYC. Reply with your OTP right now to unlock it.",
    "Congratulations! You won 25 lakhs in WhatsApp Lucky Draw. Pay 5000 fee to claim.",
    "This is Microsoft tech support. Install AnyDesk immediately to scan your system.",
    "Beta, this is your uncle. Transfer 2 lakhs urgently to this account and do not tell your parents.",
]

SAMPLE_TRANSCRIPT = (
    "This is Senior Inspector Verma from Economic Offences Wing. "
    "We have an arrest warrant for money laundering under your name. "
    "Transfer 5 lakh rupees to court escrow immediately. "
    "Tell me the OTP sent to your phone. Do not speak to anyone."
)


async def run_benchmark():
    print("--- Running Real Inference Benchmark (Gemma 3n on Ollama) ---")

    # 1. Benchmark Text Inference (10 runs)
    print("\nBenchmarking extract_signals_from_text (10 runs)...")
    text_latencies = []
    for i in range(10):
        prompt = SAMPLE_TEXTS[i % len(SAMPLE_TEXTS)]
        t0 = time.perf_counter()
        sigs, _, _ = await extract_signals_from_text(prompt, f"bench_text_{i}")
        elapsed = (time.perf_counter() - t0) * 1000
        text_latencies.append(elapsed)
        print(f"  Run {i+1:02d}: {elapsed:.1f} ms ({len(sigs)} signals)")

    # 2. Benchmark Voice Sliding-Window Inference (2 runs)
    print("\nBenchmarking voice sliding-window chunking (2 runs)...")
    voice_latencies = []
    for i in range(2):
        t0 = time.perf_counter()
        chunks = create_sliding_windows(SAMPLE_TRANSCRIPT, f"bench_voice_{i}", target_window_size=150)
        chunk_sigs = []
        for c in chunks:
            s, _, _ = await extract_signals_from_text(c.text, c.source_ref)
            chunk_sigs.append(s)
        agg = aggregate_signals(chunk_sigs, SAMPLE_TRANSCRIPT)
        elapsed = (time.perf_counter() - t0) * 1000
        voice_latencies.append(elapsed)
        print(f"  Voice Run {i+1:02d}: {elapsed:.1f} ms ({len(chunks)} chunks, {len(agg)} unique signals)")

    # Compute Statistics
    stats = {
        "text_runs": len(text_latencies),
        "text_min_ms": round(float(np.min(text_latencies)), 1),
        "text_p50_ms": round(float(np.percentile(text_latencies, 50)), 1),
        "text_p90_ms": round(float(np.percentile(text_latencies, 90)), 1),
        "text_p95_ms": round(float(np.percentile(text_latencies, 95)), 1),
        "text_p99_ms": round(float(np.percentile(text_latencies, 99)), 1),
        "text_max_ms": round(float(np.max(text_latencies)), 1),
        "voice_avg_ms": round(float(np.mean(voice_latencies)), 1) if voice_latencies else 0,
    }

    print("\n=== LATENCY BASELINE REPORT ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    return stats


if __name__ == "__main__":
    asyncio.run(run_benchmark())
