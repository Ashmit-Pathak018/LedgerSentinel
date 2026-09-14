/**
 * The seam between the frozen contracts and the view models.
 *
 * Yash's components speak `Transaction` from `types/fraud.ts`. The API speaks `Decision`,
 * `Assessment`, `Evidence` and `Signal` from `@contracts`. This file is the ONLY place those
 * two vocabularies meet — so there is exactly one conversion to get wrong, and it is here
 * rather than scattered through nine views.
 *
 * ⚠ THE CONFIDENCE SCALE
 *
 *     API / contracts   confidence is 0–1     (0.632)
 *     view models       confidence is 0–100   (63)
 *
 * `pct()` below is the only place that conversion happens. Wire a component straight to the API
 * without it and every confidence renders as 0.6% instead of 63% — which looks like a broken
 * model rather than a unit bug, and is exactly the sort of thing you find on stage.
 *
 * The right long-term fix is for the view models to adopt 0–1 and drop `types/fraud.ts` in
 * favour of `@contracts`. Until then, this adapter contains the damage.
 */

import type {
  Action,
  Assessment,
  Decision,
  Evidence,
  Signal,
} from '@contracts'
import { SIGNAL_LABELS } from '@contracts'
import type {
  AutonomyAction,
  EvidenceSignal,
  RiskLevel,
  Transaction,
  TransactionStatus,
} from '../types/fraud'
import { analyze, type AnalyzeRequest, type AnalyzeResponse } from '../api'

/** 0–1 (contract) → 0–100 (view model). The single conversion point. */
export const pct = (unit: number): number => Math.round(unit * 100)

/** Risk bands, matching the policy thresholds in api/policy/thresholds.py. */
export function riskLevel(score: number): RiskLevel {
  if (score >= 90) return 'CRITICAL'
  if (score >= 70) return 'HIGH'
  if (score >= 31) return 'MEDIUM'
  return 'LOW'
}

/** What the analyst sees in the status column for a given authorised action. */
export function statusFor(action: Action): TransactionStatus {
  switch (action) {
    case 'APPROVE':
      return 'Approved'
    case 'VERIFY':
      return 'Verified'
    case 'COOL_OFF':
    case 'HOLD':
      return 'Hold'
    case 'ESCALATE':
      return 'Escalated'
    default:
      return 'In Review'
  }
}

const CHANNEL_OF: Record<string, EvidenceSignal['channel']> = {
  call: 'voice',
  sms: 'sms',
  email: 'email',
  image: 'image',
}

const SOURCE_OF: Record<EvidenceSignal['channel'], EvidenceSignal['source']> = {
  voice: 'Voice Call',
  sms: 'SMS',
  email: 'Email',
  image: 'Message Images',
}

/** Guess the channel from a communication id. Phase 3 reads this from Supabase instead. */
function channelOf(sourceRef: string): EvidenceSignal['channel'] {
  const hit = Object.keys(CHANNEL_OF).find((k) => sourceRef.includes(k))
  return hit ? CHANNEL_OF[hit] : 'sms'
}

export function toEvidenceSignal(
  s: Signal,
  evidence: Evidence[],
  index: number,
): EvidenceSignal {
  const ch = channelOf(s.source_ref)
  const backing = evidence.find((e) => e.source_ref === s.source_ref)
  return {
    id: `${s.source_ref}-${s.signal_type}-${index}`,
    signalName: SIGNAL_LABELS[s.signal_type],
    riskLevel: riskLevel(pct(s.confidence)),
    confidence: pct(s.confidence), // ← 0–1 becomes 0–100 here, and nowhere else
    source: SOURCE_OF[ch],
    quote: s.redacted_quote ?? backing?.redacted_quote ?? '',
    detectedAt: backing?.timestamp ?? new Date().toISOString(),
    channel: ch,
    isKeyFactor: backing?.critical ?? false,
  }
}

const CURRENCY: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹' }

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY[currency] ?? `${currency} `
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

/**
 * Build one view-model Transaction from an API response plus the request that produced it.
 *
 * The request is needed because `Decision` deliberately carries no customer or amount — it is a
 * decision, not a transaction record. Keeping them separate is what lets the audit trail store a
 * decision without storing the customer's details alongside it.
 */
export function toTransaction(res: AnalyzeResponse, req: AnalyzeRequest): Transaction {
  const { decision, assessment, evidence, signals } = res
  return {
    id: decision.transaction_id,
    timestamp: decision.created_at ?? new Date().toISOString(),
    customer: {
      id: req.customer_id,
      // Synthetic only (rule 10). Real deployments resolve this from the customer record.
      name: req.customer_id,
      account: req.customer_id.replace('cust_', 'acct_'),
      phone: '—',
      riskCategory: assessment.identity_assurance ?? 'BASIC',
    },
    amount: req.amount,
    formattedAmount: formatAmount(req.amount, req.currency ?? 'USD'),
    destination: req.destination_country ?? '—',
    riskScore: assessment.risk_score, // already 0–100 in the contract
    riskLevel: riskLevel(assessment.risk_score),
    confidence: pct(assessment.confidence), // ← 0–1 becomes 0–100
    action: decision.action as AutonomyAction,
    status: statusFor(decision.action),
    evidenceSignals: signals.map((s, i) => toEvidenceSignal(s, evidence, i)),
    policyVersion: decision.policy_version,
    modelVersion: assessment.model_version,
    criticalEvidenceCount: evidence.filter((e) => e.critical).length,
  }
}

/** Run one scenario through the live API and return it as a view-model Transaction. */
export async function loadTransaction(req: AnalyzeRequest): Promise<Transaction> {
  return toTransaction(await analyze(req), req)
}

/**
 * Load several scenarios concurrently.
 *
 * Returns whatever succeeded rather than rejecting the lot — a single failing scenario should
 * degrade the dashboard, not blank it. Same instinct as rule 5: partial information beats none,
 * as long as you are honest about which part is missing.
 */
export async function loadAll(
  reqs: AnalyzeRequest[],
): Promise<{ transactions: Transaction[]; errors: string[] }> {
  const settled = await Promise.allSettled(reqs.map(loadTransaction))
  const transactions: Transaction[] = []
  const errors: string[] = []

  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') transactions.push(r.value)
    else errors.push(`${reqs[i].transaction_id}: ${String(r.reason)}`)
  })

  return { transactions, errors }
}

/** Re-exported so views can show the exact rules and evidence behind a decision. */
export function rationaleOf(decision: Decision): string[] {
  return [...decision.rationale_refs]
}

export function factorsOf(assessment: Assessment): string[] {
  return [...assessment.factors]
}
