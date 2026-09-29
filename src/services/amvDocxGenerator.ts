import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import { AMVDocumentData, DocumentType, ThemeFormat, FooterSignOffData } from '../types';
import { formatNum, formatInt, formatAmountByMagnitude, formatSigFig, formatResponse } from './mathUtils';
import { createDocxSignOffFooter } from './docxSignOffFooter';
import { getWestCoastStampUint8Array } from '../utils/stampUtils';

export interface DocxOptions {
  docType: DocumentType;
  theme: ThemeFormat;
  fontFamily?: string;
  fontSize?: number;
  dataMode?: 'TEMPLATE' | 'DEMO';
  footerSignOffData?: FooterSignOffData;
}

export async function generateAndDownloadAMVDocx(
  data: AMVDocumentData,
  options: DocxOptions
): Promise<void> {
  const { docType, theme } = options;
  const isProtocol = docType === 'protocol';
  const responseDecimals = (data as any).responseDecimals ?? 0;
  const responseLabel = (data as any).responseLabel || 'Peak Area (\u00B5V\u00B7s)';
  const isBlue = theme === 'blue';

  // Times New Roman (12pt default) matching authentic regulatory monograph
  const FONT_FAMILY = options.fontFamily || 'Times New Roman';
  const BASE_FONT_HALF_PT = (options.fontSize || 12) * 2;
  const TABLE_CELL_SIZE = Math.max(16, BASE_FONT_HALF_PT - 4);
  const SECTION_HEAD_SIZE = BASE_FONT_HALF_PT + 2;
  const SUBSECTION_HEAD_SIZE = BASE_FONT_HALF_PT;
  const BODY_SIZE = BASE_FONT_HALF_PT;

  // Exact A4 Printable Width: 11906 total dxa - 1000 left margin - 1000 right margin = 9906 dxa
  const TOTAL_TABLE_WIDTH_DXA = 9906;

  // Colors matching Reference PDF
  const headerBgColor = isBlue ? '1F4E79' : 'F3F4F6';
  const headerTextColor = isBlue ? 'FFFFFF' : '111827';
  const borderColor = isBlue ? 'B0C4DE' : 'D1D5DB';
  const altRowBgColor = isBlue ? 'F8FAFC' : 'F9FAFB';
  const metaLabelBgColor = isBlue ? 'F2F4F8' : 'F3F4F6';
  const navyTextColor = isBlue ? '1F4E79' : '111827';

  // Crisp table border: 0.5pt single line
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
  };

  const cellMargins = {
    top: 60, // 3pt
    bottom: 60,
    left: 90, // 4.5pt
    right: 90,
  };

  const createHeaderCell = (
    text: string,
    widthDxa: number,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER
  ) => {
    return new TableCell({
      shading: { fill: headerBgColor },
      borders: cellBorder,
      margins: cellMargins,
      width: { size: widthDxa, type: WidthType.DXA },
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: text !== '' && text !== undefined ? text : ' ',
              bold: true,
              color: headerTextColor,
              size: TABLE_CELL_SIZE,
              font: FONT_FAMILY,
            }),
          ],
        }),
      ],
    });
  };

  const createDataCell = (
    text: string | number | undefined | null,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
    bold = false,
    bg?: string,
    widthDxa?: number
  ) => {
    const displayText = text !== '' && text !== undefined && text !== null ? String(text) : ' ';
    return new TableCell({
      shading: bg ? { fill: bg } : undefined,
      borders: cellBorder,
      margins: cellMargins,
      width: widthDxa ? { size: widthDxa, type: WidthType.DXA } : undefined,
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: displayText,
              bold,
              size: TABLE_CELL_SIZE,
              font: FONT_FAMILY,
              color: '111827',
            }),
          ],
        }),
      ],
    });
  };

  const createDocxTable = (colWidths: number[], rows: TableRow[]) => {
    return new Table({
      width: { size: TOTAL_TABLE_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: colWidths,
      rows,
    });
  };

  const createRow = (cells: TableCell[], isHeader = false) => {
    return new TableRow({
      cantSplit: true,
      tableHeader: isHeader,
      children: cells,
    });
  };

  const createSectionHeader = (title: string, beforeSpace = 120, afterSpace = 50) => {
    return new Paragraph({
      spacing: { before: beforeSpace, after: afterSpace },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: SECTION_HEAD_SIZE,
          font: FONT_FAMILY,
          color: navyTextColor,
        }),
      ],
    });
  };

  const createSubSectionHeader = (title: string, beforeSpace = 80, afterSpace = 30) => {
    return new Paragraph({
      spacing: { before: beforeSpace, after: afterSpace },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: SUBSECTION_HEAD_SIZE,
          font: FONT_FAMILY,
          color: '1F2937',
        }),
      ],
    });
  };

  const createBodyParagraph = (text: string, beforeSpace = 20, afterSpace = 40) => {
    return new Paragraph({
      spacing: { before: beforeSpace, after: afterSpace },
      children: [
        new TextRun({
          text,
          size: BODY_SIZE,
          font: FONT_FAMILY,
          color: '27272A',
        }),
      ],
    });
  };

  const createAcceptanceParagraph = (text: string) => {
    return new Paragraph({
      spacing: { before: 50, after: 50 },
      children: [
        new TextRun({
          text,
          size: BODY_SIZE,
          font: FONT_FAMILY,
          bold: true,
          color: '1F2937',
        }),
      ],
    });
  };

  const c = data.chromatographicConditions;
  const ss = data.systemSuitability;
  const spec = data.specificity;
  const lin = data.linearity;
  const acc = data.accuracy;
  const prec = data.precision;
  const rob = data.robustness;
  const stab = data.solutionStability;

  // Single document number source of truth for exact character-by-character consistency
  const singleDocNumber = isProtocol
    ? data.documentNo
    : (data.reportNo || (data.documentNo.includes('/AMV/') ? data.documentNo.replace('/AMV/', '/AMVR/') : `${data.documentNo}/R`));

  // =========================================================================
  // PAGE 1: MASTHEAD, METADATA, 3-COL SIGN-OFF, SEC 1, 2, 3, 4.1 HEADING
  // =========================================================================

  // Masthead
  const page1CompanyHeader = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 20 },
    children: [
      new TextRun({
        text: data.companyName,
        bold: true,
        size: 28, // 14pt (increased from 13pt)
        font: FONT_FAMILY,
        color: navyTextColor,
      }),
    ],
  });

  const page1Address = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 },
    children: [
      new TextRun({
        text: data.companyAddress,
        size: 20, // 10pt (increased from 9pt)
        font: FONT_FAMILY,
        color: '4B5563',
      }),
    ],
  });

  const page1DocTitle = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 100 },
    children: [
      new TextRun({
        text: isProtocol
          ? 'ANALYTICAL METHOD VALIDATION PROTOCOL (Assay by HPLC)'
          : 'ANALYTICAL METHOD VALIDATION REPORT (Assay by HPLC)',
        bold: true,
        size: 24, // 12pt (increased from 11pt)
        font: FONT_FAMILY,
        color: navyTextColor,
      }),
    ],
  });

  const page1DemoCallout =
    options.dataMode === 'DEMO'
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 80 },
          children: [
            new TextRun({
              text: isProtocol
                ? '*** PROTOCOL \u2014 NOT AN EXECUTED REPORT ***'
                : '*** DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE ***',
              bold: true,
              size: 20,
              font: FONT_FAMILY,
              color: 'B45309',
            }),
          ],
        })
      : null;

  // Metadata Table (2 cols: 3106, 6800 dxa)
  const colMeta = [3106, 6800];
  const page1MetaTable = createDocxTable(colMeta, [
    createRow([
      createDataCell(isProtocol ? 'Protocol No.' : 'Report No.', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(singleDocNumber, AlignmentType.LEFT, true, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Product Name', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(data.productName, AlignmentType.LEFT, true, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Label Claim', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(data.labelClaim, AlignmentType.LEFT, false, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Test Parameter', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(data.testParameter, AlignmentType.LEFT, false, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Reference', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(data.reference, AlignmentType.LEFT, false, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Batch No. Used', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(data.batchNoUsed, AlignmentType.LEFT, true, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Effective Date', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(isProtocol ? '01-Apr-2026' : (data.effectiveDate || '21-Apr-2026'), AlignmentType.LEFT, false, undefined, colMeta[1]),
    ]),
    createRow([
      createDataCell('Supersedes', AlignmentType.LEFT, true, metaLabelBgColor, colMeta[0]),
      createDataCell(data.supersedes, AlignmentType.LEFT, false, undefined, colMeta[1]),
    ]),
  ]);

  // 3-Column Sign-Off Table matching Reference PDF exactly
  // Widths: 3302, 3302, 3302 = 9906 dxa
  const colSign3 = [3302, 3302, 3302];
  const prepDate = isProtocol ? '25-Mar-2026' : (data.signOffs?.preparedBy?.date || '15-Apr-2026');
  const revDate = isProtocol ? '28-Mar-2026' : (data.signOffs?.reviewedBy?.date || '18-Apr-2026');
  const appDate = isProtocol ? '31-Mar-2026' : (data.signOffs?.approvedBy?.date || '20-Apr-2026');

  const createSignCell = (
    name: string,
    designation: string,
    dateText: string,
    widthDxa: number
  ) => {
    return new TableCell({
      borders: cellBorder,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      width: { size: widthDxa, type: WidthType.DXA },
      children: [
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({ text: 'Name: ', bold: true, size: 20, font: FONT_FAMILY }),
            new TextRun({ text: name || ' ', size: 20, font: FONT_FAMILY }),
          ],
        }),
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({ text: 'Designation: ', bold: true, size: 20, font: FONT_FAMILY }),
            new TextRun({ text: designation || ' ', size: 20, font: FONT_FAMILY }),
          ],
        }),
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({ text: 'Signature / Date: ', bold: true, size: 20, font: FONT_FAMILY }),
            // A protocol is signed on issue, so the cell is left open.
            new TextRun({ text: isProtocol ? '________________' : (dateText || ' '), size: 20, font: FONT_FAMILY }),
          ],
        }),
      ],
    });
  };

  const prepSet: any = (data as any).sectionPreparations || {};
  // The preparation that produces a table is printed immediately above it.
  const prepParagraphs = (section: string): any[] => {
    const prep = prepSet[section];
    if (!prep) return [];
    const out: any[] = [];
    if (prep.intro) {
      out.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: prep.intro, size: 20, font: FONT_FAMILY })],
        })
      );
    }
    (prep.steps || []).forEach((step: string) => {
      out.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 200, hanging: 200 },
          children: [new TextRun({ text: step, size: 20, font: FONT_FAMILY })],
        })
      );
    });
    return out;
  };

  // Content of Uniformity table, present only in the combined Assay + CU document
  const cuData: any = (data as any).contentUniformity;
  const cuSection: any[] = cuData
    ? [
        createSectionHeader('13A. PRECISION (FOR CONTENT OF UNIFORMITY)', 120, 50),
        ...(cuData.preparation
          ? [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun({ text: cuData.preparation.intro, size: 20, font: FONT_FAMILY })],
              }),
              ...(cuData.preparation.steps || []).map(
                (step: string) =>
                  new Paragraph({
                    spacing: { before: 20, after: 20 },
                    alignment: AlignmentType.JUSTIFIED,
                    indent: { left: 200, hanging: 200 },
                    children: [new TextRun({ text: step, size: 20, font: FONT_FAMILY })],
                  })
              ),
            ]
          : []),
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: cuData.tableTitle || 'Table 5.1', bold: true, size: 20, font: FONT_FAMILY })],
        }),
        createDocxTable(
          [900, 1600, 2400, 2200, 2000],
          [
            createRow(
              [
                createHeaderCell('Sr. No.', 900),
                createHeaderCell('Sample ID', 1600),
                createHeaderCell('Amount of preparation used (mg)', 2400),
                createHeaderCell('Sample area', 2200),
                createHeaderCell('Content (% of LA)', 2000),
              ],
              true
            ),
            ...(cuData.rows || []).map((r: any) =>
              createRow([
                createDataCell(String(r.srNo), AlignmentType.CENTER, true, undefined, 900),
                createDataCell(r.sampleId, AlignmentType.CENTER, false, undefined, 1600),
                createDataCell(isProtocol ? '\u2014' : formatNum(r.amountUsedMg, 2), AlignmentType.RIGHT, false, undefined, 2400),
                createDataCell(isProtocol ? '\u2014' : formatResponse(r.sampleArea, responseDecimals), AlignmentType.RIGHT, false, undefined, 2200),
                createDataCell(isProtocol ? '\u2014' : formatNum(r.contentPercentLa, 1), AlignmentType.RIGHT, false, undefined, 2000),
              ])
            ),
            ...[
              ['Mean', isProtocol ? '\u2014' : formatNum(cuData.mean, 2)],
              ['RSD (NMT 2.0 %)', isProtocol ? '\u2014' : formatNum(cuData.rsd, 2)],
              ['Acceptance Value (USP <905>, NMT 15.0)', isProtocol ? '\u2014' : formatNum(cuData.acceptanceValue, 2)],
            ].map(([label, value]) =>
              createRow([
                createDataCell('', AlignmentType.CENTER, false, 'F2F2F2', 900),
                createDataCell('', AlignmentType.CENTER, false, 'F2F2F2', 1600),
                createDataCell('', AlignmentType.CENTER, false, 'F2F2F2', 2400),
                createDataCell(label, AlignmentType.RIGHT, true, 'F2F2F2', 2200),
                createDataCell(value, AlignmentType.RIGHT, true, 'F2F2F2', 2000),
              ])
            ),
          ]
        ),
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [new TextRun({ text: 'Evaluation', bold: true, size: 18, font: FONT_FAMILY })],
        }),
        ...(cuData.evaluation || []).map(
          (e: string) =>
            new Paragraph({
              spacing: { before: 10, after: 10 },
              children: [new TextRun({ text: e, size: 18, font: FONT_FAMILY })],
            })
        ),
        ...(cuData.calculationNote || []).map(
          (n: string, idx: number) =>
            new Paragraph({
              spacing: { before: idx === 0 ? 60 : 10, after: 10 },
              children: [new TextRun({ text: n, size: 18, bold: idx === 0, font: FONT_FAMILY })],
            })
        ),
        ...(isProtocol
          ? []
          : (cuData.workings || []).map(
              (w: string) =>
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [new TextRun({ text: w, size: 18, font: FONT_FAMILY })],
                })
            )),
        new Paragraph({
          spacing: { before: 60, after: 120 },
          children: [
            new TextRun({
              text: isProtocol ? cuData.acceptanceTextProtocol : cuData.conclusionReport,
              size: 18,
              italics: true,
              font: FONT_FAMILY,
            }),
          ],
        }),
      ]
    : [];

  // Page 1 approval table, one row per activity:
  // ACTIVITY | DESIGNATION | NAME | SIGNATURE | DATE
  const colSign = [1900, 2400, 2100, 1600, 1360];
  const signOffRows: [string, any, string][] = [
    ['Prepared By', data.signOffs?.preparedBy, prepDate],
    ['Checked By', (data.signOffs as any)?.checkedBy || data.signOffs?.reviewedBy, revDate],
    ['Reviewed By', data.signOffs?.reviewedBy, revDate],
    ['Authorized By', data.signOffs?.approvedBy, appDate],
  ];
  const page1SignOffTable = createDocxTable(colSign, [
    createRow(
      [
        createHeaderCell('ACTIVITY', colSign[0]),
        createHeaderCell('DESIGNATION', colSign[1]),
        createHeaderCell('NAME', colSign[2]),
        createHeaderCell('SIGNATURE', colSign[3]),
        createHeaderCell('DATE', colSign[4]),
      ],
      true
    ),
    ...signOffRows.map(([activity, person, date]) =>
      createRow([
        createDataCell(activity, AlignmentType.LEFT, true, undefined, colSign[0]),
        createDataCell(person?.designation || '', AlignmentType.LEFT, false, undefined, colSign[1]),
        createDataCell((person?.name || '').toUpperCase(), AlignmentType.LEFT, false, undefined, colSign[2]),
        // The signature is always signed by hand, in a protocol and in a report.
        createDataCell('________________', AlignmentType.CENTER, false, undefined, colSign[3]),
        createDataCell(isProtocol ? '________________' : date, AlignmentType.CENTER, false, undefined, colSign[4]),
      ])
    ),
  ]);

  // TABLE OF CONTENTS (Assay by HPLC)
  const colTOC = [1200, 7206, 1500];
  const tocRows = [
    createRow([
      createHeaderCell('Sr. No.', colTOC[0]),
      createHeaderCell('Contents / Section Title', colTOC[1], AlignmentType.LEFT),
      createHeaderCell('Page No.', colTOC[2]),
    ], true),
    ...[
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
    ].map((item, idx) =>
      createRow([
        createDataCell(item.srNo, AlignmentType.CENTER, false, idx % 2 === 1 ? altRowBgColor : undefined, colTOC[0]),
        createDataCell(item.title, AlignmentType.LEFT, false, idx % 2 === 1 ? altRowBgColor : undefined, colTOC[1]),
        createDataCell(item.pageNo, AlignmentType.CENTER, true, idx % 2 === 1 ? altRowBgColor : undefined, colTOC[2]),
      ])
    )
  ];
  const page1TocTable = createDocxTable(colTOC, tocRows);

  // Section 3: Reference Documents & Verification Details Table
  const colSec3 = [2706, 7200];
  const sec3Table = createDocxTable(colSec3, [
    createRow([
      createDataCell('Reference', AlignmentType.LEFT, true, metaLabelBgColor, colSec3[0]),
      createDataCell(data.verificationDetails?.reference || data.reference, AlignmentType.LEFT, false, undefined, colSec3[1]),
    ]),
    createRow([
      createDataCell('(a) Type of Verification', AlignmentType.LEFT, true, metaLabelBgColor, colSec3[0]),
      createDataCell(data.verificationDetails?.typeOfVerification || 'Verification of a compendial assay procedure under actual conditions of use, as per USP <1225> and ICH Q2(R2)', AlignmentType.LEFT, false, undefined, colSec3[1]),
    ]),
    createRow([
      createDataCell('(b) Test to be Verified', AlignmentType.LEFT, true, metaLabelBgColor, colSec3[0]),
      createDataCell(data.verificationDetails?.testToBeVerified || `Assay by HPLC (${data.activeSubstance} content)`, AlignmentType.LEFT, false, undefined, colSec3[1]),
    ]),
    createRow([
      createDataCell('(c) Verification Team', AlignmentType.LEFT, true, metaLabelBgColor, colSec3[0]),
      createDataCell(data.verificationDetails?.verificationTeam || 'Analyst 1: Sahil Panchal (Chemist, QC); Analyst 2: Smit Patel (Executive, QC); Supervisor: Anil Parmar (Manager, QC)', AlignmentType.LEFT, false, undefined, colSec3[1]),
    ]),
    createRow([
      createDataCell('(d) Experimental Details', AlignmentType.LEFT, true, metaLabelBgColor, colSec3[0]),
      createDataCell(data.verificationDetails?.experimentalDetails || `Specificity, system suitability, linearity (50 % to 150 %), accuracy / recovery (50 %, 100 %, 150 %), precision and intermediate precision, robustness and stability of analytical solutions up to 24 hours, executed on batch ${data.batchNoUsed}.`, AlignmentType.LEFT, false, undefined, colSec3[1]),
    ]),
  ]);

  // =========================================================================
  // PAGE 2: SEC 4.1 NARRATIVE CONDITIONS, NOTE, SEC 4.2 TABLE, SEC 4.3 CALCULATION FORMULAE
  // =========================================================================

  // 4.1 Chromatographic Conditions - Narrative Paragraph Format (No Table)
  const chromConditionsParagraph1 = new Paragraph({
    children: [
      new TextRun({ text: "The high-performance liquid chromatographic (HPLC) separation is executed using a stationary phase consisting of ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Column: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.column + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The mobile phase system employed is ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Mobile Phase: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.mobilePhase + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The chromatographic system is operated isocratically at a controlled ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Flow Rate: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.flowRate + ", ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "with spectrophotometric monitoring performed at a ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Detection Wavelength: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.detectionWavelength + ".", size: 20, font: FONT_FAMILY }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 60 },
  });

  const chromConditionsParagraph2 = new Paragraph({
    children: [
      new TextRun({ text: "Sample introduction is carried out with an ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Injection Volume: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.injectionVolume + ", ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "and thermal equilibrium of the stationary phase is maintained at a ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Column Temperature: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.columnTemperature + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The total chromatographic ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Run Time: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.runTime + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Samples and reference standard preparations are prepared in ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Diluent: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.diluent + " ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "to attain a target ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Working Concentration: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.workingConcentration + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Under these validated operational conditions, the typical chromatographic retention time for the main active analyte is approximately ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Approximate Retention Time: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.approxRetentionTime || '6.5 min') + ".", size: 20, font: FONT_FAMILY }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 60 },
  });

  const noteParagraph = new Paragraph({
    children: [
      new TextRun({ text: "Note: " + (c.note || 'Dissolve 1.36 g of Potassium Dihydrogen Phosphate in 1000 mL water, adjust pH to 6.0 with 0.1M KOH.'), italics: true, size: 19, font: FONT_FAMILY, color: "4B5563" }),
    ],
    spacing: { before: 40, after: 80 },
  });

  // 4.2 Preparation of Solutions Table (2806, 7100 dxa)
  const colSol = [2806, 7100];
  const solTable = createDocxTable(colSol, [
    createRow([createHeaderCell('Solution', colSol[0], AlignmentType.LEFT), createHeaderCell('Preparation Procedure', colSol[1], AlignmentType.LEFT)], true),
    createRow([
      createDataCell(`Standard Solution (${c.workingConcentration})`, AlignmentType.LEFT, true, metaLabelBgColor, colSol[0]),
      createDataCell(data.solutionPreparation.standardSolution, AlignmentType.LEFT, false, undefined, colSol[1]),
    ]),
    createRow([
      createDataCell(`Sample Solution (${c.workingConcentration})`, AlignmentType.LEFT, true, metaLabelBgColor, colSol[0]),
      createDataCell(data.solutionPreparation.sampleSolution, AlignmentType.LEFT, false, undefined, colSol[1]),
    ]),
  ]);

  // =========================================================================
  // PAGE 3: SEC 4.4 (REAGENTS & EQUIPMENT), SEC 5 (ROWS 1 TO 4)
  // =========================================================================

  // Reagents Table (4 cols: 3406, 2200, 2200, 2100 dxa)
  const colReagents = [3406, 2200, 2200, 2100];
  const reagentsRows = [
    createRow([
      createHeaderCell('Name of Chemical / Standard', colReagents[0], AlignmentType.LEFT),
      createHeaderCell('Grade', colReagents[1], AlignmentType.LEFT),
      createHeaderCell('Make / Catalogue', colReagents[2], AlignmentType.LEFT),
      createHeaderCell('Batch / Lot No.', colReagents[3], AlignmentType.LEFT),
    ], true),
    ...(data.reagentsAndStandards || []).map((r) =>
      createRow([
        createDataCell(r.name, AlignmentType.LEFT, true, undefined, colReagents[0]),
        createDataCell(r.grade, AlignmentType.LEFT, false, undefined, colReagents[1]),
        createDataCell(r.make, AlignmentType.LEFT, false, undefined, colReagents[2]),
        createDataCell(r.batchNo, AlignmentType.LEFT, false, undefined, colReagents[3]),
      ])
    ),
  ];
  const reagentsTable = createDocxTable(colReagents, reagentsRows);

  // Section 5 Validation Parameters Table (4 cols: 600, 2600, 3906, 2800 dxa = 9906 dxa)
  const colValParam = [600, 2600, 3906, 2800];
  const valResultHeader = isProtocol ? 'Verification Requirement' : 'Result / Acceptance Status';

  const valRowsP3Data = [
    {
      sr: 1,
      param: 'Specificity',
      criteria: 'No interference from blank (diluent) and placebo at the retention time of the analyte peak. Peak purity passed by PDA.',
      result: isProtocol ? '—' : 'No interference observed; peak purity passed (purity angle < threshold)',
    },
    {
      sr: 2,
      param: 'System Suitability',
      criteria: 'Tailing factor NMT 2.0; %RSD of area NMT 2.0 % (n=5); theoretical plates NLT 2000.',
      result: isProtocol ? '—' : `Tailing ${formatNum(ss.meanTailing, 2)}; %RSD ${formatNum(ss.rsdArea, 2)} %; plates ${formatInt(ss.meanPlates)}`,
    },
    {
      sr: 3,
      param: 'Linearity (50%–150%)',
      criteria: 'Correlation coefficient (r) shall be ≥ 0.999 (r² ≥ 0.998); slope and y-intercept reported; y-intercept bias at 100 % level within ±2.0 %.',
      result: isProtocol ? '—' : `r = ${formatSigFig(lin.regression.correlationR, 6)}; slope ${formatNum(lin.regression.slope, 1)}; y-intercept ${formatNum(lin.regression.yIntercept, 0)}; bias ${formatNum(lin.regression.yInterceptBiasPercent, 2)} %`,
    },
    {
      sr: 4,
      param: 'Accuracy (50%–150%)',
      criteria: 'Mean recovery of three levels in triplicate between 98.0 % and 102.0 %; %RSD at each level NMT 2.0 %.',
      result: isProtocol ? '—' : `Mean recovery ${formatNum(acc.meanRecoveryAllLevels, 2)} % (n = 9, %RSD ${formatNum(acc.rsdAllLevels, 2)} %)`,
    },
  ];

  const valTableP3 = createDocxTable(colValParam, [
    createRow([
      createHeaderCell('Sr.', colValParam[0]),
      createHeaderCell('Parameter', colValParam[1], AlignmentType.LEFT),
      createHeaderCell('Acceptance Criteria', colValParam[2], AlignmentType.LEFT),
      createHeaderCell(valResultHeader, colValParam[3]),
    ], true),
    ...(valRowsP3Data || []).map((v) =>
      createRow([
        createDataCell(v.sr, AlignmentType.CENTER, true, undefined, colValParam[0]),
        createDataCell(v.param, AlignmentType.LEFT, true, undefined, colValParam[1]),
        createDataCell(v.criteria, AlignmentType.LEFT, false, undefined, colValParam[2]),
        createDataCell(v.result, AlignmentType.LEFT, false, undefined, colValParam[3]),
      ])
    ),
  ]);

  // Dynamic stability difference calculation for docx
  const initialStdArea = Number(stab.rows[0]?.standardArea) || 1;
  const initialSplArea = Number(stab.rows[0]?.sampleArea) || 1;
  let maxDocxStdDiff = 0;
  let maxDocxSplDiff = 0;
  stab.rows.forEach((r, i) => {
    if (i > 0) {
      const curStd = Number(r.standardArea) || 0;
      const curSpl = Number(r.sampleArea) || 0;
      const dS = (Math.abs(curStd - initialStdArea) / initialStdArea) * 100;
      const dP = (Math.abs(curSpl - initialSplArea) / initialSplArea) * 100;
      if (dS > maxDocxStdDiff) maxDocxStdDiff = dS;
      if (dP > maxDocxSplDiff) maxDocxSplDiff = dP;
    }
  });

  const maxRobRsd = (rob?.rows?.length || 0) > 0 ? Math.max(... (rob?.rows || []).map((r) => Number(r.rsdPercent) || 0)) : 0.13;

  const valRowsP4Data = [
    {
      sr: 5,
      param: 'Range',
      criteria: 'Mean recovery 98.0 % to 102.0 %; %RSD ≤ 2.0 % at each level; correlation coefficient r ≥ 0.999.',
      result: isProtocol ? '—' : `Mean recovery ${formatNum(acc.meanRecoveryAllLevels, 2)} %; %RSD ${formatNum(acc.rsdAllLevels, 2)} %; r = ${formatSigFig(lin.regression.correlationR, 6)}`,
    },
    {
      sr: 6,
      param: 'Method Precision (Repeatability)',
      criteria: '%RSD for six assay sample preparations NMT 2.0 %.',
      result: isProtocol ? '—' : `Mean ${formatNum(prec.analyst1Mean, 2)} %; %RSD ${formatNum(prec.analyst1Rsd, 2)} %`,
    },
    {
      sr: 7,
      param: 'Intermediate Precision (Ruggedness)',
      criteria: '%RSD for six results NMT 2.0 %; cumulative %RSD for twelve results NMT 2.0 %.',
      result: isProtocol ? '—' : `Analyst 2 %RSD ${formatNum(prec.analyst2Rsd, 2)} %; Cumulative %RSD ${formatNum(prec.cumulativeRsd, 2)} % (n = 12)`,
    },
    {
      sr: 8,
      param: 'Robustness',
      criteria: 'System suitability criteria met under all deliberately varied conditions (%RSD NMT 2.0 %, Tailing NMT 2.0, Plates NLT 2000).',
      result: isProtocol ? '—' : `Maximum %RSD ${formatNum(maxRobRsd, 2)} %; all criteria met`,
    },
    {
      sr: 9,
      param: 'Solution Stability',
      criteria: 'Cumulative difference in peak response for standard and sample solutions over 24 hours shall not exceed 2.0 %; %RSD ≤ 2.0 %.',
      result: isProtocol ? '—' : `Standard max diff ${formatNum(maxDocxStdDiff, 2)} %; Sample max diff ${formatNum(maxDocxSplDiff, 2)} % (24 h)`,
    },
  ];

  const valTableP4 = createDocxTable(colValParam, [
    createRow([
      createHeaderCell('Sr.', colValParam[0]),
      createHeaderCell('Parameter', colValParam[1], AlignmentType.LEFT),
      createHeaderCell('Acceptance Criteria', colValParam[2], AlignmentType.LEFT),
      createHeaderCell(valResultHeader, colValParam[3]),
    ], true),
    ...(valRowsP4Data || []).map((v) =>
      createRow([
        createDataCell(v.sr, AlignmentType.CENTER, true, undefined, colValParam[0]),
        createDataCell(v.param, AlignmentType.LEFT, true, undefined, colValParam[1]),
        createDataCell(v.criteria, AlignmentType.LEFT, false, undefined, colValParam[2]),
        createDataCell(v.result, AlignmentType.LEFT, false, undefined, colValParam[3]),
      ])
    ),
  ]);

  // Section 6 System Suitability Table (4 cols: 2476, 2476, 2476, 2478 dxa)
  const colSS = [2476, 2476, 2476, 2478];
  const ssRows = [
    createRow([
      createHeaderCell('Injection No.', colSS[0]),
      createHeaderCell(responseLabel, colSS[1]),
      createHeaderCell('Tailing Factor', colSS[2]),
      createHeaderCell('Theoretical Plates', colSS[3]),
    ], true),
    ... (ss?.injections || []).map((inj) =>
      createRow([
        createDataCell(inj.injectionNo, AlignmentType.CENTER, true, undefined, colSS[0]),
        createDataCell(isProtocol ? '—' : formatResponse(inj.peakArea, responseDecimals), AlignmentType.RIGHT, false, undefined, colSS[1]),
        createDataCell(isProtocol ? '—' : formatNum(inj.tailingFactor, 2), AlignmentType.RIGHT, false, undefined, colSS[2]),
        createDataCell(isProtocol ? '—' : formatInt(inj.theoreticalPlates), AlignmentType.RIGHT, false, undefined, colSS[3]),
      ])
    ),
    createRow([
      createDataCell('Mean', AlignmentType.CENTER, true, altRowBgColor, colSS[0]),
      createDataCell(isProtocol ? '—' : formatResponse(ss.meanArea, responseDecimals), AlignmentType.RIGHT, true, altRowBgColor, colSS[1]),
      createDataCell(isProtocol ? '—' : formatNum(ss.meanTailing, 2), AlignmentType.RIGHT, true, altRowBgColor, colSS[2]),
      createDataCell(isProtocol ? '—' : formatInt(ss.meanPlates), AlignmentType.RIGHT, true, altRowBgColor, colSS[3]),
    ]),
    createRow([
      // Standard deviation sits between the mean and the % RSD, as on a worksheet.
      createDataCell('SD', AlignmentType.CENTER, true, altRowBgColor, colSS[0]),
      createDataCell(isProtocol ? '—' : formatNum((ss as any).sdArea ?? 0, 2), AlignmentType.RIGHT, true, altRowBgColor, colSS[1]),
      createDataCell(isProtocol ? '—' : formatNum((ss as any).sdTailing ?? 0, 3), AlignmentType.RIGHT, true, altRowBgColor, colSS[2]),
      createDataCell(isProtocol ? '—' : formatNum((ss as any).sdPlates ?? 0, 1), AlignmentType.RIGHT, true, altRowBgColor, colSS[3]),
    ]),
    createRow([
      createDataCell('% RSD', AlignmentType.CENTER, true, altRowBgColor, colSS[0]),
      createDataCell(isProtocol ? '—' : `${formatNum(ss.rsdArea, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colSS[1]),
      createDataCell(isProtocol ? '—' : `${formatNum(ss.rsdTailing, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colSS[2]),
      createDataCell(isProtocol ? '—' : `${formatNum(ss.rsdPlates, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colSS[3]),
    ]),
  ];
  const ssTable = createDocxTable(colSS, ssRows);

  // Section 7 Specificity Table (3 cols: 3506, 3200, 3200 dxa)
  const colSpec = [3506, 3200, 3200];
  const specRows = [
    createRow([
      createHeaderCell('Solution', colSpec[0], AlignmentType.LEFT),
      createHeaderCell('Retention Time (min)', colSpec[1]),
      createHeaderCell('Interference Observed', colSpec[2]),
    ], true),
    ... (spec?.rows || []).map((r) =>
      createRow([
        createDataCell(r.solution, AlignmentType.LEFT, true, undefined, colSpec[0]),
        createDataCell(isProtocol ? '—' : r.retentionTime, AlignmentType.CENTER, false, undefined, colSpec[1]),
        createDataCell(isProtocol ? '—' : r.interference, AlignmentType.CENTER, false, undefined, colSpec[2]),
      ])
    ),
  ];
  const specTable = createDocxTable(colSpec, specRows);

  // =========================================================================
  // PAGE 5: SEC 8 LINEARITY (TABLES 1 & 2), SEC 9 ACCURACY (ROWS 1 TO 6)
  // =========================================================================

  // Linearity Table 1 (4 cols: 2476, 2476, 2476, 2478 dxa)
  const colLin1 = [2476, 2476, 2476, 2478];
  const lin1Rows = [
    createRow([
      createHeaderCell('Level (%)', colLin1[0]),
      createHeaderCell('Concentration (µg/mL)', colLin1[1]),
      createHeaderCell(`Mean ${responseLabel}`, colLin1[2]),
      createHeaderCell('% of 100% Response', colLin1[3]),
    ], true),
    ... (lin?.levels || []).map((lvl) =>
      createRow([
        createDataCell(`${lvl.levelPercent} %`, AlignmentType.CENTER, true, undefined, colLin1[0]),
        createDataCell(formatNum(lvl.concentration, 2), AlignmentType.RIGHT, false, undefined, colLin1[1]),
        createDataCell(isProtocol ? '—' : formatResponse(lvl.meanArea, responseDecimals), AlignmentType.RIGHT, false, undefined, colLin1[2]),
        createDataCell(isProtocol ? '—' : `${formatNum(lvl.percentOf100Response, 2)} %`, AlignmentType.RIGHT, false, undefined, colLin1[3]),
      ])
    ),
  ];
  const lin1Table = createDocxTable(colLin1, lin1Rows);

  // Linearity Table 2 Regression (2 cols: 5406, 4500 dxa)
  const colLin2 = [5406, 4500];
  const lin2Rows = [
    createRow([createHeaderCell('Regression Parameter', colLin2[0], AlignmentType.LEFT), createHeaderCell('Value', colLin2[1])], true),
    createRow([createDataCell('Correlation Coefficient (r)', AlignmentType.LEFT, true, undefined, colLin2[0]), createDataCell(isProtocol ? 'Criteria: ≥ 0.999' : formatSigFig(lin.regression.correlationR, 6), AlignmentType.RIGHT, true, undefined, colLin2[1])]),
    createRow([createDataCell('Coefficient of Determination (r²)', AlignmentType.LEFT, true, undefined, colLin2[0]), createDataCell(isProtocol ? 'Criteria: ≥ 0.998' : formatSigFig(lin.regression.rSquared, 6), AlignmentType.RIGHT, true, undefined, colLin2[1])]),
    createRow([createDataCell('Slope', AlignmentType.LEFT, true, undefined, colLin2[0]), createDataCell(isProtocol ? '—' : formatNum(lin.regression.slope, 2), AlignmentType.RIGHT, false, undefined, colLin2[1])]),
    createRow([createDataCell('y-Intercept', AlignmentType.LEFT, true, undefined, colLin2[0]), createDataCell(isProtocol ? '—' : formatNum(lin.regression.yIntercept, 2), AlignmentType.RIGHT, false, undefined, colLin2[1])]),
    createRow([createDataCell('y-Intercept bias as % of 100% response', AlignmentType.LEFT, true, undefined, colLin2[0]), createDataCell(isProtocol ? 'Criteria: NMT ±2.0%' : `${formatNum(lin.regression.yInterceptBiasPercent, 2)} %`, AlignmentType.RIGHT, false, undefined, colLin2[1])]),
  ];
  const lin2Table = createDocxTable(colLin2, lin2Rows);

  // Accuracy Table: All 9 determinations + Summary rows (5 cols: 1606, 1500, 2200, 2400, 2200 dxa)
  const colAcc = [1606, 1500, 2200, 2400, 2200];
  const accRows = [
    createRow([
      createHeaderCell('Level (%)', colAcc[0]),
      createHeaderCell('Exp. No.', colAcc[1]),
      createHeaderCell('Amount Added (mg)', colAcc[2]),
      createHeaderCell('Amount Recovered (mg)', colAcc[3]),
      createHeaderCell('% Recovery', colAcc[4]),
    ], true),
    ... (acc?.rows || []).map((r) =>
      createRow([
        createDataCell(`${r.levelPercent} %`, AlignmentType.CENTER, true, undefined, colAcc[0]),
        createDataCell(r.expNo, AlignmentType.CENTER, false, undefined, colAcc[1]),
        createDataCell(formatAmountByMagnitude(r.amountAdded), AlignmentType.RIGHT, false, undefined, colAcc[2]),
        createDataCell(isProtocol ? '—' : formatAmountByMagnitude(r.amountRecovered), AlignmentType.RIGHT, false, undefined, colAcc[3]),
        createDataCell(isProtocol ? '—' : `${formatNum(r.percentRecovery, 2)} %`, AlignmentType.RIGHT, false, undefined, colAcc[4]),
      ])
    ),
    createRow([
      createDataCell('Mean % Recovery (all levels)', AlignmentType.LEFT, true, altRowBgColor, colAcc[0]),
      createDataCell('3 Levels (50%, 100%, 150%)', AlignmentType.CENTER, false, altRowBgColor, colAcc[1]),
      createDataCell('9 Determinations', AlignmentType.CENTER, false, altRowBgColor, colAcc[2]),
      createDataCell(isProtocol ? '—' : 'Mean of 9 runs', AlignmentType.RIGHT, false, altRowBgColor, colAcc[3]),
      createDataCell(isProtocol ? 'Criteria: 98.0 – 102.0 %' : `${formatNum(acc.meanRecoveryAllLevels, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colAcc[4]),
    ]),
    createRow([
      createDataCell('% RSD (n = 9)', AlignmentType.LEFT, true, altRowBgColor, colAcc[0]),
      createDataCell('Across all 9 runs', AlignmentType.CENTER, false, altRowBgColor, colAcc[1]),
      createDataCell('Overall % RSD', AlignmentType.CENTER, false, altRowBgColor, colAcc[2]),
      createDataCell(isProtocol ? '—' : 'NMT 2.0 %', AlignmentType.RIGHT, false, altRowBgColor, colAcc[3]),
      createDataCell(isProtocol ? 'Criteria: NMT 2.0 %' : `${formatNum(acc.rsdAllLevels, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colAcc[4]),
    ]),
  ];
  const accTable = createDocxTable(colAcc, accRows);

  // Section 10 Precision Table (4 cols: 2476, 2476, 2476, 2478 dxa)
  const colPrec = [2476, 2476, 2476, 2478];
  const precRows = [
    createRow([
      createHeaderCell('Sample No.', colPrec[0]),
      createHeaderCell('Analyst 1 (% Assay)', colPrec[1]),
      createHeaderCell('Analyst 2 (% Assay)', colPrec[2]),
      createHeaderCell('Statistical Evaluation', colPrec[3]),
    ], true),
    ... (prec?.rows || []).map((r, i) =>
      createRow([
        createDataCell(r.sampleNo, AlignmentType.CENTER, true, undefined, colPrec[0]),
        createDataCell(isProtocol ? '—' : `${formatNum(r.analyst1Assay, 2)} %`, AlignmentType.RIGHT, false, undefined, colPrec[1]),
        createDataCell(isProtocol ? '—' : `${formatNum(r.analyst2Assay, 2)} %`, AlignmentType.RIGHT, false, undefined, colPrec[2]),
        createDataCell(isProtocol ? 'To be calculated' : (r.statisticalEvaluation || 'To be verified'), AlignmentType.CENTER, false, undefined, colPrec[3]),
      ])
    ),
    createRow([
      createDataCell('Mean', AlignmentType.CENTER, true, altRowBgColor, colPrec[0]),
      createDataCell(isProtocol ? '—' : `${formatNum(prec.analyst1Mean, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colPrec[1]),
      createDataCell(isProtocol ? '—' : `${formatNum(prec.analyst2Mean, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colPrec[2]),
      createDataCell(isProtocol ? 'To be calculated' : `Cum. Mean = ${formatNum(prec.cumulativeMean, 2)} %`, AlignmentType.CENTER, true, altRowBgColor, colPrec[3]),
    ]),
    createRow([
      createDataCell('SD', AlignmentType.CENTER, true, altRowBgColor, colPrec[0]),
      createDataCell(isProtocol ? '—' : formatNum(prec.analyst1Sd ?? 0, 3), AlignmentType.RIGHT, true, altRowBgColor, colPrec[1]),
      createDataCell(isProtocol ? '—' : formatNum(prec.analyst2Sd ?? 0, 3), AlignmentType.RIGHT, true, altRowBgColor, colPrec[2]),
      createDataCell(isProtocol ? '—' : `Cum. SD = ${formatNum(prec.cumulativeSd ?? 0, 3)}`, AlignmentType.CENTER, true, altRowBgColor, colPrec[3]),
    ]),
    createRow([
      createDataCell('% RSD', AlignmentType.CENTER, true, altRowBgColor, colPrec[0]),
      createDataCell(isProtocol ? 'Criteria: NMT 2.0 %' : `${formatNum(prec.analyst1Rsd, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colPrec[1]),
      createDataCell(isProtocol ? 'Criteria: NMT 2.0 %' : `${formatNum(prec.analyst2Rsd, 2)} %`, AlignmentType.RIGHT, true, altRowBgColor, colPrec[2]),
      createDataCell(isProtocol ? 'Criteria: NMT 2.0 %' : `Cum. %RSD = ${formatNum(prec.cumulativeRsd, 2)} %`, AlignmentType.CENTER, true, altRowBgColor, colPrec[3]),
    ]),
  ];
  const precTable = createDocxTable(colPrec, precRows);

  // Section 11 Robustness Table: All 6 conditions (4 cols: 3406, 2100, 2200, 2200 dxa)
  const colRob = [2768, 1288, 1890, 1980, 1980];
  const robRows = [
    createRow([
      createHeaderCell('Condition Varied', colRob[0], AlignmentType.LEFT),
      createHeaderCell('RT (min)', colRob[1]),
      createHeaderCell('% RSD (n=5)', colRob[2]),
      createHeaderCell('Tailing Factor', colRob[3]),
      createHeaderCell('Theoretical Plates', colRob[4]),
    ], true),
    ... (rob?.rows || []).map((r) =>
      createRow([
        createDataCell(r.conditionVaried, AlignmentType.LEFT, true, undefined, colRob[0]),
        createDataCell(isProtocol ? '—' : formatNum((r as any).retentionTime ?? 0, 2), AlignmentType.RIGHT, false, undefined, colRob[1]),
        createDataCell(isProtocol ? '—' : `${formatNum(r.rsdPercent, 2)} %`, AlignmentType.RIGHT, false, undefined, colRob[2]),
        createDataCell(isProtocol ? '—' : formatNum(r.tailingFactor, 2), AlignmentType.RIGHT, false, undefined, colRob[3]),
        createDataCell(isProtocol ? '—' : formatInt(r.theoreticalPlates), AlignmentType.RIGHT, false, undefined, colRob[4]),
      ])
    ),
  ];
  const robTable = createDocxTable(colRob, robRows);

  // Section 12 Solution Stability Table (4 cols: 2476, 2476, 2476, 2478 dxa)
  const colStab = [2476, 2476, 2476, 2478];
  const stabRows = [
    createRow([
      createHeaderCell('Time Point', colStab[0]),
      createHeaderCell('Standard Area (µV·s)', colStab[1]),
      createHeaderCell('Sample Area (µV·s)', colStab[2]),
      createHeaderCell('% Diff (Std / Spl)', colStab[3]),
    ], true),
    ... (stab?.rows || []).map((r) =>
      createRow([
        createDataCell(r.timePoint, AlignmentType.CENTER, true, undefined, colStab[0]),
        createDataCell(isProtocol ? '—' : formatResponse(r.standardArea, responseDecimals), AlignmentType.RIGHT, false, undefined, colStab[1]),
        createDataCell(isProtocol ? '—' : formatResponse(r.sampleArea, responseDecimals), AlignmentType.RIGHT, false, undefined, colStab[2]),
        createDataCell(isProtocol ? '—' : r.diffPercent, AlignmentType.CENTER, false, undefined, colStab[3]),
      ])
    ),
  ];
  const stabTable = createDocxTable(colStab, stabRows);

  const abbrColWidths = [2500, 7406];
  const abbrRows: TableRow[] = [
    createRow([createHeaderCell('Abbreviation', abbrColWidths[0]), createHeaderCell('Full Form / Expansion', abbrColWidths[1])], true),
    ...(data.abbreviations || []).map((ab, i) =>
      createRow([
        createDataCell(ab.abbreviation, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, abbrColWidths[0]),
        createDataCell(ab.expansion, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, abbrColWidths[1]),
      ])
    ),
  ];
  const abbrTable = createDocxTable(abbrColWidths, abbrRows);

  const endMarkParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: '— END OF DOCUMENT —',
        bold: true,
        size: 20,
        font: FONT_FAMILY,
        color: '6B7280',
      }),
    ],
  });

  const docChildren: (Paragraph | Table)[] = [
    page1CompanyHeader,
    page1Address,
    page1DocTitle,
    ...(page1DemoCallout ? [page1DemoCallout] : []),
    page1MetaTable,
    new Paragraph({ spacing: { before: 60, after: 60 } }),
    page1SignOffTable,
    new Paragraph({ spacing: { before: 80, after: 40 } }),
    createSectionHeader('TABLE OF CONTENTS', 120, 50),
    page1TocTable,

    createSectionHeader('1. OBJECTIVE', 120, 50),
    createBodyParagraph(data.objective || 'To establish documented evidence that the analytical test procedure for Assay by HPLC is suitable for its intended purpose and consistently yields results meeting predetermined acceptance criteria.'),

    createSectionHeader('2. SCOPE', 120, 50),
    createBodyParagraph(data.scope || `This document applies to the analytical method validation / verification for Assay of ${data.productName} by HPLC at ${data.companyName}, ${data.companyAddress}.`),

    createSectionHeader('3. REFERENCE DOCUMENTS & VERIFICATION DETAILS', 120, 50),
    sec3Table,

    createSectionHeader('4. ANALYTICAL METHOD SUMMARY', 120, 50),
    createSubSectionHeader('4.1 Chromatographic Conditions'),
    chromConditionsParagraph1,
    chromConditionsParagraph2,
    noteParagraph,

    createSubSectionHeader('4.2 Preparation of Solutions'),
    solTable,

    createSubSectionHeader('4.3 Calculation Formulae'),
    createBodyParagraph('Assay (%) = (AT / AS) × (WS / DS) × (DT / WT) × (AVG_WT / LC) × P × 100'),
    createBodyParagraph(`Where: AT = Sample ${responseLabel.replace(/\s*\(.*$/, '')}, AS = Standard ${responseLabel.replace(/\s*\(.*$/, '')}, WS = Standard Weight (mg), DS = Standard Dilution (mL), DT = Sample Dilution (mL), WT = Sample Powder Weight (mg), AVG_WT = Average Weight of 20 units (mg), LC = Label Claim (mg), P = Standard Potency decimal.`),

    createSubSectionHeader('4.4 Reagents and Reference Standards'),
    reagentsTable,

    createSectionHeader('5. SUMMARY OF VALIDATION PARAMETERS & ACCEPTANCE CRITERIA', 120, 50),
    valTableP3,
    valTableP4,

    createSectionHeader('6. SYSTEM SUITABILITY TEST (SST)', 120, 50),
    ...prepParagraphs('systemSuitability'),
    ssTable,

    createSectionHeader('7. SPECIFICITY / SELECTIVITY', 120, 50),
    ...prepParagraphs('specificity'),
    specTable,

    createSectionHeader('8. LINEARITY AND RANGE', 120, 50),
    ...prepParagraphs('linearity'),
    lin1Table,
    lin2Table,

    createSectionHeader('9. ACCURACY (RECOVERY)', 120, 50),
    ...prepParagraphs('accuracy'),
    accTable,

    createSectionHeader('10. METHOD PRECISION (REPEATABILITY)', 120, 50),
    ...prepParagraphs('precision'),
    precTable,

    createSectionHeader('12. ROBUSTNESS', 120, 50),
    ...prepParagraphs('robustness'),
    robTable,

    createSectionHeader('13. SOLUTION STABILITY', 120, 50),
    ...prepParagraphs('solutionStability'),
    stabTable,

    ...cuSection,

    createSectionHeader('Overall Conclusion', 120, 50),
    ...(isProtocol
      ? [
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: '____________________________________________________________________', size: 22, font: FONT_FAMILY })] }),
          new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: '____________________________________________________________________', size: 22, font: FONT_FAMILY })] }),
          new Paragraph({ spacing: { before: 60, after: 120 }, children: [new TextRun({ text: '____________________________________________________________________', size: 22, font: FONT_FAMILY })] }),
          new Paragraph({ spacing: { before: 60, after: 240 }, children: [new TextRun({ text: 'To be completed by the analyst after execution.', size: 22, font: FONT_FAMILY, italics: true })] }),
        ]
      : [
          createBodyParagraph((data as any).overallConclusion || `The analytical method for Assay of ${data.productName} by HPLC has been evaluated and meets all predetermined acceptance criteria in accordance with ICH Q2(R2) and USP <1225> guidelines. The method demonstrates acceptable specificity, linearity (r ≥ 0.999), accuracy (mean recovery 98.0–102.0%), precision (%RSD ≤ 2.0%), intermediate precision, robustness, and 24-hour solution stability. All predetermined acceptance criteria have been satisfied. The analytical method is concluded to be validated and suitable for its intended quality control purpose.`),
        ]),
    
    createSectionHeader('Review Checklist', 120, 50),
    createDocxTable([5000, 4906], [
      createRow([
        createDataCell('Raw data & chromatograms reviewed', AlignmentType.LEFT, false, undefined, 5000),
        createDataCell(isProtocol ? '[ ] Yes  [ ] No    Initials ____' : '[X] Yes  [ ] No    Reviewed by QC', AlignmentType.LEFT, false, undefined, 4906)
      ]),
      createRow([
        createDataCell('Audit trail reviewed', AlignmentType.LEFT, false, undefined, 5000),
        createDataCell(isProtocol ? '[ ] Yes  [ ] No    Initials ____' : '[X] Yes  [ ] No    Verified', AlignmentType.LEFT, false, undefined, 4906)
      ]),
      createRow([
        createDataCell('Deviation / OOS raised', AlignmentType.LEFT, false, undefined, 5000),
        createDataCell(isProtocol ? '[ ] None  [ ] Ref No: _________' : '[X] None  [ ] Ref No: N/A', AlignmentType.LEFT, false, undefined, 4906)
      ]),
      createRow([
        createDataCell('Annexures attached', AlignmentType.LEFT, false, undefined, 5000),
        createDataCell(isProtocol ? '____ of ____ pages' : 'Attached (Annexures 1 to 5)', AlignmentType.LEFT, false, undefined, 4906)
      ])
    ]),

    createSectionHeader('14. Abbreviations', 70, 30),
    abbrTable,
    endMarkParagraph,
  ];

  // Document Headers & Footers
  const runningHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: `${data.companyName}  |  ${isProtocol ? 'Assay AMV Protocol' : 'Assay AMV Report'} – ${data.productName}  |  Doc No. ${singleDocNumber}`,
            size: 18, // 9pt (increased from 8pt)
            font: FONT_FAMILY,
            color: '6B7280',
          }),
        ],
      }),
    ],
  });

  const stampBytes = await getWestCoastStampUint8Array(180);

  const runningFooter = createDocxSignOffFooter({
    docType: isProtocol ? 'protocol' : 'report',
    fontFamily: FONT_FAMILY,
    dataMode: options.dataMode,
    footerData: options.footerSignOffData,
    stampImageBytes: stampBytes,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 Width
              height: 16838, // A4 Height
            },
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        headers: {
          default: runningHeader,
        },
        footers: {
          default: runningFooter,
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanDocType = isProtocol ? 'AMV_Protocol' : 'AMV_Report';
  const cleanProduct = data.productName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanDocType}_${cleanProduct}_${singleDocNumber.replace(/\//g, '-')}.docx`;

  saveAs(blob, filename);
}
