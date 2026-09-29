import React from 'react';
import { DissolutionUvAMVData } from '../services/dissolutionUvDatabase';
import { SignOffFooter } from './SignOffFooter';
import type { FooterSignOffData } from '../types';

interface Props {
  seed: string;
  data: DissolutionUvAMVData;
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
  footerSignOffData: FooterSignOffData;
  onUpdateFooterSignOffData: (d: FooterSignOffData) => void;
}

export const DissolutionUvDocumentViewer: React.FC<Props> = ({
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

  const page = 'page-card bg-white border border-zinc-300 rounded-lg shadow-sm p-6 sm:p-8 max-w-5xl mx-auto mb-6';

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

  const m = data.methodology;

  return (
    <div style={{ fontFamily, fontSize: `${fontSize}px` }}>
      <div className="flex flex-wrap gap-2 mb-4 max-w-5xl mx-auto">
        <button onClick={onDownloadProtocol} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1F4E79] text-white">
          Download Protocol
        </button>
        <button onClick={onDownloadReport} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1F4E79] text-white">
          Download Report
        </button>
        <button onClick={onDownloadBoth} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-zinc-300 text-zinc-700">
          Download Both
        </button>
      </div>

      {/* PAGE 1 */}
      <div className={page}>
        <h2 className={`text-base font-bold text-center mb-0.5 ${headingClass}`}>{data.companyName}</h2>
        <p className="text-center text-[10px] text-zinc-600 mb-1">{data.companyAddress}</p>
        <p className="text-center text-sm font-bold mb-0.5">
          {data.documentTitle} {isProtocol ? 'PROTOCOL' : 'REPORT'}
        </p>
        <p className="text-center text-xs font-semibold mb-3">{data.documentSubTitle}</p>

        {isProtocol && (
          <p className="text-center text-xs font-bold text-amber-700 mb-2">*** PROTOCOL — NOT AN EXECUTED REPORT ***</p>
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
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Label Claim</td>
              <td className="p-2 border border-zinc-300" colSpan={3}>
                {data.labelClaim}
              </td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">Test</td>
              <td className="p-2 border border-zinc-300 font-bold" colSpan={3}>
                {data.testParameter}
              </td>
            </tr>
            <tr>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50">{isProtocol ? 'Protocol No.' : 'Report No.'}</td>
              <td className="p-2 border border-zinc-300">{isProtocol ? data.protocolNo : data.reportNo}</td>
              <td className="p-2 border border-zinc-300 font-bold bg-zinc-50 w-32">{isProtocol ? 'Protocol Date' : 'Report Date'}</td>
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
                <td className="p-1.5 border border-zinc-300 text-center">________________</td>
                <td className="p-1.5 border border-zinc-300 text-center">{isProtocol ? '________________' : s.date}</td>
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
        <SignOffFooter pageNum={0} totalPages={5} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 2 — introduction and methodology */}
      <div className={page}>
        <Section no="1." title="Introduction:">
          <p className="text-xs text-justify">{data.introduction}</p>
        </Section>

        <Section no="2." title="Materials, Chemicals, Reagents, Equipment and Methodology used:">
          <p className="text-xs font-bold mb-1">2.1 Material used:</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-20">Sr. No.</th>
                <th className="p-2 border border-zinc-300 text-left">Material Name</th>
              </tr>
            </thead>
            <tbody>
              {data.materials.map((x) => (
                <tr key={x.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center">{x.srNo}</td>
                  <td className="p-1.5 border border-zinc-300">{x.name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold mb-1">2.2 Chemicals used:</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-20">Sr. No.</th>
                <th className="p-2 border border-zinc-300 text-left">Chemicals</th>
              </tr>
            </thead>
            <tbody>
              {data.chemicals.map((x) => (
                <tr key={x.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center">{x.srNo}</td>
                  <td className="p-1.5 border border-zinc-300">{x.name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold mb-1">2.3 Wavelength used:</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-20">Sr. No.</th>
                <th className="p-2 border border-zinc-300 text-left">Wavelength</th>
              </tr>
            </thead>
            <tbody>
              {data.wavelengths.map((x) => (
                <tr key={x.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center">{x.srNo}</td>
                  <td className="p-1.5 border border-zinc-300">{x.wavelength}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold mb-1">2.4 Methodology</p>
          <div className="text-xs leading-relaxed">
            <p className="font-bold">{m.heading}</p>
            <p>
              <span className="font-bold">Medium:</span> {m.medium}
            </p>
            <p>
              <span className="font-bold">{m.apparatus.split(':')[0]}:</span> {m.apparatus.split(':').slice(1).join(':').trim()}
            </p>
            <p>
              <span className="font-bold">Time:</span> {m.time}
            </p>
            <p className="mt-1">
              <span className="font-bold">Standard stock solution:</span> {m.standardStockSolution}
            </p>
            <p>
              <span className="font-bold">Standard solution:</span> {m.standardSolution}
            </p>
            <p>
              <span className="font-bold">Sample solution:</span> {m.sampleSolution}
            </p>
            <p>
              <span className="font-bold">Blank:</span> {m.blank}
            </p>
            <p>
              <span className="font-bold">Mode:</span> {m.mode}
            </p>
            <p>
              <span className="font-bold">Analytical wavelengths:</span> {m.analyticalWavelengths}
            </p>
            <p className="mt-1 font-bold">Analysis:</p>
            <p>{m.analysis}</p>
            <p className="font-mono my-1">{m.resultFormula}</p>
            {m.formulaLegend.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <p className="mt-1">
              <span className="font-bold">Tolerances:</span> {m.tolerances}
            </p>
          </div>
        </Section>
        <SignOffFooter pageNum={0} totalPages={5} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 3 — system suitability and linearity */}
      <div className={page}>
        <h3 className={`text-xs font-bold uppercase mb-2 ${headingClass}`}>3. Verification parameters:</h3>

        <Section no="3.1" title="System Suitability">
          <Prep intro={data.systemSuitability.intro} steps={data.systemSuitability.steps} />
          <p className="text-xs font-bold mb-1">{data.systemSuitability.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-20">Sr. No.</th>
                <th className="p-2 border border-zinc-300">Standard Weight (mg)</th>
                <th className="p-2 border border-zinc-300">Absorbance</th>
              </tr>
            </thead>
            <tbody>
              {data.systemSuitability.rows.map((r) => (
                <tr key={r.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.standardWeightMg.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.absorbance.toFixed(4))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  Mean
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.systemSuitability.mean.toFixed(4))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  SD
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.systemSuitability.sd.toFixed(5))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  % RSD (NMT 2.0 %)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.systemSuitability.rsd.toFixed(2))}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold mb-1">Instrument Qualification Checks</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 text-left">Parameter</th>
                <th className="p-2 border border-zinc-300 text-left">Acceptance Criteria</th>
                <th className="p-2 border border-zinc-300 text-right">Observed</th>
              </tr>
            </thead>
            <tbody>
              {data.systemSuitability.instrumentChecks.map((c, i) => (
                <tr key={i}>
                  <td className="p-1.5 border border-zinc-300 font-semibold">{c.parameter}</td>
                  <td className="p-1.5 border border-zinc-300">{c.criterion}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(c.observed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Evaluation items={data.systemSuitability.evaluation} />
        </Section>

        <Section no="3.2" title="Linearity and Range">
          <p className="text-xs font-semibold mb-1">A. Linearity</p>
          <Prep intro={data.linearity.intro} steps={data.linearity.steps} />
          <p className="text-xs font-bold mb-1">{data.linearity.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300 mb-3">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                <th className="p-2 border border-zinc-300">Level</th>
                <th className="p-2 border border-zinc-300">Concentration (mg/mL)</th>
                <th className="p-2 border border-zinc-300">Absorbance</th>
              </tr>
            </thead>
            <tbody>
              {data.linearity.rows.map((r) => (
                <tr key={r.srNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-center">{r.levelLabel}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.concentrationMgMl)}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.absorbance.toFixed(4))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={3}>
                  Correlation coefficient (r² &gt; 0.995)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.linearity.rSquared)}</td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.linearity.evaluation} />

          <p className="text-xs font-semibold mb-1">B. Range</p>
          <Prep intro={data.range.intro} />
          <p className="text-xs font-bold mb-1">{data.range.tableTitle}</p>
          {data.range.groups.map((g) => (
            <table key={g.levelLabel} className="w-full text-xs border-collapse border border-zinc-300 mb-3">
              <thead>
                <tr className={thClass}>
                  <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                  <th className="p-2 border border-zinc-300">Sample ID</th>
                  <th className="p-2 border border-zinc-300">Absorbance</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.srNo}>
                    <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.srNo}</td>
                    <td className="p-1.5 border border-zinc-300 text-center">{r.sampleId}</td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.absorbance.toFixed(4))}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold">
                  <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                    Mean / SD / % RSD
                  </td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">
                    {v(`${g.mean.toFixed(4)} / ${g.sd.toFixed(5)} / ${g.rsd.toFixed(2)}`)}
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
          <Evaluation items={data.range.evaluation} />
        </Section>
        <SignOffFooter pageNum={0} totalPages={5} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 4 — precision and intermediate precision */}
      <div className={page}>
        <Section no="3.3" title="Precision">
          <Prep intro={data.precision.intro} steps={data.precision.steps} />
          <p className="text-xs font-bold mb-1">{data.precision.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-24">Vessel No.</th>
                <th className="p-2 border border-zinc-300">Absorbance</th>
                <th className="p-2 border border-zinc-300">% of Labelled Amount Dissolved</th>
              </tr>
            </thead>
            <tbody>
              {data.precision.rows.map((r) => (
                <tr key={r.vesselNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.vesselNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.absorbance.toFixed(4))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.percentReleased.toFixed(2))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  Mean
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.precision.mean.toFixed(2))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  SD
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.precision.sd.toFixed(3))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  % RSD (NMT 2.0 %)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.precision.rsd.toFixed(2))}</td>
              </tr>
              <tr className="bg-amber-50 font-bold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  Range (min – max) against {data.precision.qLimit}
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(`${data.precision.minReleased.toFixed(2)} – ${data.precision.maxReleased.toFixed(2)}`)}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.precision.evaluation} />
        </Section>

        <Section no="3.4" title="Intermediate Precision">
          <Prep intro={data.intermediatePrecision.intro} steps={data.intermediatePrecision.steps} />
          <p className="text-xs font-bold mb-1">{data.intermediatePrecision.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-20" rowSpan={2}>
                  Vessel
                </th>
                <th className="p-2 border border-zinc-300" colSpan={2}>
                  Analyst 1
                </th>
                <th className="p-2 border border-zinc-300" colSpan={2}>
                  Analyst 2
                </th>
              </tr>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300">Absorbance</th>
                <th className="p-2 border border-zinc-300">% Dissolved</th>
                <th className="p-2 border border-zinc-300">Absorbance</th>
                <th className="p-2 border border-zinc-300">% Dissolved</th>
              </tr>
            </thead>
            <tbody>
              {data.intermediatePrecision.rows.map((r) => (
                <tr key={r.vesselNo}>
                  <td className="p-1.5 border border-zinc-300 text-center font-semibold">{r.vesselNo}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a1Absorbance.toFixed(4))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a1Released.toFixed(2))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a2Absorbance.toFixed(4))}</td>
                  <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.a2Released.toFixed(2))}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  Mean
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.intermediatePrecision.analyst1Mean.toFixed(2))}</td>
                <td className="p-1.5 border border-zinc-300 text-right">Mean</td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.intermediatePrecision.analyst2Mean.toFixed(2))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={2}>
                  % RSD
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.intermediatePrecision.analyst1Rsd.toFixed(2))}</td>
                <td className="p-1.5 border border-zinc-300 text-right">% RSD</td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(data.intermediatePrecision.analyst2Rsd.toFixed(2))}</td>
              </tr>
              <tr className="bg-zinc-50 font-semibold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={4}>
                  Cumulative mean / % RSD (n = 12)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(`${data.intermediatePrecision.cumulativeMean.toFixed(2)} / ${data.intermediatePrecision.cumulativeRsd.toFixed(2)}`)}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.intermediatePrecision.evaluation} />
        </Section>
        <SignOffFooter pageNum={0} totalPages={5} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>

      {/* PAGE 5 — accuracy and conclusion */}
      <div className={page}>
        <Section no="3.5" title="Accuracy">
          <Prep intro={data.accuracy.intro} steps={data.accuracy.steps} />
          <p className="text-xs font-bold mb-1">{data.accuracy.tableTitle}</p>
          <table className="w-full text-xs border-collapse border border-zinc-300">
            <thead>
              <tr className={thClass}>
                <th className="p-2 border border-zinc-300 w-16">Sr. No.</th>
                <th className="p-2 border border-zinc-300">Level</th>
                <th className="p-2 border border-zinc-300">Amount spiked (mg)</th>
                <th className="p-2 border border-zinc-300">Absorbance</th>
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
                      <td className="p-1.5 border border-zinc-300 text-center">{lvl.levelLabel}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.spikedMg.toFixed(1))}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.absorbance.toFixed(4))}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.recoveredMg.toFixed(1))}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-mono">{v(r.recoveryPercent.toFixed(2))}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-semibold">
                    <td className="p-1.5 border border-zinc-300 text-right" colSpan={5}>
                      {lvl.levelLabel} — Mean / % RSD
                    </td>
                    <td className="p-1.5 border border-zinc-300 text-right font-mono">
                      {v(`${lvl.mean.toFixed(2)} / ${lvl.rsd.toFixed(2)}`)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-amber-50 font-bold">
                <td className="p-1.5 border border-zinc-300 text-right" colSpan={5}>
                  Overall mean recovery / % RSD (n = 9)
                </td>
                <td className="p-1.5 border border-zinc-300 text-right font-mono">
                  {v(`${data.accuracy.overallMean.toFixed(2)} / ${data.accuracy.overallRsd.toFixed(2)}`)}
                </td>
              </tr>
            </tbody>
          </table>
          <Evaluation items={data.accuracy.evaluation} />
        </Section>

        <Section no="4." title="Conclusion:">
          <p className="text-xs text-justify">{isProtocol ? data.conclusionProtocol : data.conclusionReport}</p>
          {isProtocol && (
            <div className="mt-3 text-xs text-zinc-500">
              <p className="mb-3">_______________________________________________________________</p>
              <p className="mb-3">_______________________________________________________________</p>
              <p>To be completed by the analyst after execution.</p>
            </div>
          )}
        </Section>
        <SignOffFooter pageNum={0} totalPages={5} dataMode={dataMode as any} footerData={footerSignOffData} />
      </div>
    </div>
  );
};
