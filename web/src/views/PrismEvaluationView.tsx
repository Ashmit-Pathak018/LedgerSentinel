import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Terminal
} from 'lucide-react';
import { PRISM_METRICS } from '../data/mockData';

export const PrismEvaluationView: React.FC = () => {
  const [selectedTraceStep, setSelectedTraceStep] = useState<number>(5); // Step 5: Policy Evaluation highlighted

  const traceSteps = [
    { id: 1, name: 'Input Ingestion', detail: 'Event payload & account telemetry buffered' },
    { id: 2, name: 'Signal Extraction', detail: 'On-device acoustic & NLP classifiers emit scores' },
    { id: 3, name: 'Confidence Calibration', detail: 'Bayesian temperature scaling applied (ECE: 0.04)' },
    { id: 4, name: 'Evidence Fusion', detail: 'Contradictory merchant signals reconciled' },
    { id: 5, name: 'Policy Evaluation', detail: 'Deterministic Policy Gate v1.3.1 enforced' },
    { id: 6, name: 'Final Decision', detail: 'Bounded action HOLD dispatched to human ops' },
  ];

  const scenarios = [
    {
      scenario: 'High Urgency Voice Call + Known Beneficiary Utility',
      v1: 'False Positive ESCALATE',
      v2: 'Resolved via Context Fusion (APPROVE)',
      change: 'Corrected false trigger',
    },
    {
      scenario: 'CBI Impersonation + First-Time Zero History Beneficiary',
      v1: 'Missed Coercion Signal (VERIFY)',
      v2: 'Critical Multi-Signal HOLD (82 Risk / 87% Conf)',
      change: 'Detected & bounded correctly',
    },
    {
      scenario: 'Conflicting Lexical Urgency with Family Wire Transfer',
      v1: 'Overconfident Block (98% Conf)',
      v2: 'Calibrated Confidence (62%) → Timed COOL_OFF',
      change: 'Prevented customer lock-out',
    },
    {
      scenario: 'Simultaneous Active VoIP Call during Large Fund Transfer',
      v1: 'Ignored Telemetry',
      v2: 'Extracted Telemetry Flag (Risk +35)',
      change: 'Captured remote coercion scam',
    },
  ];

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              PRISM Evaluation
            </h1>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200">
              Benchmark v2.0
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Model benchmark, confidence calibration and decision trace.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs font-mono">
          <Terminal className="w-3.5 h-3.5 text-blue-600" />
          <span>Evaluation Dataset: 50,000 Verified Scenarios</span>
        </div>
      </div>

      {/* TOP: 6 LARGE METRICS (V1 -> V2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {PRISM_METRICS.map((metric) => (
          <div key={metric.id} className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 leading-tight truncate">
              {metric.label}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-mono text-slate-400 line-through">
                {metric.v1}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-lg font-bold font-mono text-slate-900">
                {metric.v2}
              </span>
            </div>

            <div className="text-[11px] font-bold text-emerald-600 font-mono">
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN 2-COLUMN LAYOUT: 60% FAILURE FOUND & FIXED / 40% DECISION TRACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT 60%: FAILURE FOUND & FIXED */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1">
              Case Study: Benchmark Deep-Dive
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Failure Found & Fixed
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Production defect caught during adversarial stress-testing.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                Reported Failure
              </span>
              <p className="text-slate-900 font-semibold text-sm">
                "Confidence overestimated under conflicting evidence."
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1">
                <span className="font-bold text-rose-700 uppercase text-[10px] tracking-wider">
                  Root Cause
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Model over-trusted a single high-confidence signal while ignoring contradictory merchant profile data.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider">
                  Engineered Fix
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Added conflicting-evidence handling and Bayesian calibration penalty in PRISM v2.0 policy gate.
                </p>
              </div>
            </div>

            {/* V1 vs V2 outcome comparison */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <div>
                  <span className="font-mono font-bold text-slate-500 block text-[11px]">VERSION 1.0</span>
                  <span className="font-semibold text-rose-700">Incorrect (False Block)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-mono font-bold text-emerald-800 block text-[11px]">VERSION 2.0</span>
                  <span className="font-semibold text-emerald-700">Correct (Calibrated Hold)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 40%: DECISION TRACE */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Decision Trace
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive trace execution pipeline for TXN-88204-IN
            </p>
          </div>

          <div className="space-y-2.5">
            {traceSteps.map((step) => {
              const isSelected = selectedTraceStep === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedTraceStep(step.id)}
                  className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100 shadow-xs'
                      : 'bg-slate-50/50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {step.id}
                      </span>
                      {step.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        ACTIVE TRACE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 pl-7">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM: V1 VS V2 COMPARISON TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            Scenario Benchmark Comparison
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantifiable evaluation showing how PRISM v2.0 solves edge cases
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Scenario</th>
                <th className="py-4 px-6">V1 Decision</th>
                <th className="py-4 px-6">V2 Decision</th>
                <th className="py-4 px-6">Improvement Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {scenarios.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-800 max-w-[320px]">
                    {s.scenario}
                  </td>
                  <td className="py-4 px-6 font-mono text-rose-700 bg-rose-50/30">
                    {s.v1}
                  </td>
                  <td className="py-4 px-6 font-mono font-semibold text-emerald-700 bg-emerald-50/30">
                    {s.v2}
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-medium">
                    {s.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
