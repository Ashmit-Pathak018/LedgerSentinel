/**
 * Transaction detail - the Phase 2 screen.
 *
 * Yash: restyle freely, but keep two things, because they are the product:
 *   1. Risk and confidence render as SEPARATE values. Never merge them into one number or bar.
 *   2. Every signal shows its quote and its source. A score with no factors behind it is a bug.
 */

import { useEffect, useState } from 'react'
import {
  ACTIONS,
  SIGNAL_LABELS,
  actionSeverity,
  confidenceBand,
  type Action,
  type Assessment,
  type Decision,
  type Evidence,
  type Signal,
} from '@contracts'
import { SCENARIOS, analyze, health, type AnalyzeResponse, type Health } from './api'

const TONE: Record<Action, { text: string; bg: string; border: string; blurb: string }> = {
  APPROVE: {
    text: 'text-approve', bg: 'bg-approve-soft', border: 'border-approve',
    blurb: 'Proceeds. AI acted alone.',
  },
  VERIFY: {
    text: 'text-verify', bg: 'bg-verify-soft', border: 'border-verify',
    blurb: 'Step-up identity challenge on an out-of-band channel.',
  },
  COOL_OFF: {
    text: 'text-cooloff', bg: 'bg-cooloff-soft', border: 'border-cooloff',
    blurb: 'Delayed. Friction the scammer cannot wait out.',
  },
  HOLD: {
    text: 'text-hold', bg: 'bg-hold-soft', border: 'border-hold',
    blurb: 'Paused and queued for review. Reversible, time-boxed.',
  },
  ESCALATE: {
    text: 'text-escalate', bg: 'bg-escalate-soft', border: 'border-escalate',
    blurb: 'Paused. A named human must decide - the system cannot release it.',
  },
}

export default function App() {
  const [scenario, setScenario] = useState<'s01' | 's04'>('s01')
  const [data, setData] = useState<AnalyzeResponse | null>(null)
  const [hp, setHp] = useState<Health | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    health().then(setHp).catch(() => setHp(null))
  }, [])

  useEffect(() => {
    setBusy(true)
    setErr(null)
    analyze(SCENARIOS[scenario])
      .then(setData)
      .catch((e) => setErr(String(e)))
      .finally(() => setBusy(false))
  }, [scenario])

  return (
    <div className="min-h-full px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <Header hp={hp} scenario={scenario} onScenario={setScenario} busy={busy} />
        {err && <ErrorBox message={err} />}
        {data && !err && (
          <>
            <DecisionBanner decision={data.decision} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <RiskConfidence assessment={data.assessment} />
              <Factors assessment={data.assessment} />
            </div>
            <EvidenceList evidence={data.evidence} signals={data.signals} />
            <Ladder current={data.decision.action} />
          </>
        )}
      </div>
    </div>
  )
}

function Header({
  hp, scenario, onScenario, busy,
}: {
  hp: Health | null
  scenario: string
  onScenario: (s: 's01' | 's04') => void
  busy: boolean
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-line pb-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
          Transaction detail
        </div>
        <h1 className="mt-1 text-3xl font-semibold">LedgerSentinel</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['s01', 's04'] as const).map((s) => (
          <button
            key={s}
            id={`scenario-${s}`}
            onClick={() => onScenario(s)}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
              scenario === s
                ? 'border-brand bg-brand-soft text-ink'
                : 'border-line text-ink-2 hover:border-ink-3'
            }`}
          >
            {SCENARIOS[s].label}
          </button>
        ))}
        <span className="ml-1 font-mono text-[11px] text-ink-3">
          {busy
            ? 'analysing…'
            : hp
              ? `${hp.policy_version}${hp.models_mock ? ' · mock' : ''}`
              : 'api down'}
        </span>
      </div>
    </header>
  )
}

function DecisionBanner({ decision }: { decision: Decision }) {
  const tone = TONE[decision.action]
  return (
    <section className={`mt-6 rounded border-l-4 ${tone.border} ${tone.bg} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            Authorised action
          </div>
          <div className={`mt-1 font-mono text-2xl font-semibold ${tone.text}`}>
            {decision.action}
          </div>
        </div>
        {decision.human_required && (
          <span className="rounded border border-escalate px-2 py-1 font-mono text-[11px] text-escalate">
            HUMAN REQUIRED
          </span>
        )}
      </div>
      <p className="mt-2 max-w-prose text-sm text-ink-2">{tone.blurb}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/60 pt-3">
        {decision.rationale_refs.map((r) => (
          <code
            key={r}
            className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-2"
          >
            {r}
          </code>
        ))}
      </div>
      <div className="mt-2 font-mono text-[11px] text-ink-3">
        {decision.policy_version} · trace {decision.trace_id}
      </div>
    </section>
  )
}

