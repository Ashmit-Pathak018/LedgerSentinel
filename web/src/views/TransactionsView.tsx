import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useFraud } from '../context/FraudContext';

export const TransactionsView: React.FC = () => {
  const { transactions, selectTransaction } = useFraud();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = 
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.destination.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'ALL' || txn.riskLevel === riskFilter;
    const matchesAction = actionFilter === 'ALL' || txn.action === actionFilter;

    return matchesSearch && matchesRisk && matchesAction;
  });

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review transaction activity and risk decisions.
          </p>
        </div>

        {/* Export CTA */}
        <button className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs transition-colors self-start md:self-auto">
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Report
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transaction, customer, destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* Date */}
          <div>
            <select className="w-full bg-slate-50 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500">
              <option>Date: Today</option>
              <option>Date: Last 7 Days</option>
              <option>Date: Month-to-date</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <select className="w-full bg-slate-50 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500">
              <option>Amount: All</option>
              <option>&gt; ₹5,00,000</option>
              <option>₹1,00,000 – ₹5,00,000</option>
              <option>&lt; ₹1,00,000</option>
            </select>
          </div>

          {/* Risk */}
          <div>
            <select 
              value={riskFilter} 
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-slate-50 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">Risk: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Policy Action */}
          <div>
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-50 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">Action: All</option>
              <option value="HOLD">HOLD</option>
              <option value="ESCALATE">ESCALATE</option>
              <option value="VERIFY">VERIFY</option>
              <option value="COOL_OFF">COOL_OFF</option>
              <option value="APPROVE">APPROVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Transaction ID</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Destination</th>
                <th className="py-4 px-6">Risk</th>
                <th className="py-4 px-6">Confidence</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.map((txn) => (
                <tr 
                  key={txn.id}
                  onClick={() => selectTransaction(txn.id)}
                  className={`hover:bg-slate-50/90 transition-colors cursor-pointer group ${
                    txn.id === 'TXN-88204-IN' ? 'bg-rose-50/20' : ''
                  }`}
                >
                  <td className="py-5 px-6 font-mono font-semibold text-blue-600 group-hover:underline">
                    {txn.id}
                  </td>
                  <td className="py-5 px-6 text-slate-600">
                    {txn.timestamp}
                  </td>
                  <td className="py-5 px-6">
                    <span className="font-medium text-slate-800">{txn.customer.name}</span>
                    <span className="block text-[11px] text-slate-400 font-mono">{txn.customer.id}</span>
                  </td>
                  <td className="py-5 px-6 font-semibold text-slate-900 text-sm">
                    {txn.formattedAmount}
                  </td>
                  <td className="py-5 px-6 text-slate-600 max-w-[200px] truncate">
                    {txn.destination}
                  </td>
                  <td className="py-5 px-6">
                    <Badge type="risk" value={txn.riskLevel} />
                  </td>
                  <td className="py-5 px-6">
                    <Badge type="confidence" value={txn.confidence.toString()} />
                  </td>
                  <td className="py-5 px-6">
                    <Badge type="action" value={txn.action} />
                  </td>
                  <td className="py-5 px-6">
                    <Badge type="status" value={txn.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
          <span className="text-slate-400">Click any row to open Transaction Investigation</span>
        </div>
      </div>
    </div>
  );
};
