import React from 'react';
import { ArrowDown, Lock } from 'lucide-react';

export const ExplainabilitySection: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#F7F9FC]">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-4 mb-16 text-center mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
            Transparent Governance
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F1B33] tracking-tight">
            Don't just get a decision. <br />
            Understand why.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Black-box AI approvals fail regulatory scrutiny. LedgerSentinel decomposes every
            evaluation into audited signals, fused evidence, and deterministic policy rules.
          </p>
        </div>

        {/* 2-Part Layout: Pipeline Flow (Left) + Detailed Decision Card (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          
          {/* Left: Sequential Pipeline Flow (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Deterministic Decision Pipeline
            </div>

            {/* Step 1 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                01
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">MODEL SIGNALS</div>
                <div className="text-[11px] text-slate-500">On-device acoustic & NLP classifiers</div>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">EVIDENCE FUSION</div>
                <div className="text-[11px] text-slate-500">Bayesian correlation across channels</div>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">POLICY GATE v1.3.1</div>
                <div className="text-[11px] text-slate-500">Zero-hallucination deterministic gate</div>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                04
              </div>
              <div>
                <div className="text-xs font-bold text-orange-900">FINAL ACTION: HOLD</div>
                <div className="text-[11px] text-orange-700 font-medium">Enforced human review</div>
              </div>
            </div>
          </div>

          {/* Right: Detailed Decision Explanation Breakdown (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-6">
            
            {/* Header Result */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Case Decision Record
                </span>
                <span className="font-mono text-xs text-slate-500">TXN-88204-IN</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Enforced Action</span>
                  <div className="text-2xl font-bold text-orange-600 tracking-tight">HOLD</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Risk vs Confidence</span>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    Risk 82 <span className="text-slate-400 font-normal">|</span> Conf 87%
                  </div>
                </div>
              </div>
            </div>

            {/* Why Section */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Why was this action chosen?
              </span>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-medium text-slate-800">Authority Impersonation</span>
                  <span className="font-mono font-bold text-rose-600">0.94 (HIGH)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-medium text-slate-800">Coercive Urgency</span>
                  <span className="font-mono font-bold text-rose-600">0.91 (HIGH)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-medium text-slate-800">Payment Redirection</span>
                  <span className="font-mono font-bold text-amber-600">0.86 (ELEVATED)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-medium text-slate-800">Secrecy Pressure</span>
                  <span className="font-mono font-bold text-purple-600">0.88 (HIGH)</span>
                </div>
              </div>
            </div>

            {/* Core Golden Rule Declaration */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Fundamental System Contract:</span>
              </div>
              <p className="text-blue-800 leading-relaxed">
                AI provides evidence. The deterministic policy gate makes the decision. The system never grants autonomous execution when risk is elevated or evidence is degraded.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
