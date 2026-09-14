import asyncio
from app.inference.qwen_client import synthesise_rationale

test_signals = [
    {"signal_type": "authority_impersonation", "confidence": 0.95, "redacted_quote": "this is Senior Inspector Rathore calling from the CBI"},
    {"signal_type": "urgency", "confidence": 0.95, "redacted_quote": "Transfer immediately or arrest warrant will be issued"},
    {"signal_type": "payment_redirect", "confidence": 0.90, "redacted_quote": "Transfer 3 lakh rupees to the court escrow account"}
]

async def main():
    rat, lat = await synthesise_rationale(test_signals)
    print(f"Latency: {lat:.1f} ms")
    print(f"Rationale:\n{rat}")

if __name__ == "__main__":
    asyncio.run(main())
