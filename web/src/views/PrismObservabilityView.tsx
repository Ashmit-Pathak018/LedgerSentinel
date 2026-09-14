import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { evalRuns, prismSummary, type EvalRun, type PrismSummary } from '../api';

/**
 * PRISM Observability.
 *
 * Everything on this screen was fetched, not typed in. Two sources: what PRISM recorded about
 * the running service (latency by span, recent trajectories), and the saved cohort runs in
 * eval/runs/ - V1's failure through to the current state, which is the PRISM story.
 *
 * Deliberately absent: PRISM's satisfaction scores. Its evaluator applies a customer-service
 * rubric that grades a correct escalation as "poor user experience" - see AGENTS.md. A number
 * that rewards missing fraud does not belong on a fraud console.
 */

const SPAN_LABEL: Record<string, string> = {
  extraction: 'Signal extraction',
  gate: 'Policy gate',
  analysis: 'Whole analysis',
};

const EVALUATOR_ORDER = [
  'decision_correctness',
  'critical_evidence_coverage',
  'policy_adherence',
  'grounded_rationale',
  'escalation_safety',
  'loop_discipline',
  'latency_under_10s',
  'calibration',
];

const pct = (x: number) => `${(x * 100).toFixed(x === 1 ? 0 : 1)}%`;
// PRISM stores latency as an integer; the gate genuinely finishes inside a millisecond.
const ms = (x: number) => (x < 1 ? '<1' : String(x));
const shortTime = (iso: string) => (iso ? iso.slice(11, 19) : '—');

