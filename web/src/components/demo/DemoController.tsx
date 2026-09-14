import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Sparkles, 
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useFraud } from '../../context/FraudContext';

const DEMO_STEPS = [
  { step: 1, title: 'Open Dashboard', desc: 'High-level real-time overview: 142,850 transactions, risk distribution, and risk vs confidence separation.' },
  { step: 2, title: 'Select ₹8,00,000 Transaction', desc: 'Analyst locates flagged transaction TXN-88204-IN in recent decisions queue.' },
  { step: 3, title: 'Open Investigation Screen', desc: 'Core screen opens with 4 distinct summary blocks: Transaction, Risk, Confidence, Action.' },
  { step: 4, title: 'Initial Baseline View', desc: 'Initially, before deep communication signals arrive, transaction appears relatively normal.' },
  { step: 5, title: 'Communication Evidence Arrives', desc: 'On-device acoustic/NLP extractor fuses private local call and SMS metadata.' },
  { step: 6, title: 'Social Signals Detected', desc: 'Signals extracted: Authority Impersonation (94%), Urgency (91%), Secrecy (88%), Redirect (86%).' },
  { step: 7, title: 'Risk Score Elevated', desc: 'Composite risk score spikes from baseline 28 (LOW) to 82 (HIGH).' },
  { step: 8, title: 'Confidence Calibrated', desc: 'Bayesian confidence updates to 87% with 4 independent multi-modal signals.' },
  { step: 9, title: 'Deterministic Policy Gate Evaluates', desc: 'AI models do NOT choose action. The deterministic policy gate applies strict governance rule v1.3.1.' },
  { step: 10, title: 'Final Action: HOLD → ESCALATE', desc: 'Policy gate bounds autonomy to HOLD, then elevates to ESCALATE for human intervention.' },
  { step: 11, title: 'Case Created', desc: 'Case CASE-2026-8820 generated in Case Management with 15-min SLA and tier-2 routing.' },
  { step: 12, title: 'Inspect Redacted Communication', desc: 'Analyst inspects redacted transcript in Communication Analysis (message stays local).' },
  { step: 13, title: 'Immutable Audit Trail', desc: 'Every model inference, signal score, and policy gate evaluation logged cryptographically.' },
  { step: 14, title: 'Consent Revocation Consequence', desc: 'Testing privacy: Revoking consent drops confidence to 42% and restricts to TRANSACTION-ONLY.' },
  { step: 15, title: 'PRISM V1 → V2 Verification', desc: 'Engineering proof: Expected calibration error reduced by 78% and correctness up to 96.8%.' },
];

export const DemoController: React.FC = () => {
  const { demoStep, setDemoStep, nextDemoStep, prevDemoStep, resetDemo } = useFraud();
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const current = DEMO_STEPS[demoStep - 1] || DEMO_STEPS[0];

  return (
    <aside aria-label="Interactive Demo Flow" className="fixed bottom-4 right-6 z-50 max-w-lg w-full transition-all duration-200">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/80 overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-blue-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>INTERACTIVE DEMO WALKTHROUGH</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Step {demoStep} of 15
            </span>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Body */}
        {!isMinimized && (
          <div className="p-4 space-y-3">
            {/* Title & Desc */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800">
                  {current.step.toString().padStart(2, '0')}
                </span>
                <h4 className="text-sm font-semibold text-slate-100">
                  {current.title}
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {current.desc}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(demoStep / 15) * 100}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevDemoStep}
                  disabled={demoStep === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors border border-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  onClick={nextDemoStep}
                  disabled={demoStep === 15}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-xs"
                >
                  Next Step
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Direct step selector */}
                <select
                  value={demoStep}
                  onChange={(e) => setDemoStep(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-[11px] text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  {DEMO_STEPS.map((s) => (
                    <option key={s.step} value={s.step}>
                      {s.step}. {s.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetDemo}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Reset Demo to Step 1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
