import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Check,
  UploadCloud,
  Sliders,
  CheckCircle2,
  History,
  ClipboardPaste,
  Trash2,
  FileCode
} from 'lucide-react';
import { ValidationMethodType } from '../types';
import {
  parseFpsMoaText,
  extractTextFromPdfArrayBuffer,
  extractTextFromPdfBase64,
  GROUND_TRUTH_VILDAGLIPTIN_RAW_TEXT,
  ExtractedFpsMoaData,
} from '../services/fpsPdfParser';

export interface FPSOverrides {
  column?: string;
  mobilePhase?: string;
  bufferText?: string;
  flowRate?: string;
  wavelength?: string;
  injectionVolume?: string;
  columnTemperature?: string;
  runTime?: string;
  diluent?: string;
  workingConcentration?: string;
  approxRetentionTime?: string;
  standardSolution?: string;
  sampleSolution?: string;
  standardWeight?: number | string;
  sampleWeight?: number | string;
  stdDilution?: number | string;
  sampleDilution?: number | string;
  standardPurity?: number | string;
  averageWeight?: string;
  strength?: string;
  dosageForm?: string;
  activeSubstance?: string;
  labelClaim?: string;
  productName?: string;
  specNo?: string;
  moaNo?: string;
  dissolutionLimit?: string;
  assayRange?: string;
  rsLimits?: string;
  uduLimit?: string;
  auditNotes?: string[];
  targetApi?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileData: { base64: string; mimeType: string } | null;
  onConfirm: (overrides: FPSOverrides, detectedProductName?: string) => void;
  validationMethod: ValidationMethodType;
}

