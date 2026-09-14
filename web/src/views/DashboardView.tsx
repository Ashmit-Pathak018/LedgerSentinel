import React, { useState } from 'react';
import { Calendar, Cpu } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useFraud } from '../context/FraudContext';

export const DashboardView: React.FC = () => {
  const { transactions, selectTransaction } = useFraud();
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  // Filter transactions for recent decisions table
  const filteredTransactions = transactions.filter((t) => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'High Risk') return t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL';
    if (selectedFilter === 'Low Confidence') return t.confidence < 75;
    if (selectedFilter === 'Escalated') return t.action === 'ESCALATE';
    if (selectedFilter === 'Awaiting Review') return t.status === 'In Review' || t.status === 'Hold';
    return true;
  });

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Fraud Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time transaction risk and bounded AI decisions.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Last 24 hours</span>
          <span className="text-slate-400 text-[10px]">▼</span>
        </div>
      </div>

      {/* ROW 1: 5 SHORT KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Transactions Analyzed</div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">142,850</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-medium">↑ 4.2%</span> vs yesterday
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">High-Risk</div>
          <div className="text-2xl font-bold text-rose-600 mt-2 tracking-tight">1,247</div>
          <div className="text-[11px] text-slate-400 mt-1">
            0.87% of volume
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Cases Requiring Review</div>
          <div className="text-2xl font-bold text-amber-600 mt-2 tracking-tight">328</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active in queue
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Avg Confidence</div>
          <div className="text-2xl font-bold text-blue-600 mt-2 tracking-tight">89%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Calibrated score
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs col-span-2 md:col-span-1">
          <div className="text-xs text-slate-500 font-medium">Escalations</div>
          <div className="text-2xl font-bold text-purple-700 mt-2 tracking-tight">47</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Human desk routed
          </div>
        </div>
      </div>

      {/* ROW 2: 60% RISK OVERVIEW & 40% RISK VS CONFIDENCE SCATTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 60%: Risk Overview */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Risk Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across evaluated transaction population</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: 142,850 txns</span>
          </div>

          {/* Clean Distribution Chart */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-emerald-700">LOW (0 – 30)</span>
                <span className="text-slate-600 font-mono">132,450 (92.7%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92.7%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-amber-700">MEDIUM (31 – 69)</span>
                <span className="text-slate-600 font-mono">9,153 (6.4%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '6.4%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-rose-700">HIGH (70 – 89)</span>
                <span className="text-slate-600 font-mono">1,012 (0.7%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '0.7%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-purple-700 font-semibold">CRITICAL (90 – 100)</span>
                <span className="text-slate-600 font-mono">235 (0.2%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: '0.2%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 40%: Risk vs Confidence Scatter Plot */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Risk vs Confidence</h3>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Separated Metrics
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              X-axis: Risk score (0-100) • Y-axis: Signal confidence (0-100%)
            </p>

            {/* Custom visual scatter plot */}
            <div className="relative h-48 border-l border-b border-slate-300 ml-6 mb-2 mt-3">
              {/* Quadrant background tints */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none overflow-hidden">
                <div className="bg-emerald-500/[0.02]" />
                <div className="bg-rose-500/[0.03]" />
                <div className="bg-slate-500/[0.015]" />
                <div className="bg-amber-500/[0.025]" />
              </div>

              {/* Y Axis Labels */}
              <span className="absolute -left-7 top-0 text-[10px] text-slate-400 font-mono">100%</span>
              <span className="absolute -left-7 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">50%</span>
              <span className="absolute -left-7 bottom-0 text-[10px] text-slate-400 font-mono">0%</span>

              {/* Gridlines */}
              <div className="w-full border-t border-dashed border-slate-200 absolute top-1/2" />
              <div className="h-full border-r border-dashed border-slate-200 absolute left-1/2" />

              {/* Quadrant labels - positioned with generous clearance so dots never overlap */}
              <span className="absolute top-2.5 left-2.5 text-[9px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200/70 select-none pointer-events-none">
                Safe & Confident
              </span>
              <span className="absolute top-2.5 left-[52%] text-[9px] uppercase tracking-wider font-bold text-rose-700 bg-rose-50/90 px-1.5 py-0.5 rounded border border-rose-200/70 select-none pointer-events-none shadow-2xs">
                High Risk / High Conf
              </span>
              <span className="absolute bottom-2.5 right-2.5 text-[9px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200/70 select-none pointer-events-none">
                High Uncertainty
              </span>
              <span className="absolute bottom-2.5 left-2.5 text-[9px] uppercase tracking-wider font-medium text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/60 select-none pointer-events-none">
                Baseline Monitor
              </span>

              {/* Plotted Points */}
              {/* Point 1: TXN-88204-IN (Risk 82, Conf 87) - Highlighted Flagged Transaction */}
              <div 
                className="group absolute cursor-pointer transform -translate-x-1/2 translate-y-1/2 z-20"
                style={{ left: '82%', bottom: '87%' }}
                title="TXN-88204-IN: Risk 82, Conf 87% (Click to investigate)"
                onClick={() => selectTransaction('TXN-88204-IN')}
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                <span className="relative flex w-3.5 h-3.5 bg-rose-600 rounded-full ring-4 ring-rose-200 group-hover:scale-125 transition-transform"></span>
              </div>

              {/* Realistic distributed sample points - Well separated from quadrant badges */}
              {/* Safe & Confident (low risk, high confidence) */}
              <div 
                className="absolute w-2 h-2 bg-emerald-500 rounded-full opacity-70 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '14%', bottom: '74%' }} 
                title="Risk 14, Conf 74%" 
              />
              <div 
                className="absolute w-2 h-2 bg-emerald-500 rounded-full opacity-70 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '22%', bottom: '68%' }} 
                title="Risk 22, Conf 68%" 
              />
              <div 
                className="absolute w-2.5 h-2.5 bg-emerald-600 rounded-full opacity-75 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '30%', bottom: '78%' }} 
                title="Risk 30, Conf 78%" 
              />
              <div 
                className="absolute w-2 h-2 bg-emerald-500 rounded-full opacity-65 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '18%', bottom: '62%' }} 
                title="Risk 18, Conf 62%" 
              />

              {/* High Risk points */}
              <div 
                className="absolute w-2.5 h-2.5 bg-rose-500 rounded-full opacity-70 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '89%', bottom: '78%' }} 
                title="Risk 89, Conf 78%" 
              />
              <div 
                className="absolute w-3 h-3 bg-purple-600 rounded-full opacity-80 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '94%', bottom: '88%' }} 
                title="Risk 94, Conf 88%" 
              />

              {/* High Uncertainty (elevated risk, lower confidence) */}
              <div 
                className="absolute w-2.5 h-2.5 bg-amber-500 rounded-full opacity-70 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '60%', bottom: '60%' }} 
                title="Risk 60, Conf 60%" 
              />
              <div 
                className="absolute w-2.5 h-2.5 bg-amber-500 rounded-full opacity-70 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '68%', bottom: '38%' }} 
                title="Risk 68, Conf 38%" 
              />

              {/* Baseline Monitor */}
              <div 
                className="absolute w-2 h-2 bg-slate-400 rounded-full opacity-60 transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform" 
                style={{ left: '26%', bottom: '32%' }} 
                title="Risk 26, Conf 32%" 
              />
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] text-slate-400 font-mono ml-6 pt-1">
              <span>0 (Low Risk)</span>
              <span>50</span>
              <span>100 (Critical)</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              Flagged: <strong className="text-slate-800">TXN-88204-IN</strong>
            </span>
            <button 
              onClick={() => selectTransaction('TXN-88204-IN')}
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              Investigate point →
            </button>
          </div>
        </div>
      </div>

      {/* ROW 3: RECENT DECISIONS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Recent Decisions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time decisions emitted by deterministic policy engine</p>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['All', 'High Risk', 'Low Confidence', 'Escalated', 'Awaiting Review'].map((chip) => (
              <button
                key={chip}
                onClick={() => setSelectedFilter(chip)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedFilter === chip
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Transaction</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Risk</th>
                <th className="py-3.5 px-6">Confidence</th>
                <th className="py-3.5 px-6">Evidence</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.slice(0, 7).map((txn) => (
                <tr 
                  key={txn.id}
                  onClick={() => selectTransaction(txn.id)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    txn.id === 'TXN-88204-IN' ? 'bg-rose-50/30' : ''
                  }`}
                >
                  <td className="py-4 px-6 font-mono font-medium text-slate-900">
                    {txn.id}
                    <span className="block text-[11px] text-slate-400 font-sans">{txn.timestamp}</span>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-800">
                    {txn.formattedAmount}
                  </td>
                  <td className="py-4 px-6">
                    <Badge type="risk" value={txn.riskLevel} />
                  </td>
                  <td className="py-4 px-6">
                    <Badge type="confidence" value={txn.confidence.toString()} />
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {txn.evidenceSignals.length > 0 ? (
                      <span className="text-slate-700 font-medium">
                        {txn.criticalEvidenceCount} critical signals
                      </span>
                    ) : (
                      <span className="text-slate-400">0 signals</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <Badge type="action" value={txn.action} />
                  </td>
                  <td className="py-4 px-6">
                    <Badge type="status" value={txn.status} />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTransaction(txn.id);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM: SMALL INFORMATIONAL BANNER */}
      <div className="bg-slate-900 text-white rounded-xl p-4.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              DETERMINISTIC POLICY GATE
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              AI models emit evidence signals with confidence scores. The policy gate evaluates those signals and produces the final action.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          <span>Policy v1.3.1</span>
          <span>•</span>
          <span className="text-emerald-400">Strict Enforcement</span>
        </div>
      </div>
    </div>
  );
};