export const PrismObservabilityView: React.FC = () => {
  const [prism, setPrism] = useState<PrismSummary | null>(null);
  const [runs, setRuns] = useState<EvalRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Two independent fetches, not one allSettled: the cohort history is a local file read and
    // must not sit behind the PRISM round-trip, which is the one thing here that can be slow.
    evalRuns()
      .then((r) => !cancelled && setRuns(r.runs))
      .catch((e) => !cancelled && setError(`eval runs: ${String(e)}`));
    prismSummary()
      .then((p) => !cancelled && setPrism(p))
      .catch((e) =>
        !cancelled &&
        setPrism({ available: false, reason: String(e), host: '', project: '', latency: [], trajectories: [] }),
      );
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const latest = runs && runs.length ? runs[runs.length - 1] : null;
  const latestPass = latest
    ? Object.values(latest.evaluators).filter((e) => e.pass).length
    : 0;
  const latestTotal = latest ? Object.keys(latest.evaluators).length : 0;
  const gate = prism?.latency.find((l) => l.span === 'gate');
  const analysis = prism?.latency.find((l) => l.span === 'analysis');

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              PRISM Observability
            </h1>
            {prism?.available ? (
              <span className="text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Live · project {prism.project}
              </span>
            ) : (
              <span className="text-xs font-mono font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-200">
                {prism ? 'PRISM unreachable' : 'Loading…'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Every model call, gate decision and full analysis is traced. One transaction is one
            trajectory. Nothing here is typed in - it is read back from PRISM and from the saved
            evaluation runs.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setTick((t) => t + 1);
          }}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh
        </button>
      </div>

      {prism && !prism.available && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-3">
          PRISM did not answer: <span className="font-mono">{prism.reason}</span>. The cohort
          history below is local and still accurate; the live panels wait for the next refresh.
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label={`Traces · last ${prism?.totals?.period ?? '24h'}`}
          value={prism?.totals ? prism.totals.total_traces.toLocaleString() : '—'}
          sub="spans received by PRISM"
        />
        <Stat
          label="Policy gate · p95"
          value={gate ? `${ms(gate.p95_ms)} ms` : '—'}
          sub={gate ? `p50 ${ms(gate.p50_ms)} ms · n=${gate.n}` : 'no gate spans yet'}
        />
        <Stat
          label="Whole analysis · p95"
          value={analysis ? `${ms(analysis.p95_ms)} ms` : '—'}
          sub={analysis ? `p50 ${ms(analysis.p50_ms)} ms · n=${analysis.n}` : 'no analysis spans yet'}
        />
        <Stat
          label={latest ? `Cohort · ${latest.label}` : 'Cohort'}
          value={latest ? `${latestPass}/${latestTotal}` : '—'}
          sub={latest ? (latestPass === latestTotal ? 'evaluators GREEN' : 'evaluators passing') : 'no saved runs'}
          tone={latest ? (latestPass === latestTotal ? 'good' : 'warn') : 'neutral'}
        />
      </div>

      {/* Cohort history - the PRISM story */}
      {runs && runs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              What PRISM found, run by run
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              The same eight scenarios, re-run after each fix. A score moves only when the
              reasoning changed - the thresholds never did.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">Evaluator</th>
                  {runs.map((r) => (
                    <th key={r.label} className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-700">{r.label}</div>
                      <div className="font-normal normal-case tracking-normal text-slate-400">
                        {r.mode.startsWith('live') ? 'live' : 'in-process'} · {r.policy_version}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {EVALUATOR_ORDER.filter((n) => runs.some((r) => r.evaluators[n])).map((name) => (
                  <tr key={name} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-mono text-slate-700">{name}</td>
                    {runs.map((r, i) => {
                      const e = r.evaluators[name];
                      const prev = i > 0 ? runs[i - 1].evaluators[name] : undefined;
                      const delta = e && prev ? e.score - prev.score : 0;
                      return (
                        <td key={r.label} className="py-3 px-4 whitespace-nowrap">
                          {e ? (
                            <span className="inline-flex items-center gap-1.5">
                              {e.pass ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              <span className={`font-mono font-semibold ${e.pass ? 'text-slate-800' : 'text-rose-700'}`}>
                                {pct(e.score)}
                              </span>
                              {Math.abs(delta) > 0.0005 && (
                                <span className={`font-mono text-[10px] ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {delta > 0 ? '▲' : '▼'} {(Math.abs(delta) * 100).toFixed(1)}pp
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-scenario actions */}
          <div className="px-6 pt-5 pb-2 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800">Action per scenario</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Highlighted cells changed from the previous run. Expected action in the first column.
            </p>
          </div>
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-6">Scenario</th>
                  <th className="py-2 px-4">Expected</th>
                  {runs.map((r) => (
                    <th key={r.label} className="py-2 px-4">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(latest?.scenarios ?? []).map((s) => (
                  <tr key={s.scenario_id}>
                    <td className="py-2 px-6 text-slate-700">{s.scenario_id}</td>
                    <td className="py-2 px-4 text-slate-500">{s.expected_action}</td>
                    {runs.map((r, i) => {
                      const cur = r.scenarios.find((x) => x.scenario_id === s.scenario_id);
                      const prev = i > 0 ? runs[i - 1].scenarios.find((x) => x.scenario_id === s.scenario_id) : undefined;
                      const changed = !!prev && !!cur && prev.action !== cur.action;
                      const ok = !!cur && cur.action === cur.expected_action;
                      return (
                        <td key={r.label} className="py-2 px-4">
                          {cur ? (
                            <span className={`px-1.5 py-0.5 rounded ${ok ? 'text-emerald-700' : 'text-rose-700'} ${changed ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}>
                              {cur.action}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Latency by span + trajectories */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
          <h3 className="text-base font-semibold text-slate-900">Latency by span</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            From the {prism?.latency.reduce((n, l) => n + l.n, 0) || '—'} most recent spans PRISM
            returns. The gate is pure code and sub-millisecond; extraction is the model.
          </p>
          <div className="divide-y divide-slate-100 text-xs">
            {(prism?.latency ?? []).map((l) => (
              <div key={l.span} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{SPAN_LABEL[l.span] ?? l.span}</div>
                  <div className="text-slate-400 font-mono text-[11px]">n={l.n}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-slate-900 font-semibold">{ms(l.p95_ms)} ms <span className="text-slate-400 font-normal">p95</span></div>
                  <div className="text-slate-500">{ms(l.p50_ms)} ms <span className="text-slate-400">p50</span></div>
                </div>
              </div>
            ))}
            {prism && prism.available && prism.latency.length === 0 && (
              <div className="py-3 text-slate-400">No spans recorded yet.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
          <h3 className="text-base font-semibold text-slate-900">Recent trajectories</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            One session per transaction: its model calls, then the gate, then the whole analysis.
          </p>
          <div className="space-y-3">
            {(prism?.trajectories ?? []).map((t) => (
              <div key={t.session_id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2">
                  <span>{t.session_id}</span>
                  <span>{shortTime(t.started_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {t.spans.map((s, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                      <span
                        title={s.preview}
                        className={`px-2 py-0.5 rounded-md font-mono text-[11px] ${
                          s.kind === 'gate'
                            ? 'bg-purple-50 text-purple-700'
                            : s.kind === 'analysis'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {SPAN_LABEL[s.kind] ?? s.kind} · {ms(s.latency_ms)} ms
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
            {prism && prism.available && prism.trajectories.length === 0 && (
              <div className="text-xs text-slate-400">No trajectories recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Not shown on purpose: PRISM's satisfaction scores. Its evaluator applies a customer-service
        rubric and grades a correct ESCALATE as "poor user experience" - measured across our gate
        decisions, escalating costs 34 points. Quality is measured by the cohort above instead.
      </p>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub: string; tone?: 'good' | 'warn' | 'neutral' }> = ({
  label,
  value,
  sub,
  tone = 'neutral',
}) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
    <div
      className={`text-2xl font-bold font-mono mt-2 ${
        tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-slate-900'
      }`}
    >
      {value}
    </div>
    <div className="text-xs text-slate-500 mt-1">{sub}</div>
  </div>
);
