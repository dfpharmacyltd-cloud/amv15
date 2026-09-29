import React from 'react';
import { TitrationAMVData } from '../services/titrationDatabase';
import { SignOffFooter } from './SignOffFooter';
import type { FooterSignOffData } from '../types';

interface Props {
  seed: string;
  data: TitrationAMVData;
  docType: 'protocol' | 'report';
  theme: string;
  dataMode: string;
  fontFamily: string;
  fontSize: number;
  onFontFamilyChange: (v: any) => void;
  onFontSizeChange: (v: any) => void;
  onDocTypeChange: (v: any) => void;
  onThemeChange: (v: any) => void;
  onDownloadProtocol: () => void;
  onDownloadReport: () => void;
  onDownloadBoth: () => void;
  onUpdateData?: (d: TitrationAMVData) => void;
  footerSignOffData: FooterSignOffData;
  onUpdateFooterSignOffData: (d: FooterSignOffData) => void;
}

export const TitrationDocumentViewer: React.FC<Props> = ({
  data,
  docType,
  theme,
  dataMode,
  fontFamily,
  fontSize,
  onDownloadProtocol,
  onDownloadReport,
  onDownloadBoth,
  footerSignOffData,
}) => {
  const isProtocol = docType === 'protocol';
  const isDemo = dataMode === 'DEMO';
  const isBlue = theme === 'blue';
  const headingClass = isBlue ? 'text-[#1F4E79]' : 'text-zinc-900';
  const thClass = isBlue ? 'bg-[#1F4E79] text-white' : 'bg-zinc-200 text-zinc-900';

  /** A protocol carries no measured values: every data cell is an em dash. */
  const v = (value: any) => (isProtocol ? '\u2014' : String(value));

  const Prep = ({ intro, steps }: { intro?: string; steps?: string[] }) => (
    <div className="mb-3 text-xs text-zinc-700 leading-relaxed">
      {intro && <p className="mb-1.5 text-justify">{intro}</p>}
      {steps?.map((s, i) => (
        <p key={i} className="mb-1 text-justify pl-3 -indent-3">
          {s}
        </p>
      ))}
    </div>
  );

  const Evaluation = ({ items }: { items: string[] }) => (
    <div className="text-xs text-zinc-700 mt-2 mb-3">
      <p className="font-semibold mb-0.5">Evaluation</p>
      {items.map((e, i) => (
        <p key={i} className="mb-0.5">
          {e}
        </p>
      ))}
    </div>
  );

  const Section = ({ no, title, children }: { no: string; title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className={`text-xs font-bold uppercase mb-1 ${headingClass}`}>
        {no} {title}
      </h3>
      {children}
    </div>
  );

  const page = 'page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6';

  return (
    <div style={{ fontFamily, fontSize: `${fontSize}px` }}>
      <div className="flex flex-wrap gap-2 mb-4 max-w-5xl mx-auto">
        <button
          onClick={onDownloadProtocol}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1F4E79] text-white"
        >
          Download Protocol
        </button>
        <button
          onClick={onDownloadReport}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1F4E79] text-white"
        >
          Download Report
        </button>
        <button
          onClick={onDownloadBoth}
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-zinc-300 text-zinc-700"
        >
          Download Both
        </button>
      </div>

      {/* PAGE 1 */}
      <div className={page}>
        <h2 className={`text-base font-bold text-center mb-0.5 ${headingClass}`}>{data.companyName}</h2>
        <p className="text-center text-[10px] text-zinc-600 mb-1">{data.companyAddress}</p>
        <p className="text-center text-sm font-bold mb-0.5">
          ANALYTICAL METHOD VERIFICATION {isProtocol ? 'PROTOCOL' : 'REPORT'}
        </p>
        <p className="text-center text-xs font-semibold mb-3">{data.documentSubTitle}</p>

        {isProtocol && (
          <p className="text-center text-xs font-bold text-amber-700 mb-2">
            *** PROTOCOL — NOT AN EXECUTED REPORT ***
          </p>
        )}
        {isDemo && (
          <p className="text-center text-xs font-bold text-amber-700 mb-3">
            *** DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE ***
          </p>
        )}

        <table className="w-full text-xs border-collapse border border-zinc-300 mb-4">
          <tbody>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50 w-40">Product Name</td>
              <td className="p-2 border border-zinc-300 font-bold" colSpan={3}>
                {data.productName.toUpperCase()}
              </td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Test</td>
              <td className="p-2 border border-zinc-300 font-bold" colSpan={3}>
                {data.testParameter}
              </td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">
                {isProtocol ? 'Protocol No.' : 'Report No.'}
              </td>
              <td className="p-2 border border-zinc-300">{isProtocol ? data.protocolNo : data.reportNo}</td>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50 w-32">
                {isProtocol ? 'Protocol Date' : 'Report Date'}
              </td>
              <td className="p-2 border border-zinc-300">{isProtocol ? data.protocolDate : data.reportDate}</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Batch No.</td>
              <td className="p-2 border border-zinc-300">{data.batchNo}</td>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Standard Lot</td>
              <td className="p-2 border border-zinc-300">{data.standardLotNo}</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Format No.</td>
              <td className="p-2 border border-zinc-300">{data.formatNo}</td>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Supersedes</td>
              <td className="p-2 border border-zinc-300">{data.supersedes}</td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Label Claim</td>
              <td className="p-2 border border-zinc-300" colSpan={3}>{data.labelClaim}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-xs border-collapse border border-zinc-300 mb-4">
          <thead>
            <tr className={thClass}>
              <th className="p-2 border border-zinc-300">ACTIVITY</th>
              <th className="p-2 border border-zinc-300">DESIGNATION</th>
              <th className="p-2 border border-zinc-300">NAME</th>
              <th className="p-2 border border-zinc-300">SIGNATURE</th>
              <th className="p-2 border border-zinc-300">DATE</th>
            </tr>
          </thead>
          <tbody>
            {data.signOffs.map((s) => (
              <tr key={s.activity}>
                <td className="p-1.5 border border-zinc-300 font-semibold">{s.activity}</td>
                <td className="p-1.5 border border-zinc-300">{s.designation}</td>
                <td className="p-1.5 border border-zinc-300">{s.name}</td>
                <td className="p-1.5 border border-zinc-300">{isProtocol ? '________________' : ''}</td>
                <td className="p-1.5 border border-zinc-300">{isProtocol ? '________________' : s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs font-bold mb-1">Table of contents</p>
        <table className="w-full text-xs border-collapse border border-zinc-300">
          <thead>
            <tr className={thClass}>
              <th className="p-2 border border-zinc-300 w-20">Sr. No.</th>
              <th className="p-2 border border-zinc-300 text-left">Contents</th>
              <th className="p-2 border border-zinc-300 w-24">Page No.</th>
            </tr>
          </thead>
          <tbody>
            {data.tableOfContents.map((t) => (
              <tr key={t.srNo}>
                <td className="p-1.5 border border-zinc-300 text-center font-mono">{t.srNo}</td>
                <td className="p-1.5 border border-zinc-300">{t.contents}</td>
                <td className="p-1.5 border border-zinc-300 text-center">{t.pageNo}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <SignOffFooter pageNum={0} totalPages={6} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 2 — introduction, materials, methodology */}
      <div className={page}>
        <Section no="1." title="Objective">
          <p className="text-xs text-justify">{data.objective}</p>
        </Section>

        <Section no="2." title="Scope">
          <p className="text-xs text-justify">{data.scope}</p>
        </Section>

        <Section no="3." title="Reference Documents & Verification Details">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <tbody>
              <tr>
                <td className="p-2 border border-zinc-300 font-bold bg-zinc-50 w-56">Reference</td>
                <td className="p-2 border border-zinc-300">{data.verificationDetails.reference}</td>
              </tr>
              <tr>
                <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">(a) Type of Verification</td>
                <td className="p-2 border border-zinc-300">{data.verificationDetails.typeOfVerification}</td>
              </tr>
              <tr>
                <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">(b) Test to be Verified</td>
                <td className="p-2 border border-zinc-300">{data.verificationDetails.testToBeVerified}</td>
              </tr>
              <tr>
                <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">(c) Verification Team</td>
                <td className="p-2 border border-zinc-300">{data.verificationDetails.verificationTeam}</td>
              </tr>
              <tr>
                <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">(d) Experimental Details</td>
                <td className="p-2 border border-zinc-300">{data.verificationDetails.experimentalDetails}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section no="7." title="Analytical Method Summary">
          <p className="text-xs font-bold mb-1">4.1 Titrimetric Conditions</p>
          <p className="text-xs text-justify mb-2">{data.methodSummary.conditionsText}</p>
          {data.methodSummary.note && (
            <p className="text-xs text-justify mb-2">
              <span className="font-bold">Note:</span> {data.methodSummary.note}
            </p>
          )}

          <p className="text-xs font-bold mb-1">4.2 Preparation of Solutions</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 text-left w-64">Solution</th>
                <th className="p-2 border border-zinc-300 text-left">Preparation Procedure</th>
              </tr>
            </thead>
            <tbody>
              {data.methodSummary.preparations.map((pr) => (
                <tr key={pr.solution}>
                  <td className="p-1.5 border border-zinc-300 font-semibold">{pr.solution}</td>
                  <td className="p-1.5 border border-zinc-300 text-justify">{pr.procedure}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold mb-1">4.3 Calculation Formula</p>
          <p className="text-xs font-mono mb-1">{data.methodSummary.formula}</p>
          <p className="text-xs mb-3">{data.methodSummary.formulaLegend}</p>
          {data.methodology.factorNote && (
            <p className="text-xs text-amber-700 font-semibold mb-3">{data.methodology.factorNote}</p>
          )}

          <p className="text-xs font-bold mb-1">4.4 Materials, Chemicals and Reference Standards</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                <th className="p-2 border border-zinc-300 text-left">Name of Material / Chemical / Standard</th>
                <th className="p-2 border border-zinc-300 text-left">Type</th>
                <th className="p-2 border border-zinc-300 text-left">Batch / Lot No.</th>
              </tr>
            </thead>
            <tbody>
              {data.materialsTable.map((m) => (
                <tr key={m.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center">{m.srNo}</td>
                  <td className="p-1.5 border border-zinc-300">{m.name}</td>
                  <td className="p-1.5 border border-zinc-300">{m.type}</td>
                  <td className="p-1.5 border border-zinc-300 font-mono">{m.batchNo}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold mb-1">4.5 Methodology</p>
          <div className="text-xs leading-relaxed">
            <p className="font-bold">{data.methodology.assayHeading}</p>
            <p className="font-bold">{data.methodology.standardHeading}</p>
            <p className="font-bold">Procedure</p>
            <p><span className="font-bold">Sample:</span> {data.methodology.sampleText}</p>
            <p className="font-bold">Titrimetric system</p>
            <p><span className="font-bold">Mode</span>: {data.methodology.mode}</p>
            <p><span className="font-bold">Titrant</span>: {data.methodology.titrant}</p>
            <p><span className="font-bold">Endpoint detection</span>: {data.methodology.endpointDetection}</p>
            <p><span className="font-bold">Blank</span>: {data.methodology.blank}</p>
            <p className="mt-1"><span className="font-bold">Analysis</span>: {data.methodology.analysis}</p>
          </div>
        </Section>

        <Section no="5." title="Summary of Verification Parameters & Acceptance Criteria">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-12">Sr.</th>
                <th className="p-2 border border-zinc-300 text-left">Parameter</th>
                <th className="p-2 border border-zinc-300 text-left">Acceptance Criteria</th>
                <th className="p-2 border border-zinc-300 text-left">Verification Requirement</th>
              </tr>
            </thead>
            <tbody>
              {data.verificationParameters.map((vp) => (
                <tr key={vp.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center">{vp.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 font-semibold">{vp.parameter}</td>
                  <td className="p-1.5 border border-zinc-300 text-justify">{vp.acceptanceCriteria}</td>
                  <td className="p-1.5 border border-zinc-300">{vp.verificationRequirement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <SignOffFooter pageNum={0} totalPages={6} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 3 — verification parameters */}
      <div className={page}>
        <h3 className={`text-xs font-bold uppercase mb-2 ${headingClass}`}>6. Verification parameters — results</h3>

        <Section no="6.1" title="Specificity">
          <Prep intro={data.specificity.intro} steps={data.specificity.steps} />
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 text-left">Solution</th>
                <th className="p-2 border border-zinc-300 text-left">Observation</th>
                <th className="p-2 border border-zinc-300 text-left">Interference</th>
              </tr>
            </thead>
            <tbody>
              {data.specificity.rows.map((r, i) => (
                <tr key={i}>
                  <td className="p-1.5 border border-zinc-300">{r.solution}</td>
                  <td className="p-1.5 border border-zinc-300">{v(r.observation)}</td>
                  <td className="p-1.5 border border-zinc-300">{v(r.interference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Evaluation items={data.specificity.evaluation} />
        </Section>

        <Section no="6.2" title="System Suitability">
          <Prep intro={data.systemSuitability.intro} steps={data.systemSuitability.steps} />
          <p className="text-xs font-bold mb-1">{data.systemSuitability.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300">Working Standard Weight (mg)</th>
                <th className="p-2 border border-zinc-300">Burette Reading (ml)</th>
              </tr>
            </thead>
            <tbody>
              {data.systemSuitability.rows.map((r, i) => (
                <tr key={i}>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.weightMg.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.buretteMl.toFixed(2))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right">Mean</td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.systemSuitability.mean.toFixed(2))}
                </td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right">RSD (NMT 2.0 %)</td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.systemSuitability.rsd.toFixed(2))}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.systemSuitability.evaluation} />
        </Section>
        <SignOffFooter pageNum={0} totalPages={6} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 4 — linearity and range */}
      <div className={page}>
        <Section no="6.3" title="Linearity and Range">
          <p className="text-xs font-semibold mb-1">A. Linearity</p>
          <Prep intro={data.linearity.intro} steps={data.linearity.steps} />
          <p className="text-xs font-bold mb-1">{data.linearity.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                <th className="p-2 border border-zinc-300">Concentration (% of nominal)</th>
                <th className="p-2 border border-zinc-300">Weight taken (mg)</th>
                <th className="p-2 border border-zinc-300">Burette Reading (ml)</th>
                <th className="p-2 border border-zinc-300">Mean</th>
              </tr>
            </thead>
            <tbody>
              {data.linearity.rows.map((r) => (
                <tr key={r.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center">{r.levelLabel}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.weightMg.toFixed(1))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {v(r.readings.map((x) => x.toFixed(2)).join(' / '))}
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.mean.toFixed(2))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>
                  Correlation coefficient (r² &gt; 0.995)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.linearity.rSquared)}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.linearity.evaluation} />

          <p className="text-xs font-semibold mb-1">B. Range</p>
          <Prep intro={data.range.intro} steps={data.range.steps} />
          <p className="text-xs font-bold mb-1">{data.range.tableTitle}</p>
          {data.range.groups.map((g) => (
            <table key={g.levelLabel} className="w-full text-xs border-collapse border border-zinc-300 mb-3">
              <thead>
                <tr className={thClass}>
                  <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                  <th className="p-2 border border-zinc-300">Sample ID</th>
                  <th className="p-2 border border-zinc-300">Sample Burette Reading (ml)</th>
                  <th className="p-2 border border-zinc-300">Mean</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.srNo}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                    <td className="p-1.5 border border-zinc-300 text-center">{r.sampleId}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {v(r.readings.map((x) => x.toFixed(2)).join(' / '))}
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.mean.toFixed(2))}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold">
                  <td className="p-1.5 border border-zinc-300 text-right" colSpan={3}>
                    Mean = / SD = / RSD (NMT 2.0 %) =
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {v(`${g.mean.toFixed(2)} / ${g.sd.toFixed(3)} / ${g.rsd.toFixed(2)}`)}
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
          <Evaluation items={data.range.evaluation} />
        </Section>
        <SignOffFooter pageNum={0} totalPages={6} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 5 — precision and intermediate precision */}
      <div className={page}>
        <Section no="6.4" title="Precision">
          <Prep intro={data.precision.intro} steps={data.precision.steps} />
          <p className="text-xs font-bold mb-1">{data.precision.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                <th className="p-2 border border-zinc-300">Sample ID</th>
                <th className="p-2 border border-zinc-300">Amount of preparation used (mg)</th>
                <th className="p-2 border border-zinc-300">Burette Reading (ml)</th>
                <th className="p-2 border border-zinc-300">Content (% of LA)</th>
              </tr>
            </thead>
            <tbody>
              {data.precision.rows.map((r) => (
                <tr key={r.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center">{r.sampleId}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.weightMg.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.buretteMl.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.contentPercent.toFixed(1))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>
                  Mean
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.precision.mean.toFixed(2))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>
                  RSD (NMT 2.0 %)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.precision.rsd.toFixed(2))}</td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.precision.evaluation} />
        </Section>

        <Section no="6.5" title="Intermediate Precision">
          <Prep intro={data.intermediatePrecision.intro} steps={data.intermediatePrecision.steps} />
          <p className="text-xs font-bold mb-1">{data.intermediatePrecision.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16" rowSpan={2}>
                  Sr. No.
                </th>
                <th className="p-2 border border-zinc-300" colSpan={3}>
                  Analyst: 1
                </th>
                <th className="p-2 border border-zinc-300" colSpan={3}>
                  Analyst: 2
                </th>
              </tr>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300">Amount used (mg)</th>
                <th className="p-2 border border-zinc-300">Burette Reading (ml)</th>
                <th className="p-2 border border-zinc-300">Content (% of LA)</th>
                <th className="p-2 border border-zinc-300">Amount used (mg)</th>
                <th className="p-2 border border-zinc-300">Burette Reading (ml)</th>
                <th className="p-2 border border-zinc-300">Content (% of LA)</th>
              </tr>
            </thead>
            <tbody>
              {data.intermediatePrecision.rows.map((r) => (
                <tr key={r.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a1WeightMg.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a1BuretteMl.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a1Content.toFixed(1))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a2WeightMg.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a2BuretteMl.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a2Content.toFixed(1))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={3}>
                  Mean
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.intermediatePrecision.analyst1Mean.toFixed(2))}
                </td>
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  Mean
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.intermediatePrecision.analyst2Mean.toFixed(2))}
                </td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={3}>
                  RSD (NMT 2.0 %)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.intermediatePrecision.analyst1Rsd.toFixed(2))}
                </td>
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  RSD (NMT 2.0 %)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(data.intermediatePrecision.analyst2Rsd.toFixed(2))}
                </td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={6}>
                  Cumulative mean / RSD (n = 12)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(
                    `${data.intermediatePrecision.cumulativeMean.toFixed(2)} / ${data.intermediatePrecision.cumulativeRsd.toFixed(2)}`
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.intermediatePrecision.evaluation} />
        </Section>
        <SignOffFooter pageNum={0} totalPages={6} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 6 — accuracy and conclusion */}
      <div className={page}>
        <Section no="6.6" title="Accuracy">
          <Prep intro={data.accuracy.intro} steps={data.accuracy.steps} />
          <p className="text-xs font-bold mb-1">{data.accuracy.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                <th className="p-2 border border-zinc-300">Sample ID</th>
                <th className="p-2 border border-zinc-300">Amount of reference standard spiked (mg)</th>
                <th className="p-2 border border-zinc-300">Burette Reading (ml)</th>
                <th className="p-2 border border-zinc-300">Amount recovered (mg)</th>
                <th className="p-2 border border-zinc-300">Recovery (98 % to 102 %)</th>
              </tr>
            </thead>
            <tbody>
              {data.accuracy.levels.map((lvl) => (
                <React.Fragment key={lvl.levelLabel}>
                  {lvl.rows.map((r) => (
                    <tr key={`${lvl.levelLabel}-${r.srNo}`}>
                      <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                      <td className="p-1.5 border border-zinc-300 text-center">{r.sampleId}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.spikedMg.toFixed(1))}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.buretteMl.toFixed(2))}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.recoveredMg.toFixed(1))}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.recoveryPercent.toFixed(2))}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-semibold">
                    <td className="p-1.5 border border-zinc-300 text-right" colSpan={5}>
                      {lvl.levelLabel} — Mean = / RSD (NMT 2.0 %) =
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {v(`${lvl.mean.toFixed(2)} / ${lvl.rsd.toFixed(2)}`)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-amber-50 font-bold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={5}>
                  Overall mean recovery / RSD (n = 9)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(`${data.accuracy.overallMean.toFixed(2)} / ${data.accuracy.overallRsd.toFixed(2)}`)}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.accuracy.evaluation} />
        </Section>

        <Section no="7." title="Overall Conclusion">
          <p className="text-xs text-justify">
            {isProtocol ? data.overallConclusion.protocol : data.overallConclusion.report}
          </p>
          {isProtocol && (
            <div className="mt-3 text-xs text-zinc-500">
              <p className="mb-3">_______________________________________________________________</p>
              <p className="mb-3">_______________________________________________________________</p>
              <p>To be completed by the analyst after execution.</p>
            </div>
          )}
        </Section>

        <Section no="8." title="Review Checklist & Completion Record">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 text-left">Particulars</th>
                <th className="p-2 border border-zinc-300 text-left">Compliance</th>
                <th className="p-2 border border-zinc-300 w-28">Checked By</th>
              </tr>
            </thead>
            <tbody>
              {data.reviewChecklist.map((c, i) => (
                <tr key={i}>
                  <td className="p-1.5 border border-zinc-300 font-semibold">{c.particulars}</td>
                  <td className="p-1.5 border border-zinc-300">{c.compliance}</td>
                  <td className="p-1.5 border border-zinc-300">{isProtocol ? '________' : 'Anil Parmar'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section no="9." title="List of Abbreviations">
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <tbody>
              {data.abbreviations.map((a, i) => (
                <tr key={i}>
                  <td className="p-1.5 border border-zinc-300 font-semibold w-24">{a.abbreviation}</td>
                  <td className="p-1.5 border border-zinc-300">{a.expansion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <SignOffFooter pageNum={0} totalPages={6} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>
    </div>
  );
};
