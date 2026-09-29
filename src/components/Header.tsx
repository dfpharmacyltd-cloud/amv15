import React from 'react';
import { ThemeFormat, DocumentType, ValidationMethodType, FontFamilyType, FontSizePt, DataMode } from '../types';
import { FileText, Award, Palette, CheckCircle2, Download, Printer, Sparkles, ShieldCheck, Database, BookOpen } from 'lucide-react';
import { FontAndSizeControl } from './FontAndSizeControl';

interface HeaderProps {
  theme: ThemeFormat;
  onThemeChange: (theme: ThemeFormat) => void;
  activeDocType: DocumentType;
  onDocTypeChange: (docType: DocumentType) => void;
  validationMethod: ValidationMethodType;
  onValidationMethodChange: (method: ValidationMethodType) => void;
  dataMode: DataMode;
  onDataModeChange: (mode: DataMode) => void;
  fontFamily: FontFamilyType;
  fontSize: FontSizePt;
  onFontFamilyChange: (font: FontFamilyType) => void;
  onFontSizeChange: (size: FontSizePt) => void;
  onDownloadDocx: () => void;
  onSelfTest?: () => void;
  onPrint: () => void;
  onOpenAuditGate?: () => void;
  onOpenSSOTModal?: () => void;
  onOpenPromptModal?: () => void;
  auditPassed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeChange,
  activeDocType,
  onDocTypeChange,
  validationMethod,
  onValidationMethodChange,
  dataMode,
  onDataModeChange,
  fontFamily,
  fontSize,
  onFontFamilyChange,
  onFontSizeChange,
  onDownloadDocx,
  onSelfTest,
  onPrint,
  onOpenAuditGate,
  onOpenSSOTModal,
  onOpenPromptModal,
  auditPassed,
}) => {
  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Regulatory Standards */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm ${
                theme === 'blue' ? 'bg-[#1F4E79]' : 'bg-zinc-800'
              }`}
            >
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                  Pharmaceutical AMV Suite &amp; Word Generator
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> cGMP Compliant
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-0.5 font-mono">
                <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 border border-zinc-200">
                  ICH Q2(R2)
                </span>
                <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 border border-zinc-200">
                  BP Appendix XII B1
                </span>
                <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 border border-zinc-200">
                  BP Appendix III D
                </span>
                <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 border border-zinc-200">
                  USP &lt;621&gt; / &lt;711&gt;
                </span>
              </div>
            </div>
          </div>

          {/* Quick Document Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Method Type Toggle: Dissolution vs Related Substances vs Assay */}
            <div className="inline-flex rounded-lg border border-blue-200 bg-blue-50/60 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => onValidationMethodChange('assay')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  validationMethod === 'assay'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Assay by HPLC Validation Protocol & Report format"
              >
                Assay (HPLC)
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('assay_cu')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  validationMethod === 'assay_cu'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Assay and Content of Uniformity by HPLC — validated range 70 % to 130 %, with the USP <905> acceptance value"
              >
                Assay + Content Uniformity
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('assay_uv')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  validationMethod === 'assay_uv'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Assay by UV Visible Spectroscopy"
              >
                Assay (UV)
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('dissolution_uv')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  validationMethod === 'dissolution_uv'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Dissolution by UV Visible Spectroscopy"
              >
                Dissolution (UV)
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('content_uniformity')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  validationMethod === 'content_uniformity'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Content of Uniformity by HPLC on its own, with the USP <905> acceptance value"
              >
                Content Uniformity
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('assay_titration')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  validationMethod === 'assay_titration'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Assay by Titration Verification Protocol & Report format"
              >
                Assay (Titration)
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('dissolution')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  validationMethod === 'dissolution'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Dissolution Method Verification Protocol & Report format (BP Appendix XII B1)"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Dissolution</span>
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('related_substances')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  validationMethod === 'related_substances'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Related Substances (RS) / Organic Impurities Protocol & Report format"
              >
                <span>Related Substances</span>
              </button>
              <button
                type="button"
                onClick={() => onValidationMethodChange('microbial_limit_test')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  validationMethod === 'microbial_limit_test'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
                title="Microbial Limit Test (MLT) Verification Protocol & Report format"
              >
                <span>Microbial Limit Test</span>
              </button>
            </div>


            {/* PROTOCOL / REPORT Mode Selector */}
            <div className="inline-flex rounded-lg border border-purple-200 bg-purple-50 p-1 text-xs font-medium">
              <button
                type="button"
                title="PROTOCOL Mode (Data cells em dashes, blank execution dates, no compliance flags)"
                onClick={() => onDocTypeChange('protocol')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  activeDocType === 'protocol'
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>PROTOCOL</span>
              </button>
              <button
                type="button"
                title="REPORT Mode (Executed data cells filled, results evaluated against criteria)"
                onClick={() => onDocTypeChange('report')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  activeDocType === 'report'
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>REPORT</span>
              </button>
            </div>

            {/* Every generated document carries the DEMO marking, so there is a single
                mode control (PROTOCOL / REPORT) above and no second data-mode switch. */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              DEMO — NOT FOR GMP USE
            </div>

            {/* Document Theme Option (Executive Blue vs Simple Format No Color) */}
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-xs font-medium">
              <button
                type="button"
                title="Executive Blue Header Style"
                onClick={() => onThemeChange('blue')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  theme === 'blue'
                    ? 'bg-[#1F4E79] text-white shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300 inline-block"></span>
                Executive Blue
              </button>
              <button
                type="button"
                title="Simple Format - No Blue, Pure Clean Monochrome"
                onClick={() => onThemeChange('simple')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  theme === 'simple'
                    ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block"></span>
                Simple Format
              </button>
              <button
                type="button"
                title="Official Westcoast Pharmaceutical Format (Exact PDF layout & font)"
                onClick={() => onThemeChange('westcoast')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  theme === 'westcoast'
                    ? 'bg-amber-800 text-white shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                Westcoast Format
              </button>
            </div>

            {/* Typography Controls: Font Family & Font Size (matching uploaded image: Times New Roman 12) */}
            <FontAndSizeControl
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={onFontFamilyChange}
              onFontSizeChange={onFontSizeChange}
            />

            {/* SSOT Inspector Button */}
            {onOpenSSOTModal && (
              <button
                type="button"
                onClick={onOpenSSOTModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
                title="Inspect Single Source of Truth (SSOT) Parameters (§1.2)"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">SSOT Block</span>
              </button>
            )}

            {/* Input Template & Prompt Rules Button */}
            {onOpenPromptModal && (
              <button
                type="button"
                onClick={onOpenPromptModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors shadow-2xs"
                title="View Master System Prompt Rules & User Input Template (§10)"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden md:inline">GMP Engine Rules</span>
              </button>
            )}

            {/* Compliance Gate Status & Audit Modal Launcher */}
            {onSelfTest && validationMethod === 'microbial_limit_test' && (
              <button
                type="button"
                onClick={onSelfTest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Self-Test</span>
              </button>
            )}
            {onOpenAuditGate && (
              <button
                type="button"
                onClick={onOpenAuditGate}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-2xs ${
                  auditPassed !== false
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
                title="Review 10-Point Pre-Output Compliance & Contamination Audit"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compliance Gate: {auditPassed !== false ? '10/10 Clear' : 'Blocked'}</span>
              </button>
            )}

            {/* Quick Export Actions */}
            <button type="button" onClick={onDownloadDocx}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .docx</span>
            </button>
            <button type="button" onClick={onPrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors"
              title="Print Document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
