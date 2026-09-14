import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useFraud } from '../context/FraudContext';
import type { AutonomyAction } from '../types/fraud';

export const InvestigationView: React.FC = () => {
  const { 
    activeTransaction, 
    setCurrentScreen, 
    isConsentRevoked, 
    restoreConsent 
  } = useFraud();
  
  const [activeTab, setActiveTab] = useState<'Overview' | 'Evidence' | 'Communications' | 'Policy Decision' | 'Audit Trail'>('Overview');
  const [showAllSignals, setShowAllSignals] = useState<boolean>(false);

  const displayedSignals = showAllSignals 
    ? activeTransaction.evidenceSignals 
    : activeTransaction.evidenceSignals.slice(0, 4);

  // Autonomy ladder steps
  const ladderSteps: Array<{ action: AutonomyAction; label: string; desc: string }> = [
    { action: 'APPROVE', label: 'APPROVE', desc: 'AI acts alone' },
    { action: 'VERIFY', label: 'VERIFY', desc: 'Step-up verification' },
    { action: 'COOL_OFF', label: 'COOL_OFF', desc: 'Timed delay' },
    { action: 'HOLD', label: 'HOLD', desc: 'Human review' },
    { action: 'ESCALATE', label: 'ESCALATE', desc: 'Human decides' },
  ];

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Privacy Revocation Warning Banner (if revoked) */}
      {isConsentRevoked && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center justify-between text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                PRIVACY STATUS: TRANSACTION-ONLY
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Communication analysis disabled by user consent revocation. Signal confidence dropped to 42%. Policy gate enforces conservative human hold.
              </p>
            </div>
          </div>
          <button
            onClick={restoreConsent}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            Re-enable Consent
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Transaction Investigation
            </h1>
            <Badge type="action" value={activeTransaction.action} size="lg" />
          </div>
          <p className="text-sm text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
            <span className="font-mono font-medium text-slate-700">{activeTransaction.id}</span>
            <span>•</span>
            <span>{activeTransaction.timestamp}</span>
            <span>•</span>
            <span>Beneficiary: <strong className="text-slate-700">{activeTransaction.destination}</strong></span>
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentScreen('stepup')}
            className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            Initiate Verification
          </button>
          <button 
            onClick={() => setCurrentScreen('cases')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            Open Case Queue
          </button>
        </div>
      </div>

      {/* TOP SUMMARY — 4 SEPARATE BLOCKS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block 1: Transaction */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            TRANSACTION
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {activeTransaction.formattedAmount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Customer: {activeTransaction.customer.name}
          </div>
        </div>

        {/* Block 2: Risk */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>RISK</span>
            <span className="text-[10px] font-mono text-slate-400">Score 0–100</span>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 flex items-baseline gap-2">
            <span>{activeTransaction.riskLevel}</span>
            <span className="text-sm font-normal text-slate-400 font-mono">({activeTransaction.riskScore}/100)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            High velocity anomaly detected
          </div>
        </div>

        {/* Block 3: Confidence */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>CONFIDENCE</span>
            <span className="text-[10px] font-mono text-slate-400">Calibrated</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2 font-mono">
            {activeTransaction.confidence}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Bayesian signal consensus
          </div>
        </div>

        {/* Block 4: Action */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            ACTION
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {activeTransaction.action}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Deterministic policy result
          </div>
        </div>
      </div>

      {/* MAIN AREA — 70 / 30 SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT 70%: TABS & EVIDENCE */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-medium space-x-6">
            {(['Overview', 'Evidence', 'Communications', 'Policy Decision', 'Audit Trail'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 relative transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Transaction Summary Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  Transaction Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Customer Name</span>
                    <span className="font-semibold text-slate-800">{activeTransaction.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Account Number</span>
                    <span className="font-mono text-slate-800">{activeTransaction.customer.account}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Account Age / History</span>
                    <span className="text-slate-800">{activeTransaction.customer.riskCategory}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Beneficiary Destination</span>
                    <span className="font-mono text-slate-800">{activeTransaction.destination}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Channel / Protocol</span>
                    <span className="text-slate-800">Mobile RTGS Instant</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Device Telemetry</span>
                    <span className="text-emerald-700 font-medium">Known Device (Pixel 8)</span>
                  </div>
                </div>
              </div>

              {/* Detected Social Engineering Signals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                      Detected Social Engineering Signals
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Extracted on-device with zero raw data egress.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {activeTransaction.evidenceSignals.length} Total Signals
                  </span>
                </div>

                {activeTransaction.evidenceSignals.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 text-xs text-slate-500">
                    No social engineering signals detected. Communication privacy mode or baseline state.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedSignals.map((signal) => (
                      <div
                        key={signal.id}
                        className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-slate-900 text-sm">
                              {signal.signalName}
                            </span>
                            <Badge type="risk" value={signal.riskLevel} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500">
                              Confidence: <strong className="text-blue-700 font-mono">{signal.confidence}%</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-medium">
                              Source: {signal.source}
                            </span>
                          </div>
                        </div>

                        {/* Redacted Quote */}
                        <div className="bg-slate-50 rounded-lg p-3 my-2 text-xs text-slate-700 italic border-l-3 border-blue-500">
                          {signal.quote}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-slate-400 font-mono text-[11px]">
                            Detected at {signal.detectedAt}
                          </span>
                          <button
                            onClick={() => setCurrentScreen('communications')}
                            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                          >
                            View source transcript →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTransaction.evidenceSignals.length > 4 && (
                  <button
                    onClick={() => setShowAllSignals(!showAllSignals)}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                  >
                    {showAllSignals 
                      ? 'Show top 4 signals only' 
                      : `View all ${activeTransaction.evidenceSignals.length} signals →`}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Evidence' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
              <h3 className="text-base font-semibold text-slate-900">
                Multi-Modal Evidence Fusion
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                LedgerSentinel synthesizes lexical, acoustic stress, and device telemetry vectors. Each factor is evaluated through a Bayesian belief network to prevent single-signal hallucinations.
              </p>
              <div className="divide-y divide-slate-100 text-xs pt-2">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Acoustic Stress Biomarkers</span>
                  <span className="text-rose-600 font-semibold">High Tension / Rapid Cadence</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Lexical Coercion Markers</span>
                  <span className="text-rose-600 font-semibold">CBI Warrant / Section 102</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Clipboard Destination Injection</span>
                  <span className="text-amber-600 font-semibold">Pasted in 4.2 seconds</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Concurrent Active VoIP Call</span>
                  <span className="text-rose-600 font-semibold">Ongoing incoming call</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Communications' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Communication Analysis Channel</h3>
                <button
                  onClick={() => setCurrentScreen('communications')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Open Full Screen View →
                </button>
              </div>
              <p className="text-slate-600">
                Transcripts are processed strictly on-device. Raw audio or text is never transmitted outside the client boundary.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800">Audio Call Snippet (Redacted):</div>
                <p className="italic text-slate-700">
                  "Your bank account will be frozen by CBI Special Task Force within 30 minutes if you do not transfer funds to this secure verification account immediately."
                </p>
              </div>
            </div>
          )}

          {activeTab === 'Policy Decision' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
              <h3 className="text-base font-semibold text-slate-900">Deterministic Policy Rule Trace</h3>
              <p className="text-slate-600">
                Rule ID: <strong className="font-mono text-slate-800">RULE-SE-HOLD-802</strong>
              </p>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
                <div>IF (risk_score &gt;= 70 AND confidence &gt;= 80)</div>
                <div>AND (evidence_signals CONTAINS 'Authority Impersonation')</div>
                <div>AND (transaction_amount &gt;= ₹5,00,000)</div>
                <div className="text-emerald-400 font-bold">THEN ACTION = 'HOLD'</div>
                <div className="text-purple-400 font-bold">AND ROUTE_TO = 'HUMAN_FRAUD_OPS'</div>
              </div>
            </div>
          )}

          {activeTab === 'Audit Trail' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-3 text-xs">
              <h3 className="text-base font-semibold text-slate-900">Transaction Event Log</h3>
              <div className="divide-y divide-slate-100 font-mono">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">10:18:42 AM</span>
                  <span className="text-slate-800 font-medium">Policy evaluated: HOLD applied</span>
                  <span className="text-emerald-600">Passed</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">10:18:25 AM</span>
                  <span className="text-slate-800">Signal fusion complete (8 signals)</span>
                  <span className="text-blue-600">Verified</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">10:17:48 AM</span>
                  <span className="text-slate-800">Impersonation signal extracted</span>
                  <span className="text-rose-600">High Risk</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 30%: AUTONOMY LADDER & WHY THIS ACTION */}
        <div className="lg:col-span-4 space-y-6">
          {/* Autonomy Ladder Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Autonomy Ladder
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Dynamic Degradation</span>
            </div>

            <div className="space-y-2">
              {ladderSteps.map((step, idx) => {
                const isCurrent = activeTransaction.action === step.action;
                return (
                  <div key={step.action}>
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-rose-50 border-rose-300 shadow-xs ring-2 ring-rose-200/50'
                          : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-xs font-bold ${isCurrent ? 'text-rose-900' : 'text-slate-700'}`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isCurrent ? 'text-rose-700 font-medium' : 'text-slate-500'}`}>
                        {step.desc}
                      </p>
                    </div>

                    {idx < ladderSteps.length - 1 && (
                      <div className="flex justify-center my-1 text-slate-300">
                        ↓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* WHY THIS ACTION? */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              Why This Action?
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Risk Score</span>
                <span className="font-bold text-rose-600 font-mono">{activeTransaction.riskScore} / 100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Confidence</span>
                <span className="font-bold text-blue-600 font-mono">{activeTransaction.confidence}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Critical Evidence</span>
                <span className="font-bold text-slate-900">{activeTransaction.criticalEvidenceCount} signals</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Policy Version</span>
                <span className="font-mono text-slate-700">{activeTransaction.policyVersion}</span>
              </div>
            </div>

            {/* Pipeline Visualizer: Models -> Signals -> Policy Gate -> Action */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Deterministic Policy Gate
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-[11px] space-y-2">
                <div className="flex items-center justify-between font-mono text-slate-600">
                  <span>Models</span>
                  <span>→</span>
                  <span>Signals</span>
                  <span>→</span>
                  <span className="font-bold text-blue-700">Policy Gate</span>
                  <span>→</span>
                  <span className="font-bold text-rose-700">Action</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                  The policy gate is the ultimate authority. Raw AI models cannot directly trigger account holds or fund transfers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: HORIZONTAL EVIDENCE TIMELINE */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight mb-4">
          Evidence Timeline
        </h3>

        {/* Horizontal step sequence */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-[900px] justify-between text-xs relative">
            {/* Horizontal connecting line */}
            <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

            {[
              { label: 'Transaction initiated', time: '10:16:10', state: 'done' },
              { label: 'Voice analyzed', time: '10:16:35', state: 'done' },
              { label: 'Urgency detected', time: '10:17:15', state: 'alert' },
              { label: 'Authority impersonation', time: '10:17:48', state: 'alert' },
              { label: 'SMS analyzed', time: '10:18:12', state: 'done' },
              { label: 'Risk increased (82)', time: '10:18:25', state: 'alert' },
              { label: 'Policy evaluated', time: '10:18:42', state: 'done' },
              { label: 'HOLD + ESCALATE', time: '10:18:43', state: 'active' },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center z-10 px-2 max-w-[110px]">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shadow-xs mb-2 ${
                    step.state === 'active'
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : step.state === 'alert'
                      ? 'bg-amber-500 text-white ring-2 ring-amber-100'
                      : 'bg-white border-2 border-blue-600 text-blue-700'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="font-semibold text-slate-800 text-[11px] leading-tight">
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {step.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
