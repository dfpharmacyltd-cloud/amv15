import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { DissolutionUvAMVData } from './dissolutionUvDatabase';
import { createDocxSignOffFooter } from './docxSignOffFooter';
import { FooterSignOffData } from '../types';

interface Options {
  docType: 'protocol' | 'report';
  theme?: string;
  fontFamily?: string;
  fontSize?: number;
  dataMode?: string;
  footerSignOffData?: FooterSignOffData;
}

const TOTAL_WIDTH = 9360;

export async function generateAndDownloadDissolutionUvDocx(data: DissolutionUvAMVData, options: Options) {
  const isProtocol = options.docType === 'protocol';
  const isDemo = (options.dataMode || 'DEMO') === 'DEMO';
  const FONT = options.fontFamily || 'Times New Roman';
  const headerFill = options.theme === 'simple' ? 'D9D9D9' : '1F4E79';
  const headerColor = options.theme === 'simple' ? '000000' : 'FFFFFF';

  /** A protocol carries no measured values: every data cell is an em dash. */
  const v = (value: any) => (isProtocol ? '\u2014' : String(value));

  const border = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '808080' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '808080' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '808080' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '808080' },
  };

  const cell = (
    text: string,
    opts: { bold?: boolean; align?: any; width?: number; fill?: string; span?: number; rowSpan?: number } = {}
  ) =>
    new TableCell({
      borders: border,
      shading: opts.fill ? { fill: opts.fill } : undefined,
      width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
      columnSpan: opts.span,
      rowSpan: opts.rowSpan,
      margins: { top: 40, bottom: 40, left: 90, right: 90 },
      children: [
        new Paragraph({
          alignment: opts.align || AlignmentType.LEFT,
          children: [
            new TextRun({
              text: text === '' || text === undefined || text === null ? ' ' : String(text),
              bold: opts.bold,
              size: 18,
              font: FONT,
              color: opts.fill === headerFill ? headerColor : '000000',
            }),
          ],
        }),
      ],
    });

  const head = (text: string, width?: number, span?: number, rowSpan?: number) =>
    cell(text, { bold: true, align: AlignmentType.CENTER, width, fill: headerFill, span, rowSpan });

  const table = (widths: number[], rows: TableRow[]) =>
    new Table({ width: { size: TOTAL_WIDTH, type: WidthType.DXA }, columnWidths: widths, rows });

  const row = (cells: TableCell[]) => new TableRow({ cantSplit: true, children: cells });

  const para = (
    text: string,
    opts: { bold?: boolean; align?: any; size?: number; italics?: boolean; color?: string; indent?: boolean } = {}
  ) =>
    new Paragraph({
      spacing: { before: 40, after: 40 },
      alignment: opts.align || AlignmentType.JUSTIFIED,
      indent: opts.indent ? { left: 200, hanging: 200 } : undefined,
      children: [
        new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size || 20, font: FONT, color: opts.color }),
      ],
    });

  /** "Medium: 0.1 M Hydrochloric acid; 900 mL" with only the label in bold. */
  const labelled = (label: string, value: string) =>
    new Paragraph({
      spacing: { before: 20, after: 20 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20, font: FONT }),
        new TextRun({ text: value, size: 20, font: FONT }),
      ],
    });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [
        new TextRun({ text, bold: true, size: 22, font: FONT, color: headerFill === '1F4E79' ? '1F4E79' : '000000' }),
      ],
    });

  const prep = (intro: string | undefined, steps: string[] | undefined) => {
    const out: Paragraph[] = [];
    if (intro) out.push(para(intro));
    (steps || []).forEach((s) => out.push(para(s, { indent: true })));
    return out;
  };

  const evaluation = (items: string[]) => [
    para('Evaluation', { bold: true, size: 18 }),
    ...items.map((i) => para(i, { size: 18 })),
  ];

  const m = data.methodology;
  const ss = data.systemSuitability;

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: data.companyName, bold: true, size: 26, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: data.companyAddress, size: 16, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: `${data.documentTitle} ${isProtocol ? 'PROTOCOL' : 'REPORT'}`,
          bold: true,
          size: 24,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: data.documentSubTitle, bold: true, size: 20, font: FONT })],
    }),
    ...(isProtocol
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: '*** PROTOCOL \u2014 NOT AN EXECUTED REPORT ***',
                bold: true,
                size: 20,
                font: FONT,
                color: 'B45309',
              }),
            ],
          }),
        ]
      : []),
    ...(isDemo
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: '*** DEMO / FORMAT-DEMONSTRATION ONLY \u2014 NOT FOR GMP USE ***',
                bold: true,
                size: 20,
                font: FONT,
                color: 'B45309',
              }),
            ],
          }),
        ]
      : []),

    table(
      [2200, 2500, 2200, 2460],
      [
        row([cell('Product Name', { bold: true, fill: 'F2F2F2', width: 2200 }), cell(data.productName.toUpperCase(), { bold: true, span: 3 })]),
        row([cell('Label Claim', { bold: true, fill: 'F2F2F2' }), cell(data.labelClaim, { span: 3 })]),
        row([cell('Test', { bold: true, fill: 'F2F2F2' }), cell(data.testParameter, { bold: true, span: 3 })]),
        row([
          cell(isProtocol ? 'Protocol No.' : 'Report No.', { bold: true, fill: 'F2F2F2' }),
          cell(isProtocol ? data.protocolNo : data.reportNo),
          cell(isProtocol ? 'Protocol Date' : 'Report Date', { bold: true, fill: 'F2F2F2' }),
          cell(isProtocol ? data.protocolDate : data.reportDate),
        ]),
        row([
          cell('Batch No.', { bold: true, fill: 'F2F2F2' }),
          cell(data.batchNo),
          cell('Standard Lot', { bold: true, fill: 'F2F2F2' }),
          cell(data.standardLotNo),
        ]),
        row([
          cell('Format No.', { bold: true, fill: 'F2F2F2' }),
          cell(data.formatNo),
          cell('Supersedes', { bold: true, fill: 'F2F2F2' }),
          cell(data.supersedes),
        ]),
      ]
    ),

    para(''),
    table(
      [1900, 2400, 2100, 1600, 1360],
      [
        row([head('ACTIVITY', 1900), head('DESIGNATION', 2400), head('NAME', 2100), head('SIGNATURE', 1600), head('DATE', 1360)]),
        ...data.signOffs.map((s) =>
          row([
            cell(s.activity, { bold: true }),
            cell(s.designation),
            cell(s.name),
            cell('________________', { align: AlignmentType.CENTER }),
            cell(isProtocol ? '________________' : s.date, { align: AlignmentType.CENTER }),
          ])
        ),
      ]
    ),

    para(''),
    para('Table of contents', { bold: true }),
    table(
      [1400, 6360, 1600],
      [
        row([head('Sr. No.', 1400), head('Contents', 6360), head('Page No.', 1600)]),
        ...data.tableOfContents.map((t) =>
          row([cell(t.srNo, { align: AlignmentType.CENTER }), cell(t.contents), cell(t.pageNo, { align: AlignmentType.CENTER })])
        ),
      ]
    ),

    heading('1. Introduction'),
    para(data.introduction),

    heading('2. Materials, Chemicals, Reagents, Equipment and Methodology used'),
    para('2.1 Material used:', { bold: true }),
    table(
      [1400, 7960],
      [
        row([head('Sr. No.', 1400), head('Material Name', 7960)]),
        ...data.materials.map((x) => row([cell(String(x.srNo), { align: AlignmentType.CENTER }), cell(x.name)])),
      ]
    ),
    para(''),
    para('2.2 Chemicals used:', { bold: true }),
    table(
      [1400, 7960],
      [
        row([head('Sr. No.', 1400), head('Chemicals', 7960)]),
        ...data.chemicals.map((x) => row([cell(String(x.srNo), { align: AlignmentType.CENTER }), cell(x.name)])),
      ]
    ),
    para(''),
    para('2.3 Wavelength used:', { bold: true }),
    table(
      [1400, 7960],
      [
        row([head('Sr. No.', 1400), head('Wavelength', 7960)]),
        ...data.wavelengths.map((x) => row([cell(String(x.srNo), { align: AlignmentType.CENTER }), cell(x.wavelength)])),
      ]
    ),
    para(''),
    para('2.4 Methodology', { bold: true }),
    para(m.heading, { bold: true }),
    labelled('Medium', m.medium),
    labelled(m.apparatus.split(':')[0], m.apparatus.split(':').slice(1).join(':').trim()),
    labelled('Time', m.time),
    labelled('Standard stock solution', m.standardStockSolution),
    labelled('Standard solution', m.standardSolution),
    labelled('Sample solution', m.sampleSolution),
    labelled('Blank', m.blank),
    labelled('Mode', m.mode),
    labelled('Analytical wavelengths', m.analyticalWavelengths),
    para('Analysis:', { bold: true }),
    para(m.analysis),
    para(m.resultFormula, { bold: true }),
    ...m.formulaLegend.map((l) => para(l, { size: 18 })),
    labelled('Tolerances', m.tolerances),

    heading('3. Verification parameters'),

    heading('3.1 System Suitability'),
    ...prep(ss.intro, ss.steps),
    para(ss.tableTitle, { bold: true }),
    table(
      [1400, 3980, 3980],
      [
        row([head('Sr. No.', 1400), head('Standard Weight (mg)', 3980), head('Absorbance', 3980)]),
        ...ss.rows.map((r) =>
          row([
            cell(String(r.srNo), { align: AlignmentType.CENTER }),
            cell(v(r.standardWeightMg.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
          ])
        ),
        ...[
          ['Mean', v(ss.mean.toFixed(4))],
          ['SD', v(ss.sd.toFixed(5))],
          ['% RSD (NMT 2.0 %)', v(ss.rsd.toFixed(2))],
        ].map(([label, value]) =>
          row([
            cell(label, { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
            cell(value, { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          ])
        ),
      ]
    ),
    para(''),
    para('Instrument Qualification Checks', { bold: true }),
    table(
      [3200, 3200, 2960],
      [
        row([head('Parameter', 3200), head('Acceptance Criteria', 3200), head('Observed', 2960)]),
        ...ss.instrumentChecks.map((c) =>
          row([cell(c.parameter, { bold: true }), cell(c.criterion), cell(v(c.observed), { align: AlignmentType.RIGHT })])
        ),
      ]
    ),
    ...evaluation(ss.evaluation),

    heading('3.2 Linearity and Range'),
    para('A. Linearity', { bold: true }),
    ...prep(data.linearity.intro, data.linearity.steps),
    para(data.linearity.tableTitle, { bold: true }),
    table(
      [1200, 2000, 3200, 2960],
      [
        row([head('Sr. No.', 1200), head('Level', 2000), head('Concentration (mg/mL)', 3200), head('Absorbance', 2960)]),
        ...data.linearity.rows.map((r) =>
          row([
            cell(String(r.srNo), { align: AlignmentType.CENTER }),
            cell(r.levelLabel, { align: AlignmentType.CENTER }),
            cell(v(String(r.concentrationMgMl)), { align: AlignmentType.RIGHT }),
            cell(v(r.absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
          ])
        ),
        row([
          cell('Correlation coefficient (r\u00B2 > 0.995)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 3 }),
          cell(v(String(data.linearity.rSquared)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
      ]
    ),
    ...evaluation(data.linearity.evaluation),

    para('B. Range', { bold: true }),
    para(data.range.intro),
    para(data.range.tableTitle, { bold: true }),
    ...data.range.groups.flatMap((g) => [
      table(
        [1400, 3980, 3980],
        [
          row([head('Sr. No.', 1400), head('Sample ID', 3980), head('Absorbance', 3980)]),
          ...g.rows.map((r) =>
            row([
              cell(String(r.srNo), { align: AlignmentType.CENTER }),
              cell(r.sampleId, { align: AlignmentType.CENTER }),
              cell(v(r.absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
            ])
          ),
          row([
            cell('Mean / SD / % RSD', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
            cell(v(`${g.mean.toFixed(4)} / ${g.sd.toFixed(5)} / ${g.rsd.toFixed(2)}`), {
              bold: true,
              align: AlignmentType.RIGHT,
              fill: 'F2F2F2',
            }),
          ]),
        ]
      ),
      para(''),
    ]),
    ...evaluation(data.range.evaluation),

    heading('3.3 Precision'),
    ...prep(data.precision.intro, data.precision.steps),
    para(data.precision.tableTitle, { bold: true }),
    table(
      [1600, 3600, 4160],
      [
        row([head('Vessel No.', 1600), head('Absorbance', 3600), head('% of Labelled Amount Dissolved', 4160)]),
        ...data.precision.rows.map((r) =>
          row([
            cell(String(r.vesselNo), { align: AlignmentType.CENTER }),
            cell(v(r.absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
            cell(v(r.percentReleased.toFixed(2)), { align: AlignmentType.RIGHT }),
          ])
        ),
        ...[
          ['Mean', v(data.precision.mean.toFixed(2))],
          ['SD', v(data.precision.sd.toFixed(3))],
          ['% RSD (NMT 2.0 %)', v(data.precision.rsd.toFixed(2))],
          [
            `Range (min \u2013 max) against ${data.precision.qLimit}`,
            v(`${data.precision.minReleased.toFixed(2)} \u2013 ${data.precision.maxReleased.toFixed(2)}`),
          ],
        ].map(([label, value]) =>
          row([
            cell(label, { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
            cell(value, { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          ])
        ),
      ]
    ),
    ...evaluation(data.precision.evaluation),

    heading('3.4 Intermediate Precision'),
    ...prep(data.intermediatePrecision.intro, data.intermediatePrecision.steps),
    para(data.intermediatePrecision.tableTitle, { bold: true }),
    table(
      [1360, 2000, 2000, 2000, 2000],
      [
        row([head('Vessel', 1360, undefined, 2), head('Analyst 1', 4000, 2), head('Analyst 2', 4000, 2)]),
        row([head('Absorbance', 2000), head('% Dissolved', 2000), head('Absorbance', 2000), head('% Dissolved', 2000)]),
        ...data.intermediatePrecision.rows.map((r) =>
          row([
            cell(String(r.vesselNo), { align: AlignmentType.CENTER }),
            cell(v(r.a1Absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
            cell(v(r.a1Released.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.a2Absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
            cell(v(r.a2Released.toFixed(2)), { align: AlignmentType.RIGHT }),
          ])
        ),
        row([
          cell('Mean', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
          cell(v(data.intermediatePrecision.analyst1Mean.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          cell('Mean', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          cell(v(data.intermediatePrecision.analyst2Mean.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
        row([
          cell('% RSD', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
          cell(v(data.intermediatePrecision.analyst1Rsd.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          cell('% RSD', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          cell(v(data.intermediatePrecision.analyst2Rsd.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
        row([
          cell('Cumulative mean / % RSD (n = 12)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 4 }),
          cell(
            v(
              `${data.intermediatePrecision.cumulativeMean.toFixed(2)} / ${data.intermediatePrecision.cumulativeRsd.toFixed(2)}`
            ),
            { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }
          ),
        ]),
      ]
    ),
    ...evaluation(data.intermediatePrecision.evaluation),

    heading('3.5 Accuracy'),
    ...prep(data.accuracy.intro, data.accuracy.steps),
    para(data.accuracy.tableTitle, { bold: true }),
    table(
      [900, 1300, 1900, 1700, 1900, 1660],
      [
        row([
          head('Sr. No.', 900),
          head('Level', 1300),
          head('Amount spiked (mg)', 1900),
          head('Absorbance', 1700),
          head('Amount recovered (mg)', 1900),
          head('Recovery (98 % to 102 %)', 1660),
        ]),
        ...data.accuracy.levels.flatMap((lvl) => [
          ...lvl.rows.map((r) =>
            row([
              cell(String(r.srNo), { align: AlignmentType.CENTER }),
              cell(lvl.levelLabel, { align: AlignmentType.CENTER }),
              cell(v(r.spikedMg.toFixed(1)), { align: AlignmentType.RIGHT }),
              cell(v(r.absorbance.toFixed(4)), { align: AlignmentType.RIGHT }),
              cell(v(r.recoveredMg.toFixed(1)), { align: AlignmentType.RIGHT }),
              cell(v(r.recoveryPercent.toFixed(2)), { align: AlignmentType.RIGHT }),
            ])
          ),
          row([
            cell(`${lvl.levelLabel} \u2014 Mean / % RSD`, { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 5 }),
            cell(v(`${lvl.mean.toFixed(2)} / ${lvl.rsd.toFixed(2)}`), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          ]),
        ]),
        row([
          cell('Overall mean recovery / % RSD (n = 9)', { bold: true, align: AlignmentType.RIGHT, fill: 'FFF3CD', span: 5 }),
          cell(v(`${data.accuracy.overallMean.toFixed(2)} / ${data.accuracy.overallRsd.toFixed(2)}`), {
            bold: true,
            align: AlignmentType.RIGHT,
            fill: 'FFF3CD',
          }),
        ]),
      ]
    ),
    ...evaluation(data.accuracy.evaluation),

    heading('4. Conclusion'),
    para(isProtocol ? data.conclusionProtocol : data.conclusionReport),
    ...(isProtocol
      ? [
          para('_______________________________________________________________', { size: 18 }),
          para('_______________________________________________________________', { size: 18 }),
          para('To be completed by the analyst after execution.', { italics: true, size: 18 }),
        ]
      : []),
  ];

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 1440, left: 720 } } },
        footers: {
          default: createDocxSignOffFooter({
            docType: isProtocol ? 'protocol' : 'report',
            fontFamily: FONT,
            dataMode: (options.dataMode as any) || 'DEMO',
            footerData: options.footerSignOffData,
            theme: options.theme,
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = data.productName.replace(/[^A-Za-z0-9]+/g, '_');
  const docNo = (isProtocol ? data.protocolNo : data.reportNo).replace(/[^A-Za-z0-9-]+/g, '_');
  saveAs(blob, `AMV_${isProtocol ? 'Protocol' : 'Report'}_Dissolution_UV_${safeName}_${docNo}.docx`);
}
