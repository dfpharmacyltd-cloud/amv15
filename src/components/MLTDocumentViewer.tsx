import React, { useState } from 'react';
import { MLTDocumentData, DocumentType, ThemeFormat, DataMode, FontFamilyType, FontSizePt, FooterSignOffData } from '../types';
import { FontAndSizeControl } from './FontAndSizeControl';
import { Download, Printer, Layers, Calendar } from 'lucide-react';
import { SignOffFooter, DEFAULT_FOOTER_SIGN_OFF } from './SignOffFooter';
import { FooterDateModal } from './FooterDateModal';
import {
  generateAndDownloadMLTDocx,
  WESTCOAST_MLT_RECOVERY_BENCHMARK,
  WESTCOAST_MLT_SPECIFIED_BENCHMARK,
} from '../services/mltDocxGenerator';

interface MLTDocumentViewerProps {
  seed: string;
  data: MLTDocumentData | null;
  docType: DocumentType;
  theme: ThemeFormat;
  dataMode: DataMode;
  fontFamily: FontFamilyType;
  fontSize: FontSizePt;
  onFontFamilyChange: (f: FontFamilyType) => void;
  onFontSizeChange: (s: FontSizePt) => void;
  onDocTypeChange: (d: DocumentType) => void;
  onThemeChange: (t: ThemeFormat) => void;
  onDownloadProtocol: () => void;
  onDownloadReport: () => void;
  onDownloadBoth: () => void;
  onUpdateData: (d: MLTDocumentData) => void;
  footerSignOffData?: FooterSignOffData;
  onUpdateFooterSignOffData?: (data: FooterSignOffData) => void;
}

