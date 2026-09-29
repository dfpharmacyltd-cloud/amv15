import React from 'react';
import { SelfAuditCheckItem, DataPendingItem } from '../services/selfAuditEngine';
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';

interface SelfAuditTableProps {
  checks: SelfAuditCheckItem[];
  pendingItems?: DataPendingItem[];
  dataMode: 'TEMPLATE' | 'DEMO';
  tableHeaderClass?: string;
  subHeaderClass?: string;
}

export const SelfAuditTable: React.FC<SelfAuditTableProps> = ({
  checks,
  pendingItems = [],
  dataMode,
  tableHeaderClass = 'bg-[#1F4E79] text-white',
  subHeaderClass = 'text-[#1F4E79]',
}) => {
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const naCount = checks.filter((c) => c.status === 'N/A').length;
  const allPassed = failCount === 0;

  return (
    <div className="mt-8 pt-6 border-t-2 border-zinc-300 space-y-6">
      {/* 1. DATA PENDING SECTION (If TEMPLATE mode or missing items) */}
      {pendingItems.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>DATA PENDING — Laboratory Raw Data Required Prior to Release</span>
          </div>
          <p className="text-xs text-amber-800">
            The following fields require laboratory raw data prior to release:
          </p>
          <table className="w-full text-xs border-collapse border border-amber-300 bg-white">
            <thead>
              <tr className="bg-amber-100 text-amber-900">
                <th className="p-2 border border-amber-300 text-left w-1/4">Section</th>
                <th className="p-2 border border-amber-300 text-left w-1/4">Field</th>
                <th className="p-2 border border-amber-300 text-left">Analytical Requirement</th>
              </tr>
            </thead>
            <tbody>
              {(pendingItems || []).map((item, idx) => (
                <tr key={idx} className="border-b border-amber-200">
                  <td className="p-2 border border-amber-200 font-medium text-zinc-800">{item.section}</td>
                  <td className="p-2 border border-amber-200 font-mono text-zinc-900 font-semibold">{item.field}</td>
                  <td className="p-2 border border-amber-200 text-zinc-700">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. MANDATORY 25-POINT SELF-AUDIT TABLE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1F4E79]" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${subHeaderClass}`}>
              Self-Audit &amp; Pre-Output Verification Matrix
            </h4>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
            allPassed
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-rose-50 text-rose-700 border-rose-300'
          }`}>
            {allPassed ? `Compliant (${passCount} Passed${naCount > 0 ? `, ${naCount} N/A` : ''})` : `${failCount} Pending / Failed`}
          </span>
        </div>
        <p className="text-[11px] text-zinc-600 mb-2 leading-relaxed">
          The self-audit table is constructed by reading back exact text from the document body. Every row provides the exact quoted string from the body and the section number where it appears. A status of FAIL is assigned if the quote cannot be verified from the body or data is pending.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-10">No.</th>
                <th className="p-1.5 border border-zinc-300 text-left w-1/3">Check item</th>
                <th className="p-1.5 border border-zinc-300 text-center w-20">PASS/FAIL</th>
                <th className="p-1.5 border border-zinc-300 text-left">Exact quote from body</th>
                <th className="p-1.5 border border-zinc-300 text-center w-28">Section</th>
              </tr>
            </thead>
            <tbody>
              {(checks || []).map((c, i) => (
                <tr key={c.id} className={i % 2 === 1 ? 'bg-zinc-50' : 'bg-white'}>
                  <td className="p-1.5 border border-zinc-200 text-center font-mono font-medium text-zinc-600">
                    {c.id}
                  </td>
                  <td className="p-1.5 border border-zinc-200 text-zinc-800 font-medium">
                    {c.rule}
                  </td>
                  <td className="p-1.5 border border-zinc-200 text-center">
                    <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-1.5 py-0.5 rounded ${
                      c.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.status === 'N/A'
                        ? 'bg-zinc-100 text-zinc-700'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {c.status === 'PASS' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-600" />
                      )}
                      {c.status}
                    </span>
                  </td>
                  <td className={`p-1.5 border border-zinc-200 text-[11px] font-mono ${
                    c.exactQuote.startsWith('NOT FOUND IN BODY')
                      ? 'text-rose-700 font-bold bg-rose-50/50'
                      : c.status === 'N/A'
                      ? 'text-zinc-500 italic font-sans'
                      : 'text-zinc-800'
                  }`}>
                    {c.exactQuote}
                  </td>
                  <td className="p-1.5 border border-zinc-200 text-center text-zinc-600 font-medium text-[11px]">
                    {c.sectionNumber}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. FINAL FORMAL TERMINATOR (Section 9) */}
      <div className="pt-4 pb-2 text-center text-xs font-bold tracking-widest text-zinc-500 uppercase border-t border-zinc-200">
        — END OF DOCUMENT —
      </div>
    </div>
  );
};
