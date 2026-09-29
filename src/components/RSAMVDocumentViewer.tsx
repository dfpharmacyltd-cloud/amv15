import React, { useState } from 'react';
import { RSAMVDocumentData, DocumentType, ThemeFormat, FontFamilyType, FontSizePt, DataMode, FooterSignOffData } from '../types';
import { Download, Printer, Edit3, Layers, CheckCircle2, FileSpreadsheet, Calendar } from 'lucide-react';
import { FontAndSizeControl } from './FontAndSizeControl';
import { SignOffFooter, DEFAULT_FOOTER_SIGN_OFF } from './SignOffFooter';
import { FooterDateModal } from './FooterDateModal';
import { generateAndDownloadRSAMVDocx } from '../services/rsDocxGenerator';

interface RSAMVDocumentViewerProps {
  data: RSAMVDocumentData;
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
  onUpdateData?: (updated: RSAMVDocumentData) => void;
  footerSignOffData?: FooterSignOffData;
  onUpdateFooterSignOffData?: (data: FooterSignOffData) => void;
}

export const RSAMVDocumentViewer: React.FC<RSAMVDocumentViewerProps> = ({
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

  const tableHeaderClass = isBlue
    ? 'bg-[#1F4E79] text-white font-bold border-[#1F4E79]'
    : 'bg-zinc-100 text-zinc-900 font-bold border-zinc-300';

  const sectionHeadingClass = isBlue
    ? 'text-[#1F4E79] border-[#1F4E79]'
    : 'text-zinc-900 border-zinc-800';

  const runningHeader = (
    <div className="flex justify-between items-center pb-2 mb-4 border-b border-zinc-300 text-[11px] text-zinc-500 font-sans">
      <span className="font-semibold text-zinc-700">{data.companyName}</span>
      <span>
        {isProtocol ? 'AMV Protocol' : 'AMV Report'} (Related Substances) – {data.productName} | Doc No. {data.protocolNo}
      </span>
    </div>
  );

  const runningFooter = (pageNum: number) => (
    <SignOffFooter
      pageNum={pageNum}
      totalPages={7}
      dataMode={dataMode}
      footerData={activeFooterData}
      onUpdateFooterData={handleUpdateFooter}
    />
  );

  return (
    <div style={fontStyle} className="space-y-6 text-zinc-900">
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
              RS Protocol
            </button>
            <button
              type="button"
              onClick={() => onDocTypeChange('report')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                docType === 'report' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              RS Report
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
            <button
              type="button"
              onClick={() => onThemeChange('westcoast')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'westcoast'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Westcoast Format
            </button>
          </div>

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
          <button
            type="button"
            onClick={() => {
              generateAndDownloadRSAMVDocx(data, {
                docType,
                theme: 'westcoast',
                fontFamily: 'Times New Roman',
                fontSize: 12,
                dataMode: dataMode as ('TEMPLATE' | 'DEMO'),
                footerSignOffData: activeFooterData,
              });
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-amber-700 hover:bg-amber-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download authentic Westcoast format Word .docx (exact match to PDF)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Westcoast Format (.docx)</span>
          </button>
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
            title="Download Word .docx for RS Protocol"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>RS Protocol (.docx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadReport}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-1.5"
            title="Download Word .docx for RS Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>RS Report (.docx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadBoth}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 transition-colors flex items-center gap-1.5"
            title="Download Both in one click"
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
      {/* PAGE 1: MASTHEAD, METADATA, 4-COL APPROVALS, SEC 1, 2, 3 */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <div className="text-center pb-1 pt-1">
          <h1 className={`text-xl sm:text-2xl font-bold uppercase tracking-wide ${sectionHeadingClass}`}>
            {data.companyName}
          </h1>
          <h2 className={`text-sm sm:text-base font-bold uppercase tracking-wider mt-2 ${sectionHeadingClass}`}>
            {isProtocol
              ? 'ANALYTICAL METHOD VALIDATION PROTOCOL'
              : 'ANALYTICAL METHOD VALIDATION REPORT'}
          </h2>
          <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mt-1">
            {data.subTitle}
          </h3>
          {dataMode === 'DEMO' && (
            <div className="inline-block mt-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded text-amber-900 font-bold text-xs tracking-wider uppercase">
              DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE
            </div>
          )}
        </div>

        <div className={`w-full h-1 my-3 ${isBlue ? 'bg-[#1F4E79]' : 'bg-zinc-800'}`}></div>

        {/* Metadata Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <tbody>
              <tr>
                <td className="w-1/3 bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">
                  {isProtocol ? 'Protocol No.' : 'Report No.'}
                </td>
                <td className="w-2/3 border border-zinc-300 px-3 py-1.5 font-mono font-bold text-zinc-900">
                  {isProtocol ? data.protocolNo : (data.reportNo || data.protocolNo.replace('/AMV/', '/AMVR/'))}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">
                  {isProtocol ? 'Protocol Date' : 'Report Date'}
                </td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">
                  {isProtocol ? data.protocolDate : data.reportDate}
                </td>
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
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">
                  {isProtocol ? 'Batch No. to be used' : 'Batch No. used'}
                </td>
                <td className="border border-zinc-300 px-3 py-1.5 font-mono font-bold text-zinc-900">
                  {isProtocol ? '—' : data.batchNoUsed}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4-Person Sign-Off Table (Strict Matching PDF) */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-2 border border-zinc-300 text-center w-1/4">Prepared By</th>
                <th className="p-2 border border-zinc-300 text-center w-1/4">Checked By</th>
                <th className="p-2 border border-zinc-300 text-center w-1/4">Reviewed By</th>
                <th className="p-2 border border-zinc-300 text-center w-1/4">Authorised By</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-zinc-300 text-xs align-top space-y-1">
                  <div><span className="font-bold">Designation:</span> {data.signOffs?.preparedBy?.designation}</div>
                  <div><span className="font-bold">Name:</span> {data.signOffs?.preparedBy?.name}</div>
                  <div><span className="font-bold">Sign/Date:</span> {isProtocol ? `${data.signOffs?.preparedBy?.name} / ${data.signOffs?.preparedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.preparedBy?.name} / ${data.signOffs?.preparedBy?.dateReport || data.signOffs?.preparedBy?.date}`}</div>
                </td>
                <td className="p-2 border border-zinc-300 text-xs align-top space-y-1">
                  <div><span className="font-bold">Designation:</span> {data.signOffs?.checkedBy?.designation}</div>
                  <div><span className="font-bold">Name:</span> {data.signOffs?.checkedBy?.name}</div>
                  <div><span className="font-bold">Sign/Date:</span> {isProtocol ? `${data.signOffs?.checkedBy?.name} / ${data.signOffs?.checkedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.checkedBy?.name} / ${data.signOffs?.checkedBy?.dateReport || data.signOffs?.checkedBy?.date}`}</div>
                </td>
                <td className="p-2 border border-zinc-300 text-xs align-top space-y-1">
                  <div><span className="font-bold">Designation:</span> {data.signOffs?.reviewedBy?.designation}</div>
                  <div><span className="font-bold">Name:</span> {data.signOffs?.reviewedBy?.name}</div>
                  <div><span className="font-bold">Sign/Date:</span> {isProtocol ? `${data.signOffs?.reviewedBy?.name} / ${data.signOffs?.reviewedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.reviewedBy?.name} / ${data.signOffs?.reviewedBy?.dateReport || data.signOffs?.reviewedBy?.date}`}</div>
                </td>
                <td className="p-2 border border-zinc-300 text-xs align-top space-y-1">
                  <div><span className="font-bold">Designation:</span> {data.signOffs?.authorisedBy?.designation}</div>
                  <div><span className="font-bold">Name:</span> {data.signOffs?.authorisedBy?.name}</div>
                  <div><span className="font-bold">Sign/Date:</span> {isProtocol ? `${data.signOffs?.authorisedBy?.name} / ${data.signOffs?.authorisedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.authorisedBy?.name} / ${data.signOffs?.authorisedBy?.dateReport || data.signOffs?.authorisedBy?.date}`}</div>
                </td>
              </tr>
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
                { srNo: '3.0', title: 'Reference and Validation Details', pageNo: 'Page 1' },
                { srNo: '4.0', title: 'Analytical Method Summary (4.1 Conditions, 4.2 Gradient, 4.3 Prep, 4.4 Formulae)', pageNo: 'Page 2' },
                { srNo: '4.6', title: 'Reagents, Reference Standards & Analytical Equipment', pageNo: 'Page 2' },
                { srNo: '5.0', title: 'Validation Parameters and Acceptance Criteria', pageNo: 'Page 3' },
                { srNo: '6.0', title: 'System Suitability Test (SST & Resolution)', pageNo: 'Page 3' },
                { srNo: '7.0', title: 'Specificity / Placebo Interference & Forced Degradation', pageNo: 'Page 3' },
                { srNo: '8.0', title: 'Linearity and Range (LOQ to 150 % of specification limit)', pageNo: 'Page 4' },
                { srNo: '9.0', title: 'Limit of Detection (LOD) & Limit of Quantitation (LOQ)', pageNo: 'Page 4' },
                { srNo: '10.0', title: 'Method Precision (Repeatability, n = 6)', pageNo: 'Page 4' },
                { srNo: '11.0', title: 'Intermediate Precision / Ruggedness (Analyst-to-Analyst)', pageNo: 'Page 5' },
                { srNo: '12.0', title: 'Accuracy / Recovery (LOQ, 50 %, 100 %, 150 % Levels)', pageNo: 'Page 5' },
                { srNo: '13.0', title: 'Robustness (Flow Rate, Temperature, Mobile Phase, Wavelength)', pageNo: 'Page 6' },
                { srNo: '14.0', title: 'Stability of Analytical Solutions (Standard & Sample)', pageNo: 'Page 6' },
                { srNo: '15.0', title: 'Overall Conclusion', pageNo: 'Page 6' },
                { srNo: '16.0', title: 'Review Checklist & Completion Record', pageNo: 'Page 7' },
                { srNo: '17.0', title: 'List of Abbreviations & Document Revision History', pageNo: 'Page 7' },
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
          <p className="text-xs text-zinc-800 leading-relaxed whitespace-pre-line">{data.objective}</p>
        </div>

        {/* 2. Scope */}
        <div className="mb-3">
          <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>2. Scope</h3>
          <p className="text-xs text-zinc-800 leading-relaxed">{data.scope}</p>
        </div>

        {/* 3. Reference and Validation Details */}
        <div className="mb-2">
          <h3 className={`text-xs font-bold uppercase mb-1.5 ${sectionHeadingClass}`}>
            3. Reference and Validation Details
          </h3>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <tbody>
              <tr>
                <td className="w-1/4 bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Reference</td>
                <td className="border border-zinc-300 px-3 py-1 text-zinc-800">{data.referenceDetails.reference}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">(a) Type of study</td>
                <td className="border border-zinc-300 px-3 py-1 text-zinc-800">{data.referenceDetails.typeOfStudy}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">(b) Test to be validated</td>
                <td className="border border-zinc-300 px-3 py-1 text-zinc-800">{data.referenceDetails.testToBeValidated}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">(c) Validation team</td>
                <td className="border border-zinc-300 px-3 py-1 text-zinc-800">{data.referenceDetails.validationTeam}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">(d) Experimental details</td>
                <td className="border border-zinc-300 px-3 py-1 text-zinc-800">{data.referenceDetails.experimentalDetails}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {runningFooter(1)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: SEC 4. ANALYTICAL METHOD SUMMARY (4.1, 4.2, 4.3, 4.4, 4.5) */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {runningHeader}
        <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
          4. Analytical Method Summary
        </h2>

        {/* 4.1 Chromatographic Conditions - Narrative Paragraph Format (No Table) */}
        <div className="mb-3">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">4.1 Chromatographic Conditions</h3>
          <div className="text-xs text-zinc-800 leading-relaxed space-y-2 p-3.5 bg-zinc-50 border border-zinc-300 rounded">
            <p className="text-justify">
              Chromatographic analysis of Related Substances (Organic Impurities) is performed utilizing an <strong>Instrument / Detector:</strong> {data.methodSummary.chromatographicConditions.instrumentDetector || 'HPLC System equipped with UV/PDA Detector'}. Chromatographic separation is achieved using a stationary phase consisting of <strong>Column (Stationary Phase):</strong> {data.methodSummary.chromatographicConditions.column}. The mobile phase system employed is <strong>Mobile Phase:</strong> {data.methodSummary.chromatographicConditions.mobilePhase || data.methodSummary.chromatographicConditions.carrierGasOrMobilePhase || 'Phosphate Buffer : Acetonitrile'}. The chromatographic system operates at a steady <strong>Flow Rate:</strong> {data.methodSummary.chromatographicConditions.flowRate || data.methodSummary.chromatographicConditions.injectionTempOrFlowRate || '1.0 mL/min'}, with spectrophotometric monitoring performed at a <strong>Detection Wavelength:</strong> {data.methodSummary.chromatographicConditions.wavelength || data.methodSummary.chromatographicConditions.detectorTempOrWavelength || '210 nm'}.
            </p>
            <p className="text-justify">
              Stationary phase temperature is maintained at a <strong>Column Temperature:</strong> {data.methodSummary.chromatographicConditions.columnTemperature || '30 °C'}. Sample introduction is performed with an <strong>Injection Volume:</strong> of {data.methodSummary.chromatographicConditions.injectionVolume}. The total chromatographic <strong>Run Time:</strong> is established at {data.methodSummary.chromatographicConditions.totalRunTime}. Standard and test preparations are dissolved and diluted in <strong>Diluent:</strong> {data.methodSummary.chromatographicConditions.diluent}. The method establishes an <strong>Internal Standard:</strong> of {data.methodSummary.chromatographicConditions.internalStandard || 'N/A (External Standard Method)'} with relative retention established as <strong>Relative Retention:</strong> {data.methodSummary.chromatographicConditions.relativeRetention || 'Specified per impurity monograph relative to main active analyte peak'}.
            </p>
          </div>
        </div>

        {/* 4.2 Mobile Phase / Gradient Programme */}
        <div className="mb-3">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">4.2 Mobile Phase / Gradient Programme</h3>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center">Time (minutes)</th>
                <th className="p-1.5 border border-zinc-300 text-center">Mobile Phase Composition / Condition</th>
                <th className="p-1.5 border border-zinc-300 text-left">Comment</th>
              </tr>
            </thead>
            <tbody>
              {data.methodSummary.ovenProgramme?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.timeRange}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{row.temperature}</td>
                  <td className="p-1.5 border border-zinc-300 text-left text-zinc-700">{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4.3 Preparation of Solutions */}
        <div className="mb-3">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">4.3 Preparation of Solutions</h3>
          <div className="text-xs text-zinc-800 space-y-1.5 bg-zinc-50 p-3 rounded-sm border border-zinc-200">
            <div><span className="font-bold">Solution (1) — Internal Standard Solution:</span> {data.methodSummary.solutionPreparation.internalStandard}</div>
            <div><span className="font-bold">Solution (2) — Test Solution:</span> {data.methodSummary.solutionPreparation.testSolution}</div>
            <div><span className="font-bold">Solution (3) — Reference Solution:</span> {data.methodSummary.solutionPreparation.referenceSolution}</div>
            <div><span className="font-bold">Solution (4) — System Suitability Solution:</span> {data.methodSummary.solutionPreparation.systemSuitabilitySolution}</div>
            <div><span className="font-bold">Blank:</span> {data.methodSummary.solutionPreparation.blank}</div>
            <div><span className="font-bold">Placebo Solution:</span> {data.methodSummary.solutionPreparation.placeboSolution}</div>
            <div className="text-zinc-600 italic"><span className="font-bold not-italic">Handling Note:</span> {data.methodSummary.solutionPreparation.handlingNote}</div>
          </div>
        </div>

        {/* 4.4 Limits (as per the monograph) */}
        <div className="mb-3">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">4.4 Limits (as per the monograph)</h3>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-left">Criterion</th>
                <th className="p-1.5 border border-zinc-300 text-center w-1/3">Limit</th>
              </tr>
            </thead>
            <tbody>
              {data.methodSummary.monographLimits?.map((lim, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-zinc-800">{lim.criterion}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold text-zinc-900">{lim.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4.5 Requirements */}
        <div className="mb-2">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">4.5 Requirements (Reagents &amp; Consumables)</h3>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-left">Name of Material</th>
                <th className="p-1.5 border border-zinc-300 text-left">Grade</th>
                <th className="p-1.5 border border-zinc-300 text-left">Make</th>
                <th className="p-1.5 border border-zinc-300 text-center">Batch No.</th>
              </tr>
            </thead>
            <tbody>
              {data.methodSummary.requirements?.map((req, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{req.name}</td>
                  <td className="p-1.5 border border-zinc-300 text-zinc-700">{req.grade}</td>
                  <td className="p-1.5 border border-zinc-300 text-zinc-700">{req.make}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono text-zinc-800">{req.batchNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {runningFooter(2)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: SEC 5. CRITERIA & SEC 6. SYSTEM SUITABILITY & SEC 7. SPECIFICITY */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {runningHeader}
        
        {/* 5. Validation Parameters Acceptance Criteria */}
        <div className="mb-4">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            5. Validation Parameters — Acceptance Criteria
          </h2>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-12">Sr.</th>
                <th className="p-1.5 border border-zinc-300 text-left w-36">Parameter</th>
                <th className="p-1.5 border border-zinc-300 text-left">Acceptance Criteria</th>
                <th className="p-1.5 border border-zinc-300 text-left w-48">
                  {isProtocol ? 'Execution Status' : 'Observed Result / Compliance'}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.validationParameters?.map((p, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{p.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{p.parameter}</td>
                  <td className="p-1.5 border border-zinc-300 text-zinc-700">{p.acceptanceCriteria}</td>
                  <td className="p-1.5 border border-zinc-300 font-medium text-emerald-800">
                    {isProtocol ? '—' : p.resultRemark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 6. System Suitability */}
        <div className="mb-4">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            6. System Suitability
          </h2>
          <PrepBlock section="systemSuitability" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-14">Sr. No.</th>
                <th className="p-1.5 border border-zinc-300 text-center">Working Standard Weight (mg)</th>
                <th className="p-1.5 border border-zinc-300 text-right">Peak Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">Tailing Factor</th>
                <th className="p-1.5 border border-zinc-300 text-center">Theoretical Plates</th>
                <th className="p-1.5 border border-zinc-300 text-left">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.systemSuitability.injections?.map((inj, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{inj.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : inj.weightMg}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono font-semibold">
                    {isProtocol ? '—' : inj.peakArea.toLocaleString('en-US', { useGrouping: false })}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">
                    {isProtocol ? '—' : (inj.tailingFactor ?? '1.12')}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">
                    {isProtocol ? '—' : typeof inj.theoreticalPlates === 'number' ? inj.theoreticalPlates.toLocaleString('en-US', { useGrouping: false }) : (inj.theoreticalPlates ?? '4,850')}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-left text-zinc-600">{isProtocol ? '—' : inj.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* SS Stats Summary */}
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <tbody>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Mean Peak Area</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? '—' : data.systemSuitability.stats.meanArea.toLocaleString('en-US', { useGrouping: false })}
                </td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">% RSD of Peak Area</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: NMT 2.0 %' : `${renderPct(data.systemSuitability.stats.rsdArea)} (Limit: NMT 2.0 %)`}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Tailing Factor (T)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: NMT 2.0' : `${data.systemSuitability.stats.tailingFactor} (Limit: NMT 2.0)`}
                </td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Theoretical Plates (N)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol
                    ? `Limit: ${data.systemSuitability.stats.theoreticalPlatesCriteria || 'NLT 1500'}`
                    : `${data.systemSuitability.stats.theoreticalPlates} (Limit: ${data.systemSuitability.stats.theoreticalPlatesCriteria || 'NLT 1500'})`}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Resolution (Rs)</td>
                <td colSpan={3} className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: NLT 2.0' : `${data.systemSuitability.stats.resolution} (Limit: NLT 2.0)`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.systemSuitability.stats.conclusionProtocol : data.systemSuitability.stats.conclusionReport}
          </p>
        </div>

        {/* 7. Specificity */}
        <div className="mb-2">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            7. Specificity (Interference Study)
          </h2>
          <PrepBlock section="specificity" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-left">Solution</th>
                <th className="p-1.5 border border-zinc-300 text-center">Retention Time</th>
                <th className="p-1.5 border border-zinc-300 text-right">Peak Area</th>
                <th className="p-1.5 border border-zinc-300 text-left">Interference Observed</th>
              </tr>
            </thead>
            <tbody>
              {data.specificity.rows?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{row.solution}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : row.retentionTime}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : row.peakArea}</td>
                  <td className="p-1.5 border border-zinc-300 text-left text-zinc-700">{isProtocol ? '—' : row.interferenceObserved}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.specificity.conclusionProtocol : data.specificity.conclusionReport}
          </p>
        </div>

        {runningFooter(3)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4: SEC 8. LINEARITY & RANGE & SEC 9. PRECISION */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {runningHeader}
        <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
          8. Linearity and Range
        </h2>

        {/* 8.1 Linearity */}
        <div className="mb-3">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">8.1 Linearity (5 Levels: 50% to 150%)</h3>
          <PrepBlock section="linearityAndRange" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-left">Level</th>
                <th className="p-1.5 border border-zinc-300 text-center">Nominal (ppm)</th>
                <th className="p-1.5 border border-zinc-300 text-center">Weight (mg)</th>
                <th className="p-1.5 border border-zinc-300 text-center">Final Dilution</th>
                <th className="p-1.5 border border-zinc-300 text-right">Mean Peak Area</th>
              </tr>
            </thead>
            <tbody>
              {data.linearityAndRange.linearityLevels?.map((lvl, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{lvl.levelName}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{lvl.nominalPpm}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : lvl.weightTakenMg}</td>
                  <td className="p-1.5 border border-zinc-300 text-center">{lvl.finalDilution}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono font-semibold">
                    {isProtocol ? '—' : Number(lvl.meanArea).toLocaleString('en-US', { useGrouping: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Regression Parameters */}
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <tbody>
              <tr>
                <td className="w-1/3 bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">
                  Correlation Coefficient (r²)
                </td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: ≥ 0.995' : `${data.linearityAndRange.regression.rSquared} (Limit: ≥ 0.995)`}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Slope (S)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono text-zinc-900">
                  {isProtocol ? '—' : data.linearityAndRange.regression.slope}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">y-Intercept (c)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono text-zinc-900">
                  {isProtocol ? '—' : data.linearityAndRange.regression.yIntercept}
                </td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">
                  Residual SD of y-intercepts
                </td>
                <td className="border border-zinc-300 px-3 py-1 font-mono text-zinc-900">
                  {isProtocol ? '—' : data.linearityAndRange.regression.sdYIntercepts}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.linearityAndRange.regression.conclusionProtocol : data.linearityAndRange.regression.conclusionReport}
          </p>
        </div>

        {/* 8.2 Range */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-zinc-800 mb-1">8.2 Range (Triplicate at 75% and 125%)</h3>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-12">Sr.</th>
                <th className="p-1.5 border border-zinc-300 text-center">Level (ppm)</th>
                <th className="p-1.5 border border-zinc-300 text-left">Sample ID</th>
                <th className="p-1.5 border border-zinc-300 text-right">Peak Area</th>
              </tr>
            </thead>
            <tbody>
              {data.linearityAndRange.rangeRows?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{row.levelPpm}</td>
                  <td className="p-1.5 border border-zinc-300 text-left font-mono">{row.sampleId}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono font-semibold">
                    {isProtocol ? '—' : Number(row.peakArea).toLocaleString('en-US', { useGrouping: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.linearityAndRange.rangeConclusionProtocol : data.linearityAndRange.rangeConclusionReport}
          </p>
        </div>

        {/* 9. Precision (Repeatability) */}
        <div className="mb-2">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            9. Precision (Repeatability — 6 Determinations)
          </h2>
          <PrepBlock section="precision" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-12">Sr. No.</th>
                <th className="p-1.5 border border-zinc-300 text-left">Sample ID</th>
                <th className="p-1.5 border border-zinc-300 text-center">Volume Used</th>
                <th className="p-1.5 border border-zinc-300 text-right">Peak Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">Content (% of LA)</th>
              </tr>
            </thead>
            <tbody>
              {data.precision.rows?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 font-mono font-semibold">{row.sampleId}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.volumeUsed}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono font-semibold">
                    {isProtocol ? '—' : Number(row.peakArea).toLocaleString('en-US', { useGrouping: false })}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono font-bold text-zinc-900">
                    {isProtocol ? '—' : `${renderPct(row.contentPercentLa)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Precision Stats */}
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <tbody>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Mean Content (% of LA)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? '—' : `${renderPct(data.precision.stats.meanContent)}`}
                </td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">% RSD of Content</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: NMT 2.0 %' : `${renderPct(data.precision.stats.rsd)} (Limit: NMT 2.0 %)`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.precision.stats.conclusionProtocol : data.precision.stats.conclusionReport}
          </p>
        </div>

        {runningFooter(4)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 5: SEC 10. LOD & LOQ & SEC 11. INTERMEDIATE PRECISION */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {runningHeader}

        {/* 10. Limit of Detection and Limit of Quantitation */}
        <div className="mb-4">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            10. Limit of Detection (LOD) and Limit of Quantitation (LOQ)
          </h2>
          <p className="text-xs text-zinc-600 mb-2">
            Formulae: LOD = 3.3 × (SD / S) and LOQ = 10 × (SD / S), where SD = residual standard deviation of y-intercepts and S = slope.
          </p>

          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-12">Sr.</th>
                <th className="p-1.5 border border-zinc-300 text-left">Level</th>
                <th className="p-1.5 border border-zinc-300 text-center">Concentration (ppm)</th>
                <th className="p-1.5 border border-zinc-300 text-right">Peak Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">S/N Ratio</th>
              </tr>
            </thead>
            <tbody>
              {data.lodLoq.confirmationRows?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-900">{row.level}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : row.concentrationPpm}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : Number(row.peakArea).toLocaleString('en-US', { useGrouping: false })}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono font-bold text-zinc-900">
                    {isProtocol ? (row.level === 'LOD' ? 'Criteria: S/N ≥ 3' : 'Criteria: S/N ≥ 10') : `${row.snRatio}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xs font-bold text-zinc-800 mb-1">Precision at LOQ Level (6 Replicates)</h3>
          <PrepBlock section="lodLoq" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-12">Sr. No.</th>
                <th className="p-1.5 border border-zinc-300 text-right">Peak Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">Content (% of LA)</th>
                <th className="p-1.5 border border-zinc-300 text-left">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.lodLoq.loqPrecisionRows?.map((r, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{r.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : Number(r.peakArea).toLocaleString('en-US', { useGrouping: false })}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : `${renderPct(r.contentPercentLa)}`}</td>
                  <td className="p-1.5 border border-zinc-300 text-left text-zinc-600">{isProtocol ? '—' : r.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.lodLoq.loqStats.conclusionProtocol : data.lodLoq.loqStats.conclusionReport}
          </p>
        </div>

        {/* 11. Intermediate Precision */}
        <div className="mb-2">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            11. Intermediate Precision (Analyst 1 vs. Analyst 2)
          </h2>
          <PrepBlock section="intermediatePrecision" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-10">Sr.</th>
                <th className="p-1.5 border border-zinc-300 text-center">Analyst 1 Vol</th>
                <th className="p-1.5 border border-zinc-300 text-right">Analyst 1 Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">Analyst 1 % LA</th>
                <th className="p-1.5 border border-zinc-300 text-center">Analyst 2 Vol</th>
                <th className="p-1.5 border border-zinc-300 text-right">Analyst 2 Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">Analyst 2 % LA</th>
              </tr>
            </thead>
            <tbody>
              {data.intermediatePrecision.rows?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.analyst1Volume}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : Number(row.analyst1Area).toLocaleString('en-US', { useGrouping: false })}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : `${renderPct(row.analyst1Content)}`}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.analyst2Volume}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : Number(row.analyst2Area).toLocaleString('en-US', { useGrouping: false })}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : `${renderPct(row.analyst2Content)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Intermediate Precision Stats */}
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <tbody>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Analyst 1 Mean (% of LA)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.analyst1Mean)}`}</td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Analyst 1 % RSD</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">{isProtocol ? 'Limit: NMT 2.0 %' : `${renderPct(data.intermediatePrecision.stats.analyst1Rsd)}`}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Analyst 2 Mean (% of LA)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.analyst2Mean)}`}</td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Analyst 2 % RSD</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">{isProtocol ? 'Limit: NMT 2.0 %' : `${renderPct(data.intermediatePrecision.stats.analyst2Rsd)}`}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Cumulative Mean (n = 12)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">{isProtocol ? '—' : `${renderPct(data.intermediatePrecision.stats.cumulativeMean)}`}</td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Cumulative % RSD (n = 12)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">{isProtocol ? 'Limit: NMT 2.0 %' : `${renderPct(data.intermediatePrecision.stats.cumulativeRsd)} (Limit: NMT 2.0 %)`}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.intermediatePrecision.stats.conclusionProtocol : data.intermediatePrecision.stats.conclusionReport}
          </p>
        </div>

        {runningFooter(5)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 6: SEC 12. ACCURACY & SEC 13. OVERALL CONCLUSION */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {runningHeader}

        {/* 12. Accuracy (Recovery) */}
        <div className="mb-4">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            12. Accuracy (Recovery — 3 Levels in Triplicate)
          </h2>
          <PrepBlock section="accuracy" />
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-center w-12">Sr.</th>
                <th className="p-1.5 border border-zinc-300 text-center">Spike Level (%)</th>
                <th className="p-1.5 border border-zinc-300 text-center">Spiked (mg)</th>
                <th className="p-1.5 border border-zinc-300 text-right">Sample Area</th>
                <th className="p-1.5 border border-zinc-300 text-center">Recovered (mg)</th>
                <th className="p-1.5 border border-zinc-300 text-center">% Recovery</th>
              </tr>
            </thead>
            <tbody>
              {data.accuracy.rows?.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{row.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{row.levelPpm} % ({Math.round((row.levelPpm / 100) * (data.linearityAndRange.linearityLevels[2]?.nominalPpm || 300))} ppm)</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : row.standardSpikedMg}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{isProtocol ? '—' : Number(row.sampleArea).toLocaleString('en-US', { useGrouping: false })}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono">{isProtocol ? '—' : row.amountRecoveredMg}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono font-bold text-zinc-900">
                    {isProtocol ? '—' : `${renderPct(row.percentRecovery)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Level Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            {data.accuracy.stats.levelStats?.map((st) => (
              <div key={st.levelPpm} className="bg-zinc-50 border border-zinc-200 p-2 rounded text-xs">
                <div className="font-bold text-zinc-700">{Math.round((st.levelPpm / (data.linearityAndRange.linearityLevels[2]?.nominalPpm || 300)) * 100)} % Level ({st.levelPpm} ppm)</div>
                <div>Mean Recovery: <span className="font-mono font-semibold">{isProtocol ? 'Criteria: 98.0 – 102.0 %' : `${renderPct(st.meanRecovery)}`}</span></div>
                <div>% RSD: <span className="font-mono font-semibold">{isProtocol ? 'Criteria: ≤ 2.0 %' : `${renderPct(st.rsdRecovery)}`}</span></div>
              </div>
            ))}
          </div>

          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <tbody>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Overall Mean Recovery (n = 9)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: 98.0 – 102.0 %' : `${renderPct(data.accuracy.stats.overallMeanRecovery)} (Limit: 98.0 – 102.0 %)`}
                </td>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1 text-zinc-700">Overall % RSD (n = 9)</td>
                <td className="border border-zinc-300 px-3 py-1 font-mono font-bold text-zinc-900">
                  {isProtocol ? 'Limit: NMT 2.0 %' : `${renderPct(data.accuracy.stats.overallRsd)} (Limit: NMT 2.0 %)`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs font-semibold text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
            {isProtocol ? data.accuracy.stats.conclusionProtocol : data.accuracy.stats.conclusionReport}
          </p>
        </div>

        {/* 13. Overall Conclusion */}
        <div className="mb-2">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            13. Overall Conclusion
          </h2>
          <div className="text-xs text-zinc-800 leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-200 whitespace-pre-line">
            {isProtocol ? data.overallConclusionProtocol : data.overallConclusionReport}
          </div>
        </div>

        {runningFooter(6)}
      </div>

      {/* ========================================================================= */}
      {/* PAGE 7: SEC 14. COMPLETION RECORD, SEC 15. ABBREVIATIONS, SEC 16. REVISION */}
      {/* ========================================================================= */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {runningHeader}

        {/* 14. Completion Record */}
        <div className="mb-4">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            14. Completion Record
          </h2>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-2">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="p-1.5 border border-zinc-300 text-left w-1/2">Particulars</th>
                <th className="p-1.5 border border-zinc-300 text-left">Details / Compliance</th>
                <th className="p-1.5 border border-zinc-300 text-center w-1/4">Signature &amp; Date</th>
              </tr>
            </thead>
            <tbody>
              {data.completionRecord?.map((rec, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="p-1.5 border border-zinc-300 font-semibold text-zinc-800">{rec.particulars}</td>
                  <td className="p-1.5 border border-zinc-300 text-zinc-700">{isProtocol ? (rec.detailsProtocol || '') : (rec.detailsReport || rec.details)}</td>
                  <td className="p-1.5 border border-zinc-300 text-center font-mono text-zinc-600">
                    {isProtocol ? (rec.signatureDateProtocol || '—') : (rec.signatureDateReport || rec.signatureDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 15. Abbreviations */}
        <div className="mb-4">
          <h2 className={`text-sm font-bold uppercase mb-2 ${sectionHeadingClass}`}>
            15. Abbreviations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {data.abbreviations?.map((ab, i) => (
              <div key={i} className="flex items-center gap-2 border border-zinc-200 px-2 py-1 rounded bg-zinc-50">
                <span className="font-bold text-zinc-900 w-24 font-mono">{ab.abbreviation}</span>
                <span className="text-zinc-700">{ab.expansion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* End of Document */}
        <div className="pt-6 pb-2 text-center text-xs font-bold tracking-widest text-zinc-500 uppercase border-t border-zinc-200 mt-6">
          — END OF DOCUMENT —
        </div>

        {runningFooter(7)}
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