export const MLTDocumentViewer: React.FC<MLTDocumentViewerProps> = ({
  data, docType, theme, dataMode, fontFamily, fontSize, onUpdateData,
  onFontFamilyChange, onFontSizeChange, onDocTypeChange, onThemeChange,
  onDownloadProtocol, onDownloadReport, onDownloadBoth,
  footerSignOffData, onUpdateFooterSignOffData
}) => {
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
  let minRatio = 999;
  let maxRatio = 0;
  let allRecoveryPass = true;
  let allSpecifiedPass = true;
  const isMembrane = (data.routineMethodSelected || 'Membrane Filtration').toLowerCase().includes('membrane');
  const recoveryMethodDetail = isMembrane ? 
    'filtration using 100 mL volume per membrane, with appropriate rinsing.' : 
    'pour or spread plate method at the stated dilutions.';
  if (!data) return <div>Loading MLT Data...</div>;

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

  const isBlue = theme === 'blue';
  
  const tableHeaderClass = isBlue
    ? 'bg-[#1F4E79] text-white font-bold border-[#1F4E79]'
    : 'bg-zinc-100 text-zinc-900 font-bold border-zinc-300';

  const sectionHeadingClass = isBlue
    ? 'text-[#1F4E79] border-[#1F4E79]'
    : 'text-zinc-900 border-zinc-800';

  const themeClasses = theme === 'blue' 
    ? { primary: 'text-[#1F4E79]', bg: 'bg-[#1F4E79]/5', border: 'border-zinc-300', tableHeader: 'bg-[#1F4E79] text-white', accent: 'border-[#1F4E79]' }
    : { primary: 'text-zinc-900', bg: 'bg-zinc-50', border: 'border-zinc-300', tableHeader: 'bg-zinc-100 text-zinc-900 font-bold', accent: 'border-zinc-800' };

  const isReport = docType === 'report';

  const meanCFU = (a: number, b: number) => (a + b) / 2;
  const netTest = (meanTest: number, meanSample: number) => Math.max(0, meanTest - meanSample);
  const recoveryPct = (netT: number, meanInoc: number) => meanInoc > 0 ? (netT / meanInoc) * 100 : 0;
  const ratio = (netT: number, meanInoc: number) => meanInoc > 0 ? (netT / meanInoc) : 0;

  const getPassFail = (r: number) => (r >= 0.5 && r <= 2.0) ? 'Pass' : 'Fail';

  const inoculumCfu = (data.inoculumCfuPerMl || 0) * (data.inoculumVolumeAdded_mL || 0);

  // Conclusion Generator
  const generateConclusion = () => {
    let allPass = true;
    let minR = 999;
    let maxR = 0;
    
    // Find passing neutralizer
    let passingNeutraliser = 'None';
    let passingRec = 0;
    let passingRat = 0;

    data.suitabilityRows?.forEach(row => {
        const mI = meanCFU(row.inoculumControl1, row.inoculumControl2);
        const mS = meanCFU(row.sampleControl1, row.sampleControl2);
        const mT = meanCFU(row.testPlate1, row.testPlate2);
        const net = netTest(mT, mS);
        const rat = ratio(net, mI);
        if (rat >= 0.7) {
            passingNeutraliser = row.neutralizerLevel;
            passingRec = recoveryPct(net, mI);
            passingRat = rat;
        }
    });

    data.recoveryRows?.forEach(row => {
        const mI = meanCFU(row.inoculumControl1, row.inoculumControl2);
        const mS = meanCFU(row.sampleControl1, row.sampleControl2);
        const mT = meanCFU(row.testPlate1, row.testPlate2);
        const net = netTest(mT, mS);
        const rat = ratio(net, mI);
        if (rat < 0.5 || rat > 2.0) allPass = false;
        if (rat < minR) minR = rat;
        if (rat > maxR) maxR = rat;
    });

    data.specifiedOrganismRows?.forEach(row => {
        if (row.testProduct === 'No growth' || row.negativeControl === 'Growth' || row.positiveControl === 'No growth' || row.identificationResult !== 'Confirmed') {
            allPass = false;
        }
    });

    if (allPass && passingNeutraliser !== 'None') {
        return `The Microbial Limit Test method for ${data.productName} ${data.strength}, batch ${data.batchNo}, was verified in accordance with Protocol No. ${data.protocolNo}. Neutraliser screening established Tween 20 at ${passingNeutraliser} as the suitable condition, giving recovery of ${(Math.round(passingRec * 10) / 10).toFixed(1)} % (ratio ${(Math.round(passingRat * 100) / 100).toFixed(2)}). Recovery of all test organisms at dilutions 1:10, 1:50 and 1:100 fell within a factor of 2 of the inoculum control (range ${(Math.round(minR * 100) / 100).toFixed(2)} to ${(Math.round(maxR * 100) / 100).toFixed(2)}). Specified organisms were isolated and identified from the product-containing media. Negative controls showed no growth. The method is suitable for routine Microbial Limit Testing of the product at the stated dilutions.`;
    } else {
        return `The Microbial Limit Test method for ${data.productName} ${data.strength}, batch ${data.batchNo} failed to meet the acceptance criteria. The method is NOT SUITABLE.`;
    }
  };

  const getComplianceStatus = () => {
    let allPass = true;
    data.recoveryRows?.forEach(r => {
        const mI = meanCFU(r.inoculumControl1, r.inoculumControl2);
        const mS = meanCFU(r.sampleControl1, r.sampleControl2);
        const mT = meanCFU(r.testPlate1, r.testPlate2);
        const rat = ratio(netTest(mT, mS), mI);
        if (rat < 0.5 || rat > 2.0) allPass = false;
    });
    return allPass ? 'Complies' : 'Fails';
  };
  const RunningHeader = () => (
    <div className="flex justify-between items-center pb-2 mb-4 border-b border-zinc-300 text-[11px] text-zinc-500 font-sans">
      <span className="font-semibold text-zinc-700">{data.companyName}</span>
      <span>
        {isReport ? 'AMV Report' : 'AMV Protocol'} – {data.productName} | Doc No. {docNo}
      </span>
    </div>
  );

  const RunningFooter = ({ pageNum }: { pageNum: number }) => (
    <SignOffFooter
      pageNum={pageNum}
      totalPages={4}
      dataMode={dataMode}
      footerData={activeFooterData}
      onUpdateFooterData={handleUpdateFooter}
    />
  );


  const docNo = isReport ? data.reportNo : data.protocolNo;
  const docDate = isReport ? data.reportDate : data.protocolDate;
  const docTypeStr = isReport ? 'REPORT' : 'PROTOCOL';

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
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
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
              generateAndDownloadMLTDocx(data, {
                docType,
                theme: 'westcoast',
                fontFamily: 'Times New Roman',
                fontSize: 12,
                dataMode,
                footerSignOffData: activeFooterData,
              });
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-amber-700 hover:bg-amber-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download authentic Westcoast format Word .docx (exact match to PDF)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Westcoast Format (.docx)</span>
          </button>

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

      {/* PAGE 1 */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        {/* Company Title */}
        <div className="text-center pb-1 pt-1">
          <h1 className={`text-xl sm:text-2xl font-bold uppercase tracking-wide ${sectionHeadingClass}`}>
            {data.companyName}
          </h1>
        </div>

        {/* Solid Divider Line */}
        <div className={`w-full h-1 my-3 ${isBlue ? 'bg-[#1F4E79]' : 'bg-zinc-800'}`}></div>

        {/* Document Title */}
        <div className="text-center py-1 mb-3">
          <h2 className={`text-xs sm:text-base font-bold uppercase tracking-wider ${sectionHeadingClass}`}>
            {isProtocol
              ? 'ANALYTICAL METHOD VERIFICATION PROTOCOL (For Microbial Limit Test)'
              : 'ANALYTICAL METHOD VERIFICATION REPORT (For Microbial Limit Test)'}
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
                <td className="w-2/3 border border-zinc-300 px-3 py-1.5 font-mono font-bold text-zinc-900">{docNo}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Product Name</td>
                <td className="border border-zinc-300 px-3 py-1.5 font-bold text-zinc-900">{data.productName}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Label Claim</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{data.strength}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Test Parameter</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">Microbial Limit Test — Total Viable Aerobic Count, Total Combined Moulds and Yeasts Count, and Tests for Specified Micro-organisms</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Reference</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{data.references.join(', ')}; in-house SOP No. [Current Version]</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Batch No. Used</td>
                <td className="border border-zinc-300 px-3 py-1.5 font-mono font-bold text-zinc-900">{data.batchNo}</td>
              </tr>
              <tr>
                <td className="bg-zinc-50 font-bold border border-zinc-300 px-3 py-1.5 text-zinc-700">Effective Date</td>
                <td className="border border-zinc-300 px-3 py-1.5 text-zinc-800">{docDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* APPROVALS */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>APPROVALS / SIGN-OFF</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-zinc-300 text-center">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="border border-zinc-300 p-2">ACTIVITY</th>
                <th className="border border-zinc-300 p-2">DESIGNATION</th>
                <th className="border border-zinc-300 p-2">NAME</th>
                <th className="border border-zinc-300 p-2">SIGNATURE</th>
                <th className="border border-zinc-300 p-2">DATE</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-zinc-300 p-2 font-semibold bg-zinc-50">Prepared By</td><td className="border border-zinc-300 p-2">Microbiologist, Quality Control</td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td></tr>
              <tr><td className="border border-zinc-300 p-2 font-semibold bg-zinc-50">Checked By</td><td className="border border-zinc-300 p-2">Executive Microbiologist, Quality Control</td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td></tr>
              <tr><td className="border border-zinc-300 p-2 font-semibold bg-zinc-50">Reviewed By</td><td className="border border-zinc-300 p-2">Manager, Quality Control</td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td></tr>
              <tr><td className="border border-zinc-300 p-2 font-semibold bg-zinc-50">Authorized By</td><td className="border border-zinc-300 p-2">Manager, Quality Assurance</td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td><td className="border border-zinc-300 p-2"></td></tr>
            </tbody>
          </table>
        </div>

        {/* TOC */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>TABLE OF CONTENTS</h3>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-8`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2 w-16">Sr. No.</th>
              <th className="border border-zinc-300 p-2 text-left">Contents</th>
              <th className="border border-zinc-300 p-2 w-24">Page No.</th>
            </tr>
          </thead>
          <tbody className="text-center">
            <tr><td className="border border-zinc-300 p-1.5 font-mono">1.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Objective</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 1</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">2.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Scope</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 1</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">3.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Reference and Verification Details</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 1</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">4.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Method Summary</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 1</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">5.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Verification Parameters — Acceptance Criteria</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 1</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">6.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Neutraliser (Tween 20) Screening</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 2</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">7.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Total Viable Aerobic Count — Procedure and Recovery</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 2</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">8.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Controls</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 3</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">9.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Tests for Pathogens</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 3</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">10.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Reverification Criteria / Demonstration of Method Suitability</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 3</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">11.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Result Reporting / Reviewing Requirements</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 3</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">12.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Key Considerations</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 4</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">13.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Conclusion</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 4</td></tr>
            <tr className="bg-zinc-50"><td className="border border-zinc-300 p-1.5 font-mono">14.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Completion Record</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 4</td></tr>
            <tr><td className="border border-zinc-300 p-1.5 font-mono">15.0</td><td className="border border-zinc-300 p-1.5 text-left text-zinc-900">Abbreviations</td><td className="border border-zinc-300 p-1.5 font-bold text-zinc-900">Page 4</td></tr>
          </tbody>
        </table>

        {/* 1. OBJECTIVE */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>1. OBJECTIVE</h3>
        <p className="mb-6 text-justify">
          To establish documentary evidence that the method for Microbial Limit Test for non-sterile materials is
          capable of correctly estimating the microbial counts in the materials. The validity of the test results
          depends largely upon the adequacy of a demonstration that the test specimens to which they are applied
          do not, of themselves, inhibit the multiplication, under the test conditions, of micro-organisms that may
          be present.
          <br/><br/>
          The verification exercise shall demonstrate that the method employed is capable of correct enumeration
          of micro-organisms without adversely affecting their growth, even in the case of materials which have
          antimicrobial activity.
        </p>

        {/* 2. SCOPE */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>2. SCOPE</h3>
        <p className="mb-6 text-justify">
          This document is applicable for verifying the Microbial Limit Test of non-sterile products and raw
          materials in the Quality Control laboratory of {data.companyName}.
          <br/><br/>
          The method shall be used for verification of the procedures applicable to all dosage forms and materials
          which have a requirement for Microbial Limit Test. Whenever the method is used for Microbial Limit Test of a scale-up or scale-down formulation, the
          verification shall be carried out on only one strength of the product.
        </p>

        {/* 3. REFERENCE */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>3. REFERENCE AND VERIFICATION DETAILS</h3>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6`}>
          <tbody>
            <tr><td className="border border-zinc-300 p-2 font-semibold w-1/4 bg-slate-50">Reference</td><td className="border border-zinc-300 p-2 w-3/4">{data.references.join(', ')}; in-house SOP No. [Current]</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Type of study</td><td className="border border-zinc-300 p-2">Method verification of the Microbial Limit Test — enumeration of viable aerobic micro-organisms and tests for specified micro-organisms</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Test to be verified</td><td className="border border-zinc-300 p-2">Microbial Limit Test of {data.productName}</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Verification team</td><td className="border border-zinc-300 p-2">Analyst 1 — (Microbiologist, QC); Analyst 2 — (Executive Microbiologist, QC); under the supervision of (Manager, Quality Control)</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Experimental details</td><td className="border border-zinc-300 p-2">Screening of Tween 20 concentration (0.025 %, 0.050 %, 0.075 % and 0.1 %) in Buffered Sodium Chloride Peptone Solution; preparation of sample dilutions 1:10, 1:50 and 1:100 (Solutions A, B and C); recovery of the specified test organisms and of bile-tolerant Gram-negative bacteria; sample controls, positive controls and negative controls for media; and tests for pathogens with isolation and identification.</td></tr>
          </tbody>
        </table>

        <RunningFooter pageNum={1} />
      </div>
      {/* PAGE 2 */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />
        {/* 4. METHOD SUMMARY */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>4. METHOD SUMMARY</h3>
        
        <h4 className="font-bold mb-2">4.1 Test Conditions</h4>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6`}>
          <tbody>
            <tr><td className="border border-zinc-300 p-2 font-semibold w-1/3 bg-slate-50">Test / Enumeration</td><td className="border border-zinc-300 p-2">Total Viable Aerobic Count and Total Combined Moulds and Yeasts Count</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Diluent / Neutraliser</td><td className="border border-zinc-300 p-2">Buffered Sodium Chloride Peptone Solution with Tween 20 / Tween 80</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Medium (Bacteria)</td><td className="border border-zinc-300 p-2">Soyabean Casein Digest Agar</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Medium (Fungi)</td><td className="border border-zinc-300 p-2">Sabouraud Dextrose Agar</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Enrichment Media (Pathogens)</td><td className="border border-zinc-300 p-2">Soyabean Casein Digest Medium and MacConkey Broth / RVS Broth as applicable</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Volume of Agar per Plate</td><td className="border border-zinc-300 p-2">20 mL to 22 mL of liquefied medium</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Culture Growth — Bacteria</td><td className="border border-zinc-300 p-2">Soyabean Casein Digest Medium at 30 °C to 35 °C for 24 hours</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Culture Growth — Fungi</td><td className="border border-zinc-300 p-2">Sabouraud Dextrose Broth / Agar at 20 °C to 25 °C for 48 hours to 10 days (spore harvest)</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Inoculum Level</td><td className="border border-zinc-300 p-2">Not more than 100 cfu per plate</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Incubation — Bacterial Count</td><td className="border border-zinc-300 p-2">30 °C to 35 °C for 3-5 days</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Incubation — Moulds and Yeasts</td><td className="border border-zinc-300 p-2">20 °C to 25 °C for 5-7 days</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold bg-slate-50">Incubation — Pathogen Enrichment</td><td className="border border-zinc-300 p-2">30 °C to 35 °C for 24 to 48 hours</td></tr>
          </tbody>
        </table>

        <h4 className="font-bold mb-2">4.2 Sample Dilution Scheme</h4>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6 text-center`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2">Solution</th>
              <th className="border border-zinc-300 p-2">Composition</th>
              <th className="border border-zinc-300 p-2">Dilution</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Solution A</td><td className="border border-zinc-300 p-2 text-left">{data.sampleQty_g} g sample + {data.sampleQty_g * 9} mL Buffered Sodium Chloride Peptone Solution + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">1 : 10</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Solution B</td><td className="border border-zinc-300 p-2 text-left">10 mL of Solution A + 40 mL Buffered Sodium Chloride Peptone Solution + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">1 : 50</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Solution C</td><td className="border border-zinc-300 p-2 text-left">10 mL of Solution A + 90 mL Buffered Sodium Chloride Peptone Solution + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">1 : 100</td></tr>
          </tbody>
        </table>
        <p className="mb-6 text-xs">Six test tubes containing 10 mL each are prepared from Solution A (1:10); the same is followed for Solution B (1:50) and Solution C (1:100) respectively.</p>

        <h4 className="font-bold mb-2">4.3 Preparation and Procedure</h4>
        <p className="mb-6 text-justify text-xs">
          Grow the bacterial cultures separately in Soyabean Casein Digest Medium at 30 °C to 35 °C for 24 hours
          and the fungal cultures separately in Sabouraud Dextrose Broth/Agar at 20 °C to 25 °C for 48 hours to 10 days. The
          organisms to be used are listed in 4.5.<br/><br/>
          Prepare reference suspensions separately of the above organisms by diluting the broth cultures so as to
          obtain not more than 100 cfu per plate upon inoculation.<br/><br/>
          Add separately 1 mL of the culture dilutions of Staphylococcus aureus, Escherichia coli, Salmonella
          enterica Typhimurium, Pseudomonas aeruginosa, Candida albicans, Aspergillus brasiliensis and the other bacterial species
          prepared above into all three sets of six test tubes prepared from each of Solutions A, B and C.<br/><br/>
          From each set, pipette out 1 mL separately into two pre-sterilised Petri plates. Pour 20 mL to 22 mL of
          liquefied Soyabean Casein Digest Agar for the cultivation of bacteria and 20 mL to 22 mL of liquefied
          Sabouraud Dextrose Agar for the cultivation of fungi.<br/><br/>
          Incubate the plates of Soyabean Casein Digest Agar at 30 °C to 35 °C for 3-5 days and the plates of
          Sabouraud Dextrose Agar at 20 °C to 25 °C for 5-7 days.
        </p>

                <div className="mb-4 text-xs bg-slate-50 p-3 border border-slate-200 rounded">
          <b>Product Specification (USP &lt;1111&gt;):</b><br/>
          TAMC: NMT {data.specTAMC_cfu_per_g} cfu/g or mL<br/>
          TYMC: NMT {data.specTYMC_cfu_per_g} cfu/g or mL<br/>
          Specified Organisms: {data.specifiedOrganismsSpec}
          <br/><br/>
          <b>Organisms used for Method Suitability Demonstration:</b><br/>
          Staphylococcus aureus, Pseudomonas aeruginosa, Bacillus subtilis, Candida albicans, Aspergillus brasiliensis, Salmonella species, Escherichia coli (as applicable based on product type).
        </div>
        <h4 className="font-bold mb-2">4.4 Acceptance Criteria (as per the method)</h4>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2 text-left w-2/3">Criterion</th>
              <th className="border border-zinc-300 p-2 text-center w-1/3">Limit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-zinc-300 p-2">Recovery of the test organisms against the calculated value of the inoculum suspension</td><td className="border border-zinc-300 p-2 text-center font-semibold">Ratio 0.5 to 2.0 (USP)<br/>(In-house: NLT 70 %)</td></tr>
            <tr><td className="border border-zinc-300 p-2">Isolation and identification of organisms inoculated in the medium along with the material</td><td className="border border-zinc-300 p-2 text-center font-semibold">No failure</td></tr>
            <tr><td className="border border-zinc-300 p-2">Negative control for media</td><td className="border border-zinc-300 p-2 text-center font-semibold">No growth</td></tr>
          </tbody>
        </table>

        <h4 className="font-bold mb-2">4.5 Requirements (Media, Cultures, Reagents &amp; Equipment)</h4>
        <div className="overflow-x-auto mb-6">
          <table className={`w-full text-[11px] border-collapse border ${themeClasses.border}`}>
            <thead>
              <tr className={tableHeaderClass}>
                <th className="border border-zinc-300 p-2">Name of Material / Culture / Equipment</th>
                <th className="border border-zinc-300 p-2">Type</th>
                <th className="border border-zinc-300 p-2">Make/Source</th>
                <th className="border border-zinc-300 p-2">Batch No. / ID</th>
                <th className="border border-zinc-300 p-2">Expiry / Cal Due</th>
                <th className="border border-zinc-300 p-2">GPT Status</th>
              </tr>
            </thead>
            <tbody>
              {data.media?.map((m, i) => (
                <tr key={'m'+i} className="text-center">
                  <td className="border border-zinc-300 p-2 text-left">{m.name}</td>
                  <td className="border border-zinc-300 p-2">Media/Reagent</td>
                  <td className="border border-zinc-300 p-2">Commercial</td>
                  <td className="border border-zinc-300 p-2">{m.lotNo}</td>
                  <td className="border border-zinc-300 p-2">{m.expiryDate}</td>
                  <td className="border border-zinc-300 p-2 font-semibold">{m.gptResult}</td>
                </tr>
              ))}
              {data.organisms?.map((o, i) => (
                <tr key={'o'+i} className="text-center">
                  <td className="border border-zinc-300 p-2 text-left italic">{o.name} ATCC {o.atcc}</td>
                  <td className="border border-zinc-300 p-2">Test culture</td>
                  <td className="border border-zinc-300 p-2">{o.source}</td>
                  <td className="border border-zinc-300 p-2">{o.lotNo}</td>
                  <td className="border border-zinc-300 p-2">Passage {o.passageNo}</td>
                  <td className="border border-zinc-300 p-2">-</td>
                </tr>
              ))}
              {data.equipment?.map((e, i) => (
                <tr key={'e'+i} className="text-center">
                  <td className="border border-zinc-300 p-2 text-left">{e.type}</td>
                  <td className="border border-zinc-300 p-2">Equipment</td>
                  <td className="border border-zinc-300 p-2">{e.makeModel}</td>
                  <td className="border border-zinc-300 p-2">{e.id}</td>
                  <td className="border border-zinc-300 p-2">{e.calibrationDueDate}</td>
                  <td className="border border-zinc-300 p-2">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. VERIFICATION PARAMETERS */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>5. VERIFICATION PARAMETERS — ACCEPTANCE CRITERIA</h3>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2 w-12 text-center">Sr.</th>
              <th className="border border-zinc-300 p-2 text-left">Parameter</th>
              <th className="border border-zinc-300 p-2 text-left">Acceptance Criteria</th>
              <th className="border border-zinc-300 p-2 text-center">Observed Result / Compliance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.1</td><td className="border border-zinc-300 p-2">Neutraliser (Tween 20) Suitability</td><td className="border border-zinc-300 p-2">Concentration of Tween 20 in Buffered Sodium Chloride Peptone Solution at which recovery of the test organisms is ratio 0.5 - 2.0 (NLT 70 %).</td>
              <td className="border border-zinc-300 p-2 text-center font-bold text-green-700">{isReport ? '0.1 % Tween 20 established — Complies' : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.2</td><td className="border border-zinc-300 p-2">Total Viable Aerobic Count — Recovery</td><td className="border border-zinc-300 p-2">Recovery of each bacterial test organism ratio 0.5 - 2.0 (NLT 70 %) of the calculated inoculum value at dilutions 1:10, 1:50 and 1:100.</td>
              <td className="border border-zinc-300 p-2 text-center font-bold text-green-700">{isReport ? getComplianceStatus() : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.3</td><td className="border border-zinc-300 p-2">Total Combined Moulds and Yeasts Count — Recovery</td><td className="border border-zinc-300 p-2">Recovery of Candida albicans and Aspergillus brasiliensis ratio 0.5 - 2.0 (NLT 70 %) of the calculated inoculum value.</td>
              <td className="border border-zinc-300 p-2 text-center font-bold text-green-700">{isReport ? getComplianceStatus() : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.4</td><td className="border border-zinc-300 p-2">Sample Control</td><td className="border border-zinc-300 p-2">Counts to be recorded for Solutions A, B and C; no inhibition of growth attributable to the sample.</td>
              <td className="border border-zinc-300 p-2 text-center font-bold">{isReport ? 'Counts recorded' : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.5</td><td className="border border-zinc-300 p-2">Positive Control</td><td className="border border-zinc-300 p-2">Characteristic growth of each inoculated bacterial and fungal culture.</td>
              <td className="border border-zinc-300 p-2 text-center font-bold">{isReport ? 'Growth observed' : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.6</td><td className="border border-zinc-300 p-2">Negative Control for Media</td><td className="border border-zinc-300 p-2">No growth in any plate.</td>
              <td className="border border-zinc-300 p-2 text-center font-bold">{isReport ? 'No growth' : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 text-center">5.7</td><td className="border border-zinc-300 p-2">Tests for Pathogens</td><td className="border border-zinc-300 p-2">No failure in isolation and identification of Staphylococcus aureus, Pseudomonas aeruginosa, Salmonella species and Escherichia coli.</td>
              <td className="border border-zinc-300 p-2 text-center font-bold text-green-700">{isReport ? 'Complies' : ''}</td>
            </tr>
          </tbody>
        </table>

        <RunningFooter pageNum={2} />
      </div>
      {/* PAGE 3 */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />
        {/* 6. NEUTRALISER SCREENING */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>6. NEUTRALISER (TWEEN 20) SCREENING</h3>
        <p className="mb-4 text-xs">
          The concentration of Tween 20 in Buffered Sodium Chloride Peptone Solution was screened to establish
          the level at which the antimicrobial activity of the sample is neutralised and acceptable recovery of the
          test organisms is obtained.
        </p>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6 text-center`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2">% of Tween 20</th>
              <th className="border border-zinc-300 p-2">Mean Inoculum Control (cfu)</th>
              <th className="border border-zinc-300 p-2">Mean Recovered (cfu)</th>
              <th className="border border-zinc-300 p-2">% Recovery</th>
              <th className="border border-zinc-300 p-2">Ratio</th>
              <th className="border border-zinc-300 p-2">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {data.suitabilityRows?.map((r, i) => {
                const mI = meanCFU(r.inoculumControl1, r.inoculumControl2);
                const mS = meanCFU(r.sampleControl1, r.sampleControl2);
                const mT = meanCFU(r.testPlate1, r.testPlate2);
                const net = netTest(mT, mS);
                const rec = recoveryPct(net, mI);
                const rat = ratio(net, mI);
                const pf = (rat >= 0.7) ? 'Complies' : 'Fails';
                return (
                  <tr key={i} className="text-center">
                    <td className="border border-zinc-300 p-2 font-bold">{r.neutralizerLevel}</td>
                    <td className="border border-zinc-300 p-2">{isReport ? mI : ''}</td>
                    <td className="border border-zinc-300 p-2">{isReport ? net : ''}</td>
                    <td className="border border-zinc-300 p-2">{isReport ? rec.toFixed(1) : ''}</td>
                    <td className="border border-zinc-300 p-2">{isReport ? rat.toFixed(2) : ''}</td>
                    <td className={`border border-zinc-300 p-2 font-bold ${isReport ? (pf === 'Complies' ? 'text-green-600' : 'text-red-600') : ''}`}>{isReport ? pf : ''}</td>
                  </tr>
                );
            })}
          </tbody>
        </table>

        {/* 7. TOTAL VIABLE AEROBIC COUNT */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>7. TOTAL VIABLE AEROBIC COUNT — PROCEDURE AND RECOVERY</h3>
        <PrepBlock section="recovery" />
        <p className="mb-4 text-xs">
          Prepare Solutions A, B and C as per 4.2 and inoculate the test organisms as per 4.3. Record the count
          obtained from the inoculated sample preparation against the count obtained from the corresponding
          inoculum control, and calculate the percentage recovery for each organism at each dilution.
          (1 mL inoculum into 10 mL solution incorporates a 1.1 dilution correction factor).
        </p>
        {isMembrane ? (
          <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6 text-center`}>
            <thead>
              <tr className={tableHeaderClass}>
                <th className="border border-zinc-300 p-2">Sr. No.</th>
                <th className="border border-zinc-300 p-2">Test Organism</th>
                <th className="border border-zinc-300 p-2">Filtration Volume</th>
                <th className="border border-zinc-300 p-2">Rinse Volume</th>
                <th className="border border-zinc-300 p-2">No. of Rinses</th>
                <th className="border border-zinc-300 p-2">Inoculum Count (cfu)</th>
                <th className="border border-zinc-300 p-2">Recovered Count (cfu)</th>
                <th className="border border-zinc-300 p-2">% Recovery</th>
                <th className="border border-zinc-300 p-2">Ratio</th>
                <th className="border border-zinc-300 p-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.recoveryRows?.map((r, i) => {
                  const org = data.organisms.find(o => o.id === r.organismId);
                  const mI = meanCFU(r.inoculumControl1, r.inoculumControl2);
                  const mS = meanCFU(r.sampleControl1, r.sampleControl2);
                  const mT = meanCFU(r.testPlate1, r.testPlate2);
                  const net = netTest(mT, mS);
                  const rec = recoveryPct(net, mI);
                  const rat = ratio(net, mI);
                  const pf = getPassFail(rat);
                  
                  const match = r.dilution.match(/(\d+x rinse)/);
                  const rinseCount = match ? match[1].replace('x rinse', '').trim() : '3';
                  
                  return (
                    <tr key={i} className="text-center">
                      <td className="border border-zinc-300 p-2">{i + 1}</td>
                      <td className="border border-zinc-300 p-2 text-left italic">{org?.name}</td>
                      <td className="border border-zinc-300 p-2">100 mL</td>
                      <td className="border border-zinc-300 p-2">100 mL</td>
                      <td className="border border-zinc-300 p-2">{rinseCount}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? mI : ''}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? net : ''}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? rec.toFixed(1) : ''}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? rat.toFixed(2) : ''}</td>
                      <td className={`border border-zinc-300 p-2 font-bold ${isReport ? (pf === 'Pass' ? 'text-green-600' : 'text-red-600') : ''}`}>{isReport ? pf : ''}</td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        ) : (
          <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6 text-center`}>
            <thead>
              <tr className={tableHeaderClass}>
                <th className="border border-zinc-300 p-2">Sr. No.</th>
                <th className="border border-zinc-300 p-2">Test Organism</th>
                <th className="border border-zinc-300 p-2">Dilution</th>
                <th className="border border-zinc-300 p-2">Inoculum Count (cfu)</th>
                <th className="border border-zinc-300 p-2">Recovered Count (cfu)</th>
                <th className="border border-zinc-300 p-2">% Recovery</th>
                <th className="border border-zinc-300 p-2">Ratio</th>
                <th className="border border-zinc-300 p-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.recoveryRows?.map((r, i) => {
                  const org = data.organisms.find(o => o.id === r.organismId);
                  const mI = meanCFU(r.inoculumControl1, r.inoculumControl2);
                  const mS = meanCFU(r.sampleControl1, r.sampleControl2);
                  const mT = meanCFU(r.testPlate1, r.testPlate2);
                  const net = netTest(mT, mS);
                  const rec = recoveryPct(net, mI);
                  const rat = ratio(net, mI);
                  const pf = getPassFail(rat);
                  return (
                    <tr key={i} className="text-center">
                      <td className="border border-zinc-300 p-2">{i + 1}</td>
                      <td className="border border-zinc-300 p-2 text-left italic">{org?.name}</td>
                      <td className="border border-zinc-300 p-2 font-semibold">{r.dilution}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? mI : ''}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? net : ''}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? rec.toFixed(1) : ''}</td>
                      <td className="border border-zinc-300 p-2">{isReport ? rat.toFixed(2) : ''}</td>
                      <td className={`border border-zinc-300 p-2 font-bold ${isReport ? (pf === 'Pass' ? 'text-green-600' : 'text-red-600') : ''}`}>{isReport ? pf : ''}</td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        )}
        <p className="mb-8 text-xs font-semibold">Acceptance: recovery of each test organism shall be ratio 0.5 - 2.0 (not less than 70 %) of the calculated value of the inoculum suspension.</p>

        {/* 8. CONTROLS */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>8. CONTROLS</h3>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-8 text-left`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2">Control</th>
              <th className="border border-zinc-300 p-2">Procedure</th>
              <th className="border border-zinc-300 p-2">Incubation</th>
              <th className="border border-zinc-300 p-2">Expected Result</th>
              <th className="border border-zinc-300 p-2">Observed Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-zinc-300 p-2 font-semibold">Sample Control</td>
              <td className="border border-zinc-300 p-2">Inoculate 1.0 mL of Solutions A, B and C in duplicate and add 20 mL to 22 mL of Soyabean Casein Digest Agar for bacterial count and Sabouraud Dextrose Agar for total combined moulds and yeasts count respectively.</td>
              <td className="border border-zinc-300 p-2">30 °C to 35 °C for 3-5 days (bacteria); 20 °C to 25 °C for 5-7 days (moulds and yeasts)</td>
              <td className="border border-zinc-300 p-2">Counts to be recorded</td>
              <td className="border border-zinc-300 p-2 font-bold">{isReport ? 'Counts recorded' : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 font-semibold">Positive Control</td>
              <td className="border border-zinc-300 p-2">Inoculate 1 mL of each of the diluted bacterial and fungal cultures into two plates each and add 20 mL to 22 mL of SCDA and SDA respectively.</td>
              <td className="border border-zinc-300 p-2">30 °C to 35 °C for 3-5 days (bacteria); 20 °C to 25 °C for 5-7 days (moulds and yeasts)</td>
              <td className="border border-zinc-300 p-2">Characteristic growth</td>
              <td className="border border-zinc-300 p-2 font-bold">{isReport ? 'Growth observed' : ''}</td>
            </tr>
            <tr>
              <td className="border border-zinc-300 p-2 font-semibold">Negative Control for Media</td>
              <td className="border border-zinc-300 p-2">Inoculate 1.0 mL of Buffered Sodium Chloride Peptone Solution into four plates and add 20 mL to 22 mL of SCDA into 2 plates and SDA into the other 2 plates respectively.</td>
              <td className="border border-zinc-300 p-2">30 °C to 35 °C for 3-5 days (bacteria); 20 °C to 25 °C for 5-7 days (moulds and yeasts)</td>
              <td className="border border-zinc-300 p-2">No growth</td>
              <td className="border border-zinc-300 p-2 font-bold">{isReport ? 'No growth' : ''}</td>
            </tr>
          </tbody>
        </table>

        <RunningFooter pageNum={3} />
      </div>
      {/* PAGE 4 */}
      <div className="page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6">
        <RunningHeader />
        {/* 9. TESTS FOR PATHOGENS */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>9. TESTS FOR PATHOGENS</h3>
        <PrepBlock section="suitability" />
        
        <h4 className="font-bold mb-2">9.1 Preparation of Sample</h4>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6 text-left`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2 text-center w-12">Sr. No.</th>
              <th className="border border-zinc-300 p-2">Preparation</th>
              <th className="border border-zinc-300 p-2">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-zinc-300 p-2 text-center">1</td><td className="border border-zinc-300 p-2">10 g sample + 90 mL Soyabean Casein Digest Medium + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">Test preparation</td></tr>
            <tr><td className="border border-zinc-300 p-2 text-center">2</td><td className="border border-zinc-300 p-2">10 g sample + 90 mL MacConkey / RVS Broth + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">Test preparation</td></tr>
            <tr><td className="border border-zinc-300 p-2 text-center">3</td><td className="border border-zinc-300 p-2">100 mL Enrichment Broth + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">Positive control</td></tr>
            <tr><td className="border border-zinc-300 p-2 text-center">4</td><td className="border border-zinc-300 p-2">100 mL Enrichment Broth + {data.suitabilityRows?.[0]?.neutralizerLevel || '0.1 %'} {data.suitabilityRows?.[0]?.neutralizer || 'Tween 20'}</td><td className="border border-zinc-300 p-2">Negative control</td></tr>
          </tbody>
        </table>
        
        <h4 className="font-bold mb-2">9.2 Procedure</h4>
        <p className="mb-6 text-justify text-xs">
          Grow the bacterial cultures separately in Soyabean Casein Digest Medium at 30 °C to 35 °C for 24 hours. The organisms to be used are Escherichia coli, Staphylococcus aureus, Salmonella enterica Typhimurium and Pseudomonas aeruginosa. Prepare reference suspensions separately of the above organisms by diluting the broth cultures so as to obtain not more than 100 cfu per mL. Mix equal volumes of each suspension.<br/><br/>
          Pipette 1.0 mL of the mixed suspension of the micro-organisms separately into the tubes of respective Enrichment Media containing the sample to be examined. Incubate the tubes at 30 °C to 35 °C for 24 to 48 hours and proceed for isolation and identification of Staphylococcus aureus, Pseudomonas aeruginosa, Salmonella species and Escherichia coli from this broth as per the specified SOP.
        </p>

        <h4 className="font-bold mb-2">9.3 Isolation and Identification Record</h4>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-6 text-center`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2">Sr. No.</th>
              <th className="border border-zinc-300 p-2">Organism</th>
              <th className="border border-zinc-300 p-2">ATCC</th>
              <th className="border border-zinc-300 p-2">Enrichment / Selective Medium</th>
              <th className="border border-zinc-300 p-2">Positive Control</th>
              <th className="border border-zinc-300 p-2">Negative Control</th>
              <th className="border border-zinc-300 p-2">Test Product</th>
              <th className="border border-zinc-300 p-2">Identification Result</th>
              <th className="border border-zinc-300 p-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {data.specifiedOrganismRows?.map((r, i) => {
              const org = data.organisms.find(o => o.id === r.organismId);
              return (
                <tr key={i}>
                  <td className="border border-zinc-300 p-2">{i+1}</td>
                  <td className="border border-zinc-300 p-2 text-left italic">{org?.name}</td>
                  <td className="border border-zinc-300 p-2">{org?.atcc}</td>
                  <td className="border border-zinc-300 p-2">{r.enrichmentMedium} / {r.selectiveMedium}</td>
                  <td className="border border-zinc-300 p-2">{isReport ? r.positiveControl : ''}</td>
                  <td className="border border-zinc-300 p-2">{isReport ? r.negativeControl : ''}</td>
                  <td className="border border-zinc-300 p-2 font-medium">{isReport ? r.testProduct : ''}</td>
                  <td className="border border-zinc-300 p-2">{isReport ? r.identificationResult : ''}</td>
                  <td className="border border-zinc-300 p-2 font-bold text-green-700">{isReport ? 'Complies' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mb-8 text-xs font-semibold">Acceptance: there shall not be any failure in isolation and identification of the organisms inoculated in the medium along with the material. The negative control shall show no growth.</p>

        {/* 10. REVERIFICATION CRITERIA */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>10. REVERIFICATION CRITERIA / DEMONSTRATION OF METHOD SUITABILITY</h3>
        <p className="mb-6 text-justify text-xs">
          Reverification of the method shall be carried out in the following circumstances:<br/>
          – Change in the formulation wherein a new component has been added.<br/>
          – Change in the concentration of the preservative.<br/>
          – Major change in the method for Microbial Limit Test, such as a change in the method for deactivation of antimicrobial activity.<br/><br/>
          Three batches of each product or material shall be validated for Microbial Limit Test.
          The tests for "absence of specified organisms" provide procedures for demonstration of the absence of Staphylococcus aureus, Pseudomonas aeruginosa, Salmonella species and Escherichia coli.
        </p>

        {/* 11. RESULT REPORTING */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>11. RESULT REPORTING / PRODUCT BIOBURDEN</h3>
        <p className="mb-2 text-justify text-xs">
          Report all results on a method verification report form. If the results are unacceptable, the method shall be reviewed accordingly in order to rule out the affecting factor.
        </p>
        {isReport ? (
          <p className="mb-6 font-bold text-xs">
            Product Bioburden Result: &lt; 10 CFU/g (TAMC) and &lt; 10 CFU/g (TYMC). Complies with specification.
          </p>
        ) : (
          <p className="mb-6 font-bold text-xs italic">
            Bioburden result to be reported after execution.
          </p>
        )}

        {/* 12. KEY CONSIDERATIONS */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>12. KEY CONSIDERATIONS</h3>
        <div className="mb-8 text-justify text-xs pl-4">
          <ol className="list-decimal space-y-2">
            <li>The fundamental shortcomings of these tests in regard to the current Good Manufacturing Practice (cGMP) requirements for "absence of objectionable organisms" should be discussed by the scientific teams.</li>
            <li>Product risk analysis, including product use and route of administration, growth potential, preservation and other considerations recommended in pharmacopoeial texts, must be properly taken into account. The quality group must take a proper and reasonable scientific approach on how to handle, validate and test in special cases of product recalls due to the presence of objectionable organisms.</li>
            <li>Reverification of existing tests to align with current harmonised standards and level of detail should be properly discussed and carried out using a matrix approach.</li>
            <li>A proper reporting format should be developed by both the quality and documentation teams.</li>
            <li>Training of microbiologists for the revised tests should be considered a priority by both the verification and quality teams during transfer of procedures.</li>
          </ol>
        </div>

        {/* 13. CONCLUSION */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>13. CONCLUSION</h3>
        <p className="mb-4 text-justify text-xs">
          {isReport 
            ? generateConclusion() 
            : 'On completion of the studies described in this protocol, the method for Microbial Limit Test of the product shall be concluded as verified provided that all the acceptance criteria stated in sections 4.4 and 5.0 are met. Any deviation observed during execution shall be documented, investigated and approved prior to release of the verification report.'}
        </p>
        {isReport && (
          <div className="mb-8">
            <strong>Overall conclusion:</strong> {getComplianceStatus() === 'Complies' ? <span className="font-bold text-green-700">SUITABLE</span> : <span className="font-bold text-red-700">NOT SUITABLE</span>} <span className="text-xs italic text-slate-500">(Computed mathematically based on recorded results)</span>
          </div>
        )}

        {/* 14. COMPLETION RECORD */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>14. COMPLETION RECORD</h3>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-8`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2 text-left">Particulars</th>
              <th className="border border-zinc-300 p-2 text-left">Details / Compliance</th>
              <th className="border border-zinc-300 p-2 text-left">Signature &amp; Date</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Protocol Preparation</td><td className="border border-zinc-300 p-2">Prepared by Microbiologist, QC</td><td className="border border-zinc-300 p-2">Signed / {data.protocolDate}</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Protocol Checking</td><td className="border border-zinc-300 p-2">Checked by Executive Microbiologist, QC</td><td className="border border-zinc-300 p-2">Signed / {data.protocolDate}</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Protocol Review</td><td className="border border-zinc-300 p-2">Reviewed by Manager, Quality Control</td><td className="border border-zinc-300 p-2">Signed / {data.protocolDate}</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Protocol Authorisation</td><td className="border border-zinc-300 p-2">Authorized by Manager, Quality Assurance</td><td className="border border-zinc-300 p-2">Signed / {data.protocolDate}</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">Execution</td><td className="border border-zinc-300 p-2">Executed by the Microbiology Section</td><td className="border border-zinc-300 p-2">{isReport ? `Signed / ${data.reportDate}` : ''}</td></tr>
          </tbody>
        </table>

        {/* 15. ABBREVIATIONS */}
        <h3 className={`text-xs font-bold uppercase mb-1 ${sectionHeadingClass}`}>15. ABBREVIATIONS</h3>
        <table className={`w-full text-xs border-collapse border border-zinc-300 mb-8`}>
          <thead>
            <tr className={tableHeaderClass}>
              <th className="border border-zinc-300 p-2 text-left w-1/3">Abbreviation</th>
              <th className="border border-zinc-300 p-2 text-left">Full Form / Expansion</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-zinc-300 p-2 font-semibold">AMV</td><td className="border border-zinc-300 p-2">Analytical Method Verification</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">MLT</td><td className="border border-zinc-300 p-2">Microbial Limit Test</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">TVAC</td><td className="border border-zinc-300 p-2">Total Viable Aerobic Count</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">SCDM / SCDA</td><td className="border border-zinc-300 p-2">Soyabean Casein Digest Medium / Agar</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">SDA</td><td className="border border-zinc-300 p-2">Sabouraud Dextrose Agar</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">cfu</td><td className="border border-zinc-300 p-2">Colony Forming Unit</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">QC / QA / CQU</td><td className="border border-zinc-300 p-2">Quality Control / Quality Assurance / Corporate Quality Unit</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">cGMP</td><td className="border border-zinc-300 p-2">Current Good Manufacturing Practice</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">USP / EP</td><td className="border border-zinc-300 p-2">United States Pharmacopeia / European Pharmacopoeia</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">SOP</td><td className="border border-zinc-300 p-2">Standard Operating Procedure</td></tr>
            <tr><td className="border border-zinc-300 p-2 font-semibold">NLT / NMT</td><td className="border border-zinc-300 p-2">Not Less Than / Not More Than</td></tr>
          </tbody>
        </table>

        <div className="text-center font-bold text-lg mt-8 text-zinc-600">
          — END OF DOCUMENT —
        </div>
        <RunningFooter pageNum={4} />

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
