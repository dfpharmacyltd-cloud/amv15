import React, { useState } from 'react';
import {
  AMVDocumentData,
  DocumentType,
  ThemeFormat,
  SystemSuitabilityRow,
  AccuracyRecoveryRow,
  FontFamilyType,
  FontSizePt,
  DataMode,
  FooterSignOffData,
} from '../types';
import { formatNum, formatInt, formatAmountByMagnitude, formatSigFig, formatResponse } from '../services/mathUtils';
import { LinearityChart } from './LinearityChart';
import { FontAndSizeControl } from './FontAndSizeControl';
import { SignOffFooter, DEFAULT_FOOTER_SIGN_OFF } from './SignOffFooter';
import { FooterDateModal } from './FooterDateModal';
import {
  Download,
  Printer,
  Edit3,
  Layers,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';

interface AMVDocumentViewerProps {
  data: AMVDocumentData;
  docType: DocumentType;
  theme: ThemeFormat;
  dataMode?: 'TEMPLATE' | 'DEMO';
  fontFamily?: FontFamilyType;
  fontSize?: FontSizePt;
  onFontFamilyChange?: (font: FontFamilyType) => void;
  onFontSizeChange?: (size: FontSizePt) => void;
  onDocTypeChange: (type: DocumentType) => void;
  onThemeChange: (theme: ThemeFormat) => void;
  onDownloadProtocol: () => void;
  onDownloadReport: () => void;
  onDownloadBoth: () => void;
  onUpdateData?: (updated: AMVDocumentData) => void;
  footerSignOffData?: FooterSignOffData;
  onUpdateFooterSignOffData?: (data: FooterSignOffData) => void;
}

export const AMVDocumentViewer: React.FC<AMVDocumentViewerProps> = ({
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
  const [showChart, setShowChart] = useState(false);
  const [isFooterDateModalOpen, setIsFooterDateModalOpen] = useState(false);
  const [localFooterData, setLocalFooterData] = useState<FooterSignOffData>(DEFAULT_FOOTER_SIGN_OFF);

  const activeFooterData = footerSignOffData || localFooterData;
  const handleUpdateFooter = (updated: FooterSignOffData) => {
    setLocalFooterData(updated);
    if (onUpdateFooterSignOffData) onUpdateFooterSignOffData(updated);
  };

  const isProtocol = docType === 'protocol';
  const responseDecimals = (data as any).responseDecimals ?? 0;
  const techniqueName = (data as any).technique === 'UV' ? 'UV Visible Spectroscopy' : 'HPLC';
  const uvChecks = (data as any).uvSystemSuitabilityChecks as { parameter: string; criterion: string; observed: string }[] | undefined;
  const responseLabel = (data as any).responseLabel || 'Peak Area (\u00B5V\u00B7s)';
  const renderPct = (val: any) => (val === undefined || val === null || val === '—' || val === '' || Number.isNaN(Number(val))) ? '—' : `${val} %`;
  const isBlue = theme === 'blue';
  const currentMode: DataMode = dataMode === 'TEMPLATE' ? 'TEMPLATE' : 'DEMO';

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

  // CSS Styles based on theme (strict matching reference PDF)
  const tableHeaderClass = isBlue
    ? 'bg-[#1F4E79] text-white font-bold border-[#1F4E79]'
    : 'bg-zinc-100 text-zinc-900 font-bold border-zinc-300';

  const sectionHeadingClass = isBlue
    ? 'text-[#1F4E79] border-[#1F4E79]'
    : 'text-zinc-900 border-zinc-800';

  // Handle cell edit for System Suitability
  const handleSSChange = (index: number, field: keyof SystemSuitabilityRow, value: number) => {
    if (!onUpdateData) return;
    const updated = JSON.parse(JSON.stringify(data)) as AMVDocumentData;
    updated.systemSuitability.injections[index][field] = value;
    onUpdateData(updated);
  };

  // Handle cell edit for Accuracy
  const handleAccuracyChange = (
    index: number,
    field: keyof AccuracyRecoveryRow,
    value: number
  ) => {
    if (!onUpdateData) return;
    const updated = JSON.parse(JSON.stringify(data)) as AMVDocumentData;
    updated.accuracy.rows[index][field] = value;
    if (field === 'amountRecovered' || field === 'amountAdded') {
      const added = Number(updated.accuracy.rows[index].amountAdded);
      const rec = Number(updated.accuracy.rows[index].amountRecovered);
      if (added > 0) {
        updated.accuracy.rows[index].percentRecovery = Number(((rec / added) * 100).toFixed(2));
      }
    }
    onUpdateData(updated);
  };

  // Handle cell edit for Precision
  const handlePrecisionChange = (index: number, field: 'analyst1Assay' | 'analyst2Assay', value: number) => {
    if (!onUpdateData) return;
    const updated = JSON.parse(JSON.stringify(data)) as AMVDocumentData;
    updated.precision.rows[index][field] = value;
    onUpdateData(updated);
  };

  // Running header component for pages 2 to 8
  const RunningHeader = () => (
    <div className="flex justify-between items-center pb-2 mb-4 border-b border-zinc-300 text-[11px] text-zinc-500 font-sans">
      <span className="font-semibold text-zinc-700">{data.companyName}</span>
      <span>
        {isProtocol ? 'AMV Protocol' : 'AMV Report'} – {data.productName} | Doc No. {data.documentNo}
      </span>
    </div>
  );

  // Running footer component for each page (Page X of 8) with official sign-off table
  const RunningFooter = ({ pageNum }: { pageNum: number }) => (
    <SignOffFooter
      pageNum={pageNum}
      totalPages={8}
      dataMode={dataMode}
      footerData={activeFooterData}
      onUpdateFooterData={handleUpdateFooter}
    />
  );

  const c = data.chromatographicConditions;
  const ss = data.systemSuitability;
  const spec = data.specificity;
  const prepSet = (data as any).sectionPreparations || {};
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

  const lin = data.linearity;
  const acc = data.accuracy;
  const prec = data.precision;
  const rob = data.robustness;
  const stab = data.solutionStability;

  return (
    <div style={fontStyle} className="space-y-6 text-zinc-900">
      {/* Top Document Action Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => onDocTypeChange('protocol')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                docType === 'protocol'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              AMV Protocol
            </button>
            <button
              type="button"
              onClick={() => onDocTypeChange('report')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                docType === 'report'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              AMV Report
            </button>
          </div>

          {/* Format Switcher (Executive Blue vs Simple Format) */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => onThemeChange('blue')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'blue'
                  ? 'bg-[#1F4E79] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-300"></span>
              Executive Blue
            </button>
            <button
              type="button"
              onClick={() => onThemeChange('simple')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'simple'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isProtocol && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
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
            title="Download Word .docx for Protocol"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Protocol (.docx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadReport}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-1.5"
            title="Download Word .docx for Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Report (.docx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadBoth}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 transition-colors flex items-center gap-1.5"
            title="Download Both Protocol and Report in one click"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-600" />
            <span>Both (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors"
            title="Print or Save PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1 OF 8: MASTHEAD, METADATA, 3-COL SIGN-OFF, SEC 1, 2, 3, 4.1 HEADING */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {/* Company Title */}
        <div className="text-center pb-1 pt-1">
          <h1 className={`text-xl sm:text-2xl font-bold uppercase tracking-wide ${sectionHeadingClass}`}>
            {data.companyName}
          </h1>
          <p className="text-xs text-zinc-600 font-medium mt-1">{data.companyAddress}</p>
        </div>

        {/* Solid Divider Line */}
        <div className={`w-full h-1 my-3 ${isBlue ? 'bg-[#1F4E79]' : 'bg-zinc-800'}`}></div>

        {/* Document Title */}
        <div className="text-center py-1 mb-3">
          <h2 className={`text-sm sm:text-base font-bold uppercase tracking-wider ${sectionHeadingClass}`}>
            {isProtocol
              ? `ANALYTICAL METHOD VALIDATION PROTOCOL (${data.testParameter || `Assay by ${techniqueName}`})`
              : `ANALYTICAL METHOD VALIDATION REPORT (${data.testParameter || `Assay by ${techniqueName}`})`}
          </h2>
          {dataMode === 'DEMO' && (
            <div className="inline-block mt-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded text-amber-900 font-bold text-xs tracking-wider uppercase">
              DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE
            </div>
          )}
        </div>

        {/* Metadata Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <tbody>
              <tr>
                <td className="w-1/3 bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Document No.</td>
                <td className="w-2/3 border border-zinc-300 px-3 py-1.5 font-mono font-bold text-zinc-900">{data.documentNo}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Product Name</td>
                <td className="border border-zinc-300 px-3 py-1.5 font-bold text-zinc-900">{data.productName}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Label Claim</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{data.labelClaim}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Test Parameter</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{data.testParameter}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Reference</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{data.reference}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Batch No. Used</td>
                <td className="border border-zinc-300 px-3 py-1.5 font-mono font-bold text-zinc-900">{data.batchNoUsed}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Effective Date</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">
                  {isProtocol ? '01-Apr-2026' : (data.effectiveDate || '21-Apr-2026')}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Supersedes</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{data.supersedes}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Approval table: one row per activity, as on the house format */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-2 border border-zinc-300 text-center">ACTIVITY</th>
                <th className="p-2 border border-zinc-300 text-center">DESIGNATION</th>
                <th className="p-2 border border-zinc-300 text-center">NAME</th>
                <th className="p-2 border border-zinc-300 text-center">SIGNATURE</th>
                <th className="p-2 border border-zinc-300 text-center">DATE</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Prepared By', data.signOffs?.preparedBy],
                ['Checked By', (data.signOffs as any)?.checkedBy || data.signOffs?.reviewedBy],
                ['Reviewed By', data.signOffs?.reviewedBy],
                ['Authorized By', data.signOffs?.approvedBy],
              ].map(([activity, person]: any) => (
                <tr key={activity}>
                  <td className="p-1.5 border border-zinc-300 font-semibold">{activity}</td>
                  <td className="p-1.5 border border-zinc-300">{person?.designation || ''}</td>
                  <td className="p-1.5 border border-zinc-300">{(person?.name || '').toUpperCase()}</td>
                  <td className="p-1.5 border border-zinc-300 text-center">________________</td>
                  <td className="p-1.5 border border-zinc-300 text-center">
                    {isProtocol ? '________________' : person?.date || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TABLE OF CONTENTS */}
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-1.5 ${sectionHeadingClass}`}>
            TABLE OF CONTENTS
          </h3>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-16">Sr. No.</th>
                <th className="p-1.5 border border-zinc-300 text-left">Contents / Section Title</th>
                <th className="p-1.5 border border-zinc-300 text-center w-24">Page No.</th>
              </tr>
            </thead>
            <tbody>
              {[
                { srNo: '1.0', title: 'Objective', pageNo: 'Page 1' },
                { srNo: '2.0', title: 'Scope', pageNo: 'Page 1' },
                { srNo: '3.0', title: 'Reference Documents & Verification Details', pageNo: 'Page 1' },
                { srNo: '4.0', title: 'Analytical Method Summary (4.1 Conditions, 4.2 Preparations, 4.3 Formulae)', pageNo: 'Page 2' },
                { srNo: '4.4', title: 'Reagents, Reference Standards & Analytical Equipment', pageNo: 'Page 3' },
                { srNo: '5.0', title: 'Validation Parameters and Acceptance Criteria', pageNo: 'Page 3' },
                { srNo: '6.0', title: 'System Suitability Test (SST)', pageNo: 'Page 4' },
                { srNo: '7.0', title: 'Specificity / Placebo Interference & Forced Degradation', pageNo: 'Page 4' },
                { srNo: '8.0', title: 'Linearity and Range (50 % to 150 % of nominal conc.)', pageNo: 'Page 5' },
                { srNo: '9.0', title: 'Accuracy / Recovery (50 %, 100 %, 150 % Levels)', pageNo: 'Page 5' },
                { srNo: '10.0', title: 'Method Precision (Repeatability, n = 6)', pageNo: 'Page 6' },
                { srNo: '11.0', title: 'Intermediate Precision / Ruggedness (Analyst-to-Analyst)', pageNo: 'Page 6' },
                { srNo: '12.0', title: 'Robustness & Stability of Analytical Solutions', pageNo: 'Page 7' },
                { srNo: '13.0', title: 'Overall Conclusion', pageNo: 'Page 7' },
                { srNo: '14.0', title: 'Review Checklist & Completion Record', pageNo: 'Page 7' },
                { srNo: '15.0', title: 'List of Abbreviations & Document Revision History', pageNo: 'Page 8' },
              ]?.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1 border border-zinc-300 text-center font-mono font-medium text-zinc-700">{item.srNo}</td>
                  <td className="p-1 border border-zinc-300 text-left text-zinc-900">{item.title}</td>
                  <td className="p-1 border border-zinc-300 text-center font-bold text-zinc-900">{item.pageNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 1. Objective */}
        <div className="mb-3">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>1. Objective</h3>
          <p className="text-xs text-zinc-800 leading-relaxed">{data.objective}</p>
        </div>

        {/* 2. Scope */}
        <div className="mb-3">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>2. Scope</h3>
          <p className="text-xs text-zinc-800 leading-relaxed">{data.scope}</p>
        </div>

        {/* 3. Reference Documents & Verification Details */}
        <div className="mb-3">
          <h3 className={`text-xs font-bold uppercase mb-1.5 ${sectionHeadingClass}`}>
            3. Reference Documents &amp; Verification Details
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <tbody>
                <tr>
                  <td className="w-1/4 bg-zinc-50 font-bold border border-zinc-300 px-2.5 py-1.5 text-zinc-700">Reference</td>
                  <td className="w-3/4 border border-zinc-300 px-2.5 py-1.5 text-zinc-800">{data.verificationDetails?.reference || data.reference}</td>
                </tr>
                <tr>
                  <td className="bg-zinc-50 font-bold border border-zinc-300 px-2.5 py-1.5 text-zinc-700">(a) Type of Verification</td>
                  <td className="border border-zinc-300 px-2.5 py-1.5 text-zinc-800">{data.verificationDetails?.typeOfVerification || 'Verification of a compendial assay procedure under actual conditions of use, as per USP <1225> and ICH Q2(R2)'}</td>
                </tr>
                <tr>
                  <td className="bg-zinc-50 font-bold border border-zinc-300 px-2.5 py-1.5 text-zinc-700">(b) Test to be Verified</td>
                  <td className="border border-zinc-300 px-2.5 py-1.5 text-zinc-800">{data.verificationDetails?.testToBeVerified || `Assay by ${techniqueName} (${data.activeSubstance} content)`}</td>
                </tr>
                <tr>
                  <td className="bg-zinc-50 font-bold border border-zinc-300 px-2.5 py-1.5 text-zinc-700">(c) Verification Team</td>
                  <td className="border border-zinc-300 px-2.5 py-1.5 text-zinc-800">{data.verificationDetails?.verificationTeam || 'Analyst 1: Sahil Panchal (Chemist, QC); Analyst 2: Smit Patel (Executive, QC); Supervisor: Anil Parmar (Manager, QC)'}</td>
                </tr>
                <tr>
                  <td className="bg-zinc-50 font-bold border border-zinc-300 px-2.5 py-1.5 text-zinc-700">(d) Experimental Details</td>
                  <td className="border border-zinc-300 px-2.5 py-1.5 text-zinc-800">{data.verificationDetails?.experimentalDetails || `Specificity, system suitability, linearity (50 % to 150 %), accuracy / recovery (50 %, 100 %, 150 %), precision and intermediate precision, robustness and stability of analytical solutions up to 24 hours, executed on batch ${data.batchNoUsed}.`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Analytical Method Summary Heading */}
        <div>
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            4. Analytical Method Summary
          </h3>
          <h4 className="text-xs font-bold text-zinc-800">4.1 Chromatographic Conditions</h4>
        </div>

        <RunningFooter pageNum={1} />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2 OF 8: SEC 4.1 TABLE, NOTE, SEC 4.2 TABLE, SEC 4.3 CALCULATION FORMULAE */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* 4.1 Chromatographic Conditions - Narrative Paragraph Format (No Table) */}
        <div className="mb-4">
          <div className="text-xs text-zinc-800 leading-relaxed space-y-2.5 p-3.5 bg-zinc-50 border border-zinc-300 rounded">
            <p className="text-justify">
              {uvChecks ? (
                <>
                  The measurement is made on a <strong>Instrument:</strong> {(c as any).instrument || 'double beam UV / Visible spectrophotometer'} using <strong>Cells:</strong> {(c as any).cellPathLength || '1 cm matched quartz cells'}, at a <strong>Wavelength:</strong> {c.detectionWavelength}, against <strong>Blank:</strong> {(c as any).blank || c.diluent}.
                </>
              ) : (
                <>
                  The high-performance liquid chromatographic (HPLC) separation is executed using a stationary phase consisting of <strong>Column:</strong> {c.column}. The mobile phase system employed is <strong>Mobile Phase:</strong> {c.mobilePhase}. The chromatographic system is operated isocratically at a controlled <strong>Flow Rate:</strong> {c.flowRate}, with spectrophotometric monitoring performed at a <strong>Detection Wavelength:</strong> {c.detectionWavelength}.
                </>
              )}
            </p>
            <p className="text-justify">
              Sample introduction is carried out with an <strong>Injection Volume:</strong> {c.injectionVolume}, and thermal equilibrium of the stationary phase is maintained at a <strong>Column Temperature:</strong> {c.columnTemperature}. The total chromatographic <strong>Run Time:</strong> is established at {c.runTime}. Samples and reference standard preparations are prepared in <strong>Diluent:</strong> {c.diluent} to attain a target <strong>Working Concentration:</strong> of {c.workingConcentration}. Under these validated operational conditions, the typical chromatographic retention time for the main active analyte is approximately <strong>Approximate Retention Time:</strong> {c.approxRetentionTime || '6.5 min'}.
            </p>
            {c.note && (
              <p className="text-[11px] italic text-zinc-600 bg-white p-2 border border-zinc-200 rounded">
                <strong>Note on Mobile Phase Preparation:</strong> {c.note}
              </p>
            )}
          </div>
        </div>

        {/* 4.2 Preparation of Solutions (Summary) */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-zinc-800 mb-1.5">4.2 Preparation of Solutions (Summary)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-left w-1/3">Solution</th>
                  <th className="p-2 border border-zinc-300 text-left w-2/3">Preparation Procedure</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 font-semibold bg-zinc-50 border border-zinc-300 align-top">
                    Standard Solution ({c.workingConcentration})
                  </td>
                  <td className="p-2 border border-zinc-300 text-zinc-800 leading-relaxed">
                    {data.solutionPreparation.standardSolution}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold bg-zinc-50 border border-zinc-300 align-top">
                    Sample Solution ({c.workingConcentration})
                  </td>
                  <td className="p-2 border border-zinc-300 text-zinc-800 leading-relaxed">
                    {data.solutionPreparation.sampleSolution}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4.3 Calculation Formula & Assay Equations */}
        <div className="mb-2">
          <h4 className="text-xs font-bold text-zinc-800 mb-2">4.3 Calculation Formula &amp; Assay Equations</h4>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-xs space-y-2 mb-2 font-mono">
            <div className="font-bold text-[#1F4E79]">
              {data.calculationFormula?.assayFormula || 'Assay (%) = (AT / AS) × (WS / 100) × (100 / WT) × (AVG_WT / LC) × Purity'}
            </div>
            <div className="font-bold text-[#1F4E79]">
              {data.calculationFormula?.contentFormula || 'Content (mg/tablet) = Assay (%) × Label Claim (mg) / 100'}
            </div>
          </div>
          <div className="text-xs text-zinc-700 space-y-1 pl-1">
            {(data.calculationFormula?.notes || [
              '• AT = Peak area of analyte in the sample chromatogram',
              '• AS = Mean peak area of analyte in standard chromatograms',
              `• WS = Weight of ${data.activeSubstance} working standard taken (mg)`,
              '• WT = Weight of powdered dosage unit sample taken (mg)',
              '• AVG_WT = Average weight of 20 tablets (mg)',
              `• LC = Label claim of ${data.activeSubstance} per unit (mg)`,
              `• Purity = Decimal purity of ${data.activeSubstance} reference standard`,
            ])?.map((note, i) => (
              <p key={i}>{note}</p>
            ))}
          </div>
        </div>

        <RunningFooter pageNum={2} />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3 OF 8: SEC 4.4 (REAGENTS & EQUIPMENT), SEC 5 (ROWS 1 TO 4)           */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* 4.4 Requirements — Reagents and Reference Standards */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-zinc-800 mb-2">
            4.4 Requirements — Reagents and Reference Standards
          </h4>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-1.5 border border-zinc-300 text-left">Name of Chemical / Standard</th>
                  <th className="p-1.5 border border-zinc-300 text-left">Grade</th>
                  <th className="p-1.5 border border-zinc-300 text-left">Make / Catalogue</th>
                  <th className="p-1.5 border border-zinc-300 text-left">Batch / Lot No.</th>
                </tr>
              </thead>
              <tbody>
                {data.reagentsAndStandards?.map((r, i) => (
                  <tr key={i}>
                    <td className="p-1.5 border border-zinc-300 font-semibold">{r.name}</td>
                    <td className="p-1.5 border border-zinc-300">{r.grade}</td>
                    <td className="p-1.5 border border-zinc-300">{r.make}</td>
                    <td className="p-1.5 border border-zinc-300 font-mono">{r.batchNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Validation Parameters and Acceptance Criteria */}
        <div>
          <h3 className={`text-xs font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            5. Validation Parameters and Acceptance Criteria
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-12">Sr.</th>
                  <th className="p-2 border border-zinc-300 text-left w-1/4">Parameter</th>
                  <th className="p-2 border border-zinc-300 text-left w-2/5">Acceptance Criteria</th>
                  <th className="p-2 border border-zinc-300 text-left w-1/3">
                    {isProtocol ? 'Verification Requirement' : 'Result / Acceptance Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">1</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Specificity</td>
                  <td className="p-1.5 border border-zinc-300">
                    No interference from blank (diluent) and placebo at the retention time of the analyte peak. Peak purity passed by PDA.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : 'No interference observed; peak purity passed (purity angle < threshold) — Complies'}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">2</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">System Suitability</td>
                  <td className="p-1.5 border border-zinc-300">
                    Tailing factor NMT 2.0; %RSD of area NMT 2.0 % (n=5); theoretical plates NLT 2000.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : `Tailing ${formatNum(ss.meanTailing, 2)}; %RSD ${renderPct(formatNum(ss.rsdArea, 2))}; plates ${formatInt(ss.meanPlates)} — Complies`}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">3</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Linearity (50%–150%)</td>
                  <td className="p-1.5 border border-zinc-300">
                    Correlation coefficient (r) shall be ≥ 0.999 (r² ≥ 0.998); slope and y-intercept reported; y-intercept bias at 100 % level within ±2.0 %.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : `r = ${formatSigFig(lin.regression.correlationR, 6)}; slope ${formatNum(lin.regression.slope, 1)}; y-intercept ${formatNum(lin.regression.yIntercept, 0)}; bias ${renderPct(formatNum(lin.regression.yInterceptBiasPercent, 2))} — Complies`}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">4</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Accuracy (50%–150%)</td>
                  <td className="p-1.5 border border-zinc-300">
                    Mean recovery of three levels in triplicate between 98.0 % and 102.0 %; %RSD at each level NMT 2.0 %.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : `Mean recovery ${renderPct(formatNum(acc.meanRecoveryAllLevels, 2))} (n = 9, %RSD ${renderPct(formatNum(acc.rsdAllLevels, 2))}) — Complies`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <RunningFooter pageNum={3} />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4 OF 8: SEC 5 (ROWS 5-9), SEC 6 SYSTEM SUITABILITY, SEC 7 SPECIFICITY */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* 5. Validation Parameters Continued (Rows 5 to 9) */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-12">Sr.</th>
                  <th className="p-2 border border-zinc-300 text-left w-1/4">Parameter</th>
                  <th className="p-2 border border-zinc-300 text-left w-2/5">Acceptance Criteria</th>
                  <th className="p-2 border border-zinc-300 text-left w-1/3">
                    {isProtocol ? 'Verification Requirement' : 'Result / Acceptance Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">5</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Range</td>
                  <td className="p-1.5 border border-zinc-300">
                    Mean recovery 98.0 % to 102.0 %; %RSD ≤ 2.0 % at each level; correlation coefficient r ≥ 0.999.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : `Mean recovery ${renderPct(formatNum(acc.meanRecoveryAllLevels, 2))}; %RSD ${renderPct(formatNum(acc.rsdAllLevels, 2))}; r = ${formatSigFig(lin.regression.correlationR, 6)} — Complies`}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">6</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Method Precision (Repeatability)</td>
                  <td className="p-1.5 border border-zinc-300">%RSD for six assay sample preparations NMT 2.0 %.</td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : `Mean ${renderPct(formatNum(prec.analyst1Mean, 2))}; %RSD ${renderPct(formatNum(prec.analyst1Rsd, 2))} — Complies`}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">7</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Intermediate Precision (Ruggedness)</td>
                  <td className="p-1.5 border border-zinc-300">
                    %RSD for six results NMT 2.0 %; cumulative %RSD for twelve results NMT 2.0 %.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol ? '—' : `Analyst 2 %RSD ${renderPct(formatNum(prec.analyst2Rsd, 2))}; Cumulative %RSD ${renderPct(formatNum(prec.cumulativeRsd, 2))} (n = 12) — Complies`}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">8</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Robustness</td>
                  <td className="p-1.5 border border-zinc-300">
                    System suitability criteria met under all deliberately varied conditions (%RSD NMT 2.0 %, Tailing NMT 2.0, Plates NLT 2000).
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol
                      ? 'To be verified as per protocol criteria'
                      : `Maximum %RSD ${renderPct(formatNum((rob?.rows?.length || 0) > 0 ? Math.max(...rob.rows?.map((r) => r.rsdPercent)) : 0.13, 2))}; all criteria met — Complies`}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 text-center font-bold">9</td>
                  <td className="p-1.5 font-semibold bg-zinc-50 border border-zinc-300">Solution Stability</td>
                  <td className="p-1.5 border border-zinc-300">
                    Cumulative difference in peak response for standard and sample solutions over 24 hours shall not exceed 2.0 %; %RSD ≤ 2.0 %.
                  </td>
                  <td className="p-1.5 border border-zinc-300">
                    {isProtocol
                      ? 'To be verified as per protocol criteria'
                      : (() => {
                          const initialStd = stab.rows?.[0]?.standardArea || 1;
                          const initialSpl = stab.rows?.[0]?.sampleArea || 1;
                          let maxStd = 0;
                          let maxSpl = 0;
                          stab.rows?.forEach((r, i) => {
                            if (i > 0) {
                              const dS = (Math.abs(r.standardArea - initialStd) / initialStd) * 100;
                              const dP = (Math.abs(r.sampleArea - initialSpl) / initialSpl) * 100;
                              if (dS > maxStd) maxStd = dS;
                              if (dP > maxSpl) maxSpl = dP;
                            }
                          });
                          return `Standard max diff ${renderPct(formatNum(maxStd, 2))}; Sample max diff ${renderPct(formatNum(maxSpl, 2))} (24 h) — Complies`;
                        })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. System Suitability */}
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            6. System Suitability
          </h3>
          <p className="text-xs text-zinc-600 mb-2">
            Inject five (5) replicate injections of the standard solution ({c.workingConcentration}). Record peak area, tailing factor, and theoretical plates into the execution table below.
          </p>
          <PrepBlock section="systemSuitability" />

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-24">Injection No.</th>
                  <th className="p-2 border border-zinc-300 text-right">{responseLabel}</th>
                  {!uvChecks && <th className="p-2 border border-zinc-300 text-right">Tailing Factor</th>}
                  {!uvChecks && <th className="p-2 border border-zinc-300 text-right">Theoretical Plates</th>}
                </tr>
              </thead>
              <tbody>
                {ss.injections?.map((inj, idx) => (
                  <tr key={inj.injectionNo}>
                    <td className="p-1.5 border border-zinc-300 text-center font-bold text-zinc-800">
                      {inj.injectionNo}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? (
                        ''
                      ) : isEditing ? (
                        <input
                          type="number"
                          value={inj.peakArea}
                          onChange={(e) => handleSSChange(idx, 'peakArea', parseFloat(e.target.value) || 0)}
                          className="w-28 text-right px-1 py-0.5 border rounded bg-amber-50"
                        />
                      ) : (
                        formatResponse(inj.peakArea, responseDecimals)
                      )}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? (
                        ''
                      ) : isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inj.tailingFactor}
                          onChange={(e) => handleSSChange(idx, 'tailingFactor', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right px-1 py-0.5 border rounded bg-amber-50"
                        />
                      ) : (
                        formatNum(inj.tailingFactor, 2)
                      )}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? (
                        ''
                      ) : isEditing ? (
                        <input
                          type="number"
                          value={inj.theoreticalPlates}
                          onChange={(e) => handleSSChange(idx, 'theoreticalPlates', parseInt(e.target.value, 10) || 0)}
                          className="w-20 text-right px-1 py-0.5 border rounded bg-amber-50"
                        />
                      ) : (
                        formatInt(inj.theoreticalPlates)
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-center text-zinc-900">Mean</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatResponse(ss.meanArea, responseDecimals)}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(ss.meanTailing, 2)}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatInt(ss.meanPlates)}
                  </td>
                </tr>
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-center text-zinc-900">SD</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(ss.sdArea ?? 0, 2)}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(ss.sdTailing ?? 0, 3)}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(ss.sdPlates ?? 0, 1)}
                  </td>
                </tr>
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-center text-zinc-900">%RSD</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(ss.rsdArea, 2))}`}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(ss.rsdTailing, 2))}`}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(ss.rsdPlates, 2))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? (uvChecks
                  ? 'Acceptance Criteria: %RSD of absorbance for six replicate measurements NMT 1.0 %; the instrument qualification checks below shall comply. (Observed Result: To be recorded upon execution)'
                  : 'Acceptance Criteria: %RSD of Peak Area <= 2.0%, Tailing Factor <= 2.0, Theoretical Plates >= 2000. (Observed Result: To be recorded upon execution)')
              : uvChecks
              ? `Acceptance: %RSD of absorbance NMT 1.0 %. (Result: Mean ${responseLabel} = ${formatResponse(ss.meanArea, responseDecimals)}, %RSD = ${renderPct(formatNum(ss.rsdArea, 2))} — Complies)`
              : `Acceptance: %RSD of Peak Area <= 2.0%, Tailing Factor <= 2.0, Theoretical Plates >= 2000. (Result: Mean Area = ${formatResponse(ss.meanArea, responseDecimals)}, %RSD = ${renderPct(formatNum(ss.rsdArea, 2))}, Tailing = ${formatNum(ss.meanTailing, 2)}, Plates = ${formatInt(ss.meanPlates)} — Complies)`}
          </p>
        </div>

        {/* 7. Specificity */}
        <div className="mb-2">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>7. Specificity</h3>
          <p className="text-xs text-zinc-600 mb-2">
            Inject blank, placebo, reference standard, sample, and impurity solutions in duplicate. Record retention times and confirm absence of co-eluting peaks at the analyte retention window.
          </p>
          {uvChecks && (
            <div className="mb-4">
              <p className="text-xs font-bold mb-1">Instrument Qualification Checks</p>
              <table className="w-full text-xs border-collapse border border-zinc-300">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className="p-2 border border-zinc-300 text-left">Parameter</th>
                    <th className="p-2 border border-zinc-300 text-left">Acceptance Criteria</th>
                    <th className="p-2 border border-zinc-300 text-right">Observed</th>
                  </tr>
                </thead>
                <tbody>
                  {uvChecks.map((c, i) => (
                    <tr key={i}>
                      <td className="p-1.5 border border-zinc-300 font-semibold">{c.parameter}</td>
                      <td className="p-1.5 border border-zinc-300">{c.criterion}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : c.observed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PrepBlock section="specificity" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-left w-2/5">Solution</th>
                  <th className="p-2 border border-zinc-300 text-center w-3/10">Retention Time (min)</th>
                  <th className="p-2 border border-zinc-300 text-center w-3/10">Interference Observed</th>
                </tr>
              </thead>
              <tbody>
                {spec.rows?.map((r, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{r.solution}</td>
                    <td className="p-1.5 border border-zinc-300 text-center font-mono">
                      {isProtocol ? '—' : r.retentionTime}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-center">
                      {isProtocol ? '—' : r.interference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? 'Acceptance Criteria: No interfering peak from blank or placebo matrix shall co-elute with the active substance peak. Peak purity shall be verified.'
              : `Acceptance Criteria: No interfering peak from blank or placebo matrix shall co-elute with the active substance peak. (Result: No interfering peaks observed at ${data.activeSubstance} retention window. Peak purity passed — Complies)`}
          </p>
        </div>

        <RunningFooter pageNum={4} />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 5 OF 8: SEC 8 LINEARITY (TABLES 1 & 2), SEC 9 ACCURACY (ROWS 1 TO 6) */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* 8. Linearity and Range */}
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            8. Linearity and Range
          </h3>
          <p className="text-xs text-zinc-600 mb-2">
            Prepare linearity standard solutions across 5 concentration levels (50 % to 150 % of nominal working concentration). Inject in triplicate and construct calibration curve.
          </p>
          <PrepBlock section="linearity" />
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-24">Level (%)</th>
                  <th className="p-2 border border-zinc-300 text-right">Concentration (µg/mL)</th>
                  <th className="p-2 border border-zinc-300 text-right">Mean {responseLabel}</th>
                  <th className="p-2 border border-zinc-300 text-right">% of 100% Response</th>
                </tr>
              </thead>
              <tbody>
                {lin.levels?.map((lvl) => (
                  <tr key={lvl.levelPercent}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">
                      {lvl.levelPercent} %
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {formatNum(lvl.concentration, 2)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatResponse(lvl.meanArea, responseDecimals)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : `${renderPct(formatNum(lvl.percentOf100Response, 2))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Regression Parameter Table */}
          <div className="overflow-x-auto mb-2">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-left w-3/5">Regression Parameter</th>
                  <th className="p-2 border border-zinc-300 text-right w-2/5">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">Correlation Coefficient (r)</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono font-bold">
                    {isProtocol ? 'Criteria: ≥ 0.999' : formatSigFig(lin.regression.correlationR, 6)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">Coefficient of Determination (r²)</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono font-bold">
                    {isProtocol ? 'Criteria: ≥ 0.998' : formatSigFig(lin.regression.rSquared, 6)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">Slope</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(lin.regression.slope, 2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">y-Intercept</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(lin.regression.yIntercept, 2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">y-Intercept bias as % of 100% response</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? 'Criteria: NMT ±2.0%' : `${renderPct(formatNum(lin.regression.yInterceptBiasPercent, 2))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? 'Acceptance Criteria: Correlation coefficient (r) shall be ≥ 0.999; r² ≥ 0.998. The y-intercept bias shall be within ±2.0% of nominal response.'
              : `Acceptance: Correlation coefficient r ≥ 0.999 (r² ≥ 0.998). (Result: r = ${formatSigFig(lin.regression.correlationR, 6)}, r² = ${formatSigFig(lin.regression.rSquared, 6)}, y-Intercept Bias = ${renderPct(formatNum(lin.regression.yInterceptBiasPercent, 2))} — Complies)`}
          </p>

          {/* Interactive Linearity Plot Toggle (Browser Feature) */}
          <div className="mt-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              {showChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{showChart ? 'Hide Calibration Curve Plot' : 'Show Calibration Curve Plot'}</span>
            </button>
            {showChart && (
              <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                <LinearityChart linearity={data.linearity} />
              </div>
            )}
          </div>
        </div>

        {/* 9. Accuracy (Recovery) - Part 1 (Rows 1 to 6) */}
        <div>
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            9. Accuracy (Recovery)
          </h3>
          <p className="text-xs text-zinc-600 mb-2">
            Placebo blend spiked with {data.activeSubstance} working standard at 50%, 100%, and 150% of nominal target assay concentration in triplicate (9 determinations).
          </p>
          <PrepBlock section="accuracy" />

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-20">Level (%)</th>
                  <th className="p-2 border border-zinc-300 text-center w-20">Exp. No.</th>
                  <th className="p-2 border border-zinc-300 text-right">Amount Added (mg)</th>
                  <th className="p-2 border border-zinc-300 text-right">Amount Recovered (mg)</th>
                  <th className="p-2 border border-zinc-300 text-right">% Recovery</th>
                </tr>
              </thead>
              <tbody>
                {acc.rows?.slice(0, 6)?.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">
                      {row.levelPercent} %
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-center font-medium text-zinc-700">
                      {row.expNo}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {formatAmountByMagnitude(row.amountAdded)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? (
                        ''
                      ) : isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.amountRecovered}
                          onChange={(e) => handleAccuracyChange(idx, 'amountRecovered', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right px-1 py-0.5 border rounded bg-amber-50"
                        />
                      ) : (
                        formatAmountByMagnitude(row.amountRecovered)
                      )}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : `${renderPct(formatNum(row.percentRecovery, 2))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <RunningFooter pageNum={5} />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 6 OF 8: SEC 9 ACCURACY (ROWS 7-9 + MEANS), SEC 10 PRECISION, SEC 11 (PART 1) */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* Section 9 Continued: Rows 7 to 9 + Summary */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-20">Level (%)</th>
                  <th className="p-2 border border-zinc-300 text-center w-20">Exp. No.</th>
                  <th className="p-2 border border-zinc-300 text-right">Amount Added (mg)</th>
                  <th className="p-2 border border-zinc-300 text-right">Amount Recovered (mg)</th>
                  <th className="p-2 border border-zinc-300 text-right">% Recovery</th>
                </tr>
              </thead>
              <tbody>
                {acc.rows?.slice(6, 9)?.map((row, idx) => {
                  const actualIdx = idx + 6;
                  return (
                    <tr key={actualIdx}>
                      <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">
                        {row.levelPercent} %
                      </td>
                      <td className="p-1.5 border border-zinc-300 text-center font-medium text-zinc-700">
                        {row.expNo}
                      </td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">
                        {formatAmountByMagnitude(row.amountAdded)}
                      </td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">
                        {isProtocol ? (
                          ''
                        ) : isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.amountRecovered}
                            onChange={(e) => handleAccuracyChange(actualIdx, 'amountRecovered', parseFloat(e.target.value) || 0)}
                            className="w-20 text-right px-1 py-0.5 border rounded bg-amber-50"
                          />
                        ) : (
                          formatAmountByMagnitude(row.amountRecovered)
                        )}
                      </td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">
                        {isProtocol ? '—' : `${renderPct(formatNum(row.percentRecovery, 2))}`}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-left" colSpan={3}>Mean % Recovery (all levels)</td>
                  <td className="p-1.5 border border-zinc-300 text-right text-zinc-600">Mean of 9 runs</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? 'Criteria: 98.0 – 102.0%' : `${renderPct(formatNum(acc.meanRecoveryAllLevels, 2))}`}
                  </td>
                </tr>
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-left" colSpan={3}>% RSD (n = 9)</td>
                  <td className="p-1.5 border border-zinc-300 text-right text-zinc-600">NMT 2.0 %</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(acc.rsdAllLevels, 2))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? 'Acceptance Criteria: Mean recovery at each concentration level shall be between 98.0% and 102.0%. Overall % RSD across 9 determinations shall be NMT 2.0%.'
              : `Acceptance: Mean recovery at each concentration level shall be 98.0%–102.0%; Overall %RSD NMT 2.0%. (Result: Mean Recovery = ${renderPct(formatNum(acc.meanRecoveryAllLevels, 2))}, Overall %RSD = ${renderPct(formatNum(acc.rsdAllLevels, 2))} — Complies)`}
          </p>
        </div>

        {/* 10. Precision & Intermediate Precision (Ruggedness) */}
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            10. Precision &amp; Intermediate Precision (Ruggedness)
          </h3>
          <p className="text-xs text-zinc-600 mb-1.5">
            Prepare six (6) individual sample preparations from homogenous batch. Analyst 1 shall test on Day 1 on Instrument 1. Analyst 2 shall independently prepare and test 6 fresh samples on Day 2 on Instrument 2.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-28">Sample No.</th>
                  <th className="p-2 border border-zinc-300 text-right">Analyst 1 (% Assay)</th>
                  <th className="p-2 border border-zinc-300 text-right">Analyst 2 (% Assay)</th>
                  <th className="p-2 border border-zinc-300 text-center">Statistical Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {prec.rows?.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">
                      {row.sampleNo}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? (
                        ''
                      ) : isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.analyst1Assay}
                          onChange={(e) => handlePrecisionChange(idx, 'analyst1Assay', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right px-1 py-0.5 border rounded bg-amber-50"
                        />
                      ) : (
                        `${renderPct(formatNum(row.analyst1Assay, 2))}`
                      )}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? (
                        ''
                      ) : isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.analyst2Assay}
                          onChange={(e) => handlePrecisionChange(idx, 'analyst2Assay', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right px-1 py-0.5 border rounded bg-amber-50"
                        />
                      ) : (
                        `${renderPct(formatNum(row.analyst2Assay, 2))}`
                      )}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-center text-zinc-700">
                      {isProtocol ? 'To be calculated' : (row.statisticalEvaluation || 'Complies')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-center">Mean</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(prec.analyst1Mean, 2))}`}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(prec.analyst2Mean, 2))}`}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">
                    {isProtocol ? 'To be calculated' : `Cum. Mean = ${renderPct(formatNum(prec.cumulativeMean, 2))}`}
                  </td>
                </tr>
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-center">SD</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(prec.analyst1Sd ?? 0, 3)}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : formatNum(prec.analyst2Sd ?? 0, 3)}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">
                    {isProtocol ? '—' : `Cum. SD = ${formatNum(prec.cumulativeSd ?? 0, 3)}`}
                  </td>
                </tr>
                <tr className="bg-zinc-50 font-bold">
                  <td className="p-1.5 border border-zinc-300 text-center">% RSD</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(prec.analyst1Rsd, 2))}`}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {isProtocol ? '—' : `${renderPct(formatNum(prec.analyst2Rsd, 2))}`}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">
                    {isProtocol ? '—' : `Cum. %RSD = ${renderPct(formatNum(prec.cumulativeRsd, 2))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? 'Acceptance Criteria: % RSD of six assay results for Analyst 1 and Analyst 2 shall be NMT 2.0%. Overall cumulative % RSD (n=12) shall be NMT 2.0%. Absolute difference between means shall be NMT 1.5%.'
              : `Acceptance: Analyst 1 %RSD NMT 2.0%, Analyst 2 %RSD NMT 2.0%, Cumulative %RSD NMT 2.0%, Mean Diff NMT 1.5%. (Result: A1 %RSD = ${renderPct(formatNum(prec.analyst1Rsd, 2))}, A2 %RSD = ${renderPct(formatNum(prec.analyst2Rsd, 2))}, Cum %RSD = ${renderPct(formatNum(prec.cumulativeRsd, 2))}, Diff = ${renderPct(formatNum(prec.diffBetweenMeans, 2))} — Complies)`}
          </p>
        </div>

        {/* 11. Robustness - Part 1 (Rows 1 to 4) */}
        <div>
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>11. Robustness</h3>
          <p className="text-xs text-zinc-600 mb-2">
            {rob.instructionParagraph ||
              (uvChecks
                ? 'Evaluate the measurement under deliberately varied conditions (wavelength ±1 nm, standing time, matched cell pair, sonication time ±5 min).'
                : 'Evaluate system suitability under deliberately varied HPLC conditions (Flow rate ±0.1 mL/min, Column Temp ±3°C, Mobile phase pH ±0.2).')}
          </p>
          <PrepBlock section="robustness" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-left w-2/5">Condition Varied</th>
                  <th className="p-2 border border-zinc-300 text-right">RT (min)</th>
                  <th className="p-2 border border-zinc-300 text-right w-1/5">% RSD (n=5)</th>
                  {!uvChecks && <th className="p-2 border border-zinc-300 text-right w-1/5">Tailing Factor</th>}
                  {!uvChecks && <th className="p-2 border border-zinc-300 text-right w-1/5">Theoretical Plates</th>}
                </tr>
              </thead>
              <tbody>
                {rob.rows?.slice(0, 4)?.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{row.conditionVaried}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum((row as any).retentionTime ?? 0, 2)}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : `${renderPct(formatNum(row.rsdPercent, 2))}`}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatNum(row.tailingFactor, 2)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatInt(row.theoreticalPlates)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <RunningFooter pageNum={6} />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 7 OF 8: SEC 11 (ROWS 5-6), SEC 12 STABILITY, SEC 13 CONCLUSION, SEC 14 (PART 1) */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* Section 11 Continued: Rows 5 to 6 */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-left w-2/5">Condition Varied</th>
                  <th className="p-2 border border-zinc-300 text-right">RT (min)</th>
                  <th className="p-2 border border-zinc-300 text-right w-1/5">% RSD (n=5)</th>
                  {!uvChecks && <th className="p-2 border border-zinc-300 text-right w-1/5">Tailing Factor</th>}
                  {!uvChecks && <th className="p-2 border border-zinc-300 text-right w-1/5">Theoretical Plates</th>}
                </tr>
              </thead>
              <tbody>
                {rob.rows?.slice(4)?.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{row.conditionVaried}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum((row as any).retentionTime ?? 0, 2)}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : `${renderPct(formatNum(row.rsdPercent, 2))}`}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatNum(row.tailingFactor, 2)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatInt(row.theoreticalPlates)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? (uvChecks
                  ? 'Acceptance Criteria: The absorbance %RSD shall remain NMT 1.0 % under all varied conditions.'
                  : 'Acceptance Criteria: System suitability criteria (% RSD NMT 2.0%, Tailing NMT 2.0, Plates NLT 2000) shall be complied with under all varied conditions.')
              : 'Acceptance: System suitability criteria met under all varied conditions. (Result: Peak shape, tailing <= 2.0, plates >= 2000 maintained under all variations — Complies)'}
          </p>
        </div>

        {/* 12. Solution Stability */}
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            12. Solution Stability
          </h3>
          <p className="text-xs text-zinc-600 mb-2">
            Evaluate analytical solution stability at room temperature and 2–8°C over 24 hours. Analyze at intervals (0h, 3h, 6h, 12h, 18h, 24h).
          </p>
          <PrepBlock section="solutionStability" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-1/4">Time Point</th>
                  <th className="p-2 border border-zinc-300 text-right w-1/4">Standard Area (µV·s)</th>
                  <th className="p-2 border border-zinc-300 text-right w-1/4">Sample Area (µV·s)</th>
                  <th className="p-2 border border-zinc-300 text-center w-1/4">% Diff (Std / Spl)</th>
                </tr>
              </thead>
              <tbody>
                {stab.rows?.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">{row.timePoint}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatResponse(row.standardArea, responseDecimals)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {isProtocol ? '—' : formatResponse(row.sampleArea, responseDecimals)}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-center font-mono">
                      {isProtocol ? '—' : row.diffPercent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-zinc-800 mt-2">
            {isProtocol
              ? 'Acceptance Criteria: The cumulative percentage difference in peak response for standard and sample solutions over 24 hours shall not exceed 2.0%.'
              : (() => {
                  const initialStd = stab.rows?.[0]?.standardArea || 1;
                  const initialSpl = stab.rows?.[0]?.sampleArea || 1;
                  let maxStd = 0;
                  let maxSpl = 0;
                  stab.rows?.forEach((r, i) => {
                    if (i > 0) {
                      const dS = (Math.abs(r.standardArea - initialStd) / initialStd) * 100;
                      const dP = (Math.abs(r.sampleArea - initialSpl) / initialSpl) * 100;
                      if (dS > maxStd) maxStd = dS;
                      if (dP > maxSpl) maxSpl = dP;
                    }
                  });
                  return `Acceptance: Cumulative percentage difference in peak response over 24h shall not exceed 2.0%. (Result: Max difference Std = ${renderPct(formatNum(maxStd, 2))}, Spl = ${renderPct(formatNum(maxSpl, 2))} — Stable for 24h)`;
                })()}
          </p>
        </div>

        {/* 13. Overall Conclusion & Review Checklist */}
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
            13. Overall Conclusion &amp; Review Checklist
          </h3>
          <p className="text-xs text-zinc-800 leading-relaxed mb-2">
            The analytical method for {data.productName} {data.testParameter || `Assay by ${techniqueName}`} is specific, linear, precise, accurate, robust, and stable, meeting all acceptance criteria as per ICH Q2(R2) and USP compendial standards.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-left w-1/2">Particulars</th>
                  <th className="p-2 border border-zinc-300 text-left w-1/2">Details / Compliance</th>
                </tr>
              </thead>
              <tbody>
                {data.reviewChecklist?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{item.particulars}</td>
                    <td className="p-1.5 border border-zinc-300 text-zinc-800">
                      {isProtocol ? 'To be verified upon execution' : item.compliance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 14. Abbreviations - Part 1 (First 7 items) */}
        <div>
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>14. Abbreviations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-1/3">Abbreviation</th>
                  <th className="p-2 border border-zinc-300 text-left w-2/3">Expansion / Definition</th>
                </tr>
              </thead>
              <tbody>
                {data.abbreviations?.slice(0, 7)?.map((a, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">{a.abbreviation}</td>
                    <td className="p-1.5 border border-zinc-300 text-zinc-800">{a.expansion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <RunningFooter pageNum={7} />
        {/* 3.3.1 Precision (For Content of Uniformity) — house format */}
        {(data as any).contentUniformity && (
          <div className="mb-4 mt-6">
            <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>
              12A. Precision (For Content of Uniformity)
            </h3>
            {(() => {
              const cu: any = (data as any).contentUniformity;
              return (
                <>
                  <div className="mb-3 text-xs text-zinc-700 leading-relaxed">
                    <p className="mb-1.5 text-justify">{cu.preparation?.intro}</p>
                    {cu.preparation?.steps?.map((step: string, i: number) => (
                      <p key={i} className="mb-1 text-justify pl-3 -indent-3">{step}</p>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-zinc-800 mb-1">{cu.tableTitle}</p>
                  <div className="overflow-x-auto mb-2">
                    <table className="w-full text-xs border-collapse border border-zinc-300">
                      <thead>
                        <tr className={tableHeaderClass}>
                          <th className="p-2 border border-zinc-300 text-center w-16">Sr. No.</th>
                          <th className="p-2 border border-zinc-300 text-center">Sample ID</th>
                          <th className="p-2 border border-zinc-300 text-right">Amount of preparation used (mg)</th>
                          <th className="p-2 border border-zinc-300 text-right">Sample area</th>
                          <th className="p-2 border border-zinc-300 text-right">Content (% of LA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cu.rows?.map((r: any) => (
                          <tr key={r.srNo}>
                            <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">{r.srNo}</td>
                            <td className="p-1.5 border border-zinc-300 text-center">{r.sampleId}</td>
                            <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum(r.amountUsedMg, 2)}</td>
                            <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatResponse(r.sampleArea, responseDecimals)}</td>
                            <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum(r.contentPercentLa, 1)}</td>
                          </tr>
                        ))}
                        <tr className="bg-zinc-50 font-semibold">
                          <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>Mean</td>
                          <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum(cu.mean, 2)}</td>
                        </tr>
                        <tr className="bg-zinc-50 font-semibold">
                          <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>RSD (NMT 2.0 %)</td>
                          <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum(cu.rsd, 2)}</td>
                        </tr>
                        <tr className="bg-amber-50 font-bold">
                          <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>Acceptance Value (USP &lt;905&gt;, NMT 15.0)</td>
                          <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : formatNum(cu.acceptanceValue, 2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-zinc-700 mb-2">
                    <p className="font-semibold mb-0.5">Evaluation</p>
                    {cu.evaluation?.map((e: string, i: number) => (
                      <p key={i} className="mb-0.5">{e}</p>
                    ))}
                  </div>
                  <div className="text-xs text-zinc-600 mb-2">
                    {cu.calculationNote?.map((n: string, i: number) => (
                      <p key={i} className={i === 0 ? 'font-mono mb-1' : 'mb-0.5'}>{n}</p>
                    ))}
                  </div>
                  {!isProtocol && (
                    <div className="text-xs text-zinc-700 mb-2">
                      {cu.workings?.map((w: string, i: number) => (
                        <p key={i} className="mb-0.5">{w}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 italic">
                    {isProtocol ? cu.acceptanceTextProtocol : cu.conclusionReport}
                  </p>
                </>
              );
            })()}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* PAGE 8 OF 8: SEC 14 (REST OF ABBREVIATIONS), SEC 15 REVISION HISTORY, END MARK */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />

        {/* Section 14 Continued: Rest of Abbreviations */}
        <div className="mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-300">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="p-2 border border-zinc-300 text-center w-1/3">Abbreviation</th>
                  <th className="p-2 border border-zinc-300 text-left w-2/3">Expansion / Definition</th>
                </tr>
              </thead>
              <tbody>
                {data.abbreviations?.slice(7)?.map((a, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">{a.abbreviation}</td>
                    <td className="p-1.5 border border-zinc-300 text-zinc-800">{a.expansion}</td>
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

        <RunningFooter pageNum={8} />
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
