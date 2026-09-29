import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  FileEdit,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  MethodDiffItem,
  validateRevisionReasonForMajorChanges,
} from '../services/methodVersionHistory';

interface MajorChangePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffs: MethodDiffItem[];
  currentReason: string;
  onApplyReason: (newReason: string) => void;
  productName: string;
  documentNo: string;
}

export const MajorChangePromptModal: React.FC<MajorChangePromptModalProps> = ({
  isOpen,
  onClose,
  diffs,
  currentReason,
  onApplyReason,
  productName,
  documentNo,
}) => {
  const [reasonText, setReasonText] = useState(currentReason || '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReasonText(currentReason || '');
      setTouched(false);
    }
  }, [isOpen, currentReason]);

  if (!isOpen || diffs.length === 0) return null;

  const validation = validateRevisionReasonForMajorChanges(reasonText, diffs);

  // Generate an automated suggested compliant rationale based on the changed parameters
  const generateSuggestedRationale = () => {
    const paramParts: string[] = [];
    for (const d of diffs) {
      if (d.parameter === 'Retention Time') {
        paramParts.push(`retention time shifted from ${d.oldValue} to ${d.newValue} (${d.thresholdDescription})`);
      } else if (d.parameter === 'Column') {
        paramParts.push(`stationary phase column updated to ${d.newValue} to enhance theoretical plates`);
      } else if (d.parameter === 'Mobile Phase') {
        paramParts.push(`mobile phase adjusted to ${d.newValue} for improved chromatographic peak selectivity`);
      } else if (d.parameter === 'Wavelength') {
        paramParts.push(`detection wavelength adjusted to ${d.newValue} (${d.thresholdDescription})`);
      } else if (d.parameter === 'Flow Rate') {
        paramParts.push(`flow rate set to ${d.newValue} (${d.thresholdDescription})`);
      } else if (d.parameter === 'Column Temperature') {
        paramParts.push(`column temperature regulated at ${d.newValue} (${d.thresholdDescription})`);
      }
    }

    return `Method parameters revised for ${productName} (${documentNo}): ${paramParts.join('; ')} to ensure optimum peak resolution, baseline stability, and robust system suitability under ICH Q2(R2).`;
  };

  const handleApplySuggestion = () => {
    setReasonText(generateSuggestedRationale());
    setTouched(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validation.isValid) return;
    onApplyReason(reasonText.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-amber-50/90 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-zinc-900">
                  Major Method Parameter Changes Detected
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  Change Control Mandatory
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                ICH Q2(R2) & ALCOA+ Data Integrity: Analytical changes require an explicit, non-generic explanation in Revision History.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Diff Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[11px]">
                Detected Parameter Modifications vs. Baseline ({diffs.length})
              </h4>
              <span className="text-zinc-500 font-mono text-[11px]">{productName}</span>
            </div>

            <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50/50 divide-y divide-zinc-200">
              <div className="grid grid-cols-12 bg-zinc-100/90 p-2 font-semibold text-zinc-700 text-[11px]">
                <div className="col-span-3">Parameter</div>
                <div className="col-span-3">Monograph Baseline</div>
                <div className="col-span-3">New Document Value</div>
                <div className="col-span-3">Shift / Variation</div>
              </div>
              {(diffs || []).map((d, i) => (
                <div key={i} className="grid grid-cols-12 p-2.5 items-center hover:bg-white transition-colors">
                  <div className="col-span-3 font-semibold text-zinc-900 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>{d.parameter}</span>
                  </div>
                  <div className="col-span-3 font-mono text-zinc-600 truncate pr-1" title={String(d.oldValue)}>
                    {d.oldValue}
                  </div>
                  <div className="col-span-3 font-mono font-medium text-blue-700 truncate pr-1" title={String(d.newValue)}>
                    {d.newValue}
                  </div>
                  <div className="col-span-3 text-amber-700 font-medium text-[11px]">
                    {d.thresholdDescription}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reason-for-change-input" className="font-semibold text-zinc-800 flex items-center space-x-1.5">
                  <FileEdit className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Revision History "Reason for Change" (Mandatory):</span>
                </label>
                <button
                  type="button"
                  id="suggest-compliant-rationale-btn"
                  onClick={handleApplySuggestion}
                  className="text-blue-700 hover:text-blue-800 font-medium flex items-center space-x-1 hover:underline text-[11px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Auto-draft Compliant Rationale</span>
                </button>
              </div>

              <textarea
                id="reason-for-change-input"
                rows={3}
                value={reasonText}
                onChange={(e) => {
                  setReasonText(e.target.value);
                  setTouched(true);
                }}
                placeholder="Specify the explicit technical reason for changing the analytical parameter(s). E.g., 'Retention time shifted to ~3.8 min and column dimensions altered to improve peak resolution under ICH Q2(R2)...'"
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:ring-2 font-sans transition-all ${
                  validation.isValid
                    ? 'border-emerald-300 focus:ring-emerald-500 bg-white'
                    : touched
                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-zinc-300 focus:ring-blue-500 bg-white'
                }`}
              />
            </div>

            {/* Validation Feedback Status */}
            <div className={`p-3 rounded-lg border flex items-start space-x-2.5 ${
              validation.isValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <div className="mt-0.5 flex-shrink-0">
                {validation.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-[11px]">
                  {validation.isValid
                    ? 'Compliant with Change Control & ICH Q2(R2)'
                    : 'Explanation Requirements for Major Parameter Shifts:'}
                </div>
                {validation.isValid ? (
                  <p className="text-emerald-700 text-[11px]">
                    The explanation explicitly mentions the altered parameters and provides a specific, non-generic technical justification.
                  </p>
                ) : (
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                    {(validation?.issues || []).map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Guidance Callout */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 text-[11px] flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>ALCOA+ Compliance Rule:</strong> Generic text like &quot;Comprehensive document revision...&quot; or &quot;Routine update&quot; is strictly prohibited when Retention Time (&gt;5%), Wavelength (&gt;5 nm), Column, or Mobile Phase changes. You must name the modified parameter and the rationale. This field cannot be skipped.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-100">
              <button
                type="button"
                id="cancel-major-change-btn"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-medium transition-colors"
              >
                Review Document
              </button>
              <button
                type="submit"
                id="apply-reason-for-change-btn"
                disabled={!validation.isValid}
                className={`px-4 py-1.5 rounded-lg font-semibold shadow-xs flex items-center space-x-1.5 transition-all ${
                  validation.isValid
                    ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <span>Save to Revision History & Proceed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
