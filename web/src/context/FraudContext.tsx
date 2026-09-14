import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { 
  NavScreen, 
  Transaction, 
  CaseItem, 
  AuditLog, 
  ChannelConsent, 
  AutonomyAction, 
  RiskLevel 
} from '../types/fraud';
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_CASES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_CHANNELS 
} from '../data/mockData';
import { loadAll } from '../adapters/liveData';
import { SCENARIOS } from '../api';

interface FraudContextType {
  currentScreen: NavScreen;
  setCurrentScreen: (screen: NavScreen) => void;
  transactions: Transaction[];
  activeTransaction: Transaction;
  selectTransaction: (txnId: string) => void;
  cases: CaseItem[];
  activeCaseId: string;
  setActiveCaseId: (id: string) => void;
  auditLogs: AuditLog[];
  channels: ChannelConsent[];
  toggleChannel: (channelName: 'voice' | 'sms' | 'email' | 'image') => void;
  isConsentRevoked: boolean;
  revokeAllConsent: () => void;
  restoreConsent: () => void;
  verificationStep: number;
  selectedVerificationMethod: string;
  setSelectedVerificationMethod: (method: string) => void;
  sendVerificationRequest: () => void;
  resetVerification: () => void;
  updateCaseAction: (caseId: string, newAction: AutonomyAction) => void;
  addCaseNote: (caseId: string, text: string) => void;
  // Demo Mode
  // Live data: when the API is reachable these replace the mock transactions. Falls back to
  // mocks so the UI still demos with the backend down - same instinct as MODELS_MOCK.
  isLive: boolean;
  liveError: string | null;
  demoStep: number;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  setDemoStep: (step: number) => void;
  nextDemoStep: () => void;
  prevDemoStep: () => void;
  resetDemo: () => void;
}

const FraudContext = createContext<FraudContextType | undefined>(undefined);

