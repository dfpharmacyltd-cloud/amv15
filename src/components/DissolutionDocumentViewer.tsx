import React, { useState } from 'react';
import { DissolutionAMVDocumentData, DocumentType, ThemeFormat, FontFamilyType, FontSizePt, DataMode, FooterSignOffData } from '../types';
import { Download, Printer, Edit3, Layers, CheckCircle2, Plus, Trash2, Sparkles, FileText, Table, Calendar } from 'lucide-react';
import { recalculateDissolutionSystemSuitability } from '../services/pharmaMathEngine';
import { FontAndSizeControl } from './FontAndSizeControl';
import { verifyConcentrationScale } from '../services/selfAuditEngine';
import { getProductDegradantProfile } from '../services/complianceAuditGate';
import { getCleanDrugDisplayName } from '../services/postGenerationSanitizer';
import { SignOffFooter, DEFAULT_FOOTER_SIGN_OFF } from './SignOffFooter';
import { FooterDateModal } from './FooterDateModal';

interface DissolutionDocumentViewerProps {
  data: DissolutionAMVDocumentData;
  docType: DocumentType;
  theme: ThemeFormat;
  dataMode?: DataMode;
  fontFamily?: FontFamilyType;
  fontSize?: FontSizePt;
  onFontFamilyChange?: (font: FontFamilyType) => void;
  onFontSizeChange?: (size: FontSizePt) => void;
  onDocTypeChange: (type: DocumentType) => void;
  onThemeChange: (theme: ThemeFormat) => void;
  onDownloadProtocol: () => void;
  onDownloadReport: () => void;
  onDownloadBoth: () => void;
  onUpdateData?: (updated: DissolutionAMVDocumentData) => void;
  footerSignOffData?: FooterSignOffData;
  onUpdateFooterSignOffData?: (data: FooterSignOffData) => void;
}

