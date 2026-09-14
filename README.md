<div align="center">

# 🛡️ LedgerSentinel

### Autonomous Fraud Detection · Bounded Action · Human Oversight

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,100:1e293b&height=180&section=header&text=LedgerSentinel&fontSize=48&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=When%20AI%20isn't%20certain%2C%20it%20should%20become%20less%20autonomous.&descAlignY=62&descSize=16" width="100%"/>

<br/>

[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-black?style=for-the-badge&logo=ollama)](https://ollama.com/)

<br/>

**AI-assisted fraud response for the attacks traditional transaction models miss.**

A customer can genuinely authorize a transaction and still be the victim of fraud.

LedgerSentinel analyzes the **transaction + the context around it** —  
calls, SMS, emails, message images and trusted advisories —  
then determines **how much autonomy the AI has earned.**

</div>

---

## ⚡ The Core Idea

Traditional fraud systems mostly ask:

> **"Is this transaction suspicious?"**

LedgerSentinel asks something more important:

> **"Given everything we know, how much should the system be allowed to do automatically?"**

The AI **never decides the action**.

It produces:

```text
Evidence
   ↓
Signals
   ↓
Risk + Confidence
   ↓
Deterministic Policy Gate
   ↓
┌──────────┬────────┬──────────┬────────┬───────────┐
│ APPROVE  │ VERIFY │ COOL_OFF │  HOLD  │ ESCALATE  │
└──────────┴────────┴──────────┴────────┴───────────┘
