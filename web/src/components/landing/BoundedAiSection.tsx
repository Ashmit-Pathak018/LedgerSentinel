import React, { useState } from 'react';
import { UserCheck, Bot, Lock } from 'lucide-react';

export const BoundedAiSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(3); // Default to HOLD (index 3)

  const STAGES = [
    {
      id: 'APPROVE',
      label: 'APPROVE',
      subtitle: 'Low risk · AI acts alone',
      autonomy: 'Full AI Autonomy',
      color: 'emerald',
      bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeBorder: 'border-emerald-500 ring-4 ring-emerald-50',
      description: 'Transaction and communication exhibit zero threat signals. Instant straight-through processing without human friction.',
      riskThreshold: 'Risk < 30',
      confidenceRequired: 'Confidence > 80%',
    },
    {
      id: 'VERIFY',
      label: 'VERIFY',
      subtitle: 'Step-up verification',
      autonomy: 'Supervised Verification',
      color: 'blue',
      bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
      activeBorder: 'border-blue-500 ring-4 ring-blue-50',
      description: 'Minor anomaly or new device. Policy triggers out-of-band biometric or SMS confirmation before releasing funds.',
      riskThreshold: 'Risk 30–50',
      confidenceRequired: 'Confidence > 75%',
    },
    {
      id: 'COOL_OFF',
      label: 'COOL_OFF',
      subtitle: 'Introduce temporal friction',
      autonomy: 'Automated Friction',
      color: 'amber',
      bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
      activeBorder: 'border-amber-500 ring-4 ring-amber-50',
      description: 'Signals suggest coercive urgency. A mandatory 60-minute holding window breaks the social manipulation cycle.',
      riskThreshold: 'Risk 50–70',
      confidenceRequired: 'Confidence > 70%',
    },
    {
      id: 'HOLD',
      label: 'HOLD',
      subtitle: 'Human review required',
      autonomy: 'Bounded to Human Review',
      color: 'orange',
      bgClass: 'bg-orange-50 text-orange-700 border-orange-200',
      activeBorder: 'border-orange-500 ring-4 ring-orange-50',
      description: 'Multi-signal social engineering detected. Funds frozen immediately; case dispatched to fraud operations tier-1.',
      riskThreshold: 'Risk 70–85',
      confidenceRequired: 'Confidence > 80%',
    },
    {
      id: 'ESCALATE',
      label: 'ESCALATE',
      subtitle: 'Human decides final action',
      autonomy: 'Full Human Authority',
      color: 'rose',
      bgClass: 'bg-rose-50 text-rose-700 border-rose-200',
      activeBorder: 'border-rose-500 ring-4 ring-rose-50',
      description: 'Critical threat or high value combined with signal uncertainty. Autonomy revoked completely. Analyst holds final authority.',
      riskThreshold: 'Risk > 85 OR Low Conf',
      confidenceRequired: 'Any / Degraded',
    },
  ];

  const current = STAGES[activeStage];

  return (
    <section id="bounded-ai" className="py-20 lg:py-28 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
            Bounded AI Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F1B33] tracking-tight">
            The riskier the decision, <br className="hidden sm:inline" />
            the less autonomy AI gets.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            AI models only extract evidence and compute probabilities. The deterministic policy gate
            enforces the action. Humans stay in control where it matters most.
          </p>
        </div>

        {/* Autonomy Spectrum Header Indicator */}
        <div className="mb-6 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 px-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <Bot className="w-4 h-4" />
            <span>More AI Autonomy</span>
          </div>
          <div className="h-0.5 flex-1 mx-6 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full" />
          <div className="flex items-center gap-2 text-rose-700">
            <UserCheck className="w-4 h-4" />
            <span>More Human Oversight</span>
          </div>
        </div>

        {/* 5 Stage Horizontal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {STAGES.map((stage, idx) => {
            const isSelected = activeStage === idx;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(idx)}
                className={`text-left p-4.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? `${stage.bgClass} ${stage.activeBorder} shadow-sm -translate-y-1`
                    : 'bg-[#F8FAFC] border-slate-200/90 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                {/* Active Indicator Pin */}
                {isSelected && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#0F1B33] text-white text-[9px] font-mono font-bold tracking-wider uppercase shadow-xs">
                    ACTIVE STAGE
                  </span>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">0{idx + 1}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${stage.bgClass}`}>
                    {stage.id}
                  </span>
                </div>

                <div className="font-bold text-sm text-[#0F1B33] mb-1">
                  {stage.label}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {stage.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Detail Card for Selected Stage */}
        <div className="mt-8 p-6 lg:p-8 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${current.bgClass}`}>
                  STAGE {activeStage + 1}: {current.id}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  System Governance Rule · Policy v1.3.1
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#0F1B33]">
                {current.autonomy}
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl font-normal">
                {current.description}
              </p>
            </div>

            {/* Right side constraints */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-white border border-slate-200/90 space-y-2.5 text-xs">
              <div className="font-semibold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>Deterministic Trigger Gate</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risk Threshold:</span>
                <span className="font-mono font-bold text-slate-800">{current.riskThreshold}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bayesian Confidence:</span>
                <span className="font-mono font-bold text-blue-700">{current.confidenceRequired}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AI Authority:</span>
                <span className="font-semibold text-slate-900">{current.autonomy}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
