"""
Task #4 — Pre-compute demo cache.

Runs all scenarios through the live POST /model/text/score endpoint and
writes fixtures/demo_cache.json as {"source_ref": [signals_array], ...}.

Usage (from model-service/ dir, service must be running):
    .venv\Scripts\python.exe eval/build_demo_cache.py
"""
from __future__ import annotations
import json, sys, urllib.request, pathlib, time

BASE_URL = "http://localhost:8000"
SCENARIOS_PATH = pathlib.Path("eval/scenarios.json")
OUT_PATH = pathlib.Path("fixtures/demo_cache.json")

def post_score(source_ref: str, text: str) -> dict:
    payload = json.dumps({"source_ref": source_ref, "text": text}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/model/text/score",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def main():
    scenarios = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))
    cache = {}
    total = len(scenarios)

    print(f"Building demo cache for {total} scenarios...")
    for i, sc in enumerate(scenarios, 1):
        sid = sc["id"]
        name = sc["name"]
        print(f"  [{i}/{total}] {sid}: {name}  ...", end="", flush=True)
        t0 = time.perf_counter()
        try:
            resp = post_score(source_ref=sid, text=sc["text"])
            signals = resp.get("signals", [])
            latency = (time.perf_counter() - t0) * 1000
            cache[sid] = signals
            print(f"  {len(signals)} signals  ({latency:.0f} ms)")
            if not signals:
                print(f"    WARNING: zero signals for {sid}!")
        except Exception as exc:
            print(f"  ERROR: {exc}")
            cache[sid] = []

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
    total_signals = sum(len(v) for v in cache.values())
    print(f"\nWrote {OUT_PATH}  ({len(cache)} scenarios, {total_signals} total signals)")

if __name__ == "__main__":
    main()
