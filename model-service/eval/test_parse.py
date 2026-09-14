from app.inference.gemma_client import _parse_signal_json

sample = """[
\u2581\u2581{
\u2581\u2581\u2581\u2581"signal_type": "urgency",
\u2581\u2581\u2581\u2581"value": "0.95",
\u2581\u2581\u2581\u2581"confidence": "0.98",
\u2581\u2581\u2581\u2581"source_ref": "test_direct",
\u2581\u2581\u2581\u2581"evidence_span": {
\u2581\u2581\u2581\u2581\u2581\u2581"start": "0",
\u2581\u2581\u2581\u2581\u2581\u2581"end": "66"
\u2581\u2581\u2581\u2581},
\u2581\u2581\u2581\u2581"redacted_quote": "urgent act now"
  }
]"""

res = _parse_signal_json(sample)
print("Parsed count:", len(res))
if res:
    print("Parsed signal:", res[0])