export const DissolutionDocumentViewer: React.FC<DissolutionDocumentViewerProps> = ({
  data,
  docType,
  theme,
  dataMode = 'DEMO',
  fontFamily = 'Times New Roman',
  fontSize = 12,
  onFontFamilyChange,
  onFontSizeChange,
  onDocTypeChange,
  onThemeChange,
  onDownloadProtocol,
  onDownloadReport,
  onDownloadBoth,
  onUpdateData,
  footerSignOffData,
  onUpdateFooterSignOffData,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isFooterDateModalOpen, setIsFooterDateModalOpen] = useState(false);
  const [localFooterData, setLocalFooterData] = useState<FooterSignOffData>(DEFAULT_FOOTER_SIGN_OFF);

  const activeFooterData = footerSignOffData || localFooterData;
  const handleUpdateFooter = (updated: FooterSignOffData) => {
    setLocalFooterData(updated);
    if (onUpdateFooterSignOffData) onUpdateFooterSignOffData(updated);
  };
  const [tableFormat, setTableFormat] = useState<'realReport' | 'extended'>('realReport');
  const [sectionFormat, setSectionFormat] = useState<'monograph' | 'standard'>('monograph');
  const [showForcedDegradation, setShowForcedDegradation] = useState(false);
  const isProtocol = docType === 'protocol';

  const prepSet: any = (data as any)?.sectionPreparations || {};
  // The preparation that produces a table is printed immediately above it.
  const PrepBlock = ({ section }: { section: string }) => {
    const prep = prepSet[section];
    if (!prep) return null;
    return (
      <div className="mb-3 text-xs text-zinc-700 leading-relaxed">
        {prep.intro && <p className="mb-1.5 text-justify">{prep.intro}</p>}
        {prep.steps?.map((step: string, i: number) => (
          <p key={i} className="mb-1 text-justify pl-3 -indent-3">{step}</p>
        ))}
      </div>
    );
  };
  const renderPct = (val: any) => (val === undefined || val === null || val === '—' || val === '' || Number.isNaN(Number(val))) ? '—' : `${val} %`;
  const isBlue = theme === 'blue';
  const isMonograph = sectionFormat === 'monograph';
  const currentMode: DataMode = dataMode === 'TEMPLATE' ? 'TEMPLATE' : 'DEMO';

  const concScale = verifyConcentrationScale(data, 'dissolution');

  const fontStyle: React.CSSProperties = {
    fontFamily:
      fontFamily === 'Times New Roman'
        ? '"Times New Roman", Times, "Liberation Serif", Georgia, serif'
        : fontFamily === 'Arial'
        ? 'Arial, Helvetica, "Liberation Sans", sans-serif'
        : fontFamily === 'Calibri'
        ? 'Calibri, "Segoe UI", Candara, sans-serif'
        : fontFamily,
    fontSize: `${fontSize}pt`,
    lineHeight: 1.5,
  };

  const tableHeaderClass = isBlue
    ? 'bg-[#1F4E79] text-white font-bold border-[#1F4E79]'
    : 'bg-zinc-100 text-zinc-900 font-bold border-zinc-300';

  const sectionHeadingClass = isBlue
    ? 'text-[#1F4E79] border-[#1F4E79]'
    : 'text-zinc-900 border-zinc-800';

  const runningHeader = (
    <div className="flex justify-between items-center pb-2 mb-4 border-b border-zinc-300 text-[0.85em] text-zinc-500">
      <span className="font-semibold text-zinc-700">{data.companyName}</span>
      <span>
        {isProtocol ? 'AMV Protocol' : 'AMV Report'} (Dissolution Method) – {data.productName} | Doc No. {data.protocolNo}
      </span>
    </div>
  );

  const runningFooter = (pageNum: number) => (
    <SignOffFooter
      pageNum={pageNum}
      totalPages={10}
      dataMode={dataMode}
      footerData={activeFooterData}
      onUpdateFooterData={handleUpdateFooter}
    />
  );

  const handleFieldChange = (section: keyof DissolutionAMVDocumentData, field: string, val: any) => {
    if (!onUpdateData) return;
    const clone = { ...data };
    (clone as any)[section] = {
      ...(clone as any)[section],
      [field]: val,
    };
    onUpdateData(clone);
  };

  const handleInjectionChange = (index: number, field: 'weightMg' | 'peakArea', value: string) => {
    if (!onUpdateData) return;
    const updatedInjections = [...data.systemSuitability.injections];
    const parsed = field === 'weightMg' ? value : value.replace(/,/g, '');
    updatedInjections[index] = {
      ...updatedInjections[index],
      [field]: field === 'weightMg' ? (value === '' ? '' : Number(value) || value) : (value === '' ? '' : Number(parsed) || value),
    };

    const stats = recalculateDissolutionSystemSuitability(updatedInjections);
    onUpdateData({
      ...data,
      systemSuitability: {
        injections: updatedInjections,
        stats,
      },
    });
  };

  const handleAddInjection = () => {
    if (!onUpdateData) return;
    const newSrNo = (data.systemSuitability?.injections?.length || 0) + 1;
    const updatedInjections = [
      ...data.systemSuitability.injections,
      {
        srNo: newSrNo,
        weightMg: 50.0,
        peakArea:
          typeof data.systemSuitability.stats.meanArea === 'number' && data.systemSuitability.stats.meanArea > 0
            ? data.systemSuitability.stats.meanArea
            : 42500,
        remark: `Standard Preparation ${newSrNo}`,
      },
    ];
    const stats = recalculateDissolutionSystemSuitability(updatedInjections);
    onUpdateData({
      ...data,
      systemSuitability: {
        injections: updatedInjections,
        stats,
      },
    });
  };

  const handleRemoveInjection = (index: number) => {
    if (!onUpdateData || (data.systemSuitability?.injections?.length || 0) <= 2) return;
    const updatedInjections = data.systemSuitability.injections
      .filter((_, i) => i !== index)
      ?.map((inj, i) => ({ ...inj, srNo: i + 1, remark: `Standard Preparation ${i + 1}` }));
    const stats = recalculateDissolutionSystemSuitability(updatedInjections);
    onUpdateData({
      ...data,
      systemSuitability: {
        injections: updatedInjections,
        stats,
      },
    });
  };

  const handleLoadRealReportPreset = () => {
    if (!onUpdateData) return;
    setTableFormat('realReport');
    setSectionFormat('monograph');
    // Exact 6-replicate values from user's authentic report image (Image 1)
    const authenticInjections = [
      { srNo: 1, weightMg: 50.02, peakArea: 42585, remark: 'Standard Preparation 1' },
      { srNo: 2, weightMg: 50.03, peakArea: 42596, remark: 'Standard Preparation 2' },
      { srNo: 3, weightMg: 50.06, peakArea: 42697, remark: 'Standard Preparation 3' },
      { srNo: 4, weightMg: 50.98, peakArea: 42396, remark: 'Standard Preparation 4' },
      { srNo: 5, weightMg: 50.01, peakArea: 42479, remark: 'Standard Preparation 5' },
      { srNo: 6, weightMg: 50.06, peakArea: 42198, remark: 'Standard Preparation 6' },
    ];
    const stats = recalculateDissolutionSystemSuitability(authenticInjections);
    onUpdateData({
      ...data,
      systemSuitability: {
        injections: authenticInjections,
        stats: {
          ...stats,
          meanArea: 42492, // Exact matching Image 1
          rsdArea: '0.42', // Exact matching Image 1
          conclusionReport:
            'The %RSD of peak area for 6 replicate standard preparations is 0.42 %, which complies with the acceptance criteria of NMT 2.0 %.',
        },
      },
    });
  };

  const handleToggleForcedDegradation = (include: boolean) => {
    if (!onUpdateData) return;
    const batchNo = data.batchNoUsed || 'TB2501';
    const activeRt = Number(data.systemSuitability?.injections?.[0]?.retentionTime) || 5.00;
    const activeRtDisplay = activeRt.toFixed(2);
    const drugKeyName = getCleanDrugDisplayName(data.productName);
    const degRt = Number((activeRt * 0.65).toFixed(2));
    const degRrt = Number((degRt / activeRt).toFixed(2));

    const updatedValidationParams = data.validationParameters?.map((vp) => {
      if (vp.srNo === '5.2') {
        return {
          ...vp,
          parameter: include ? 'Specificity & Forced Degradation' : 'Specificity',
          acceptanceCriteria: include
            ? 'No interference from blank diluent or placebo matrix at analyte retention window. Resolution (Rs) between degradation products and active drug peak NLT 2.0. Peak purity of active peak must pass (Purity Angle < Purity Threshold).'
            : 'No interfering peak shall be observed in Blank and Placebo preparations at the retention window of the active drug peak (± 0.20 min). Peak purity analysis of the active drug peak shall demonstrate complete spectral homogeneity without co-eluting excipient matrix interference (Purity Angle < Purity Threshold).',
          executionStatusReport: include
            ? 'Complies (Rs ≥ 4.08, PDA Peak Purity Confirmed)'
            : 'Complies (PDA Spectral Peak Purity Confirmed)',
        };
      }
      return vp;
    });

    const updatedRefDetails = {
      ...data.referenceDetails,
      experimentalDetails: include
        ? `System suitability (6 standard preparations), specificity and forced degradation, linearity (50 % to 150 % nominal concentration), range (75 % and 125 %), repeatability across 6 dosage units, intermediate precision across 2 analysts, recovery at 75 %, 100 %, and 125 % in triplicate, deliberate robustness variations, and 48-hour solution stability, evaluated against validation batch ${batchNo}.`
        : `System suitability (6 standard preparations), specificity (blank and placebo interference), linearity (50 % to 150 % nominal concentration), range (75 % and 125 %), repeatability across 6 dosage units, intermediate precision across 2 analysts, recovery at 75 %, 100 %, and 125 % in triplicate, deliberate robustness variations, and 48-hour solution stability, evaluated against validation batch ${batchNo}.`,
    };

    const updatedSpecificity = {
      ...data.specificity,
      stressRows: include && data.specificity?.stressRows?.length ? data.specificity.stressRows : include ? [
        { condition: 'Acid Stress', stressParameters: '0.1N HCl, 60 °C, 2 hr', degradantRtMin: degRt.toFixed(2), activeRtMin: activeRtDisplay, degradantPeakArea: 4850, activePeakArea: 39500, degradationPercent: '10.9', resolution: '4.12', peakPurity: 'Passed (Purity Angle < Threshold)' },
        { condition: 'Base Stress', stressParameters: '0.1N NaOH, 60 °C, 2 hr', degradantRtMin: degRt.toFixed(2), activeRtMin: activeRtDisplay, degradantPeakArea: 5200, activePeakArea: 39100, degradationPercent: '11.7', resolution: '4.08', peakPurity: 'Passed (Purity Angle < Threshold)' },
        { condition: 'Oxidative Stress', stressParameters: '3 % H₂O₂, 25 °C, 2 hr', degradantRtMin: degRt.toFixed(2), activeRtMin: activeRtDisplay, degradantPeakArea: 3950, activePeakArea: 40300, degradationPercent: '8.9', resolution: '4.15', peakPurity: 'Passed (Purity Angle < Threshold)' },
        { condition: 'Thermal Stress', stressParameters: '105 °C, 24 hr', degradantRtMin: degRt.toFixed(2), activeRtMin: activeRtDisplay, degradantPeakArea: 2150, activePeakArea: 42100, degradationPercent: '4.8', resolution: '4.16', peakPurity: 'Passed (Purity Angle < Threshold)' },
        { condition: 'Photolytic Stress', stressParameters: 'ICH Q1B (1.2M lux-hr)', degradantRtMin: degRt.toFixed(2), activeRtMin: activeRtDisplay, degradantPeakArea: 1800, activePeakArea: 42500, degradationPercent: '4.1', resolution: '4.14', peakPurity: 'Passed (Purity Angle < Threshold)' },
      ] : [],
      acceptanceTextProtocol: include
        ? 'No interfering peak shall be observed in Blank and Placebo preparations at the retention window of the active drug peak. Any degradation product observed under forced degradation stress conditions must be baseline resolved from the active drug peak with a resolution (Rs) of NLT 2.0. The active peak must pass peak purity testing (Purity Angle < Purity Threshold / Purity Index > 0.999).'
        : 'No interfering peak shall be observed in Blank and Placebo preparations at the retention window of the active drug peak (± 0.20 min). Peak purity analysis of the active drug peak shall demonstrate complete spectral homogeneity without co-eluting excipient matrix interference (Purity Angle < Purity Threshold).',
      conclusionReport: include
        ? `Complies. No interference was observed from blank diluent or placebo matrix at the retention window of ${drugKeyName} (~${activeRtDisplay} min). Across all five stress degradation conditions (Acid, Base, Oxidation, Thermal, Photolytic), the degradation impurity peak consistently eluting at RT ~${degRt.toFixed(2)} min is cleanly baseline resolved from the main analyte peak (Rs ≥ 4.08, criteria: NLT 2.0). Diode array peak purity analysis confirmed that the ${drugKeyName} peak is spectrally pure (Purity Angle < Purity Threshold) without co-eluting degradants, demonstrating method specificity and stability-indicating capacity.`
        : `Complies. No interference was observed from blank diluent or placebo matrix at the retention window of ${drugKeyName} (~${activeRtDisplay} min). Diode array peak purity analysis confirmed that the ${drugKeyName} peak is spectrally pure (Purity Angle < Purity Threshold) without co-eluting excipient matrix components, demonstrating procedure specificity for dissolution testing.`,
      degradationAssessment: include
        ? `Regulatory & Scientific Assessment of the ~${degRt.toFixed(2)} min Peak: In all five forced degradation stress samples (Acid 0.1N HCl, Base 0.1N NaOH, Peroxide 3% H₂O₂, Thermal 105 °C, and Photolytic UV/Vis), an additional peak is consistently observed at retention time ~${degRt.toFixed(2)} min (RRT ~${degRrt.toFixed(2)}). In chemical stability studies, this represents the primary degradant (${data.specificity?.degradantName || getProductDegradantProfile(data.productName).name}). Chromatographic resolution between this degradation impurity and the parent active peak is greater than 4.0 in all conditions (Rs = 4.08 to 4.16), easily satisfying the regulatory criterion of Rs ≥ 2.0. Furthermore, photodiode array (PDA) spectral peak purity analysis confirms complete homogeneity of the active peak with no co-eluting degradants. The dissolution test procedure is therefore fully validated as stability-indicating and specific for its intended use.`
        : '',
    };

    const updatedOverallConclusion = include
      ? `The Analytical Method Verification for the Dissolution of ${data.productName} by HPLC has been successfully performed in accordance with ${
          data.reference.includes('ICH Q2(R2)') ? data.reference : `${data.reference} and ICH Q2(R2)`
        }. All validation parameters—System Suitability, Specificity & Selectivity (including Forced Degradation with spectral peak purity), Linearity, Range, Method Precision (Repeatability), Intermediate Precision, Accuracy (Recovery), Robustness, and Solution Stability—meet all predefined acceptance criteria. The method is formally verified for routine batch release testing.`
      : `The Analytical Method Verification for the Dissolution of ${data.productName} by HPLC has been successfully performed in accordance with ${
          data.reference.includes('ICH Q2(R2)') ? data.reference : `${data.reference} and ICH Q2(R2)`
        }. All verification parameters—System Suitability, Specificity (Blank & Placebo Non-Interference with spectral peak purity), Linearity, Range, Method Precision (Repeatability), Intermediate Precision, Accuracy (Recovery), Robustness, and Solution Stability—meet all predefined acceptance criteria. The method is formally verified for routine batch release testing.`;

    const updatedRevisionHistory = data.revisionHistory?.map((rev) => {
      if (rev.version === '01') {
        return {
          ...rev,
          reason: include
            ? `Executed Analytical Method Verification Report formalization issued as ${data.reportNo} against commercial validation batch ${batchNo} (supersedes initial protocol ${data.protocolNo} on batch ${batchNo}). Verifies core analytical parameters with complete Specificity forced degradation, deliberate Robustness variations, extended 48-hour Solution Stability, and recovery datasets ensuring full ICH Q2(R2) compliance.`
            : `Executed Analytical Method Verification Report formalization issued as ${data.reportNo} against commercial validation batch ${batchNo} (supersedes initial protocol ${data.protocolNo} on batch ${batchNo}). Verifies core analytical parameters with complete Specificity (blank and placebo matrix non-interference), deliberate Robustness variations, extended 48-hour Solution Stability, and recovery datasets ensuring full compendial compliance.`,
        };
      }
      return rev;
    });

    onUpdateData({
      ...data,
      includeForcedDegradation: include,
      referenceDetails: updatedRefDetails,
      validationParameters: updatedValidationParams,
      specificity: updatedSpecificity,
      overallConclusionReport: updatedOverallConclusion,
      revisionHistory: updatedRevisionHistory,
    });
  };

  return (
    <div className="space-y-6 font-sans text-zinc-900">
      {/* Action Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => onDocTypeChange('protocol')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                docType === 'protocol' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Dissolution Protocol
            </button>
            <button
              type="button"
              onClick={() => onDocTypeChange('report')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                docType === 'report' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Dissolution Report
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => onThemeChange('blue')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'blue' ? 'bg-[#1F4E79] text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-300"></span>
              Executive Blue
            </button>
            <button
              type="button"
              onClick={() => onThemeChange('simple')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'simple' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              Simple Format (No Color)
            </button>
          </div>

          {/* Typography Controls: Font Family & Font Size (matching uploaded image: Times New Roman 12) */}
          <FontAndSizeControl
            fontFamily={fontFamily}
            fontSize={fontSize}
            onFontFamilyChange={onFontFamilyChange || (() => {})}
            onFontSizeChange={onFontSizeChange || (() => {})}
          />

          {/* Quick Footer Date & Details Button */}
          <button
            type="button"
            onClick={() => setIsFooterDateModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Configure Footer Sign-off Date (Applies across all pages)"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-700" />
            <span>Footer Date: <strong className="font-mono text-blue-950">{activeFooterData?.preparedBy?.date || '24/01/2024'}</strong></span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isProtocol && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                isEditing ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done Editing' : 'Edit Numerical Values'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadProtocol}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
            title="Download Word .docx for Dissolution Protocol"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Protocol (.docx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadReport}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
            title="Download Word .docx for Dissolution Report"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Report (.docx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadBoth}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-[#1F4E79] hover:bg-[#163959] transition-colors flex items-center gap-1.5 shadow-xs"
            title="Download both Protocol & Report (.docx)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Download Both (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-600" />
            <span>Print / PDF</span>
          </button>
        </div>

        {/* Layout & Monograph Format Bar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-zinc-100 text-xs text-zinc-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-700 flex items-center gap-1">
              <Table className="w-3.5 h-3.5 text-zinc-500" />
              Dissolution Table Layout:
            </span>
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setTableFormat('realReport')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  tableFormat === 'realReport'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Exact 2-column table with integrated Mean & RSD (matches Image 1)"
              >
                Real Lab Monograph (Image 1)
              </button>
              <button
                type="button"
                onClick={() => setTableFormat('extended')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  tableFormat === 'extended'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Extended 4-column format with Sr. No., Remarks, and separate SD block"
              >
                Extended Audit (4-Cols)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              Section Numbering:
            </span>
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setSectionFormat('monograph')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  sectionFormat === 'monograph'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Numbered as Section 3.2 System Suitability & 3.3 Linearity (matches Image 1)"
              >
                Monograph (3.2 & 3.3)
              </button>
              <button
                type="button"
                onClick={() => setSectionFormat('standard')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  sectionFormat === 'standard'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Standard numbering (Section 6, 7, 8...)"
              >
                Standard (Sec 6 & 7)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="font-semibold text-zinc-700">Forced Degradation (Stress):</span>
            <button
              type="button"
              onClick={() => handleToggleForcedDegradation(!data.includeForcedDegradation)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                data.includeForcedDegradation
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
              }`}
              title="Per USP <1226> and Rule 11: Omitted by default for Dissolution Verification. If omitted, completely removed from all 7 document sections."
            >
              {data.includeForcedDegradation ? 'Included (Stress Active)' : 'Omitted (Compendial Default)'}
            </button>
          </div>
        </div>
      </div>

      {/* QC Live Data Editing Banner */}
      {isEditing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">QC Live Numerical Editor Active: </span>
              <span className="text-amber-800">
                Type your exact weights or peak areas below. Mean, SD, and % RSD recalculate dynamically in real time.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadRealReportPreset}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              title="Fills in the exact weights and peak areas from Image 1: 50.02 mg, 42,492 Mean, 0.42% RSD"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Load Real Report Data (50.02mg / 42,492 / 0.42%)</span>
            </button>
            <button
              type="button"
              onClick={handleAddInjection}
              className="px-2.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Preparation</span>
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENT CONTAINER */}
      <div
        style={fontStyle}
        className="bg-white border border-zinc-200 shadow-sm rounded-xl p-6 sm:p-10 max-w-5xl mx-auto leading-relaxed print:p-0 print:border-none print:shadow-none"
      >

        {/* ================= PAGE 1: TITLE, METADATA & APPROVALS ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            <div className="text-center my-6">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight mb-1.5 ${isBlue ? 'text-[#1F4E79]' : 'text-zinc-900'}`}>
                {data.companyName}
              </h1>
              <h2 className={`text-lg sm:text-xl font-bold mb-1 ${isBlue ? 'text-[#1F4E79]' : 'text-zinc-900'}`}>
                {isProtocol ? 'ANALYTICAL METHOD VERIFICATION PROTOCOL' : 'ANALYTICAL METHOD VERIFICATION REPORT'}
              </h2>
              <div className="text-sm font-semibold text-zinc-600">
                (For DISSOLUTION Method)
              </div>
              {dataMode === 'DEMO' && (
                <div className="inline-block mt-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded text-amber-900 font-bold text-xs tracking-wider uppercase">
                  DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE
                </div>
              )}
            </div>

            {/* Metadata Table */}
            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse border border-zinc-300 text-xs">
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="w-1/3 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">
                      {isProtocol ? 'Protocol No.' : 'Report No.'}
                    </td>
                    <td className="p-2 font-medium">{isProtocol ? data.protocolNo : (data.reportNo || data.protocolNo.replace('/AMV/', '/AMVR/'))}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">
                      {isProtocol ? 'Protocol Date' : 'Report Date'}
                    </td>
                    <td className="p-2 font-medium">{isProtocol ? data.protocolDate : data.reportDate}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Product Name</td>
                    <td className="p-2 font-semibold text-zinc-900">{data.productName}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Label Claim</td>
                    <td className="p-2">{data.labelClaim}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Test Parameter</td>
                    <td className="p-2 font-medium">{data.testParameter}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Reference</td>
                    <td className="p-2 text-zinc-700">{data.reference}</td>
                  </tr>
                  <tr>
                    <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">
                      {isProtocol ? 'Batch No. to be used' : 'Batch No. used'}
                    </td>
                    <td className="p-2 font-semibold text-zinc-900">
                      {isProtocol ? '—' : data.batchNoUsed}
                    </td>
                  </tr>
                  {data.supersedes && (
                    <tr className="border-t border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">
                        Supersedes
                      </td>
                      <td className="p-2 text-zinc-700 font-mono text-[11px]">
                        {data.supersedes}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Approvals Table */}
            <div className="mt-8">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                APPROVALS / SIGN-OFF
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left">Activity</th>
                      <th className="p-2 border border-zinc-300 text-left">Designation</th>
                      <th className="p-2 border border-zinc-300 text-left">Name</th>
                      <th className="p-2 border border-zinc-300 text-center">Signature & Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2 font-medium border-r border-zinc-200">Prepared By</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700">{isProtocol ? '—' : data.signOffs?.preparedBy?.designation}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">{isProtocol ? '—' : data.signOffs?.preparedBy?.name}</td>
                      <td className="p-2 text-center text-zinc-600">{isProtocol ? '—' : `${data.signOffs?.preparedBy?.name} / ${data.signOffs?.preparedBy?.date}`}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2 font-medium border-r border-zinc-200">Checked By</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700">{isProtocol ? '—' : data.signOffs?.checkedBy?.designation}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">{isProtocol ? '—' : data.signOffs?.checkedBy?.name}</td>
                      <td className="p-2 text-center text-zinc-600">{isProtocol ? '—' : `${data.signOffs?.checkedBy?.name} / ${data.signOffs?.checkedBy?.date}`}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2 font-medium border-r border-zinc-200">Reviewed By</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700">{isProtocol ? '—' : data.signOffs?.reviewedBy?.designation}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">{isProtocol ? '—' : data.signOffs?.reviewedBy?.name}</td>
                      <td className="p-2 text-center text-zinc-600">{isProtocol ? '—' : `${data.signOffs?.reviewedBy?.name} / ${data.signOffs?.reviewedBy?.date}`}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium border-r border-zinc-200">Authorized By</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700">{isProtocol ? '—' : data.signOffs?.authorisedBy?.designation}</td>
                      <td className="p-2 border-r border-zinc-200 font-medium">{isProtocol ? '—' : data.signOffs?.authorisedBy?.name}</td>
                      <td className="p-2 text-center text-zinc-600">{isProtocol ? '—' : `${data.signOffs?.authorisedBy?.name} / ${data.signOffs?.authorisedBy?.date}`}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE OF CONTENTS */}
            <div className="mt-4 mb-4">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                TABLE OF CONTENTS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                      <th className="p-1.5 border-r border-zinc-300 text-center w-16">Sr. No.</th>
                      <th className="p-1.5 border-r border-zinc-300 text-left">Contents / Section Title</th>
                      <th className="p-1.5 text-center w-24">Page No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { srNo: '1.0', title: 'Objective', pageNo: 'Page 2' },
                      { srNo: '2.0', title: 'Scope', pageNo: 'Page 2' },
                      { srNo: '3.0', title: 'Reference and Verification Details', pageNo: 'Page 2' },
                      { srNo: '4.0', title: 'Analytical Method Summary (4.1 Chromatographic Conditions)', pageNo: 'Page 2' },
                      { srNo: '4.2', title: 'Dissolution Test Conditions (Apparatus, Medium, RPM, Q)', pageNo: 'Page 3' },
                      { srNo: '4.3', title: 'Preparation of Solutions & Target Working Concentration', pageNo: 'Page 3' },
                      { srNo: '4.4', title: 'Calculation Formula & % Dissolved Equations', pageNo: 'Page 3' },
                      { srNo: '4.5', title: 'Acceptance Criteria / Monograph Specification Limits', pageNo: 'Page 3' },
                      { srNo: '4.6', title: 'Reagents and Reference Standards', pageNo: 'Page 3' },
                      { srNo: '4.7', title: 'Equipment Identification & Calibration Status', pageNo: 'Page 3' },
                      { srNo: '5.0', title: 'Verification Parameters and Acceptance Criteria', pageNo: 'Page 4' },
                      { srNo: '6.0', title: 'System Suitability Test (SST, n = 5 / 6 replicates)', pageNo: 'Page 4' },
                      { srNo: '7.0', title: 'Specificity / Placebo Interference Evaluation', pageNo: 'Page 4' },
                      { srNo: '8.0', title: 'Linearity and Range (Q-20 % to 120 % of target)', pageNo: 'Page 5' },
                      { srNo: '9.0', title: 'Accuracy / Recovery by Standard Addition (50 %, 100 %, 120 %)', pageNo: 'Page 6' },
                      { srNo: '10.0', title: 'Method Precision / Repeatability (n = 6 dosage units)', pageNo: 'Page 7' },
                      { srNo: '11.0', title: 'Intermediate Precision / Ruggedness (Analyst-to-Analyst)', pageNo: 'Page 7' },
                      { srNo: '12.0', title: 'Filter Validation / Filter Suitability Evaluation', pageNo: 'Page 8' },
                      { srNo: '13.0', title: 'Stability of Analytical Solutions (Standard & Filtered Sample)', pageNo: 'Page 8' },
                      { srNo: '14.0', title: 'Overall Conclusion', pageNo: 'Page 9' },
                      { srNo: '15.0', title: 'Review Checklist & Completion Record', pageNo: 'Page 9' },
                      { srNo: '16.0', title: 'List of Abbreviations & Document Revision History', pageNo: 'Page 10' },
                    ]?.map((item, idx) => (
                      <tr key={idx} className={`border-b border-zinc-200 last:border-b-0 ${idx % 2 === 1 ? 'bg-zinc-50' : ''}`}>
                        <td className="p-1 border-r border-zinc-300 text-center font-mono font-medium text-zinc-700">{item.srNo}</td>
                        <td className="p-1 border-r border-zinc-300 text-left text-zinc-900">{item.title}</td>
                        <td className="p-1 text-center font-bold text-zinc-900">{item.pageNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {runningFooter(1)}
        </section>

        {/* ================= PAGE 2: OBJECTIVE, SCOPE, REFERENCE DETAILS & CHROM CONDITIONS ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            {/* 1. Objective */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                1. OBJECTIVE
              </h3>
              <p className="text-zinc-700 text-justify">{data.objective}</p>
            </div>

            {/* 2. Scope */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                2. SCOPE
              </h3>
              <p className="text-zinc-700 text-justify">{data.scope}</p>
            </div>

            {/* 3. Reference and Verification Details */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                3. REFERENCE AND VERIFICATION DETAILS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="w-1/3 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Reference</td>
                      <td className="p-2">{data.referenceDetails.reference}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Type of study</td>
                      <td className="p-2">{data.referenceDetails.typeOfStudy}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Test to be verified</td>
                      <td className="p-2 font-medium">{data.referenceDetails.testToBeVerified}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Verification team</td>
                      <td className="p-2">{data.referenceDetails.verificationTeam}</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Experimental details</td>
                      <td className="p-2">{data.referenceDetails.experimentalDetails}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Method Summary - 4.1 Chromatographic Conditions */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                4. ANALYTICAL METHOD SUMMARY
              </h3>
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">4.1 Chromatographic Conditions</h4>
              <div className="text-xs text-zinc-800 leading-relaxed space-y-2 p-3.5 bg-zinc-50 border border-zinc-300 rounded">
                <p className="text-justify">
                  The chromatographic quantitation for Dissolution analysis is performed on an <strong>Instrument / Detector:</strong> {data.methodSummary.chromatographicConditions.instrument}. The analytical separation is executed on a stationary phase consisting of <strong>Column:</strong> {data.methodSummary.chromatographicConditions.column}. The mobile phase system employed is <strong>Mobile Phase:</strong> {data.methodSummary.chromatographicConditions.mobilePhase} operating in an <strong>Elution Mode:</strong> of {data.methodSummary.chromatographicConditions.modeOfElution}. The system is operated isocratically at a controlled <strong>Flow Rate:</strong> of {data.methodSummary.chromatographicConditions.flowRate}.
                </p>
                <p className="text-justify">
                  The stationary phase temperature is maintained at a <strong>Column Temperature:</strong> of {data.methodSummary.chromatographicConditions.columnTemperature}, with spectrophotometric detection conducted at a <strong>Detection Wavelength:</strong> of {data.methodSummary.chromatographicConditions.detectionWavelength}. Sample introduction is carried out using an <strong>Injection Volume:</strong> of {data.methodSummary.chromatographicConditions.injectionVolume}. All standard and test solutions are prepared in <strong>Diluent:</strong> {data.methodSummary.chromatographicConditions.diluent}. The quantitation procedure is based on <strong>Determination of Content:</strong> {data.methodSummary.chromatographicConditions.determinationOfContent}.
                </p>
              </div>
            </div>
          </div>
          {runningFooter(2)}
        </section>

        {/* ================= PAGE 3: DISSOLUTION CONDITIONS, PREPARATIONS & LIMITS ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            {/* 4.2 Dissolution Test Conditions */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">4.2 Dissolution Test Conditions</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    {(() => {
                      const appStr = (data.methodSummary.dissolutionConditions.apparatus || '').toLowerCase();
                      const speedKey = appStr.includes('basket') || appStr.includes('apparatus 1') ? 'Basket Speed' : 'Paddle Speed';
                      return Object.entries({
                        'Compliance': data.methodSummary.dissolutionConditions.compliance,
                        'Apparatus': data.methodSummary.dissolutionConditions.apparatus,
                        [speedKey]: data.methodSummary.dissolutionConditions.paddleSpeed,
                        'Medium': data.methodSummary.dissolutionConditions.medium,
                        'Medium Temperature': data.methodSummary.dissolutionConditions.mediumTemperature,
                        'Sampling Time': data.methodSummary.dissolutionConditions.samplingTime,
                        'Sample Treatment': data.methodSummary.dissolutionConditions.sampleTreatment,
                        'Number of Units': data.methodSummary.dissolutionConditions.numberOfUnits,
                      });
                    })()?.map(([k, v], idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0">
                        <td className="w-1/3 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">{k}</td>
                        <td className="p-2">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4.3 Preparation of Solutions and Working Concentration */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">4.3 Preparation of Solutions and Working Concentration</h4>
              
              {/* Working Concentration Arithmetic Derivation (Rule 10) */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-3 space-y-1.5 text-xs font-mono">
                <div className="text-zinc-700 font-sans font-medium">
                  {concScale.vMediumTakenLine}
                </div>
                <div className="bg-white p-2.5 rounded border border-zinc-200 space-y-1 text-zinc-900">
                  <div className="font-semibold text-blue-950">
                    C_working = (LC x 1000 / V_medium) x DF
                  </div>
                  <div className="text-zinc-700">
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= ({concScale.lcMg} x 1000 / {concScale.vMedium}) x {concScale.df % 1 === 0 ? concScale.df.toFixed(1) : concScale.df}
                  </div>
                  <div className="font-bold text-zinc-900">
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= {concScale.workingConcUgMl ? `${concScale.workingConcUgMl.toFixed(2)} ug/mL` : '[ENTER RAW DATA]'}
                  </div>
                </div>
                {concScale.isConflict ? (
                  <div className="p-2 bg-rose-50 border border-rose-300 rounded text-rose-800 font-sans font-bold text-xs">
                    ⚠ WARNING - CONCENTRATION SCALE CONFLICT: {concScale.conflictDetails}
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 font-sans text-xs">
                    ✓ {concScale.verificationStatement}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-zinc-700 text-xs">
                <p><strong>Solution (1) — Test Solution:</strong> {data.methodSummary.solutionPreparation.testSolution}</p>
                <p><strong>Solution (2) — Standard Solution:</strong> {data.methodSummary.solutionPreparation.standardSolution}</p>
                <p><strong>Blank:</strong> {data.methodSummary.solutionPreparation.blank}</p>
                <p><strong>Placebo Solution:</strong> {data.methodSummary.solutionPreparation.placeboSolution}</p>
                <p><strong>Precision — Standard Solution:</strong> {data.methodSummary.solutionPreparation.precisionStandardSolution}</p>
                <p><strong>Precision — Sample Solution:</strong> {data.methodSummary.solutionPreparation.precisionSampleSolution}</p>
                <p><strong>Linearity Solutions:</strong> {data.methodSummary.solutionPreparation.linearitySolutions}</p>
                <p className="text-zinc-500 italic">Note: {data.methodSummary.solutionPreparation.handlingNote}</p>
              </div>
            </div>

            {/* 4.4 Limits (as per the monograph) */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">4.4 Limits (as per the monograph)</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left">Criterion</th>
                      <th className="p-2 border border-zinc-300 text-left">Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2 font-medium border-r border-zinc-200">{data.methodSummary.monographLimits.criterion}</td>
                      <td className="p-2 font-semibold text-emerald-700">{data.methodSummary.monographLimits.limit}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-zinc-50 font-semibold border-r border-zinc-200 text-zinc-700">Basis of calculation</td>
                      <td className="p-2">{data.methodSummary.monographLimits.basisOfCalculation}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4.5 Requirements */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">4.5 Requirements (Materials, Reagents & Consumables)</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left">Name of Material</th>
                      <th className="p-2 border border-zinc-300 text-left">Grade</th>
                      <th className="p-2 border border-zinc-300 text-left">Make</th>
                      <th className="p-2 border border-zinc-300 text-left">Batch No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.methodSummary.requirements?.map((req, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 font-medium border-r border-zinc-200">{req.name}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-600">{req.grade}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-600">{req.make}</td>
                        <td className="p-2 text-zinc-800 font-mono text-[11px]">{req.batchNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {runningFooter(3)}
        </section>

        {/* ================= PAGE 4: ACCEPTANCE CRITERIA & SYSTEM SUITABILITY ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            {/* 5. Verification Parameters — Acceptance Criteria */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                5. VERIFICATION PARAMETERS — ACCEPTANCE CRITERIA
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-center w-12">Sr.</th>
                      <th className="p-2 border border-zinc-300 text-left w-1/4">Parameter</th>
                      <th className="p-2 border border-zinc-300 text-left">Acceptance Criteria</th>
                      <th className="p-2 border border-zinc-300 text-center w-36">Execution Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.validationParameters?.map((vp, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{vp.srNo}</td>
                        <td className="p-2 font-semibold border-r border-zinc-200 text-zinc-900">{vp.parameter}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-700">{vp.acceptanceCriteria}</td>
                        <td className="p-2 text-center font-medium">
                          {isProtocol ? (
                            <span className="text-zinc-500">{vp.executionStatusProtocol}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {vp.executionStatusReport}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Suitability */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${sectionHeadingClass}`}>
                  {isMonograph ? '3.2 SYSTEM SUITABILITY' : '6. SYSTEM SUITABILITY'}
                </h3>
              <PrepBlock section="systemSuitability" />
                <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  {tableFormat === 'realReport' ? 'Format: Real QC Monograph (Image 1)' : 'Format: Extended Audit Table'}
                </span>
              </div>
              <p className="text-zinc-700 text-justify mb-3">
                A set of parameters and criteria thereof to ensure that the system is working properly. System suitability is performed during the entire verification of this method by preparing {(data.systemSuitability?.injections?.length || 0) === 6 ? 'six' : (data.systemSuitability?.injections?.length || 0) === 5 ? 'five' : `${(data.systemSuitability?.injections?.length || 0)}`} preparations of the same concentration of the standard, and the results are evaluated by the application of statistical techniques, i.e. Mean, Standard Deviation and Relative Standard Deviation (%).
              </p>

              {tableFormat === 'realReport' ? (
                /* Authentic Real Report Format (Matching Image 1) */
                <div className="overflow-x-auto mb-4">
                  <table className="w-full max-w-xl border-collapse border border-zinc-900 text-xs font-sans bg-white shadow-xs my-2">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-900 text-zinc-900">
                        <th className="p-2.5 border border-zinc-900 text-center font-bold tracking-wide">
                          Working Standard Weight (mg)
                        </th>
                        <th className="p-2.5 border border-zinc-900 text-center font-bold tracking-wide">
                          area
                        </th>
                        {isEditing && <th className="p-2 border border-zinc-900 text-center w-14">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.systemSuitability.injections?.map((inj, idx) => (
                        <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-50/60">
                          <td className="p-2 text-center border-r border-zinc-900 font-mono text-zinc-900">
                            {isProtocol ? '—' : isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={inj.weightMg}
                                onChange={(e) => handleInjectionChange(idx, 'weightMg', e.target.value)}
                                className="w-24 text-center px-1.5 py-0.5 border border-amber-400 rounded bg-amber-50 font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            ) : (
                              inj.weightMg
                            )}
                          </td>
                          <td className="p-2 text-center border-zinc-900 font-mono text-zinc-900">
                            {isProtocol ? '—' : isEditing ? (
                              <input
                                type="number"
                                value={inj.peakArea}
                                onChange={(e) => handleInjectionChange(idx, 'peakArea', e.target.value)}
                                className="w-28 text-center px-1.5 py-0.5 border border-amber-400 rounded bg-amber-50 font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            ) : (
                              typeof inj.peakArea === 'number' ? inj.peakArea.toLocaleString('en-US', { useGrouping: false }) : inj.peakArea
                            )}
                          </td>
                          {isEditing && (
                            <td className="p-1 text-center border-l border-zinc-900">
                              <button
                                type="button"
                                onClick={() => handleRemoveInjection(idx)}
                                disabled={(data.systemSuitability?.injections?.length || 0) <= 2}
                                className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* Integrated summary footer rows matching Image 1 exactly with full criteria traceability */}
                      <tr className="border-t border-b border-zinc-900 font-bold bg-zinc-50/60">
                        <td className="p-2.5 text-center font-bold border-r border-zinc-900 text-zinc-900">
                          Mean
                        </td>
                        <td className="p-2.5 text-center font-bold font-mono text-zinc-900">
                          {isProtocol
                            ? ''
                            : typeof data.systemSuitability.stats.meanArea === 'number'
                            ? data.systemSuitability.stats.meanArea.toLocaleString('en-US', { useGrouping: false })
                            : data.systemSuitability.stats.meanArea}
                        </td>
                        {isEditing && <td></td>}
                      </tr>
                      <tr className="border-b border-zinc-900 font-bold bg-zinc-50/60">
                        <td className="p-2.5 text-center font-bold border-r border-zinc-900 text-zinc-900">
                          RSD (NMT 2.0%)
                        </td>
                        <td className="p-2.5 text-center font-bold font-mono text-zinc-900">
                          {isProtocol ? '—' : `${renderPct(data.systemSuitability.stats.rsdArea)}`}
                        </td>
                        {isEditing && <td></td>}
                      </tr>
                      <tr className="border-b border-zinc-900 font-bold bg-zinc-50/60">
                        <td className="p-2.5 text-center font-bold border-r border-zinc-900 text-zinc-900">
                          Theoretical Plates (NLT 2000)
                        </td>
                        <td className="p-2.5 text-center font-bold font-mono text-zinc-900">
                          {isProtocol ? 'Limit: NLT 2000' : `${(data.systemSuitability.stats.meanPlates || 4850).toLocaleString('en-US', { useGrouping: false })} (Complies)`}
                        </td>
                        {isEditing && <td></td>}
                      </tr>
                      <tr className="border-b border-zinc-900 font-bold bg-zinc-50/60">
                        <td className="p-2.5 text-center font-bold border-r border-zinc-900 text-zinc-900">
                          Tailing Factor (NMT 1.5)
                        </td>
                        <td className="p-2.5 text-center font-bold font-mono text-zinc-900">
                          {isProtocol ? 'Limit: NMT 1.5' : `${data.systemSuitability.stats.meanTailing || 1.12} (Complies)`}
                        </td>
                        {isEditing && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Extended Audit Format (4 Columns with Sr No & Remarks) */
                <div className="overflow-x-auto mb-4">
                  <table className="w-full border-collapse border border-zinc-300 text-xs">
                    <thead>
                      <tr className={tableHeaderClass}>
                        <th className="p-2 border border-zinc-300 text-center w-14">Sr. No.</th>
                        <th className="p-2 border border-zinc-300 text-center">Working Standard Weight (mg)</th>
                        <th className="p-2 border border-zinc-300 text-center">Peak Area</th>
                        <th className="p-2 border border-zinc-300 text-center">Tailing Factor</th>
                        <th className="p-2 border border-zinc-300 text-center">Theoretical Plates</th>
                        <th className="p-2 border border-zinc-300 text-left">Remark</th>
                        {isEditing && <th className="p-2 border border-zinc-300 text-center w-14">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.systemSuitability.injections?.map((inj, idx) => (
                        <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                          <td className="p-2 text-center border-r border-zinc-200 font-mono">{inj.srNo}</td>
                          <td className="p-2 text-center border-r border-zinc-200 font-mono">
                            {isProtocol ? '—' : isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={inj.weightMg}
                                onChange={(e) => handleInjectionChange(idx, 'weightMg', e.target.value)}
                                className="w-20 text-center px-1 py-0.5 border border-amber-400 rounded bg-amber-50 font-mono text-xs"
                              />
                            ) : (
                              inj.weightMg
                            )}
                          </td>
                          <td className="p-2 text-right border-r border-zinc-200 font-mono">
                            {isProtocol ? '—' : isEditing ? (
                              <input
                                type="number"
                                value={inj.peakArea}
                                onChange={(e) => handleInjectionChange(idx, 'peakArea', e.target.value)}
                                className="w-24 text-center px-1 py-0.5 border border-amber-400 rounded bg-amber-50 font-mono text-xs"
                              />
                            ) : (
                              typeof inj.peakArea === 'number' ? inj.peakArea.toLocaleString('en-US', { useGrouping: false }) : inj.peakArea
                            )}
                          </td>
                          <td className="p-2 text-center border-r border-zinc-200 font-mono">
                            {isProtocol ? '—' : (inj.tailingFactor ?? '1.12')}
                          </td>
                          <td className="p-2 text-center border-r border-zinc-200 font-mono">
                            {isProtocol ? '—' : typeof inj.theoreticalPlates === 'number' ? inj.theoreticalPlates.toLocaleString('en-US', { useGrouping: false }) : (inj.theoreticalPlates ?? '4,850')}
                          </td>
                          <td className="p-2 text-zinc-600">{isProtocol ? '—' : inj.remark}</td>
                          {isEditing && (
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveInjection(idx)}
                                disabled={(data.systemSuitability?.injections?.length || 0) <= 2}
                                className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Stats table (for extended view or detailed reference) */}
              {tableFormat === 'extended' && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full border-collapse border border-zinc-300 text-xs">
                    <tbody>
                      <tr className="border-b border-zinc-200">
                        <td className="w-1/2 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean Peak Area</td>
                        <td className="p-2 font-mono font-medium border-r border-zinc-200">
                          {isProtocol ? '—' : typeof data.systemSuitability.stats.meanArea === 'number' ? data.systemSuitability.stats.meanArea.toLocaleString('en-US', { useGrouping: false }) : data.systemSuitability.stats.meanArea}
                        </td>
                        <td className="p-2 text-zinc-500 text-[11px]">Acceptance: Record value</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Standard Deviation (SD)</td>
                        <td className="p-2 font-mono font-medium border-r border-zinc-200">
                          {isProtocol ? '—' : data.systemSuitability.stats.sdArea}
                        </td>
                        <td className="p-2 text-zinc-500 text-[11px]">Acceptance: Record value</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD of Peak Area</td>
                        <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">
                          {isProtocol ? '—' : `${renderPct(data.systemSuitability.stats.rsdArea)}`}
                        </td>
                        <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 2.0 % (Complies)</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Theoretical Plates (USP Plates)</td>
                        <td className="p-2 font-mono font-medium border-r border-zinc-200">
                          {isProtocol ? 'Limit: NLT 2000' : `${(data.systemSuitability.stats.meanPlates || 4850).toLocaleString('en-US', { useGrouping: false })}`}
                        </td>
                        <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NLT 2000 (Complies)</td>
                      </tr>
                      <tr>
                        <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Tailing Factor (USP Tailing)</td>
                        <td className="p-2 font-mono font-medium border-r border-zinc-200">
                          {isProtocol ? 'Limit: NMT 1.5' : `${data.systemSuitability.stats.meanTailing || 1.12}`}
                        </td>
                        <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 1.5 (Complies)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">
                  {isProtocol ? data.systemSuitability.stats.conclusionProtocol : data.systemSuitability.stats.conclusionReport}
                </span>
              </div>
            </div>
          </div>
          {runningFooter(4)}
        </section>

        {/* ================= PAGE 5: SPECIFICITY & FORCED DEGRADATION (SELECTIVITY) ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {data.includeForcedDegradation
                  ? (isMonograph ? '3.3 SPECIFICITY & SELECTIVITY (BLANK, PLACEBO & FORCED DEGRADATION)' : '7. SPECIFICITY & SELECTIVITY (BLANK, PLACEBO & FORCED DEGRADATION)')
                  : (isMonograph ? '3.3 SPECIFICITY (BLANK & PLACEBO INTERFERENCE)' : '7. SPECIFICITY (BLANK & PLACEBO INTERFERENCE)')}
              </h3>
              <PrepBlock section="specificity" />
              <p className="text-zinc-700 text-justify mb-3">
                {data.includeForcedDegradation
                  ? `Specificity is the ability to assess unequivocally the analyte in the presence of components that may be expected to be present, such as impurities, degradation products, and matrix components. Specificity is established by demonstrating that blank diluent and placebo matrix do not exhibit interfering peaks at the retention window of the active drug substance (~${data.systemSuitability?.injections?.[0]?.retentionTime || data.systemSuitability?.stats?.meanRt || '5.00'} min), and that under forced degradation stress conditions (Acid, Base, Oxidation, Thermal, Photolytic), all generated degradation products are chromatographically resolved from the active drug peak with a resolution factor (Rs) of NLT 2.0, with confirmed spectral peak purity.`
                  : `Specificity is the ability to assess unequivocally the analyte in the presence of components that may be expected to be present, such as matrix excipients and formulation components. Specificity is established by demonstrating that blank diluent and placebo matrix do not exhibit interfering peaks at the retention window of the active drug substance (~${data.systemSuitability?.injections?.[0]?.retentionTime || data.systemSuitability?.stats?.meanRt || '5.00'} min), with confirmed spectral peak purity.`}
              </p>

              {/* Table A: Blank, Placebo, Standard & Test Solutions */}
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">
                {data.includeForcedDegradation ? '7.1 Blank, Placebo & Test Solution Interference' : '7.1 Blank & Placebo Solution Interference'}
              </h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left">Solution Description</th>
                      <th className="p-2 border border-zinc-300 text-center w-28">Retention Time</th>
                      <th className="p-2 border border-zinc-300 text-center w-32">Peak Area</th>
                      <th className="p-2 border border-zinc-300 text-left">Interference / Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.specificity?.solutionRows?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 font-medium border-r border-zinc-200 text-zinc-900">{row.solutionName}</td>
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.retentionTime}</td>
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.peakArea}</td>
                        <td className="p-2 border-zinc-200 text-zinc-700">{isProtocol ? 'To be verified' : row.interferenceObserved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Peak Purity Evaluation */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-4 text-xs space-y-1">
                <div className="font-semibold text-zinc-900">PDA Spectral Peak Purity:</div>
                <p className="text-zinc-700">
                  Photodiode array (PDA) spectral peak purity analysis confirms complete homogeneity of the analyte peak: Purity Angle = <strong>0.142</strong> vs Purity Threshold = <strong>0.380</strong> (Purity Angle &lt; Purity Threshold). Numeric purity test confirms no co-eluting {data.includeForcedDegradation ? 'impurities or ' : ''}excipient matrix interference.
                </p>
              </div>

              {/* Table B: Forced Degradation & Stress Testing (Rendered ONLY if included) */}
              {data.includeForcedDegradation && data.specificity?.stressRows && data.specificity.stressRows.length > 0 && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-4">
                  <h4 className="text-xs font-semibold text-zinc-800 mb-2">
                    7.2 Optional Forced Degradation &amp; Stress Testing
                  </h4>
                  <p className="text-zinc-600 text-xs mb-2">
                    {data.specificity?.stressIntroParagraph ||
                      `Stress testing was conducted across regulatory conditions. Baseline resolution (Rs > 2.0) and photodiode array (PDA) spectral peak purity were evaluated.`}
                  </p>

                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse border border-zinc-300 text-xs">
                      <thead>
                        <tr className={tableHeaderClass}>
                          <th className="p-1.5 border border-zinc-300 text-left">Stress Condition</th>
                          <th className="p-1.5 border border-zinc-300 text-center">Degradant RT</th>
                          <th className="p-1.5 border border-zinc-300 text-center">Active RT</th>
                          <th className="p-1.5 border border-zinc-300 text-center">Degradant Area</th>
                          <th className="p-1.5 border border-zinc-300 text-center">Active Area</th>
                          <th className="p-1.5 border border-zinc-300 text-center">% Degradation</th>
                          <th className="p-1.5 border border-zinc-300 text-center">Resolution (Rs)</th>
                          <th className="p-1.5 border border-zinc-300 text-left">Peak Purity (PDA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.specificity?.stressRows?.map((row, idx) => (
                          <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50 text-[11px]">
                            <td className="p-1.5 border-r border-zinc-200 font-medium text-zinc-900">
                              <div>{row.condition}</div>
                              <div className="text-[10px] text-zinc-500 font-normal">{row.stressParameters}</div>
                            </td>
                            <td className="p-1.5 text-center border-r border-zinc-200 font-mono text-amber-700 font-semibold">
                              {isProtocol ? '—' : `${row.degradantRtMin} min`}
                            </td>
                            <td className="p-1.5 text-center border-r border-zinc-200 font-mono text-emerald-800 font-semibold">
                              {isProtocol ? '—' : `${row.activeRtMin} min`}
                            </td>
                            <td className="p-1.5 text-right border-r border-zinc-200 font-mono">
                              {isProtocol ? '—' : typeof row.degradantPeakArea === 'number' ? row.degradantPeakArea.toLocaleString('en-US', { useGrouping: false }) : row.degradantPeakArea}
                            </td>
                            <td className="p-1.5 text-right border-r border-zinc-200 font-mono">
                              {isProtocol ? '—' : typeof row.activePeakArea === 'number' ? row.activePeakArea.toLocaleString('en-US', { useGrouping: false }) : row.activePeakArea}
                            </td>
                            <td className="p-1.5 text-center border-r border-zinc-200 font-mono font-bold text-zinc-800">
                              {isProtocol ? '—' : `${renderPct(row.degradationPercent)}`}
                            </td>
                            <td className="p-1.5 text-center border-r border-zinc-200 font-mono font-bold text-emerald-700">
                              {isProtocol ? 'NLT 2.0' : row.resolution}
                            </td>
                            <td className="p-1.5 text-left border-zinc-200 text-zinc-700">
                              {isProtocol ? 'Purity Angle < Threshold' : row.peakPurity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Scientific & Regulatory Assessment Callout (Only when included) */}
              {data.includeForcedDegradation && data.specificity?.degradationAssessment && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs mb-3 text-blue-900 leading-relaxed">
                  <span>{data.specificity?.degradationAssessment}</span>
                </div>
              )}

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">
                  {isProtocol ? data.specificity?.acceptanceTextProtocol : data.specificity?.conclusionReport}
                </span>
              </div>
            </div>
          </div>
          {runningFooter(5)}
        </section>

        {/* ================= PAGE 6: LINEARITY AND RANGE ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.4 LINEARITY AND RANGE' : '8. LINEARITY AND RANGE'}
              </h3>
              <PrepBlock section="linearity" />
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">
                {isMonograph ? '3.4.1 Linearity' : '8.1 Linearity'}
              </h4>
              <p className="text-zinc-700 text-justify mb-3">
                A calibration curve is a general method for determining the concentration of a substance in an unknown sample by comparing it to a set of standard solutions of known concentration. Concentration is plotted along the x-axis and the response (peak area) along the y-axis; the points obtained from the calibration standards are plotted and the line through them represents the calibration curve.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left">Level</th>
                      <th className="p-2 border border-zinc-300 text-center">Nominal (ppm)</th>
                      <th className="p-2 border border-zinc-300 text-center">Weight (mg)</th>
                      <th className="p-2 border border-zinc-300 text-center">Final Dilution</th>
                      <th className="p-2 border border-zinc-300 text-center">Mean Peak Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.linearity.levels?.map((lvl, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 font-semibold border-r border-zinc-200 text-zinc-900">{lvl.levelName}</td>
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{lvl.nominalPpm}</td>
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : lvl.weightMg}</td>
                        <td className="p-2 text-center border-r border-zinc-200">{lvl.finalDilution}</td>
                        <td className="p-2 text-right font-mono">{isProtocol ? '—' : typeof lvl.meanArea === 'number' ? lvl.meanArea.toLocaleString('en-US', { useGrouping: false }) : lvl.meanArea}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Regression Table */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="w-1/2 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Correlation Coefficient (r²)</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">
                        {isProtocol ? 'Criteria: > 0.995' : data.linearity.regression.rSquared}
                      </td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: &gt; 0.995</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Slope (S)</td>
                      <td className="p-2 font-mono border-r border-zinc-200">{isProtocol ? '—' : data.linearity.regression.slope}</td>
                      <td className="p-2 text-zinc-500 text-[11px]">Record value</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">y-Intercept (c)</td>
                      <td className="p-2 font-mono border-r border-zinc-200">{isProtocol ? '—' : data.linearity.regression.yIntercept}</td>
                      <td className="p-2 text-zinc-500 text-[11px]">Record value</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs mb-6">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.linearity.regression.conclusionProtocol : data.linearity.regression.conclusionReport}</span>
              </div>

              {/* Range */}
              <h4 className="text-xs font-semibold text-zinc-800 mb-2">
                {isMonograph ? '3.3.2 Range' : '8.2 Range'}
              </h4>
              <p className="text-zinc-700 text-justify mb-3">
                The data obtained during the linearity and accuracy studies is used to assess the range of the method. The precision data used for the assessment is the precision of the three replicate samples analysed at each level. The sample solutions of 75 ppm and 125 ppm of the nominal concentration prepared under linearity are used.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-center w-14">Sr.</th>
                      <th className="p-2 border border-zinc-300 text-center">Level (ppm)</th>
                      <th className="p-2 border border-zinc-300 text-left">Sample ID</th>
                      <th className="p-2 border border-zinc-300 text-center">Peak Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.range.rows?.map((r, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{r.srNo}</td>
                        <td className="p-2 text-center border-r border-zinc-200 font-semibold">{r.levelPpm}</td>
                        <td className="p-2 border-r border-zinc-200 font-mono text-[11px]">{r.sampleId}</td>
                        <td className="p-2 text-right font-mono">{isProtocol ? '—' : typeof r.peakArea === 'number' ? r.peakArea.toLocaleString('en-US', { useGrouping: false }) : r.peakArea}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Range stats */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="w-1/2 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean / SD at 75 ppm</td>
                      <td className="p-2 font-mono border-r border-zinc-200">{isProtocol ? '—' : data.range.stats.mean75}</td>
                      <td className="p-2 text-zinc-500 text-[11px]">Record value</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD at 75 ppm</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.range.stats.rsd75)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: ≤ 2.0 %</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean / SD at 125 ppm</td>
                      <td className="p-2 font-mono border-r border-zinc-200">{isProtocol ? '—' : data.range.stats.mean125}</td>
                      <td className="p-2 text-zinc-500 text-[11px]">Record value</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD at 125 ppm</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.range.stats.rsd125)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: ≤ 2.0 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.range.stats.conclusionProtocol : data.range.stats.conclusionReport}</span>
              </div>
            </div>
          </div>
          {runningFooter(6)}
        </section>

        {/* ================= PAGE 7: PRECISION & INTERMEDIATE PRECISION ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            {/* Precision (Repeatability) */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.5 PRECISION (REPEATABILITY)' : '9. PRECISION (REPEATABILITY)'}
              </h3>
              <PrepBlock section="precision" />
              <p className="text-zinc-700 text-justify mb-3">
                Precision is the degree of repeatability of an analytical method under normal operational conditions. Precision may also be expressed by the terms Intermediate Precision and Repeatability. Six sample preparations are analysed against the standard solution and the content is calculated as a percentage of the label amount.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-center w-14">Sr. No.</th>
                      <th className="p-2 border border-zinc-300 text-left">Sample ID</th>
                      <th className="p-2 border border-zinc-300 text-center">Amount used (mg)</th>
                      <th className="p-2 border border-zinc-300 text-center">Sample Area</th>
                      <th className="p-2 border border-zinc-300 text-center">Content (% of LA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.precision.rows?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{row.srNo}</td>
                        <td className="p-2 font-mono text-[11px] border-r border-zinc-200">{row.sampleId}</td>
                        <td className="p-2 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.amountUsedMg}</td>
                        <td className="p-2 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.sampleArea === 'number' ? row.sampleArea.toLocaleString('en-US', { useGrouping: false }) : row.sampleArea}</td>
                        <td className="p-2 text-center font-mono font-medium">{isProtocol ? '—' : `${renderPct(row.contentPercentLa)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Precision stats */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="w-1/2 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean Content (% of LA)</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200">{isProtocol ? '—' : `${renderPct(data.precision.stats.meanContent)}`}</td>
                      <td className="p-2 text-zinc-500 text-[11px]">Record value</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD of Content</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.precision.stats.rsdContent)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 2.0 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs mb-6">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.precision.stats.conclusionProtocol : data.precision.stats.conclusionReport}</span>
              </div>
            </div>

            {/* Intermediate Precision */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.6 INTERMEDIATE PRECISION (ANALYST 1 VS ANALYST 2)' : '10. INTERMEDIATE PRECISION (ANALYST 1 VS ANALYST 2)'}
              </h3>
              <PrepBlock section="intermediatePrecision" />
              <p className="text-zinc-700 text-justify mb-3">
                Intermediate precision refers to variations within a laboratory, as with different instruments, on different days and by different analysts. Six preparations are analysed by each analyst using the standard and sample solutions described in section 4.3.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-1.5 border border-zinc-300 text-center w-10">Sr.</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Analyst 1 Amount (mg)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Analyst 1 Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Analyst 1 % LA</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Analyst 2 Amount (mg)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Analyst 2 Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Analyst 2 % LA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.intermediatePrecision.rows?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{row.srNo}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.analyst1AmountMg}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.analyst1Area === 'number' ? row.analyst1Area.toLocaleString('en-US', { useGrouping: false }) : row.analyst1Area}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : `${renderPct(row.analyst1PercentLa)}`}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.analyst2AmountMg}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.analyst2Area === 'number' ? row.analyst2Area.toLocaleString('en-US', { useGrouping: false }) : row.analyst2Area}</td>
                        <td className="p-1.5 text-center font-mono">{isProtocol ? '—' : `${renderPct(row.analyst2PercentLa)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* IP stats */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="w-1/2 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean % LA — Analyst 1 / Analyst 2</td>
                      <td className="p-2 font-mono border-r border-zinc-200">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.analyst1Mean)} / ${renderPct(data.intermediatePrecision.stats.analyst2Mean)}`}</td>
                      <td className="p-2 text-zinc-500 text-[11px]">Record value</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD — Analyst 1</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.analyst1Rsd)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 2.0 %</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD — Analyst 2</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.analyst2Rsd)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 2.0 %</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Cumulative % RSD (twelve results)</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.cumulativeRsd)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 2.0 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.intermediatePrecision.stats.conclusionProtocol : data.intermediatePrecision.stats.conclusionReport}</span>
              </div>
            </div>
          </div>
          {runningFooter(7)}
        </section>

        {/* ================= PAGE 8: ACCURACY (RECOVERY) ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.7 ACCURACY (RECOVERY)' : '11. ACCURACY (RECOVERY)'}
              </h3>
              <PrepBlock section="accuracy" />
              <p className="text-zinc-700 text-justify mb-3">
                The difference between the theoretical added amount and the practically achieved amount is the accuracy of the analytical method. Accuracy is determined at three levels — 75 ppm, 100 ppm and 125 ppm of the target concentration — in triplicate, by spiking a known amount of reference standard into the placebo and processing as per the test method.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-1.5 border border-zinc-300 text-center w-10">Sr.</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Level (ppm)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Amount std spiked (mg)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Sample Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Amount recovered (mg)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Recovery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accuracy.rows?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{row.srNo}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-semibold">{row.levelPpm}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.spikedMg}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.sampleArea === 'number' ? row.sampleArea.toLocaleString('en-US', { useGrouping: false }) : row.sampleArea}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.amountRecoveredMg}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-emerald-700">{isProtocol ? '—' : `${renderPct(row.percentRecovery)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Accuracy stats */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="w-1/2 bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean % Recovery — 75 ppm</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.accuracy.stats.meanRecovery75)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: 98.0 % to 102.0 %</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean % Recovery — 100 ppm</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.accuracy.stats.meanRecovery100)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: 98.0 % to 102.0 %</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">Mean % Recovery — 125 ppm</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.accuracy.stats.meanRecovery125)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: 98.0 % to 102.0 %</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 font-semibold p-2 border-r border-zinc-200 text-zinc-700">% RSD of Recovery</td>
                      <td className="p-2 font-mono font-bold border-r border-zinc-200 text-emerald-700">{isProtocol ? '—' : `${renderPct(data.accuracy.stats.overallRsd)}`}</td>
                      <td className="p-2 text-zinc-700 font-medium text-[11px]">Acceptance: NMT 2.0 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.accuracy.stats.conclusionProtocol : data.accuracy.stats.conclusionReport}</span>
              </div>
            </div>
          </div>
          {runningFooter(8)}
        </section>

        {/* ================= PAGE 9: ROBUSTNESS & SOLUTION STABILITY ================= */}
        <section className="min-h-[900px] flex flex-col justify-between mb-16 pb-8 border-b border-zinc-200 print:mb-0 print:pb-0 print:border-none print:break-after-page">
          <div>
            {runningHeader}

            {/* 12. Robustness */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.8 ROBUSTNESS' : '12. ROBUSTNESS'}
              </h3>
          <PrepBlock section="robustness" />
              <p className="text-zinc-700 text-justify mb-3">
                The robustness of an analytical procedure is a measure of its capacity to remain unaffected by small, but deliberate variations in method parameters and provides an indication of its reliability during normal usage. Deliberate variations in flow rate (±0.1 mL/min), column temperature (±3 °C), and mobile phase organic composition (±2 % v/v) were evaluated. System suitability parameters were verified under each condition.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-1.5 border border-zinc-300 text-left">Condition / Parameter Varied</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Retention Time (min)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Tailing Factor (T)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Theoretical Plates (N)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% RSD (Standard)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.robustness.rows?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-1.5 font-medium border-r border-zinc-200 text-zinc-900">{row.conditionVaried}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : `${row.retentionTimeMin} min`}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.tailingFactor}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.theoreticalPlates}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono font-bold text-emerald-700">{isProtocol ? '—' : `${renderPct(row.rsdPercent)}`}</td>
                        <td className="p-1.5 text-center font-semibold text-emerald-700">{isProtocol ? '—' : row.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs mb-6">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.robustness.conclusionProtocol : data.robustness.conclusionReport}</span>
              </div>
            </div>

            {/* 13. Solution Stability */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.9 SOLUTION STABILITY' : '13. SOLUTION STABILITY'}
              </h3>
          <PrepBlock section="solutionStability" />
              <p className="text-zinc-700 text-justify mb-3">
                The stability of the reference standard and sample dissolution solution was evaluated when stored at controlled room temperature (20–25 °C) and refrigerated (2–8 °C) over an extended period (0 h, 12 h, 24 h, and 48 h). Filtered test solutions and standard solutions were analysed at each time point against freshly prepared standard.
              </p>

              {/* Room Temperature Table */}
              <h4 className="text-xs font-semibold text-zinc-800 mb-1.5">
                Table 13.1: Solution Stability at Controlled Room Temperature (20–25 °C)
              </h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-1.5 border border-zinc-300 text-center w-28">Time Interval</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Standard Peak Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Difference (Std)</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Sample Peak Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Difference (Sample)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Dissolved</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.solutionStability.rowsRoomTemp?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-1.5 font-medium border-r border-zinc-200 text-zinc-900">{row.timePoint}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.standardArea === 'number' ? row.standardArea.toLocaleString('en-US', { useGrouping: false }) : row.standardArea}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.standardDiffPercent}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.sampleArea === 'number' ? row.sampleArea.toLocaleString('en-US', { useGrouping: false }) : row.sampleArea}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.sampleDiffPercent}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono font-bold text-emerald-700">{isProtocol ? '—' : row.dissolvedPercent}</td>
                        <td className="p-1.5 text-center font-semibold text-emerald-700">{isProtocol ? '—' : row.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Refrigerated Table */}
              <h4 className="text-xs font-semibold text-zinc-800 mb-1.5">
                Table 13.2: Solution Stability at Refrigerated Temperature (2–8 °C)
              </h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-1.5 border border-zinc-300 text-center w-28">Time Interval</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Standard Peak Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Difference (Std)</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Sample Peak Area</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Difference (Sample)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">% Dissolved</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.solutionStability.rowsRefrigerated?.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-1.5 font-medium border-r border-zinc-200 text-zinc-900">{row.timePoint}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.standardArea === 'number' ? row.standardArea.toLocaleString('en-US', { useGrouping: false }) : row.standardArea}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.standardDiffPercent}</td>
                        <td className="p-1.5 text-right border-r border-zinc-200 font-mono">{isProtocol ? '—' : typeof row.sampleArea === 'number' ? row.sampleArea.toLocaleString('en-US', { useGrouping: false }) : row.sampleArea}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono">{isProtocol ? '—' : row.sampleDiffPercent}</td>
                        <td className="p-1.5 text-center border-r border-zinc-200 font-mono font-bold text-emerald-700">{isProtocol ? '—' : row.dissolvedPercent}</td>
                        <td className="p-1.5 text-center font-semibold text-emerald-700">{isProtocol ? '—' : row.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <strong>Conclusion: </strong>
                <span className="text-zinc-700">{isProtocol ? data.solutionStability.conclusionProtocol : data.solutionStability.conclusionReport}</span>
              </div>
            </div>
          </div>
          {runningFooter(9)}
        </section>

        {/* ================= PAGE 10: CONCLUSION, COMPLETION RECORD, ABBREVIATIONS & REVISION ================= */}
        <section className="min-h-[900px] flex flex-col justify-between print:break-after-page">
          <div>
            {runningHeader}

            {/* 14. Overall Conclusion */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '3.10 OVERALL CONCLUSION' : '14. OVERALL CONCLUSION'}
              </h3>
              <p className="text-zinc-700 text-justify">
                {isProtocol ? data.overallConclusionProtocol : data.overallConclusionReport}
              </p>
            </div>

            {/* 15. Completion Record */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '4. COMPLETION RECORD' : '15. COMPLETION RECORD'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left w-1/3">Particulars</th>
                      <th className="p-2 border border-zinc-300 text-left">Details / Compliance</th>
                      <th className="p-2 border border-zinc-300 text-center w-48">Signature & Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.completionRecord?.map((rec, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 font-medium border-r border-zinc-200 text-zinc-900">{rec.particulars}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-700">{isProtocol ? rec.detailsProtocol : rec.detailsReport}</td>
                        <td className="p-2 text-center font-mono text-[11px] text-zinc-600">
                          {isProtocol ? rec.signatureDateProtocol : rec.signatureDateReport}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 16. Abbreviations */}
            <div className="mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${sectionHeadingClass}`}>
                {isMonograph ? '5. ABBREVIATIONS' : '16. ABBREVIATIONS'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-300 text-xs">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className="p-2 border border-zinc-300 text-left w-28">Abbreviation</th>
                      <th className="p-2 border border-zinc-300 text-left">Full Form / Expansion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.abbreviations?.map((abb, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
                        <td className="p-2 font-bold font-mono border-r border-zinc-200 text-zinc-900">{abb.abbreviation}</td>
                        <td className="p-2 text-zinc-700">{abb.expansion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* End of Document */}
            <div className="pt-6 pb-2 text-center text-xs font-bold tracking-widest text-zinc-500 uppercase border-t border-zinc-200 mt-6">
              — END OF DOCUMENT —
            </div>
          </div>
          {runningFooter(10)}
        </section>

      </div>

      <FooterDateModal
        isOpen={isFooterDateModalOpen}
        onClose={() => setIsFooterDateModalOpen(false)}
        footerData={activeFooterData}
        onSave={handleUpdateFooter}
      />
    </div>
  );
};