export const FraudProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('dashboard');

  // Live transactions from the API, falling back to Yash's fixtures when it is unreachable.
  const [liveTxns, setLiveTxns] = useState<Transaction[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAll(Object.values(SCENARIOS))
      .then(({ transactions, errors }) => {
        if (cancelled) return;
        if (transactions.length) setLiveTxns(transactions);
        if (errors.length) setLiveError(errors.join('; '));
      })
      .catch((e) => {
        if (!cancelled) setLiveError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live data leads; mocks fill in behind it so every screen still has something to render.
  const transactionsList = useMemo(
    () => (liveTxns ? [...liveTxns, ...INITIAL_TRANSACTIONS] : INITIAL_TRANSACTIONS),
    [liveTxns],
  );
  const [activeTxnId, setActiveTxnId] = useState<string>('TXN-88204-IN');
  const [cases, setCases] = useState<CaseItem[]>(INITIAL_CASES);
  const [activeCaseId, setActiveCaseId] = useState<string>('CASE-2026-8820');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [channels, setChannels] = useState<ChannelConsent[]>(INITIAL_CHANNELS);
  const [isConsentRevoked, setIsConsentRevoked] = useState<boolean>(false);
  
  // Verification State
  const [verificationStep, setVerificationStep] = useState<number>(2); // 2: Awaiting customer
  const [selectedVerificationMethod, setSelectedVerificationMethod] = useState<string>('app');

  // Demo walkthrough state
  const [demoStep, setDemoStepState] = useState<number>(1);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const rawActiveTxn = useMemo(() => {
    return transactionsList.find(t => t.id === activeTxnId) || transactionsList[0];
  }, [transactionsList, activeTxnId]);

  // Compute live active transaction based on demo state or consent revocation
  const activeTransaction: Transaction = useMemo(() => {
    if (rawActiveTxn.id !== 'TXN-88204-IN') return rawActiveTxn;

    // If consent is revoked: Privacy Status is TRANSACTION-ONLY
    // Communication analysis disabled, Confidence reduced to 42%, Action routed to HOLD with Human Oversight
    if (isConsentRevoked) {
      return {
        ...rawActiveTxn,
        riskScore: 78,
        riskLevel: 'HIGH',
        confidence: 42, // severely reduced because comms evidence is blinded
        action: 'HOLD',
        status: 'In Review',
        evidenceSignals: [], // blocked due to consent revocation
        criticalEvidenceCount: 0,
      };
    }

    // If running interactive demo flow:
    if (isDemoMode) {
      if (demoStep <= 3) {
        // Step 1-3: Normal baseline view
        return {
          ...rawActiveTxn,
          riskScore: 22,
          riskLevel: 'LOW' as RiskLevel,
          confidence: 65,
          action: 'APPROVE' as AutonomyAction,
          status: 'In Review',
          evidenceSignals: [],
          criticalEvidenceCount: 0,
        };
      } else if (demoStep === 4) {
        // Step 4: Initially transaction looks relatively normal
        return {
          ...rawActiveTxn,
          riskScore: 28,
          riskLevel: 'LOW' as RiskLevel,
          confidence: 70,
          action: 'APPROVE' as AutonomyAction,
          status: 'In Review',
          evidenceSignals: [],
          criticalEvidenceCount: 0,
        };
      } else if (demoStep === 5 || demoStep === 6) {
        // Step 5-6: Communication signals detected
        return {
          ...rawActiveTxn,
          riskScore: 68,
          riskLevel: 'MEDIUM' as RiskLevel,
          confidence: 82,
          action: 'VERIFY' as AutonomyAction,
          status: 'In Review',
          evidenceSignals: rawActiveTxn.evidenceSignals.slice(0, 3),
          criticalEvidenceCount: 2,
        };
      } else if (demoStep >= 7 && demoStep <= 9) {
        // Step 7-9: Risk increases to 82 HIGH, confidence 87%, Policy evaluates HOLD
        return {
          ...rawActiveTxn,
          riskScore: 82,
          riskLevel: 'HIGH' as RiskLevel,
          confidence: 87,
          action: 'HOLD' as AutonomyAction,
          status: 'Hold',
          evidenceSignals: rawActiveTxn.evidenceSignals,
          criticalEvidenceCount: 4,
        };
      } else if (demoStep >= 10) {
        // Step 10+: Escalate to human review
        return {
          ...rawActiveTxn,
          riskScore: 91,
          riskLevel: 'CRITICAL' as RiskLevel,
          confidence: 89,
          action: 'ESCALATE' as AutonomyAction,
          status: 'Escalated',
          evidenceSignals: rawActiveTxn.evidenceSignals,
          criticalEvidenceCount: 5,
        };
      }
    }

    return rawActiveTxn;
  }, [rawActiveTxn, isConsentRevoked, isDemoMode, demoStep]);

  const selectTransaction = (txnId: string) => {
    setActiveTxnId(txnId);
    setCurrentScreen('investigation');
  };

  const toggleChannel = (channelName: 'voice' | 'sms' | 'email' | 'image') => {
    setChannels(prev => prev.map(c => c.channel === channelName ? { ...c, enabled: !c.enabled } : c));
  };

  const revokeAllConsent = () => {
    setIsConsentRevoked(true);
    setChannels(prev => prev.map(c => ({ ...c, enabled: false })));
    
    // Add audit entry
    const newLog: AuditLog = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: '10:24:12',
      actor: 'Customer / DPO',
      event: 'Consent Revocation Executed',
      transactionId: 'TXN-88204-IN',
      policyVersion: 'v1.3.1',
      modelVersion: 'Gemma-3n-E4B',
      result: 'Privacy status switched to TRANSACTION-ONLY. Comms blinded.',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const restoreConsent = () => {
    setIsConsentRevoked(false);
    setChannels(prev => prev.map(c => ({ ...c, enabled: true })));
  };

  const sendVerificationRequest = () => {
    setVerificationStep(1); // 1: Request Sent
    setTimeout(() => {
      setVerificationStep(2); // 2: Awaiting customer
    }, 800);
  };

  const resetVerification = () => {
    setVerificationStep(1);
  };

  const updateCaseAction = (caseId: string, newAction: AutonomyAction) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          action: newAction,
          status: newAction === 'APPROVE' ? 'Resolved' : newAction === 'ESCALATE' ? 'Escalated' : 'In Progress',
        };
      }
      return c;
    }));
  };

  const addCaseNote = (caseId: string, text: string) => {
    const note = {
      id: `N-${Date.now().toString().slice(-4)}`,
      author: 'Yashraj P. (Analyst)',
      timestamp: 'Just now',
      text,
    };
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, notes: [...c.notes, note] } : c));
  };

  // Demo step controller helper that syncs screens
  const setDemoStep = (step: number) => {
    setDemoStepState(step);
    setIsDemoMode(true);

    // Sync screens to demo step narrative
    if (step === 1) {
      setCurrentScreen('dashboard');
    } else if (step === 2) {
      setCurrentScreen('dashboard');
      setActiveTxnId('TXN-88204-IN');
    } else if (step >= 3 && step <= 10) {
      setCurrentScreen('investigation');
      setActiveTxnId('TXN-88204-IN');
    } else if (step === 11) {
      setCurrentScreen('cases');
    } else if (step === 12) {
      setCurrentScreen('communications');
    } else if (step === 13) {
      setCurrentScreen('audit');
    } else if (step === 14) {
      setCurrentScreen('privacy');
    } else if (step === 15) {
      setCurrentScreen('prism');
    }
  };

  const nextDemoStep = () => {
    if (demoStep < 15) {
      setDemoStep(demoStep + 1);
    }
  };

  const prevDemoStep = () => {
    if (demoStep > 1) {
      setDemoStep(demoStep - 1);
    }
  };

  const resetDemo = () => {
    setDemoStepState(1);
    setIsDemoMode(false);
    setIsConsentRevoked(false);
    setCurrentScreen('dashboard');
  };

  return (
    <FraudContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        transactions: transactionsList,
        activeTransaction,
        isLive: liveTxns !== null,
        liveError,
        selectTransaction,
        cases,
        activeCaseId,
        setActiveCaseId,
        auditLogs,
        channels,
        toggleChannel,
        isConsentRevoked,
        revokeAllConsent,
        restoreConsent,
        verificationStep,
        selectedVerificationMethod,
        setSelectedVerificationMethod,
        sendVerificationRequest,
        resetVerification,
        updateCaseAction,
        addCaseNote,
        demoStep,
        isDemoMode,
        setIsDemoMode,
        setDemoStep,
        nextDemoStep,
        prevDemoStep,
        resetDemo,
      }}
    >
      {children}
    </FraudContext.Provider>
  );
};

export const useFraud = () => {
  const context = useContext(FraudContext);
  if (!context) {
    throw new Error('useFraud must be used within a FraudProvider');
  }
  return context;
};
