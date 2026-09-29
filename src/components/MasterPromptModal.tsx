import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, FileCode, CheckCircle2, ArrowRight } from 'lucide-react';
import { ValidationMethodType } from '../types';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (method: ValidationMethodType, productName: string) => void;
}

export const MasterPromptModal: React.FC<MasterPromptModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'template'>('template');

  if (!isOpen) return null;

  const inputTemplateText = `DATA_MODE:            TEMPLATE | DEMO
★ REPORT TYPE:        Assay | Related Substances | Dissolution
★ STUDY TYPE:         Validation (in-house) | Verification (compendial)
★ PRODUCT:            
★ LABEL CLAIM:        
★ BATCH NO / SIZE / MFG DATE:
★ MONOGRAPH / REFERENCE:
★ SITE (QC lab address):
  DOC NO / PROTOCOL NO / VERSION / DATES:
  PERSONNEL (prepared / checked / reviewed / approved + designations):

★ CHROMATOGRAPHIC CONDITIONS:
   column, mobile phase, flow, wavelength, injection volume,
   column temp, run time, diluent, working conc, observed RT

★ REFERENCE STANDARD: name, source, lot, potency %, basis, valid through
★ AVERAGE WEIGHT OF 20 UNITS (assay/RS):
★ PLACEBO BATCH:
  EQUIPMENT IDs + calibration due dates:
  FILTER: type, pore size, filter suitability result

★ SPECIFICATION LIMITS:
   Assay:        e.g. 90.0–110.0 %
   RS:           individual / specified / total / disregard, RRFs
   Dissolution:  apparatus, speed, medium, volume, temp, time, Q

★ RAW DATA (paste tables):
   system suitability, specificity, linearity, accuracy, precision,
   intermediate precision, robustness, solution stability,
   LOD/LOQ (RS only), forced degradation (if performed)`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(inputTemplateText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Master System Prompt &amp; User Input Guidelines</h3>
              <p className="text-[11px] text-zinc-400">
                GMP AMV/AMVer Documentation &amp; Calculation Engine Specification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('template')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'template'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Section 10: User Input Template</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Core Non-Negotiable Rules Summary</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'template' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-zinc-600 text-[11px]">
                  Use the template below to supply user inputs for custom products. Items marked <strong className="text-rose-600">★</strong> are strictly mandatory prior to report generation.
                </p>
                <button
                  onClick={handleCopyTemplate}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs"
                >
                  {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTemplate ? 'Copied Template!' : 'Copy Input Template'}</span>
                </button>
              </div>

              <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre border border-zinc-800">
                {inputTemplateText}
              </div>

              {/* Quick Monograph Loaders */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <h4 className="font-bold text-blue-950 text-xs">
                  Quick Load Authentically Calibrated Method Baselines:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onSelectProduct('dissolution', 'Tibolone Tablets BP 2.5 mg');
                      onClose();
                    }}
                    className="p-2 bg-white rounded border border-blue-300 hover:bg-blue-100/60 text-left transition-colors flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-900 text-[11px]">Dissolution Verification</span>
                    <span className="text-[10px] text-zinc-600">Tibolone Tablets BP 2.5 mg</span>
                    <span className="text-[10px] text-blue-700 mt-1 flex items-center gap-0.5 font-semibold">
                      Load Dissolution <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProduct('related_substances', 'Sodium Valproate Oral Solution BP');
                      onClose();
                    }}
                    className="p-2 bg-white rounded border border-blue-300 hover:bg-blue-100/60 text-left transition-colors flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-900 text-[11px]">Related Substances</span>
                    <span className="text-[10px] text-zinc-600">Sodium Valproate Solution</span>
                    <span className="text-[10px] text-blue-700 mt-1 flex items-center gap-0.5 font-semibold">
                      Load RS Method <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProduct('assay', 'Acarbose Tablets 100 mg');
                      onClose();
                    }}
                    className="p-2 bg-white rounded border border-blue-300 hover:bg-blue-100/60 text-left transition-colors flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-900 text-[11px]">Assay Validation (HPLC)</span>
                    <span className="text-[10px] text-zinc-600">Acarbose Tablets 100 mg</span>
                    <span className="text-[10px] text-blue-700 mt-1 flex items-center gap-0.5 font-semibold">
                      Load Assay Method <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-[11px] text-zinc-700 leading-relaxed">
              <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-200">
                <h4 className="font-bold text-zinc-900 mb-1">1.1 Never Invent Analytical Data</h4>
                <p>Missing raw values output as <code className="bg-white px-1 py-0.5 rounded border border-zinc-300 font-mono">__________ [ENTER RAW DATA]</code> and placed on the DATA PENDING list. If DATA_MODE = DEMO, watermark "DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE" is active.</p>
              </div>

              <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-200">
                <h4 className="font-bold text-zinc-900 mb-1">1.2 Single Source of Truth (SSOT)</h4>
                <p>All values derived from the 28-variable SSOT block. No parameter can contradict another across sections.</p>
              </div>

              <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-200">
                <h4 className="font-bold text-zinc-900 mb-1">2. Calculation Engine Mandates</h4>
                <p>Sample SD with (n - 1) denominator. Slope, intercept, residual SD, LOD (3.3σ/m) and LOQ (10σ/m) recomputed. Correlation coefficient reported to 4 decimals, never 1.0000. Assay formula must include ×100.</p>
              </div>

              <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-200">
                <h4 className="font-bold text-zinc-900 mb-1">3. Regulatory Chapter Citations</h4>
                <p>Validation: USP &lt;1225&gt; | Verification: USP &lt;1226&gt; | Transfer: USP &lt;1224&gt;. Never mix.</p>
              </div>

              <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-200">
                <h4 className="font-bold text-zinc-900 mb-1">6.2 Related Substances Special Requirements</h4>
                <p>Validation performed in impurity concentration domain (µg/mL). Spikes in µg, not mg. Precision in impurity %. LOQ must be ≤ disregard limit.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-white hover:bg-zinc-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
