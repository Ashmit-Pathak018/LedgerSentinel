/**
 * LedgerSentinel frozen contracts - TypeScript mirror.
 *
 * Authoritative source is contracts/json/*.schema.json. Keep this file in sync by hand;
 * if you change one, change both in the same commit and bump CONTRACTS_VERSION.
 *
 * Rule 1: models emit Signal[]. Only the policy gate emits a Decision.
 * Rule 2: riskScore and confidence are separate. Never combine them into one number.
 */

export const CONTRACTS_VERSION = '1.0.0' as const;

/* ------------------------------------------------------------------ enums */

/** The eight frozen scam-intent labels. Adding a ninth is a contract change. */
export const SIGNAL_TYPES = [
  'urgency',
  'authority_impersonation',
  'secrecy_request',
  'remote_access_request',
  'payment_redirect',
  'otp_request',
  'threat',
  'investment_lure',
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

/** Human-readable labels for the UI. Never show a raw enum to an analyst. */
export const SIGNAL_LABELS: Record<SignalType, string> = {
  urgency: 'Time pressure',
  authority_impersonation: 'Impersonating authority',
  secrecy_request: 'Asked to keep it secret',
  remote_access_request: 'Remote access requested',
  payment_redirect: 'Payment redirected',
  otp_request: 'OTP requested',
  threat: 'Threat or intimidation',
  investment_lure: 'Investment lure',
};

/** The ladder, ordered by DESCENDING AI autonomy. Index doubles as severity. */
export const ACTIONS = ['APPROVE', 'VERIFY', 'COOL_OFF', 'HOLD', 'ESCALATE'] as const;
export type Action = (typeof ACTIONS)[number];

export type IdentityAssurance = 'NONE' | 'BASIC' | 'VERIFIED' | 'STRONG';
export type SourceType = 'communication' | 'transaction' | 'advisory' | 'identity';
export type VerificationChannel =
  | 'app_push'
  | 'branch_callback'
  | 'registered_email'
  | 'in_person';

/* -------------------------------------------------------------- contracts */

/** One scam-intent indicator. Describes evidence; never decides anything. */
export interface Signal {
  signal_type: SignalType;
  /** Raw pre-calibration score. Debugging only - do not drive UI or logic off this. */
  value: number;
  /** Calibrated probability. This is the one you display and reason over. */
  confidence: number;
  source_ref: string;
  /** [start, end) offsets into the REDACTED text, for in-place highlighting. */
  evidence_span?: [number, number];
  redacted_quote?: string;
  model_version?: string;
}

/** A normalised claim. Deliberately cannot hold a message body. */
export interface Evidence {
  evidence_id: string;
  source_type: SourceType;
  source_ref: string;
  claim: string;
  confidence: number;
  timestamp: string;
  signal_refs?: string[];
  redacted_quote?: string;
  /** Critical evidence must be consumed before a decision can be proposed. */
  critical?: boolean;
}

/** Fusion output. riskScore and confidence mean different things - show both, always. */
export interface Assessment {
  assessment_id: string;
  transaction_id: string;
  /** 0-100. How bad this looks. */
  risk_score: number;
  /** 0-1. How sure we are. Independent of risk_score. */
  confidence: number;
  factors: string[];
  evidence_ids: string[];
  identity_assurance?: IdentityAssurance;
  critical_evidence_present?: boolean;
  /** A component failed. Must lower confidence; can never yield APPROVE. */
  degraded?: boolean;
  model_version: string;
  created_at?: string;
}

/** Produced ONLY by the deterministic policy gate. */
export interface Decision {
  decision_id: string;
  transaction_id: string;
  assessment_id?: string;
  action: Action;
  human_required: boolean;
  policy_version: string;
  /** ev_* ids and rule.* ids. Never empty. */
  rationale_refs: string[];
  trace_id: string;
  /** The gate overrode the AI's proposal. The bounded-autonomy story lives here. */
  proposal_rejected?: boolean;
  cool_off_seconds?: number;
  hold_expires_at?: string;
  verification_channel?: VerificationChannel;
  created_at?: string;
}

/* ---------------------------------------------------------------- helpers */

/** Severity rank, 0 (APPROVE) to 4 (ESCALATE). Higher means less AI autonomy. */
export function actionSeverity(a: Action): number {
  return ACTIONS.indexOf(a);
}

/** Semantic colour role. Pair with an icon or text - never colour alone (accessibility). */
export function actionTone(a: Action): 'success' | 'warning' | 'danger' | 'critical' {
  switch (a) {
    case 'APPROVE':
      return 'success';
    case 'VERIFY':
      return 'warning';
    case 'COOL_OFF':
    case 'HOLD':
      return 'danger';
    case 'ESCALATE':
      return 'critical';
  }
}

/** Confidence bands for display. Keep the thresholds here so the UI stays consistent. */
export function confidenceBand(c: number): 'low' | 'moderate' | 'high' {
  if (c < 0.5) return 'low';
  if (c < 0.75) return 'moderate';
  return 'high';
}

/**
 * Runtime guard. The model service is across a network boundary, so validate rather
 * than trust - and this is also where rule 1 gets enforced on the wire.
 */
export function isSignal(v: unknown): v is Signal {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if ('action' in s) {
    throw new Error(
      'Contract violation: a Signal carried an "action" field. Models emit evidence, ' +
        'never decisions. See rule 1 in the root README.'
    );
  }
  return (
    typeof s.signal_type === 'string' &&
    (SIGNAL_TYPES as readonly string[]).includes(s.signal_type) &&
    typeof s.value === 'number' &&
    typeof s.confidence === 'number' &&
    typeof s.source_ref === 'string'
  );
}
