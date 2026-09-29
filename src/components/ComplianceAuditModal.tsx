import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  FileSpreadsheet,
  Activity,
  Layers,
  FileCheck,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { ComplianceGateResult, AuditCheckItem } from '../services/complianceAuditGate';

interface ComplianceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResult: ComplianceGateResult | null;
  onReAudit?: () => void;
  onProceedExport?: () => void;
  onOpenMajorChangeModal?: () => void;
  exportType?: 'protocol' | 'report' | 'both';
}

export const ComplianceAuditModal: React.FC<ComplianceAuditModalProps> = ({
  isOpen,
  onClose,
  auditResult,
  onReAudit,
  onProceedExport,
  onOpenMajorChangeModal,
  exportType,
}) => {
  if (!isOpen || !auditResult) return null;

  const { passed, passedCount, totalChecks, warningCount, criticalCount, blockers, warnings, checks, activeDrugIdentified } = auditResult;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Product Identity':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'Calculation Engine':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'Structural Uniformity':
        return <Layers className="w-4 h-4 text-indigo-600" />;
      case 'Data Synchronization':
        return <FileSpreadsheet className="w-4 h-4 text-purple-600" />;
      case 'Traceability & Control':
        return <FileCheck className="w-4 h-4 text-amber-600" />;
      case 'Audit Trail & Chronology':
        return <Calendar className="w-4 h-4 text-violet-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-zinc-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          passed ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/90 border-rose-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              passed ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm'
            }`}>
              {passed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-zinc-900">
                  {passed ? 'Pre-Output Compliance Gate: Cleared' : 'Pre-Output Compliance Gate: Action Required'}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {passed ? `${passedCount}/${totalChecks} Passed` : `${criticalCount} Critical Blocker${criticalCount > 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Target Active Substance: <strong className="text-zinc-800 uppercase">{activeDrugIdentified}</strong> • ALCOA+ Data Integrity & Contamination Scan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Critical Blockers Alert if any */}
          {blockers.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-rose-800">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Export Blocked: The following compliance errors must be resolved:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-xs text-rose-800">
                {(blockers || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Alert if any */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <div className="flex items-center space-x-2 font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Advisory Notice ({warnings.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-xs text-amber-800">
                {(warnings || []).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Automated Verification Checklist */}
          <div>
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
              Automated Regulatory & Method Verification Checklist ({checks.length} Criteria)
            </h4>
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden bg-white">
              {(checks || []).map((check) => (
                <div key={check.id} className="p-3 hover:bg-zinc-50/60 transition-colors flex items-start space-x-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {check.status === 'passed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    {check.status === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    {check.status === 'failed' && (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(check.category)}
                        <span className="font-semibold text-zinc-900">{check.title}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          check.status === 'passed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : check.status === 'warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {check.status === 'passed' ? 'PASSED' : check.status === 'warning' ? 'ADVISORY' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-zinc-600 mt-1 leading-relaxed">{check.message}</p>
                    {check.details && (
                      <p className="text-zinc-500 font-mono text-[11px] bg-zinc-50 p-1.5 rounded border border-zinc-200 mt-1.5 break-all">
                        {check.details}
                      </p>
                    )}
                    {check.id === 'audit-13-major-parameter-justification' && check.status === 'failed' && onOpenMajorChangeModal && (
                      <div className="mt-2 pt-1.5">
                        <button
                          type="button"
                          id="audit-modal-resolve-rule10-btn"
                          onClick={() => {
                            onClose();
                            onOpenMajorChangeModal();
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center space-x-1 shadow-xs transition-colors"
                        >
                          <span>Enter Mandatory Reason for Change</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs">
          <div className="text-zinc-500">
            {passed ? (
              <span className="text-emerald-700 font-medium">Ready for GxP/ICH Compliant Word Export</span>
            ) : (
              <span className="text-rose-600 font-medium">Document cannot be exported with critical blockers</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onReAudit && (
              <button
                onClick={onReAudit}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-medium flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Verify</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-medium"
            >
              Close
            </button>
            {passed && onProceedExport && (
              <button
                onClick={() => {
                  onClose();
                  onProceedExport();
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center space-x-1.5"
              >
                <span>Export {exportType ? exportType.toUpperCase() : 'DOCX'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
