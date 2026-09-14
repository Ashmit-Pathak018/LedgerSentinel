# Data Provenance Log

Every dataset used in LedgerSentinel model training and evaluation is logged here.
**If it's not in this file, it doesn't exist.**

---

## Corpora

| ID | Name | Source | License | Rows | Labels | Notes |
|---|---|---|---|---|---|---|
| `uci_sms_spam` | SMS Spam Collection | [UCI ML Repo](https://archive.ics.uci.edu/ml/datasets/sms+spam+collection) | Public | 5,574 | binary (spam/ham) | Re-labelled to 8-label taxonomy manually |
| `syn_qwen_v1` | Synthetic Scam Transcripts | Generated via Qwen3-4B-Q8 | Internal | TBD | 8-label | Every row hand-checked by Ashmit |
| `syn_calls_v1` | Synthetic Call Transcripts | Generated via Qwen3-4B-Q8 | Internal | TBD | 8-label | Simulated phone scam conversations |

---

## Label Taxonomy (frozen)

| Index | Label | Description |
|---|---|---|
| 0 | `urgency` | Pressure to act immediately |
| 1 | `authority_impersonation` | Claiming to be bank/police/RBI/govt |
| 2 | `secrecy_request` | Asking not to tell family/bank |
| 3 | `remote_access_request` | Asking to install software/share screen |
| 4 | `payment_redirect` | Transfer to new/safe account |
| 5 | `otp_request` | Asking for OTP/PIN/CVV |
| 6 | `threat` | Threats of arrest/legal/freezing |
| 7 | `investment_lure` | Guaranteed returns/prizes |

---

## Splits

| Split | File | Size | Purpose | Frozen? |
|---|---|---|---|---|
| Train | `data/processed/train.jsonl` | TBD | Prompt iteration | No |
| Holdout | `data/processed/holdout.jsonl` | TBD | Calibration + eval | **YES — never touch** |

---

## Changelog

| Date | Change | By |
|---|---|---|
| 2026-09-14 | Initial provenance log created | Ashmit |
