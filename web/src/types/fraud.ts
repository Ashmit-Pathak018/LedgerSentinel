export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AutonomyAction = 'APPROVE' | 'VERIFY' | 'COOL_OFF' | 'HOLD' | 'ESCALATE';

export type TransactionStatus = 'Approved' | 'In Review' | 'Hold' | 'Escalated' | 'Verified' | 'Blocked';

export type NavScreen = 
  | 'dashboard'
  | 'transactions'
  | 'cases'
  | 'investigation'
  | 'communications'
  | 'stepup'
  | 'privacy'
  | 'audit';

export interface EvidenceSignal {
  id: string;
  signalName: string;
  riskLevel: RiskLevel;
  confidence: number; // 0-100
  source: 'Voice Call' | 'SMS' | 'Email' | 'Message Images';
  quote: string;
  detectedAt: string;
  channel: 'voice' | 'sms' | 'email' | 'image';
  isKeyFactor?: boolean;
}

export interface TranscriptMessage {
  id: string;
  timestamp: string;
  speaker: 'Caller (Suspected Impersonator)' | 'Customer (Sunil M.)';
  text: string;
  suspiciousPhrases?: string[];
}

export interface Transaction {
  id: string;
  timestamp: string;
  customer: {
    id: string;
    name: string;
    account: string;
    phone: string;
    riskCategory: string;
  };
  amount: number;
  formattedAmount: string;
  destination: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  confidence: number; // 0-100
  action: AutonomyAction;
  status: TransactionStatus;
  evidenceSignals: EvidenceSignal[];
  policyVersion: string;
  modelVersion: string;
  criticalEvidenceCount: number;
  // Present only on rows that came from the API. The gate's rationale (rule ids and the ev_*
  // it cites), the assessment's recorded factors, and every piece of evidence behind them.
  // Mock rows leave these undefined and the views fall back to their static blocks.
  rationaleRefs?: string[];
  factors?: string[];
  evidence?: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  sourceType: 'communication' | 'transaction' | 'advisory' | 'identity';
  sourceRef: string;
  claim: string;
  confidence: number; // 0-100
  critical: boolean;
}

export interface CaseItem {
  id: string;
  transactionId: string;
  customerName: string;
  amount: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  action: AutonomyAction;
  status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved';
  assignedTo: string;
  updatedAt: string;
  slaRemaining: string;
  notes: Array<{
    id: string;
    author: string;
    timestamp: string;
    text: string;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  transactionId: string;
  policyVersion: string;
  modelVersion: string;
  result: string;
}

export interface PrismMetric {
  id: string;
  label: string;
  v1: string;
  v2: string;
  change: string;
  isPositive: boolean;
  explanation: string;
}

export interface ChannelConsent {
  channel: 'voice' | 'sms' | 'email' | 'image';
  title: string;
  enabled: boolean;
  analyzedContent: string;
  leavesDevice: string;
  retention: string;
}
