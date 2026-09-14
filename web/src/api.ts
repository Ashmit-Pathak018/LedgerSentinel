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
    identity_assurance: 'STRONG',
    home_countries: ['IN'],
  },
}
