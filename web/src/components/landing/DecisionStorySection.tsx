import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, MessageSquare, PhoneCall, ShieldAlert, Sparkles } from 'lucide-react';

interface DecisionStorySectionProps {
  onLaunchApp: () => void;
}

export const DecisionStorySection: React.FC<DecisionStorySectionProps> = ({ onLaunchApp }) => {
  const [activeStep, setActiveStep] = useState<number>(3); // default to step 4 (index 3)

  const STEPS = [
    {
      num: '01',
      title: 'Transaction',
      badge: 'LOW RISK',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      amount: '₹8,00,000',
      dest: 'To: New Account ••••4821',
      detail: 'Timestamp: 10:18 AM · Channel: Mobile Banking',
      quote: null,
      riskScore: 24,
      confidence: '82%',
      status: 'Approve (Baseline)',
      statusColor: 'text-emerald-600',
      explanation: 'In isolation, an ₹8,00,000 transfer to a new account passes rule thresholds with standard OTP authentication.',
      icon: CheckCircle2,
    },
    {
      num: '02',
      title: 'Add SMS Intercept',
      badge: 'ELEVATED RISK',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      amount: 'Urgency Detected',
      dest: 'Sender: Unverified Mobile (+91 98•••)',
      detail: 'Timestamp: 10:16 AM (2 mins before payment)',
      quote: '"Please approve the payment immediately. It is extremely urgent."',
      riskScore: 48,
      confidence: '91%',
      status: 'Verify / Step-up',
      statusColor: 'text-amber-600',
      explanation: 'On-device NLP extracts a 91% urgency score. Time delta of 2 minutes establishes temporal correlation.',
      icon: MessageSquare,
    },
    {
      num: '03',
      title: 'Add Voice Stream',
      badge: 'HIGH RISK',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      amount: 'Impersonation Detected',
      dest: 'Caller: False Enforcement Official',
      detail: 'Call active during transfer execution',
      quote: '"Your account will be frozen by cyber-crime branch if you disconnect..."',
      riskScore: 68,
      confidence: '88%',
      status: 'Cool-off / Friction',
      statusColor: 'text-orange-600',
      explanation: 'Acoustic stress markers + authority claims spike threat probability. Secrecy condition detected.',
      icon: PhoneCall,
    },
    {
      num: '04',
      title: 'Deterministic Policy Gate',
      badge: 'CRITICAL HOLD',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      amount: 'Bounded to Human Review',
      dest: 'Enforced by Policy Gate v1.3.1',
      detail: 'SLA: 15-Minute Fraud Ops SLA',
      quote: 'Decision: HOLD (Rule 5: High-Impact + Social Coercion)',
      riskScore: 82,
      confidence: '87%',
      status: 'HOLD · Human Review Required',
      statusColor: 'text-rose-600',
      explanation: 'AI autonomy bounds to zero. The policy gate halts payment execution and routes the case to analyst Yash Bohra.',
      icon: ShieldAlert,
    },
  ];

  const current = STEPS[activeStep];

  return (
    <section id="demo-story" className="py-20 lg:py-28 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            See It In Action
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F1B33] tracking-tight">
            A real example. Step by step.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            See how multi-modal communication evidence transforms a seemingly normal
            ₹8,00,000 transaction into a deterministic policy hold.
          </p>
        </div>

        {/* 4 Interactive Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, idx) => {
            const isSelected = activeStep === idx;
            const Icon = step.icon;
            return (
              <button
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#F8FAFC] border-blue-500 ring-4 ring-blue-50 shadow-md -translate-y-1'
                    : 'bg-white border-slate-200 hover:bg-slate-50/80 shadow-2xs text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-slate-400">{step.num}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="font-bold text-sm text-[#0F1B33]">
                    {step.title}
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-4 font-medium">
                  {step.dest}
                </div>

                {/* Score bar */}
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Risk:</span>
                    <span className="font-bold font-mono text-slate-900">{step.riskScore} / 100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        step.riskScore > 70 ? 'bg-rose-500' : step.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${step.riskScore}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Detail Card of the Selected Step */}
        <div className="mt-8 p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#0F1B33] text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  STEP {current.num}: {current.title.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">
                  Transaction TXN-88204-IN
                </span>
              </div>

              {current.quote && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-sm italic text-slate-200 font-serif">
                  {current.quote}
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                {current.explanation}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
                <div>
                  <span className="text-slate-400">Calculated Risk:</span>{' '}
                  <strong className="text-rose-400 font-mono text-sm">{current.riskScore} / 100</strong>
                </div>
                <div>
                  <span className="text-slate-400">Signal Confidence:</span>{' '}
                  <strong className="text-blue-400 font-mono text-sm">{current.confidence}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Permitted Action:</span>{' '}
                  <strong className="text-orange-400 text-sm">{current.status}</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-center items-start lg:items-end gap-3">
              <button
                onClick={onLaunchApp}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
              >
                Try the Interactive Demo
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-slate-400">
                14-step live walkthrough in operations console
              </span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