export const FPSExtractorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  fileData,
  onConfirm,
  validationMethod,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [overrides, setOverrides] = useState<FPSOverrides>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [detectedProduct, setDetectedProduct] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedFpsMoaData | null>(null);
  const [selectedConcentration, setSelectedConcentration] = useState<string>('');
  const [auditLog, setAuditLog] = useState<string[]>([]);
  const [originalExtractedValues, setOriginalExtractedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && fileData) {
      extractClientSideFromData(fileData);
    } else if (isOpen) {
      setIsExtracting(false);
    }
  }, [isOpen, fileData]);

  // Client-Side Extraction from uploaded file (100% in-browser, Vercel compliant)
  const extractClientSideFromData = async (data: { base64: string; mimeType: string }) => {
    setIsExtracting(true);
    setStatusMessage('Reading analytical method specification (client-side)...');

    try {
      let rawText = '';
      if (data.mimeType.includes('pdf')) {
        rawText = await extractTextFromPdfBase64(data.base64);
      } else {
        rawText = window.atob(data.base64.replace(/^data:.*?;base64,/, ''));
      }

      const parsed = parseFpsMoaText(rawText);
      applyParsedData(parsed);
      setStatusMessage('Parameters successfully extracted from document!');
    } catch (err: any) {
      console.warn('PDF client parse fallback:', err);
      try {
        const decoded = window.atob(data.base64.replace(/^data:.*?;base64,/, ''));
        const parsed = parseFpsMoaText(decoded);
        applyParsedData(parsed);
        setStatusMessage('Parameters extracted via stream reader.');
      } catch (_e) {
        setStatusMessage('Please paste or enter parameters manually.');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualFileUpload = (file: File) => {
    const reader = new FileReader();
    setIsExtracting(true);
    setStatusMessage('Extracting text with in-browser PDF parser...');

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const text = await extractTextFromPdfArrayBuffer(arrayBuffer);
        const parsed = parseFpsMoaText(text);
        applyParsedData(parsed);
        setStatusMessage('Parameters successfully extracted from uploaded file!');
      } catch (err: any) {
        console.warn('Manual file parse error:', err);
        setStatusMessage('Please review or enter parameters manually.');
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse pasted raw text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setStatusMessage('Please paste Assay method or Finished Product Specification text first.');
      return;
    }
    setIsExtracting(true);
    setStatusMessage('Parsing pasted Assay / FPS text client-side...');
    setTimeout(() => {
      const parsed = parseFpsMoaText(pastedText);
      applyParsedData(parsed);
      setIsExtracting(false);
      setStatusMessage('Parsed parameters extracted from pasted text!');
    }, 100);
  };

  // Clear / Reset All: strictly eliminates unwanted auto-fill as requested
  const handleClearAll = () => {
    setOverrides({});
    setExtractedData(null);
    setDetectedProduct('');
    setPastedText('');
    setSelectedConcentration('');
    setOriginalExtractedValues({});
    setAuditLog([]);
    setStatusMessage('All fields cleared. No auto-fill active.');
  };

  const applyParsedData = (parsed: ExtractedFpsMoaData) => {
    setExtractedData(parsed);

    const initialOverrides: FPSOverrides = {
      column: parsed.column,
      mobilePhase: parsed.mobilePhase,
      bufferText: parsed.bufferText,
      flowRate: parsed.flowRate,
      wavelength: parsed.wavelength,
      injectionVolume: parsed.injectionVolume,
      columnTemperature: parsed.columnTemperature,
      runTime: parsed.runTime,
      diluent: parsed.diluent,
      workingConcentration: parsed.workingConcentration,
      approxRetentionTime: parsed.approxRetentionTime,
      standardSolution: parsed.standardSolution,
      sampleSolution: parsed.sampleSolution,
      standardWeight: parsed.standardWeight,
      sampleWeight: parsed.sampleWeight,
      stdDilution: parsed.stdDilution,
      sampleDilution: parsed.sampleDilution,
      standardPurity: parsed.standardPurity,
      activeSubstance: parsed.activeSubstance,
      strength: parsed.strength,
      averageWeight: parsed.averageWeight,
      productName: parsed.productName,
      specNo: parsed.specNo,
      moaNo: parsed.moaNo,
      dissolutionLimit: parsed.dissolutionLimit,
      assayRange: parsed.assayRange,
      rsLimits: parsed.rsLimits,
      uduLimit: parsed.uduLimit,
    };

    setOverrides(initialOverrides);
    setOriginalExtractedValues({
      column: parsed.column,
      mobilePhase: parsed.mobilePhase,
      flowRate: parsed.flowRate,
      wavelength: parsed.wavelength,
      injectionVolume: parsed.injectionVolume,
      columnTemperature: parsed.columnTemperature,
      runTime: parsed.runTime,
      diluent: parsed.diluent,
      workingConcentration: parsed.workingConcentration,
      approxRetentionTime: parsed.approxRetentionTime || '',
    });

    if (parsed.productName) {
      setDetectedProduct(parsed.productName);
    }
    if (parsed.workingConcentration) {
      setSelectedConcentration(parsed.workingConcentration);
    }
  };

  const handleLoadGroundTruth = () => {
    setIsExtracting(true);
    setStatusMessage('Loading Vildagliptin 100 mg Ground-Truth Spec (Spec.No. VD/QC/SP/0529)...');
    setTimeout(() => {
      setPastedText(GROUND_TRUTH_VILDAGLIPTIN_RAW_TEXT.trim());
      const parsed = parseFpsMoaText(GROUND_TRUTH_VILDAGLIPTIN_RAW_TEXT);
      applyParsedData(parsed);
      setIsExtracting(false);
      setStatusMessage('Ground-Truth Specification Loaded!');
    }, 150);
  };

  const handleFieldChange = (key: keyof FPSOverrides, value: any) => {
    const orig = originalExtractedValues[key as string];

    setOverrides((prevOverrides) => ({ ...prevOverrides, [key]: value }));

    if (orig && orig !== value) {
      const logEntry = `Field "${key}": modified from "${orig}" to "${value}" on ${new Date().toLocaleTimeString()}`;
      setAuditLog((prevLog) => {
        const filtered = prevLog.filter((l) => !l.startsWith(`Field "${key}":`));
        return [...filtered, logEntry];
      });
    }
  };

  const handleSelectConcentration = (val: string) => {
    setSelectedConcentration(val);
    handleFieldChange('workingConcentration', val);
  };

  if (!isOpen) return null;

  const specLabel = extractedData?.specNo ? `Spec.No. ${extractedData.specNo}` : '';
  const moaLabel = extractedData?.moaNo ? `MOA.No. ${extractedData.moaNo}` : '';
  const combinedSource = [specLabel, moaLabel].filter(Boolean).join(' / ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100/80 rounded-lg">
              <FileText className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 text-sm">Finished Product Specification (FPS) &amp; Assay Method Input</h3>
              <p className="text-xs text-zinc-500">
                Direct Copy-Paste or In-Browser Upload • All AMV Tables &amp; Calculations Match FPS • Vercel Ready
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-md transition-colors text-zinc-500 hover:text-zinc-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Input Method Selector & Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-zinc-100/80 rounded-lg border border-zinc-200">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'paste'
                    ? 'bg-white text-blue-700 shadow-xs border border-zinc-200 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                📋 Paste Assay / FPS Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-700 shadow-xs border border-zinc-200 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                📁 Upload PDF / Text
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 font-medium rounded-md border border-zinc-200 hover:border-red-200 transition-colors flex items-center gap-1 shadow-2xs"
                title="Clear all fields to enter fresh data without auto-fill"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All (No Auto-Fill)
              </button>
              <button
                type="button"
                onClick={handleLoadGroundTruth}
                className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-md border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample (Vildagliptin 100 mg)
              </button>
            </div>
          </div>

          {/* Paste Section */}
          {activeTab === 'paste' && (
            <div className="space-y-2 p-3.5 bg-blue-50/40 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  Paste Assay Method / Finished Product Specification (FPS) Text
                </label>
                <span className="text-[11px] text-zinc-500">
                  Copy from your STP, Monograph, or Specification document
                </span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste Assay Method details here...&#10;E.g.:&#10;Product Name: Vildagliptin Tablets 100 mg&#10;Column: 4.6-mm x 15-cm; 5-µm packing L10&#10;Mobile phase: Acetonitrile and Buffer (15:85)&#10;Flow rate: 1.0 mL/min&#10;Wavelength: UV 205 nm&#10;Injection volume: 20 µL&#10;Column temperature: 30 °C&#10;Run time: 10.0 min&#10;Diluent: Acetonitrile and Dilute phosphoric acid (5:95)&#10;Standard solution: 0.1 mg/mL of Vildagliptin RS&#10;Sample solution: Nominally 0.08 mg/mL&#10;Assay range: 90.0 % to 110.0 % of labeled amount&#10;Approx. retention time: 4.8 min"
                className="w-full p-2.5 text-xs font-mono bg-white border border-zinc-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Parse &amp; Extract Pasted Text
                </button>
                {statusMessage && (
                  <span className="text-xs font-medium text-blue-800">{statusMessage}</span>
                )}
              </div>
            </div>
          )}

          {/* Upload Section */}
          {activeTab === 'upload' && (
            <div className="border border-dashed border-zinc-300 rounded-lg p-5 bg-zinc-50/50 hover:bg-blue-50/30 transition-colors flex flex-col items-center justify-center gap-2">
              <UploadCloud className="w-8 h-8 text-blue-500" />
              <p className="text-xs font-medium text-zinc-700">Upload FPS or MOA Document (PDF or TXT)</p>
              <p className="text-[11px] text-zinc-500">Zero server upload • 100% processed client-side</p>
              <label className="cursor-pointer px-4 py-1.5 mt-1 bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-xs rounded-md border border-zinc-300 shadow-2xs transition-colors">
                Browse File
                <input
                  type="file"
                  accept=".pdf,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleManualFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          )}

          {isExtracting ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
              <p className="font-medium text-sm text-zinc-800">{statusMessage}</p>
              <p className="text-xs text-zinc-400 mt-1">Executing zero-latency client-side parsing...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Working Concentration Disambiguation */}
              {extractedData && extractedData.concentrationOptions.length > 1 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-700" />
                      Select Working Concentration from MOA:
                    </span>
                    <span className="text-[11px] font-normal text-amber-700">Both Standard &amp; Sample concentrations detected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(extractedData?.concentrationOptions || []).map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectConcentration(opt.value)}
                        className={`text-xs px-3 py-1.5 rounded-md border font-mono transition-all flex items-center gap-1.5 ${
                          selectedConcentration === opt.value
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-amber-100/50'
                        }`}
                      >
                        {selectedConcentration === opt.value && <Check className="w-3.5 h-3.5" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 1: Product & Strength */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 tracking-wide uppercase">
                    1. Product &amp; Specification Identity
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Product Name</label>
                    <input
                      type="text"
                      value={overrides.productName || detectedProduct || ''}
                      onChange={(e) => {
                        handleFieldChange('productName', e.target.value);
                        setDetectedProduct(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none"
                      placeholder="e.g. Vildagliptin Tablets 100 mg"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Active Substance</label>
                    <input
                      type="text"
                      value={overrides.activeSubstance || ''}
                      onChange={(e) => handleFieldChange('activeSubstance', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none"
                      placeholder="e.g. Vildagliptin"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Strength / Label Claim</label>
                    <input
                      type="text"
                      value={overrides.strength || ''}
                      onChange={(e) => handleFieldChange('strength', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none"
                      placeholder="e.g. 100 mg"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Average Tablet Weight</label>
                    <input
                      type="text"
                      value={overrides.averageWeight || ''}
                      onChange={(e) => handleFieldChange('averageWeight', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none"
                      placeholder="e.g. 200 mg"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Chromatographic System (Section 4.1 Table Parameters) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 tracking-wide uppercase">
                    2. Chromatographic Conditions (Section 4.1 Table)
                  </span>
                  <span className="text-[11px] text-zinc-500 italic">
                    Displayed in Section 4.1 table
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Column (Stationary Phase &amp; Dimensions)</label>
                    <input
                      type="text"
                      value={overrides.column || ''}
                      onChange={(e) => handleFieldChange('column', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. 4.6-mm x 15-cm; 5-µm packing L10"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Mobile Phase &amp; Buffers</label>
                    <input
                      type="text"
                      value={overrides.mobilePhase || ''}
                      onChange={(e) => handleFieldChange('mobilePhase', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. Acetonitrile and Buffer (15:85)"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Flow Rate</label>
                    <input
                      type="text"
                      value={overrides.flowRate || ''}
                      onChange={(e) => handleFieldChange('flowRate', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. 1.0 mL/min"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Detection Wavelength</label>
                    <input
                      type="text"
                      value={overrides.wavelength || ''}
                      onChange={(e) => handleFieldChange('wavelength', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. UV 205 nm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Injection Volume</label>
                    <input
                      type="text"
                      value={overrides.injectionVolume || ''}
                      onChange={(e) => handleFieldChange('injectionVolume', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. 20 µL"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Column Temperature</label>
                    <input
                      type="text"
                      value={overrides.columnTemperature || ''}
                      onChange={(e) => handleFieldChange('columnTemperature', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. 30 °C"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Paragraph Parameters (Run Time, Diluent, Working Concentration, Approx RT) */}
              <div className="space-y-2 p-3 bg-emerald-50/40 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 tracking-wide uppercase">
                    3. Chromatographic Narrative Paragraph (Run Time, Diluent, Working Conc, Approx RT)
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Formatted as descriptive paragraph directly below the table
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700">Run Time</label>
                    <input
                      type="text"
                      value={overrides.runTime || ''}
                      onChange={(e) => handleFieldChange('runTime', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      placeholder="e.g. 10.0 min"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700">Diluent</label>
                    <input
                      type="text"
                      value={overrides.diluent || ''}
                      onChange={(e) => handleFieldChange('diluent', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      placeholder="e.g. Acetonitrile and Dilute phosphoric acid (5:95)"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700">Working Concentration (Linearity Basis)</label>
                    <input
                      type="text"
                      value={overrides.workingConcentration || ''}
                      onChange={(e) => handleFieldChange('workingConcentration', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      placeholder="e.g. 0.08 mg/mL or 100 µg/mL"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700">Approx. Retention Time</label>
                    <input
                      type="text"
                      value={overrides.approxRetentionTime || ''}
                      onChange={(e) => handleFieldChange('approxRetentionTime', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      placeholder="e.g. 4.8 min"
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Solution Preparation & Weights */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 tracking-wide uppercase">
                    4. Solution Preparation &amp; Weights (Formula Calculation Inputs)
                  </span>
                  <span className="text-[11px] text-zinc-500 italic">
                    Feeds Assay &amp; Precision formula: (AT/AS) × (WS/DS) × (DT/WT) × (AVG_WT/LC) × P × 100
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-2.5 bg-blue-50/40 border border-blue-200 rounded-lg">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-blue-950">Std Weight (WS, mg)</label>
                    <input
                      type="text"
                      value={overrides.standardWeight ?? ''}
                      onChange={(e) => handleFieldChange('standardWeight', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-blue-300 focus:border-blue-600 outline-none font-mono"
                      placeholder="e.g. 10.0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-blue-950">Std Dilution (DS, mL)</label>
                    <input
                      type="text"
                      value={overrides.stdDilution ?? ''}
                      onChange={(e) => handleFieldChange('stdDilution', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-blue-300 focus:border-blue-600 outline-none font-mono"
                      placeholder="e.g. 100.0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-blue-950">Sample Wt (WT, mg)</label>
                    <input
                      type="text"
                      value={overrides.sampleWeight ?? ''}
                      onChange={(e) => handleFieldChange('sampleWeight', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-blue-300 focus:border-blue-600 outline-none font-mono"
                      placeholder="e.g. 200.0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-blue-950">Sample Dilution (DT, mL)</label>
                    <input
                      type="text"
                      value={overrides.sampleDilution ?? ''}
                      onChange={(e) => handleFieldChange('sampleDilution', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-blue-300 focus:border-blue-600 outline-none font-mono"
                      placeholder="e.g. 100.0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-blue-950">RS Purity / Potency (%)</label>
                    <input
                      type="text"
                      value={overrides.standardPurity ?? ''}
                      onChange={(e) => handleFieldChange('standardPurity', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white border border-blue-300 focus:border-blue-600 outline-none font-mono"
                      placeholder="e.g. 99.82"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Standard Solution Preparation Narrative</label>
                    <textarea
                      rows={2}
                      value={overrides.standardSolution || ''}
                      onChange={(e) => handleFieldChange('standardSolution', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none resize-none"
                      placeholder="e.g. Weigh accurately 10.0 mg of Vildagliptin RS into 100 mL flask, dissolve and dilute..."
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Sample Solution Preparation Narrative</label>
                    <textarea
                      rows={2}
                      value={overrides.sampleSolution || ''}
                      onChange={(e) => handleFieldChange('sampleSolution', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none resize-none"
                      placeholder="e.g. Weigh 20 tablets, grind to fine powder. Transfer powder equivalent to 100 mg..."
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Specification Limits */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-800 tracking-wide uppercase">
                  5. Specification Acceptance Limits
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Assay Range</label>
                    <input
                      type="text"
                      value={overrides.assayRange || ''}
                      onChange={(e) => handleFieldChange('assayRange', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. 90.0 % to 110.0 %"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Dissolution Limit</label>
                    <input
                      type="text"
                      value={overrides.dissolutionLimit || ''}
                      onChange={(e) => handleFieldChange('dissolutionLimit', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. NLT 70.0 % (Q) in 45 min"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-600">Related Substances Limit</label>
                    <input
                      type="text"
                      value={overrides.rsLimits || ''}
                      onChange={(e) => handleFieldChange('rsLimits', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white outline-none font-mono"
                      placeholder="e.g. Indiv: NMT 1.0 %, Total: NMT 2.0 %"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            <span>All AMV tables &amp; calculations will be generated strictly matching your FPS inputs.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const finalOverrides: FPSOverrides = {
                  ...overrides,
                  auditNotes: auditLog,
                };
                const activeProd = overrides.productName || detectedProduct;
                onConfirm(finalOverrides, activeProd);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              Apply to AMV &amp; Calculate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
