/**
 * API client. Types come from the frozen contracts - never redeclare them here.
 *
 * Yashraj owns this file. Yash: components take these as props and never call fetch
 * themselves, which is what keeps the two lanes from colliding in the same files.
 */

import type { Assessment, Decision, Evidence, Signal } from '@contracts'

export interface AnalyzeRequest {
  transaction_id: string
  customer_id: string
  amount: number
  currency?: string
  destination_country?: string
  communication_ids?: string[]
  first_time_beneficiary?: boolean
  identity_assurance?: 'NONE' | 'BASIC' | 'VERIFIED' | 'STRONG'
  home_countries?: string[]
  /** Beneficiary reference. The API derives history from it (benef_first_seen, benef_seen_3x,
   *  benef_changed_details, merchant_retail) until Phase 3 reads Supabase. */
  destination_ref?: string
  prior_transfers_same_beneficiary?: number[]
  /** Where the customer is transacting from. Abroad is a step-up check, never a block (S04). */
  origin_country?: string
  device_known?: boolean
  /** False simulates the advisory index being down - rule 5, demonstrated live (S07). */
  advisory_index_available?: boolean
  /** Which fixture to draw mock signals from while MODELS_MOCK=true. */
  scenario?: string
}

export interface AnalyzeResponse {
  decision: Decision
  assessment: Assessment
  evidence: Evidence[]
  signals: Signal[]
}

export interface Health {
  status: string
  policy_version: string
  models_mock: boolean
  models: Record<string, unknown>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }
  return res.json() as Promise<T>
}

export const health = () => request<Health>('/v1/health')

export const analyze = (body: AnalyzeRequest) =>
  request<AnalyzeResponse>('/v1/transactions/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const audit = () => request<Record<string, unknown>[]>('/v1/audit')

/** The two demo scenarios, so the UI has something real to open with. */
export const SCENARIOS: Record<string, AnalyzeRequest & { label: string }> = {
  s01: {
    label: 'S01 - coercive scam',
    scenario: 's01',
    transaction_id: 'txn_018',
    customer_id: 'cust_1042',
    amount: 15000,
    currency: 'USD',
    destination_country: 'SG',
    communication_ids: ['comm_771', 'comm_772'],
    first_time_beneficiary: true,
    destination_ref: 'benef_first_seen',
    origin_country: 'IN',
    device_known: true,
    identity_assurance: 'VERIFIED',
    home_countries: ['IN'],
  },
  s04: {
    label: 'S04 - legitimate travel',
    scenario: 's04',
    transaction_id: 'txn_031',
    customer_id: 'cust_2210',
    amount: 890,
    currency: 'EUR',
    destination_country: 'IT',
    communication_ids: ['comm_805'],
    first_time_beneficiary: false,
    // The customer is in Florence paying a Florentine merchant: the LOCATION is unusual, the
    // destination is not. Without origin_country this scenario reads as low-risk and approves,
    // which is the opposite of what it is on stage for.
    destination_ref: 'merchant_retail',
    origin_country: 'IT',
    device_known: true,
    identity_assurance: 'STRONG',
    home_countries: ['IN'],
  },
}
