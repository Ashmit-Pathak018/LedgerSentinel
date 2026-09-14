# LedgerSentinel Web Console

A clean, spacious, professional enterprise banking fraud detection console.

## Architecture & Design System

- **Desktop-First**: Designed for a 1440px × 900px banking console target with generous whitespace and clear hierarchy.
- **Separated Risk vs. Confidence**: Enforces the critical rule that risk score (0–100) and signal confidence (0–100%) are visually and mathematically separate.
- **Deterministic Policy Gate**: Visualizes how AI models emit evidence signals while the deterministic policy gate retains sole authority over actions.
- **Autonomy Ladder**: Demonstrates bounded AI autonomy (`APPROVE` → `VERIFY` → `COOL_OFF` → `HOLD` → `ESCALATE`) degrading gracefully to human oversight.
- **Privacy & Minimisation**: Implements DPDP principles where signals travel but raw message transcripts stay local on-device.

## Core Screens

1. **Fraud Operations Dashboard**: High-level KPI cards, risk distribution, risk vs. confidence scatter plot, and recent decisions.
2. **Transactions Explorer**: Search and multi-filter transaction exploration with direct investigation links.
3. **Transaction Investigation**: In-depth analysis screen with 4 separate summary blocks, Autonomy Ladder, Policy Gate pipeline visualizer, and horizontal evidence timeline.
4. **Communication Analysis**: Multi-channel timeline (Voice, SMS, Email, Image) with redacted transcripts and ranked Bayesian signals.
5. **Case Management**: Queue workflow (Open, In Progress, Escalated, Resolved), SLA tracking, timeline, and analyst notes.
6. **Step-up Verification**: Out-of-band IAL2 identity challenge with live status stepper.
7. **Privacy & Consent**: Channel permission matrix and interactive consent revocation consequence simulation.
8. **PRISM Evaluation**: Model benchmark comparing V1 vs. V2, failure analysis, and 6-stage decision trace pipeline.
9. **Audit Trail**: Cryptographically verified immutable decision ledger.
10. **Interactive Demo Walkthrough**: 15-step guided narrative tour for end-to-end evaluation.

## Getting Started

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Run build verification
npm run build
```