/** Risk and confidence, side by side and never combined. This is rule 2, made visible. */
function RiskConfidence({ assessment }: { assessment: Assessment }) {
  const band = confidenceBand(assessment.confidence)
  return (
    <section className="rounded border border-line bg-surface p-5">
      <div className="grid grid-cols-2 gap-5">
        <Metric
          label="Risk"
          value={String(assessment.risk_score)}
          suffix="/100"
          caption="How bad this looks"
          pct={assessment.risk_score}
        />
        <Metric
          label="Confidence"
          value={assessment.confidence.toFixed(2)}
          caption={`How sure we are · ${band}`}
          pct={assessment.confidence * 100}
        />
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Two separate values. Low confidence reduces the AI's autonomy — it does not change risk.
      </p>
    </section>
  )
}

function Metric({
  label, value, suffix, caption, pct,
}: {
  label: string
  value: string
  suffix?: string
  caption: string
  pct: number
}) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{label}</div>
      <div className="tnum mt-1 text-3xl font-semibold">
        {value}
        {suffix && <span className="text-base text-ink-3">{suffix}</span>}
      </div>
      <div className="mt-2 h-1 w-full rounded bg-surface-2">
        <div className="h-1 rounded bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-ink-3">{caption}</div>
    </div>
  )
}

function Factors({ assessment }: { assessment: Assessment }) {
  return (
    <section className="rounded border border-line bg-surface p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Contributing factors
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {assessment.factors.map((f) => (
          <li key={f} className="flex items-baseline gap-2 text-sm text-ink-2">
            <span className="text-brand">·</span>
            {f.replaceAll('_', ' ')}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-ink-3">
        {assessment.model_version}
        {assessment.degraded && <span className="ml-2 text-escalate">· DEGRADED</span>}
      </div>
    </section>
  )
}

function EvidenceList({ evidence, signals }: { evidence: Evidence[]; signals: Signal[] }) {
  if (!evidence.length) {
    return (
      <section className="mt-4 rounded border border-line bg-surface p-5 text-sm text-ink-2">
        No communication evidence in the analysis window. The decision rests on transaction
        signals alone.
      </section>
    )
  }
  return (
    <section className="mt-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Evidence</h2>
      <div className="mt-2 flex flex-col gap-2">
        {evidence.map((e) => (
          <article key={e.evidence_id} className="rounded border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] text-ink-3">
                {e.source_type} · {e.source_ref}
              </span>
              <span className="flex items-center gap-2">
                {e.critical && (
                  <span className="rounded border border-escalate px-1.5 py-0.5 font-mono text-[10px] text-escalate">
                    CRITICAL
                  </span>
                )}
                <span className="tnum font-mono text-[11px] text-ink-2">
                  {e.confidence.toFixed(2)}
                </span>
              </span>
            </div>
            <p className="mt-1.5 text-sm">{e.claim}</p>
            {e.redacted_quote && (
              <blockquote className="mt-2 border-l-2 border-line pl-3 text-sm italic text-ink-2">
                “{e.redacted_quote}”
              </blockquote>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {signals
                .filter((s) => s.source_ref === e.source_ref)
                .map((s) => (
                  <span
                    key={`${s.source_ref}-${s.signal_type}`}
                    className="rounded bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2"
                  >
                    {SIGNAL_LABELS[s.signal_type]}
                    <span className="tnum ml-1.5 font-mono text-ink-3">
                      {s.confidence.toFixed(2)}
                    </span>
                  </span>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/** The ladder, with the current rung marked. Shows autonomy decreasing left to right. */
function Ladder({ current }: { current: Action }) {
  return (
    <section className="mt-6 border-t border-line pt-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        Autonomy ladder
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-5">
        {ACTIONS.map((a) => {
          const active = a === current
          const passed = actionSeverity(a) < actionSeverity(current)
          return (
            <div
              key={a}
              className={`rounded border px-2 py-2 font-mono text-[11px] ${
                active
                  ? `${TONE[a].border} ${TONE[a].bg} ${TONE[a].text}`
                  : passed
                    ? 'border-line text-ink-3'
                    : 'border-line/50 text-ink-3/50'
              }`}
            >
              {a}
              {active && <span className="ml-1">◀</span>}
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-3">
        <span>AI autonomy: maximum</span>
        <span>minimum</span>
      </div>
    </section>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded border-l-4 border-escalate bg-escalate-soft p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-escalate">
        API unreachable
      </div>
      <p className="mt-1.5 text-sm text-ink-2">{message}</p>
      <p className="mt-2 font-mono text-[11px] text-ink-3">
        cd api &amp;&amp; uvicorn main:app --reload --port 8080
      </p>
    </div>
  )
}
