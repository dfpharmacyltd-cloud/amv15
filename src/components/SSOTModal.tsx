import React, { useState } from 'react';
import { SSOTBlock } from '../services/selfAuditEngine';
import { X, Copy, Check, Database, ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface SSOTModalProps {
  isOpen: boolean;
  onClose: () => void;
  ssot: SSOTBlock;
}

export const SSOTModal: React.FC<SSOTModalProps> = ({ isOpen, onClose, ssot }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const ssotString = `// SINGLE SOURCE OF TRUTH (SSOT) BLOCK
PRODUCT: ${ssot.product}
LABEL_CLAIM: ${ssot.labelClaim}
BATCH_NO: ${ssot.batchNo}
TEST_PARAMETER: ${ssot.testParameter}
MONOGRAPH: ${ssot.monograph}
COLUMN: ${ssot.column}
MOBILE_PHASE: ${ssot.mobilePhase}
FLOW: ${ssot.flow}
WAVELENGTH: ${ssot.wavelength}
INJ_VOLUME: ${ssot.injVolume}
COL_TEMP: ${ssot.colTemp}
RUN_TIME: ${ssot.runTime}
DILUENT: ${ssot.diluent}
WORKING_CONC: ${ssot.workingConc}
RETENTION_TIME: ${ssot.retentionTime}
PLATES_TYPICAL: ${ssot.platesTypical}
TAILING_TYPICAL: ${ssot.tailingTypical}
RS_NAME: ${ssot.rsName}
RS_LOT: ${ssot.rsLot}
RS_POTENCY: ${ssot.rsPotency}
AVG_TABLET_WT: ${ssot.avgTabletWt}
SPEC_LIMITS: ${ssot.specLimits}
DOC_NO: ${ssot.docNo}
PROTOCOL_NO: ${ssot.protocolNo}
VERSION: ${ssot.version}
DATES: ${ssot.dates}
PERSONNEL: ${ssot.personnel}
SITE_ADDRESS: ${ssot.siteAddress}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(ssotString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fields: { label: string; value: string | number; key: keyof SSOTBlock }[] = [
    { label: 'PRODUCT', value: ssot.product, key: 'product' },
    { label: 'LABEL_CLAIM', value: ssot.labelClaim, key: 'labelClaim' },
    { label: 'BATCH_NO', value: ssot.batchNo, key: 'batchNo' },
    { label: 'TEST_PARAMETER', value: ssot.testParameter, key: 'testParameter' },
    { label: 'MONOGRAPH', value: ssot.monograph, key: 'monograph' },
    { label: 'COLUMN', value: ssot.column, key: 'column' },
    { label: 'MOBILE_PHASE', value: ssot.mobilePhase, key: 'mobilePhase' },
    { label: 'FLOW', value: ssot.flow, key: 'flow' },
    { label: 'WAVELENGTH', value: ssot.wavelength, key: 'wavelength' },
    { label: 'INJ_VOLUME', value: ssot.injVolume, key: 'injVolume' },
    { label: 'COL_TEMP', value: ssot.colTemp, key: 'colTemp' },
    { label: 'RUN_TIME', value: ssot.runTime, key: 'runTime' },
    { label: 'DILUENT', value: ssot.diluent, key: 'diluent' },
    { label: 'WORKING_CONC', value: ssot.workingConc, key: 'workingConc' },
    { label: 'RETENTION_TIME', value: ssot.retentionTime, key: 'retentionTime' },
    { label: 'PLATES_TYPICAL', value: ssot.platesTypical, key: 'platesTypical' },
    { label: 'TAILING_TYPICAL', value: ssot.tailingTypical, key: 'tailingTypical' },
    { label: 'RS_NAME', value: ssot.rsName, key: 'rsName' },
    { label: 'RS_LOT', value: ssot.rsLot, key: 'rsLot' },
    { label: 'RS_POTENCY', value: ssot.rsPotency, key: 'rsPotency' },
    { label: 'AVG_TABLET_WT', value: ssot.avgTabletWt, key: 'avgTabletWt' },
    { label: 'SPEC_LIMITS', value: ssot.specLimits, key: 'specLimits' },
    { label: 'DOC_NO', value: ssot.docNo, key: 'docNo' },
    { label: 'PROTOCOL_NO', value: ssot.protocolNo, key: 'protocolNo' },
    { label: 'VERSION', value: ssot.version, key: 'version' },
    { label: 'DATES', value: ssot.dates, key: 'dates' },
    { label: 'PERSONNEL', value: ssot.personnel, key: 'personnel' },
    { label: 'SITE_ADDRESS', value: ssot.siteAddress, key: 'siteAddress' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#1F4E79] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Single Source of Truth (SSOT) Inspector</h3>
              <p className="text-[11px] text-blue-100">
                Single Source of Truth: All analytical parameters derived from a synchronized, immutable baseline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Copy SSOT text block"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy SSOT'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 leading-relaxed text-[11px]">
            <strong>Section 1.2 Guarantee:</strong> Every number that appears anywhere in the report is either derived from or exactly equal to this SSOT block. No parameter can be restated with a differing value in another section.
          </div>

          <div className="border border-zinc-300 rounded-lg overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700">
                  <th className="p-2 text-left font-bold w-1/3">SSOT Parameter Key</th>
                  <th className="p-2 text-left font-bold">Synchronized Canonical Value</th>
                </tr>
              </thead>
              <tbody>
                {(fields || []).map((f, i) => (
                  <tr key={f.key} className={i % 2 === 1 ? 'bg-zinc-50' : 'bg-white'}>
                    <td className="p-2 border-b border-zinc-200 font-mono font-bold text-zinc-800">
                      {f.label}
                    </td>
                    <td className="p-2 border-b border-zinc-200 font-mono text-zinc-700">
                      {String(f.value || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-white hover:bg-zinc-900 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
