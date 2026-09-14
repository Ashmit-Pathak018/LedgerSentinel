import React, { useState } from 'react';
import { ShieldCheck, Download, Search } from 'lucide-react';
import { useFraud } from '../context/FraudContext';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, selectTransaction } = useFraud();
  const [filterQuery, setFilterQuery] = useState<string>('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.transactionId.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.event.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Audit Trail
            </h1>
            <span className="text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Immutable Append-Only Log
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cryptographically signed ledger recording all bounded decisions, model inferences, and analyst interventions.
          </p>
        </div>

        {/* Export / Download */}
        <button className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs transition-colors self-start md:self-auto">
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Signed Ledger
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by transaction ID, actor or event..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-50 focus:bg-white text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* AUDIT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Actor</th>
                <th className="py-4 px-6">Event</th>
                <th className="py-4 px-6">Transaction</th>
                <th className="py-4 px-6">Policy Version</th>
                <th className="py-4 px-6">Model Version</th>
                <th className="py-4 px-6">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 font-mono text-slate-500">
                    {log.timestamp}
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    {log.actor}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {log.event}
                  </td>
                  <td className="py-4 px-6 font-mono text-blue-600">
                    <button
                      onClick={() => selectTransaction(log.transactionId)}
                      className="hover:underline"
                    >
                      {log.transactionId}
                    </button>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-600">
                    {log.policyVersion}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-600">
                    {log.modelVersion}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {log.result}
                    </span>
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
