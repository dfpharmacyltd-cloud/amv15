import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import { TitrationAMVData } from './titrationDatabase';
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

export async function generateAndDownloadTitrationDocx(data: TitrationAMVData, options: Options) {
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

  const cell = (text: string, opts: { bold?: boolean; align?: any; width?: number; fill?: string; span?: number } = {}) =>
    new TableCell({
      borders: border,
      shading: opts.fill ? { fill: opts.fill } : undefined,
      width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
      columnSpan: opts.span,
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

  const headerCell = (text: string, width?: number, span?: number) =>
    cell(text, { bold: true, align: AlignmentType.CENTER, width, fill: headerFill, span });

  const table = (widths: number[], rows: TableRow[]) =>
    new Table({ width: { size: TOTAL_WIDTH, type: WidthType.DXA }, columnWidths: widths, rows });

  const row = (cells: TableCell[]) => new TableRow({ cantSplit: true, children: cells });

  const para = (text: string, opts: { bold?: boolean; align?: any; size?: number; italics?: boolean; color?: string; indent?: boolean } = {}) =>
    new Paragraph({
      spacing: { before: 40, after: 40 },
      alignment: opts.align || AlignmentType.JUSTIFIED,
      indent: opts.indent ? { left: 200, hanging: 200 } : undefined,
      children: [
        new TextRun({
          text,
          bold: opts.bold,
          italics: opts.italics,
          size: opts.size || 20,
          font: FONT,
          color: opts.color,
        }),
      ],
    });

  /** "Mode: Direct titration" with only the label in bold, as in the house format. */
  const labelled = (label: string, value: string, sep = ': ') =>
    new Paragraph({
      spacing: { before: 20, after: 20 },
      children: [
        new TextRun({ text: `${label}${sep}`, bold: true, size: 20, font: FONT }),
        new TextRun({ text: value, size: 20, font: FONT }),
      ],
    });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [new TextRun({ text, bold: true, size: 22, font: FONT, color: headerFill === '1F4E79' ? '1F4E79' : '000000' })],
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
          text: `ANALYTICAL METHOD VERIFICATION ${isProtocol ? 'PROTOCOL' : 'REPORT'}`,
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
              new TextRun({ text: '*** PROTOCOL \u2014 NOT AN EXECUTED REPORT ***', bold: true, size: 20, font: FONT, color: 'B45309' }),
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
        row([cell('Label Claim', { bold: true, fill: 'F2F2F2' }), cell(data.labelClaim, { span: 3 })]),
      ]
    ),

    para(''),
    table(
      [1900, 2400, 2100, 1600, 1360],
      [
        row([headerCell('ACTIVITY', 1900), headerCell('DESIGNATION', 2400), headerCell('NAME', 2100), headerCell('SIGNATURE', 1600), headerCell('DATE', 1360)]),
        ...data.signOffs.map((s) =>
          row([
            cell(s.activity, { bold: true }),
            cell(s.designation),
            cell(s.name),
            cell(isProtocol ? '________________' : ''),
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
        row([headerCell('Sr. No.', 1400), headerCell('Contents', 6360), headerCell('Page No.', 1600)]),
        ...data.tableOfContents.map((t) =>
          row([cell(t.srNo, { align: AlignmentType.CENTER }), cell(t.contents), cell(t.pageNo, { align: AlignmentType.CENTER })])
        ),
      ]
    ),

    heading('1. OBJECTIVE'),
    para(data.objective),

    heading('2. SCOPE'),
    para(data.scope),

    heading('3. REFERENCE DOCUMENTS & VERIFICATION DETAILS'),
    table(
      [3000, 6360],
      [
        row([cell('Reference', { bold: true, fill: 'F2F2F2', width: 3000 }), cell(data.verificationDetails.reference)]),
        row([cell('(a) Type of Verification', { bold: true, fill: 'F2F2F2' }), cell(data.verificationDetails.typeOfVerification)]),
        row([cell('(b) Test to be Verified', { bold: true, fill: 'F2F2F2' }), cell(data.verificationDetails.testToBeVerified)]),
        row([cell('(c) Verification Team', { bold: true, fill: 'F2F2F2' }), cell(data.verificationDetails.verificationTeam)]),
        row([cell('(d) Experimental Details', { bold: true, fill: 'F2F2F2' }), cell(data.verificationDetails.experimentalDetails)]),
      ]
    ),

    heading('4. ANALYTICAL METHOD SUMMARY'),
    para('4.1 Titrimetric Conditions', { bold: true }),
    para(data.methodSummary.conditionsText),
    ...(data.methodSummary.note ? [para(`Note: ${data.methodSummary.note}`)] : []),

    para('4.2 Preparation of Solutions', { bold: true }),
    table(
      [3000, 6360],
      [
        row([headerCell('Solution', 3000), headerCell('Preparation Procedure', 6360)]),
        ...data.methodSummary.preparations.map((pr) => row([cell(pr.solution, { bold: true }), cell(pr.procedure)])),
      ]
    ),

    para('4.3 Calculation Formula', { bold: true }),
    para(data.methodSummary.formula, { bold: true }),
    para(data.methodSummary.formulaLegend),
    ...(data.methodology.factorNote ? [para(data.methodology.factorNote, { bold: true, size: 18, color: 'B45309' })] : []),

    para('4.4 Materials, Chemicals and Reference Standards', { bold: true }),
    table(
      [900, 3700, 2660, 2100],
      [
        row([
          headerCell('Sr. No.', 900),
          headerCell('Name of Material / Chemical / Standard', 3700),
          headerCell('Type', 2660),
          headerCell('Batch / Lot No.', 2100),
        ]),
        ...data.materialsTable.map((m) =>
          row([cell(String(m.srNo), { align: AlignmentType.CENTER }), cell(m.name), cell(m.type), cell(m.batchNo)])
        ),
      ]
    ),

    para('4.5 Methodology', { bold: true }),
    para(data.methodology.assayHeading, { bold: true }),
    para(data.methodology.standardHeading, { bold: true }),
    para('Procedure', { bold: true }),
    labelled('Sample', data.methodology.sampleText),
    para('Titrimetric system', { bold: true }),
    labelled('Mode', data.methodology.mode),
    labelled('Titrant', data.methodology.titrant),
    labelled('Endpoint detection', data.methodology.endpointDetection),
    labelled('Blank', data.methodology.blank),
    labelled('Analysis', data.methodology.analysis),

    heading('5. SUMMARY OF VERIFICATION PARAMETERS & ACCEPTANCE CRITERIA'),
    table(
      [700, 2200, 4160, 2300],
      [
        row([
          headerCell('Sr.', 700),
          headerCell('Parameter', 2200),
          headerCell('Acceptance Criteria', 4160),
          headerCell('Verification Requirement', 2300),
        ]),
        ...data.verificationParameters.map((vp) =>
          row([
            cell(String(vp.srNo), { align: AlignmentType.CENTER }),
            cell(vp.parameter, { bold: true }),
            cell(vp.acceptanceCriteria),
            cell(vp.verificationRequirement),
          ])
        ),
      ]
    ),

    heading('6. VERIFICATION PARAMETERS \u2014 RESULTS'),

    heading('6.1 Specificity'),
    ...prep(data.specificity.intro, data.specificity.steps),
    table(
      [3120, 3120, 3120],
      [
        row([headerCell('Solution', 3120), headerCell('Observation', 3120), headerCell('Interference', 3120)]),
        ...data.specificity.rows.map((r) => row([cell(r.solution), cell(v(r.observation)), cell(v(r.interference))])),
      ]
    ),
    ...evaluation(data.specificity.evaluation),

    heading('6.2 System Suitability'),
    ...prep(data.systemSuitability.intro, data.systemSuitability.steps),
    para(data.systemSuitability.tableTitle, { bold: true }),
    table(
      [4680, 4680],
      [
        row([headerCell('Working Standard Weight (mg)', 4680), headerCell('Burette Reading (ml)', 4680)]),
        ...data.systemSuitability.rows.map((r) =>
          row([cell(v(r.weightMg.toFixed(2)), { align: AlignmentType.RIGHT }), cell(v(r.buretteMl.toFixed(2)), { align: AlignmentType.RIGHT })])
        ),
        row([cell('Mean', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }), cell(v(data.systemSuitability.mean.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' })]),
        row([cell('RSD (NMT 2.0 %)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }), cell(v(data.systemSuitability.rsd.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' })]),
      ]
    ),
    ...evaluation(data.systemSuitability.evaluation),

    heading('6.3 Linearity and Range'),
    para('A. Linearity', { bold: true }),
    ...prep(data.linearity.intro, data.linearity.steps),
    para(data.linearity.tableTitle, { bold: true }),
    table(
      [1000, 2200, 2000, 2560, 1600],
      [
        row([
          headerCell('Sr. No.', 1000),
          headerCell('Concentration (% of nominal)', 2200),
          headerCell('Weight taken (mg)', 2000),
          headerCell('Burette Reading (ml)', 2560),
          headerCell('Mean', 1600),
        ]),
        ...data.linearity.rows.map((r) =>
          row([
            cell(String(r.srNo), { align: AlignmentType.CENTER }),
            cell(r.levelLabel, { align: AlignmentType.CENTER }),
            cell(v(r.weightMg.toFixed(1)), { align: AlignmentType.RIGHT }),
            cell(v(r.readings.map((x) => x.toFixed(2)).join(' / ')), { align: AlignmentType.RIGHT }),
            cell(v(r.mean.toFixed(2)), { align: AlignmentType.RIGHT }),
          ])
        ),
        row([
          cell('Correlation coefficient (r\u00B2 > 0.995)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 4 }),
          cell(v(String(data.linearity.rSquared)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
      ]
    ),
    ...evaluation(data.linearity.evaluation),

    para('B. Range', { bold: true }),
    ...prep(data.range.intro, data.range.steps),
    para(data.range.tableTitle, { bold: true }),
    ...data.range.groups.flatMap((g) => [
      table(
        [1000, 2200, 4560, 1600],
        [
          row([headerCell('Sr. No.', 1000), headerCell('Sample ID', 2200), headerCell('Sample Burette Reading (ml)', 4560), headerCell('Mean', 1600)]),
          ...g.rows.map((r) =>
            row([
              cell(String(r.srNo), { align: AlignmentType.CENTER }),
              cell(r.sampleId, { align: AlignmentType.CENTER }),
              cell(v(r.readings.map((x) => x.toFixed(2)).join(' / ')), { align: AlignmentType.RIGHT }),
              cell(v(r.mean.toFixed(2)), { align: AlignmentType.RIGHT }),
            ])
          ),
          row([
            cell('Mean = / SD = / RSD (NMT 2.0 %) =', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 3 }),
            cell(v(`${g.mean.toFixed(2)} / ${g.sd.toFixed(3)} / ${g.rsd.toFixed(2)}`), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          ]),
        ]
      ),
      para(''),
    ]),
    ...evaluation(data.range.evaluation),

    heading('6.4 Precision'),
    ...prep(data.precision.intro, data.precision.steps),
    para(data.precision.tableTitle, { bold: true }),
    table(
      [1000, 1800, 2560, 2000, 2000],
      [
        row([
          headerCell('Sr. No.', 1000),
          headerCell('Sample ID', 1800),
          headerCell('Amount of preparation used (mg)', 2560),
          headerCell('Burette Reading (ml)', 2000),
          headerCell('Content (% of LA)', 2000),
        ]),
        ...data.precision.rows.map((r) =>
          row([
            cell(String(r.srNo), { align: AlignmentType.CENTER }),
            cell(r.sampleId, { align: AlignmentType.CENTER }),
            cell(v(r.weightMg.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.buretteMl.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.contentPercent.toFixed(1)), { align: AlignmentType.RIGHT }),
          ])
        ),
        row([
          cell('Mean', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 4 }),
          cell(v(data.precision.mean.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
        row([
          cell('RSD (NMT 2.0 %)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 4 }),
          cell(v(data.precision.rsd.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
      ]
    ),
    ...evaluation(data.precision.evaluation),

    heading('6.5 Intermediate Precision'),
    ...prep(data.intermediatePrecision.intro, data.intermediatePrecision.steps),
    para(data.intermediatePrecision.tableTitle, { bold: true }),
    table(
      [960, 1400, 1400, 1400, 1400, 1400, 1400],
      [
        row([headerCell('Sr. No.', 960), headerCell('Analyst: 1', 4200, 3), headerCell('Analyst: 2', 4200, 3)]),
        row([
          headerCell('', 960),
          headerCell('Amount used (mg)', 1400),
          headerCell('Burette (ml)', 1400),
          headerCell('Content (% of LA)', 1400),
          headerCell('Amount used (mg)', 1400),
          headerCell('Burette (ml)', 1400),
          headerCell('Content (% of LA)', 1400),
        ]),
        ...data.intermediatePrecision.rows.map((r) =>
          row([
            cell(String(r.srNo), { align: AlignmentType.CENTER }),
            cell(v(r.a1WeightMg.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.a1BuretteMl.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.a1Content.toFixed(1)), { align: AlignmentType.RIGHT }),
            cell(v(r.a2WeightMg.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.a2BuretteMl.toFixed(2)), { align: AlignmentType.RIGHT }),
            cell(v(r.a2Content.toFixed(1)), { align: AlignmentType.RIGHT }),
          ])
        ),
        row([
          cell('Mean', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 3 }),
          cell(v(data.intermediatePrecision.analyst1Mean.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          cell('Mean', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
          cell(v(data.intermediatePrecision.analyst2Mean.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
        row([
          cell('RSD (NMT 2.0 %)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 3 }),
          cell(v(data.intermediatePrecision.analyst1Rsd.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          cell('RSD (NMT 2.0 %)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 2 }),
          cell(v(data.intermediatePrecision.analyst2Rsd.toFixed(2)), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
        ]),
        row([
          cell('Cumulative mean / RSD (n = 12)', { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 6 }),
          cell(
            v(`${data.intermediatePrecision.cumulativeMean.toFixed(2)} / ${data.intermediatePrecision.cumulativeRsd.toFixed(2)}`),
            { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }
          ),
        ]),
      ]
    ),
    ...evaluation(data.intermediatePrecision.evaluation),

    heading('6.6 Accuracy'),
    ...prep(data.accuracy.intro, data.accuracy.steps),
    para(data.accuracy.tableTitle, { bold: true }),
    table(
      [900, 1400, 2200, 1700, 1700, 1460],
      [
        row([
          headerCell('Sr. No.', 900),
          headerCell('Sample ID', 1400),
          headerCell('Amount of reference standard spiked (mg)', 2200),
          headerCell('Burette Reading (ml)', 1700),
          headerCell('Amount recovered (mg)', 1700),
          headerCell('Recovery (98 % to 102 %)', 1460),
        ]),
        ...data.accuracy.levels.flatMap((lvl) => [
          ...lvl.rows.map((r) =>
            row([
              cell(String(r.srNo), { align: AlignmentType.CENTER }),
              cell(r.sampleId, { align: AlignmentType.CENTER }),
              cell(v(r.spikedMg.toFixed(1)), { align: AlignmentType.RIGHT }),
              cell(v(r.buretteMl.toFixed(2)), { align: AlignmentType.RIGHT }),
              cell(v(r.recoveredMg.toFixed(1)), { align: AlignmentType.RIGHT }),
              cell(v(r.recoveryPercent.toFixed(2)), { align: AlignmentType.RIGHT }),
            ])
          ),
          row([
            cell(`${lvl.levelLabel} \u2014 Mean = / RSD (NMT 2.0 %) =`, { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2', span: 5 }),
            cell(v(`${lvl.mean.toFixed(2)} / ${lvl.rsd.toFixed(2)}`), { bold: true, align: AlignmentType.RIGHT, fill: 'F2F2F2' }),
          ]),
        ]),
        row([
          cell('Overall mean recovery / RSD (n = 9)', { bold: true, align: AlignmentType.RIGHT, fill: 'FFF3CD', span: 5 }),
          cell(v(`${data.accuracy.overallMean.toFixed(2)} / ${data.accuracy.overallRsd.toFixed(2)}`), { bold: true, align: AlignmentType.RIGHT, fill: 'FFF3CD' }),
        ]),
      ]
    ),
    ...evaluation(data.accuracy.evaluation),

    heading('7. OVERALL CONCLUSION'),
    para(isProtocol ? data.overallConclusion.protocol : data.overallConclusion.report),
    ...(isProtocol
      ? [
          para('_______________________________________________________________', { size: 18 }),
          para('_______________________________________________________________', { size: 18 }),
          para('To be completed by the analyst after execution.', { italics: true, size: 18 }),
        ]
      : []),

    heading('8. REVIEW CHECKLIST & COMPLETION RECORD'),
    table(
      [3400, 4560, 1400],
      [
        row([headerCell('Particulars', 3400), headerCell('Compliance', 4560), headerCell('Checked By', 1400)]),
        ...data.reviewChecklist.map((c) =>
          row([cell(c.particulars, { bold: true }), cell(c.compliance), cell(isProtocol ? '________' : 'Anil Parmar')])
        ),
      ]
    ),

    heading('9. LIST OF ABBREVIATIONS'),
    table(
      [1800, 7560],
      [
        row([headerCell('Abbreviation', 1800), headerCell('Expansion', 7560)]),
        ...data.abbreviations.map((a) => row([cell(a.abbreviation, { bold: true }), cell(a.expansion)])),
      ]
    ),
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
  saveAs(blob, `AMV_${isProtocol ? 'Protocol' : 'Report'}_Titration_${safeName}_${docNo}.docx`);
}
