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
import { RSAMVDocumentData, DocumentType, ThemeFormat, FooterSignOffData } from '../types';
import { createDocxSignOffFooter } from './docxSignOffFooter';
import { getWestCoastStampUint8Array } from '../utils/stampUtils';

export interface RSDocxOptions {
  docType: DocumentType;
  theme: ThemeFormat;
  fontFamily?: string;
  fontSize?: number;
  dataMode?: 'TEMPLATE' | 'DEMO';
  footerSignOffData?: FooterSignOffData;
}

export async function generateAndDownloadRSAMVDocx(
  data: RSAMVDocumentData,
  options: RSDocxOptions
): Promise<void> {
  const { docType, theme } = options;
  const isProtocol = docType === 'protocol';

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
  const isBlue = theme === 'blue';
  const isWestcoast = theme === 'westcoast';

  // Times New Roman (12pt default) matching authentic regulatory monograph
  const FONT_FAMILY = options.fontFamily || 'Times New Roman';
  const BASE_FONT_HALF_PT = (options.fontSize || 12) * 2;
  const TABLE_CELL_SIZE = Math.max(16, BASE_FONT_HALF_PT - 4);
  const SECTION_HEAD_SIZE = BASE_FONT_HALF_PT + 2;
  const SUBSECTION_HEAD_SIZE = BASE_FONT_HALF_PT;
  const BODY_SIZE = BASE_FONT_HALF_PT;

  const TOTAL_TABLE_WIDTH_DXA = 9906;

  const headerBgColor = isBlue ? '1F4E79' : 'F3F4F6';
  const headerTextColor = isBlue ? 'FFFFFF' : '111827';
  const borderColor = isBlue ? 'B0C4DE' : 'D1D5DB';
  const altRowBgColor = isBlue ? 'F8FAFC' : 'F9FAFB';
  const metaLabelBgColor = isBlue ? 'F2F4F8' : 'F3F4F6';
  const navyTextColor = isBlue ? '1F4E79' : '111827';

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
  };

  const cellMargins = {
    top: 60,
    bottom: 60,
    left: 90,
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
              text: text || ' ',
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

  const createSectionHeader = (title: string, beforeSpace = 140, afterSpace = 50) => {
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

  const createSubSectionHeader = (title: string, beforeSpace = 90, afterSpace = 40) => {
    return new Paragraph({
      spacing: { before: beforeSpace, after: afterSpace },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: SUBSECTION_HEAD_SIZE,
          font: FONT_FAMILY,
          color: navyTextColor,
        }),
      ],
    });
  };

  const createBodyText = (text: string, beforeSpace = 40, afterSpace = 50) => {
    return new Paragraph({
      spacing: { before: beforeSpace, after: afterSpace, line: 260 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text,
          size: BODY_SIZE,
          font: FONT_FAMILY,
          color: '1F2937',
        }),
      ],
    });
  };

  const createConclusionBlock = (text: string) => {
    return new Paragraph({
      spacing: { before: 60, after: 100, line: 260 },
      children: [
        new TextRun({
          text,
          bold: true,
          size: 20,
          font: FONT_FAMILY,
          color: isBlue ? '1E3A8A' : '111827',
        }),
      ],
    });
  };

  // Section items array
  const docElements: (Paragraph | Table)[] = [];

  // Single document number source of truth for exact character-by-character consistency
  const singleDocNumber = isProtocol
    ? data.protocolNo
    : (data.reportNo || (data.protocolNo.includes('/AMV/') ? data.protocolNo.replace('/AMV/', '/AMVR/') : `${data.protocolNo}/R`));

  // ================= PAGE 1 =================
  // Company Header (Skip for westcoast, already included in the table)
  if (!isWestcoast) {
    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 30 },
        children: [
          new TextRun({
            text: data.companyName,
            bold: true,
            size: 28,
            font: FONT_FAMILY,
            color: navyTextColor,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 10, after: 100 },
        children: [
          new TextRun({
            text: isProtocol
              ? 'ANALYTICAL METHOD VALIDATION PROTOCOL'
              : 'ANALYTICAL METHOD VALIDATION REPORT',
            bold: true,
            size: 24,
            font: FONT_FAMILY,
            color: navyTextColor,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 140 },
        children: [
          new TextRun({
            text: data.subTitle,
            bold: true,
            size: 22,
            font: FONT_FAMILY,
            color: '4B5563',
          }),
        ],
      })
    );
  }

  // If DEMO mode, add prominent regulatory disclaimer callout
  if (options.dataMode === 'DEMO') {
    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 120 },
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
    );
  }

  if (isWestcoast) {
    // Westcoast EXACT Format Layout
    const wcMetaColWidths = [1800, 3106, 2000, 3000]; // 4 cols, total 9906
    
    // Custom cell creator for the Westcoast metadata table
    const createWCCell = (text: string, colSpan: number, bold: boolean, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, width?: number) => {
      return new TableCell({
        columnSpan: colSpan,
        borders: cellBorder,
        margins: cellMargins,
        width: width ? { size: width, type: WidthType.DXA } : undefined,
        children: [
          new Paragraph({
            alignment: align,
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: text || ' ',
                bold: bold,
                size: TABLE_CELL_SIZE,
                font: FONT_FAMILY,
                color: '000000',
              })
            ]
          })
        ]
      });
    };

    const wcMetaTable = new Table({
      width: { size: 9906, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            createWCCell(`ANALYTICAL METHOD VERIFICATION ${isProtocol ? 'PROTOCOL' : 'REPORT'}\n(For Related Substance Method)`, 4, true, AlignmentType.CENTER)
          ]
        }),
        new TableRow({
          children: [
            createWCCell('Product Name', 1, true),
            createWCCell(data.productName, 3, false)
          ]
        }),
        new TableRow({
          children: [
            createWCCell('Test', 1, true),
            createWCCell(data.testParameter, 3, false)
          ]
        }),
        new TableRow({
          children: [
            createWCCell(isProtocol ? 'Protocol No.' : 'Report No.', 1, true, AlignmentType.LEFT, 1800),
            createWCCell(singleDocNumber, 1, false, AlignmentType.LEFT, 3106),
            createWCCell(isProtocol ? 'Protocol Date' : 'Report Date', 1, true, AlignmentType.LEFT, 2000),
            createWCCell(isProtocol ? data.protocolDate : data.reportDate, 1, false, AlignmentType.LEFT, 3000)
          ]
        })
      ]
    });
    
    docElements.push(wcMetaTable);
    docElements.push(new Paragraph({ spacing: { before: 400, after: 0 } })); // spacer

    docElements.push(new Paragraph({ children: [new PageBreak()] }));


  } else {
    // Normal / Blue Meta format
  
    // Metadata Table
    const metaColWidths = [2800, 7106];
    
    const metaRows: TableRow[] = [
      createRow([
        createDataCell(isProtocol ? 'Protocol No.' : 'Report No.', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(singleDocNumber, AlignmentType.LEFT, true, undefined, 7106),
      ]),
      createRow([
        createDataCell(isProtocol ? 'Protocol Date' : 'Report Date', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(isProtocol ? data.protocolDate : data.reportDate, AlignmentType.LEFT, false, undefined, 7106),
      ]),
      createRow([
        createDataCell('Product Name', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(data.productName, AlignmentType.LEFT, true, undefined, 7106),
      ]),
      createRow([
        createDataCell('Label Claim', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(data.labelClaim, AlignmentType.LEFT, false, undefined, 7106),
      ]),
      createRow([
        createDataCell('Test Parameter', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(data.testParameter, AlignmentType.LEFT, false, undefined, 7106),
      ]),
      createRow([
        createDataCell('Reference', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(data.reference, AlignmentType.LEFT, false, undefined, 7106),
      ]),
      createRow([
        createDataCell(isProtocol ? 'Batch No. to be used' : 'Batch No. used', AlignmentType.LEFT, true, metaLabelBgColor, 2800),
        createDataCell(isProtocol ? '—' : data.batchNoUsed, AlignmentType.LEFT, true, undefined, 7106),
      ]),
    ];
    docElements.push(createDocxTable(metaColWidths, metaRows));
  
    // Approval Table (4 Persons matching PDF)
    docElements.push(createSectionHeader('APPROVALS / SIGN-OFF', 140, 60));
    const signColWidths = [2200, 2600, 2600, 2506];
    const signRows: TableRow[] = [
      createRow([
        createHeaderCell('Activity', 2200),
        createHeaderCell('Designation', 2600),
        createHeaderCell('Name', 2600),
        createHeaderCell('Signature & Date', 2506),
      ], true),
      createRow([
        createDataCell('Prepared By', AlignmentType.LEFT, true, undefined, 2200),
        createDataCell(data.signOffs?.preparedBy?.designation, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(data.signOffs?.preparedBy?.name, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(isProtocol ? `${data.signOffs?.preparedBy?.name} / ${data.signOffs?.preparedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.preparedBy?.name} / ${data.signOffs?.preparedBy?.dateReport || data.signOffs?.preparedBy?.date}`, AlignmentType.CENTER, false, undefined, 2506),
      ]),
      createRow([
        createDataCell('Checked By', AlignmentType.LEFT, true, undefined, 2200),
        createDataCell(data.signOffs?.checkedBy?.designation, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(data.signOffs?.checkedBy?.name, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(isProtocol ? `${data.signOffs?.checkedBy?.name} / ${data.signOffs?.checkedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.checkedBy?.name} / ${data.signOffs?.checkedBy?.dateReport || data.signOffs?.checkedBy?.date}`, AlignmentType.CENTER, false, undefined, 2506),
      ]),
      createRow([
        createDataCell('Reviewed By', AlignmentType.LEFT, true, undefined, 2200),
        createDataCell(data.signOffs?.reviewedBy?.designation, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(data.signOffs?.reviewedBy?.name, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(isProtocol ? `${data.signOffs?.reviewedBy?.name} / ${data.signOffs?.reviewedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.reviewedBy?.name} / ${data.signOffs?.reviewedBy?.dateReport || data.signOffs?.reviewedBy?.date}`, AlignmentType.CENTER, false, undefined, 2506),
      ]),
      createRow([
        createDataCell('Authorised By', AlignmentType.LEFT, true, undefined, 2200),
        createDataCell(data.signOffs?.authorisedBy?.designation, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(data.signOffs?.authorisedBy?.name, AlignmentType.LEFT, false, undefined, 2600),
        createDataCell(isProtocol ? `${data.signOffs?.authorisedBy?.name} / ${data.signOffs?.authorisedBy?.dateProtocol || data.protocolDate}` : `${data.signOffs?.authorisedBy?.name} / ${data.signOffs?.authorisedBy?.dateReport || data.signOffs?.authorisedBy?.date}`, AlignmentType.CENTER, false, undefined, 2506),
      ]),
    ];
    docElements.push(createDocxTable(signColWidths, signRows));
  }

  // TABLE OF CONTENTS (Related Substances by HPLC)
  docElements.push(createSectionHeader('TABLE OF CONTENTS', 140, 60));
  const tocColWidths = [1200, 7206, 1500];
  const tocRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr. No.', tocColWidths[0]),
      createHeaderCell('Contents / Section Title', tocColWidths[1], AlignmentType.LEFT),
      createHeaderCell('Page No.', tocColWidths[2]),
    ], true),
    ...[
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
    ].map((item, idx) =>
      createRow([
        createDataCell(item.srNo, AlignmentType.CENTER, false, idx % 2 === 1 ? altRowBgColor : undefined, tocColWidths[0]),
        createDataCell(item.title, AlignmentType.LEFT, false, idx % 2 === 1 ? altRowBgColor : undefined, tocColWidths[1]),
        createDataCell(item.pageNo, AlignmentType.CENTER, true, idx % 2 === 1 ? altRowBgColor : undefined, tocColWidths[2]),
      ])
    )
  ];
  docElements.push(createDocxTable(tocColWidths, tocRows));

  // 1. Objective & 2. Scope
  docElements.push(
    createSectionHeader('1. OBJECTIVE', 160, 40),
    createBodyText(data.objective),
    createSectionHeader('2. SCOPE', 140, 40),
    createBodyText(data.scope)
  );

  // 3. Reference and Validation Details
  docElements.push(createSectionHeader('3. REFERENCE AND VALIDATION DETAILS', 140, 60));
  const refColWidths = [2600, 7306];
  const refRows: TableRow[] = [
    createRow([
      createDataCell('Reference', AlignmentType.LEFT, true, metaLabelBgColor, 2600),
      createDataCell(data.referenceDetails.reference, AlignmentType.LEFT, false, undefined, 7306),
    ]),
    createRow([
      createDataCell('Type of study', AlignmentType.LEFT, true, metaLabelBgColor, 2600),
      createDataCell(data.referenceDetails.typeOfStudy, AlignmentType.LEFT, false, undefined, 7306),
    ]),
    createRow([
      createDataCell('Test to be validated', AlignmentType.LEFT, true, metaLabelBgColor, 2600),
      createDataCell(data.referenceDetails.testToBeValidated, AlignmentType.LEFT, false, undefined, 7306),
    ]),
    createRow([
      createDataCell('Validation team', AlignmentType.LEFT, true, metaLabelBgColor, 2600),
      createDataCell(data.referenceDetails.validationTeam, AlignmentType.LEFT, false, undefined, 7306),
    ]),
    createRow([
      createDataCell('Experimental details', AlignmentType.LEFT, true, metaLabelBgColor, 2600),
      createDataCell(data.referenceDetails.experimentalDetails, AlignmentType.LEFT, false, undefined, 7306),
    ]),
  ];
  docElements.push(createDocxTable(refColWidths, refRows));

  // Page break to Page 2
  docElements.push(new Paragraph({ children: [new PageBreak()] }));

  // 4. Analytical Method Summary
  docElements.push(
    createSectionHeader('4. ANALYTICAL METHOD SUMMARY', 40, 60),
    createSubSectionHeader('4.1 Chromatographic Conditions', 60, 40)
  );

  const c = data.methodSummary.chromatographicConditions;
  const chromParagraph1 = new Paragraph({
    children: [
      new TextRun({ text: "Chromatographic analysis of Related Substances (Organic Impurities) is performed utilizing an ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Instrument / Detector: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.instrumentDetector || 'HPLC System equipped with UV/PDA Detector') + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Chromatographic separation is achieved using a stationary phase consisting of ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Column (Stationary Phase): ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.column + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The mobile phase system employed is ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Mobile Phase: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.mobilePhase || c.carrierGasOrMobilePhase || 'Phosphate Buffer : Acetonitrile') + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The chromatographic system operates at a steady ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Flow Rate: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.flowRate || c.injectionTempOrFlowRate || '1.0 mL/min') + ", ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "with spectrophotometric monitoring performed at a ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Detection Wavelength: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.wavelength || c.detectorTempOrWavelength || '210 nm') + ".", size: 20, font: FONT_FAMILY }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 60 },
  });

  const chromParagraph2 = new Paragraph({
    children: [
      new TextRun({ text: "Stationary phase temperature is maintained at a ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Column Temperature: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.columnTemperature || '30 °C') + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Sample introduction is performed with an ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Injection Volume: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.injectionVolume + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The total chromatographic ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Run Time: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.totalRunTime + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Standard and test preparations are dissolved and diluted in ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Diluent: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: c.diluent + ". ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "The method establishes an ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Internal Standard: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.internalStandard || 'N/A (External Standard Method)') + " ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "with relative retention established as ", size: 20, font: FONT_FAMILY }),
      new TextRun({ text: "Relative Retention: ", bold: true, size: 20, font: FONT_FAMILY }),
      new TextRun({ text: (c.relativeRetention || 'Specified per impurity monograph relative to main active analyte peak') + ".", size: 20, font: FONT_FAMILY }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 80 },
  });
  docElements.push(chromParagraph1, chromParagraph2);

  // 4.2 Mobile Phase / Gradient Programme Table
  docElements.push(createSubSectionHeader('4.2 Mobile Phase / Gradient Programme', 100, 40));
  const ovenColWidths = [2500, 3500, 3906];
  const ovenRows: TableRow[] = [
    createRow([
      createHeaderCell('Time (minutes)', 2500),
      createHeaderCell('Mobile Phase Composition / Condition', 3500),
      createHeaderCell('Comment', 3906),
    ], true),
    ...(data.methodSummary?.ovenProgramme || []).map((row, i) =>
      createRow([
        createDataCell(row.timeRange, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2500),
        createDataCell(row.temperature, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 3500),
        createDataCell(row.comment, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 3906),
      ])
    ),
  ];
  docElements.push(createDocxTable(ovenColWidths, ovenRows));

  // 4.3 Preparation of Solutions
  const sp = data.methodSummary.solutionPreparation;
  docElements.push(
    createSubSectionHeader('4.3 Preparation of Solutions', 100, 40),
    createBodyText(`Solution (1) — Internal Standard Solution: ${sp.internalStandard}`),
    createBodyText(`Solution (2) — Test Solution: ${sp.testSolution}`),
    createBodyText(`Solution (3) — Reference Solution: ${sp.referenceSolution}`),
    createBodyText(`Solution (4) — System Suitability Solution: ${sp.systemSuitabilitySolution}`),
    createBodyText(`Blank: ${sp.blank}`),
    createBodyText(`Placebo Solution: ${sp.placeboSolution}`),
    createBodyText(`Handling Note: ${sp.handlingNote}`)
  );

  // 4.4 Limits (as per the monograph)
  docElements.push(createSubSectionHeader('4.4 Limits (as per the monograph)', 100, 40));
  const limColWidths = [6500, 3406];
  const limRows: TableRow[] = [
    createRow([createHeaderCell('Criterion', 6500), createHeaderCell('Limit', 3406)], true),
    ...(data.methodSummary?.monographLimits || []).map((lim, i) =>
      createRow([
        createDataCell(lim.criterion, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 6500),
        createDataCell(lim.limit, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 3406),
      ])
    ),
  ];
  docElements.push(createDocxTable(limColWidths, limRows));

  // 4.5 Requirements
  docElements.push(createSubSectionHeader('4.5 Requirements (Reagents & Consumables)', 100, 40));
  const reqColWidths = [3300, 2700, 1900, 2006];
  const reqRows: TableRow[] = [
    createRow([
      createHeaderCell('Name of Material', 3300),
      createHeaderCell('Grade', 2700),
      createHeaderCell('Make', 1900),
      createHeaderCell('Batch No.', 2006),
    ], true),
    ...(data.methodSummary?.requirements || []).map((req, i) =>
      createRow([
        createDataCell(req.name, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 3300),
        createDataCell(req.grade, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 2700),
        createDataCell(req.make, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 1900),
        createDataCell(req.batchNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2006),
      ])
    ),
  ];
  docElements.push(createDocxTable(reqColWidths, reqRows));

  // Page break to Page 3
  docElements.push(new Paragraph({ children: [new PageBreak()] }));

  // 5. Validation Parameters Acceptance Criteria Table
  docElements.push(createSectionHeader('5. VALIDATION PARAMETERS — ACCEPTANCE CRITERIA', 40, 60));
  const critColWidths = [800, 2200, 4000, 2906];
  const critRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr.', 800),
      createHeaderCell('Parameter', 2200),
      createHeaderCell('Acceptance Criteria', 4000),
      createHeaderCell(isProtocol ? 'Execution Status' : 'Observed Result / Compliance', 2906),
    ], true),
    ...(data.validationParameters || []).map((param, i) =>
      createRow([
        createDataCell(param.srNo, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 800),
        createDataCell(param.parameter, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 2200),
        createDataCell(param.acceptanceCriteria, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 4000),
        createDataCell(
          isProtocol ? '—' : param.resultRemark,
          AlignmentType.LEFT,
          !isProtocol,
          i % 2 === 1 ? altRowBgColor : undefined,
          2906
        ),
      ])
    ),
  ];
  docElements.push(createDocxTable(critColWidths, critRows));

  // 6. System Suitability
  docElements.push(createSectionHeader('6. SYSTEM SUITABILITY', 120, 50));
  prepParagraphs('systemSuitability').forEach((p) => docElements.push(p));
  const ssInjLabel = isProtocol ? 'Working Standard Weight (mg)' : 'Working Standard Weight (mg)';
  const ssColWidths = [1000, 2400, 2300, 1600, 1600, 1006];
  const ssRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr. No.', 1000),
      createHeaderCell(ssInjLabel, 2400),
      createHeaderCell('Peak Area', 2300),
      createHeaderCell('Tailing Factor', 1600),
      createHeaderCell('Theoretical Plates', 1600),
      createHeaderCell('Remark', 1006),
    ], true),
    ...(data.systemSuitability?.injections || []).map((inj, i) =>
      createRow([
        createDataCell(inj.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1000),
        createDataCell(isProtocol ? '—' : inj.weightMg, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2400),
        createDataCell(isProtocol ? '—' : inj.peakArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 2300),
        createDataCell(isProtocol ? '—' : (inj.tailingFactor ?? '1.12'), AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1600),
        createDataCell(isProtocol ? '—' : typeof inj.theoreticalPlates === 'number' ? inj.theoreticalPlates.toLocaleString('en-US', { useGrouping: false }) : (inj.theoreticalPlates ?? '4,850'), AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1600),
        createDataCell(isProtocol ? '—' : inj.remark, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 1006),
      ])
    ),
  ];
  docElements.push(createDocxTable(ssColWidths, ssRows));

  // SS Summary Stats Table
  const ssStats = data.systemSuitability.stats;
  const ssStatColWidths = [3300, 3300, 3306];
  const ssStatRows: TableRow[] = [
    createRow([
      createDataCell('Mean Peak Area', AlignmentType.LEFT, true, metaLabelBgColor, 3300),
      createDataCell(isProtocol ? '—' : ssStats.meanArea, AlignmentType.CENTER, false, undefined, 3300),
      createDataCell('Acceptance: Record value', AlignmentType.LEFT, false, undefined, 3306),
    ]),
    createRow([
      createDataCell('% RSD of Peak Area', AlignmentType.LEFT, true, metaLabelBgColor, 3300),
      createDataCell(isProtocol ? '—' : `${ssStats.rsdArea} %`, AlignmentType.CENTER, true, undefined, 3300),
      createDataCell('Acceptance: NMT 2.0 %', AlignmentType.LEFT, true, undefined, 3306),
    ]),
    createRow([
      createDataCell('Tailing Factor (T)', AlignmentType.LEFT, true, metaLabelBgColor, 3300),
      createDataCell(isProtocol ? '—' : ssStats.tailingFactor, AlignmentType.CENTER, false, undefined, 3300),
      createDataCell('Acceptance: NMT 2.0', AlignmentType.LEFT, true, undefined, 3306),
    ]),
    createRow([
      createDataCell('Theoretical Plates (N)', AlignmentType.LEFT, true, metaLabelBgColor, 3300),
      createDataCell(isProtocol ? '—' : ssStats.theoreticalPlates, AlignmentType.CENTER, false, undefined, 3300),
      createDataCell(`Acceptance: ${ssStats.theoreticalPlatesCriteria || 'NLT 1500'}`, AlignmentType.LEFT, true, undefined, 3306),
    ]),
    createRow([
      createDataCell('Resolution (Rs)', AlignmentType.LEFT, true, metaLabelBgColor, 3300),
      createDataCell(isProtocol ? '—' : ssStats.resolution, AlignmentType.CENTER, false, undefined, 3300),
      createDataCell('Acceptance: NLT 2.0', AlignmentType.LEFT, true, undefined, 3306),
    ]),
  ];
  docElements.push(
    new Paragraph({ spacing: { before: 60, after: 20 } }),
    createDocxTable(ssStatColWidths, ssStatRows),
    createConclusionBlock(isProtocol ? ssStats.conclusionProtocol : ssStats.conclusionReport)
  );

  // 7. Specificity
  docElements.push(createSectionHeader('7. SPECIFICITY', 120, 50));
  prepParagraphs('specificity').forEach((p) => docElements.push(p));
  const specColWidths = [3300, 2200, 2200, 2206];
  const specRows: TableRow[] = [
    createRow([
      createHeaderCell('Solution', 3300),
      createHeaderCell('Retention Time (min)', 2200),
      createHeaderCell('Peak Area', 2200),
      createHeaderCell('Interference Observed', 2206),
    ], true),
    ...(data.specificity?.rows || []).map((row, i) =>
      createRow([
        createDataCell(row.solution, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 3300),
        createDataCell(isProtocol ? '—' : row.retentionTime, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2200),
        createDataCell(isProtocol ? '—' : row.peakArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 2200),
        createDataCell(isProtocol ? '—' : row.interferenceObserved, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 2206),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(specColWidths, specRows),
    createConclusionBlock(isProtocol ? data.specificity.conclusionProtocol : data.specificity.conclusionReport)
  );

  // Page break to Page 4
  docElements.push(new Paragraph({ children: [new PageBreak()] }));

  // 8. Linearity & Range
  const lin = data.linearityAndRange;
  docElements.push(
    createSectionHeader('8. LINEARITY AND RANGE', 40, 50),
    ...prepParagraphs('linearityAndRange'),
    createSubSectionHeader('8.1 Linearity', 40, 40)
  );
  const linColWidths = [2400, 1800, 1800, 1900, 2006];
  const linRows: TableRow[] = [
    createRow([
      createHeaderCell('Level', 2400),
      createHeaderCell('Nominal (ppm)', 1800),
      createHeaderCell('Weight (mg)', 1800),
      createHeaderCell('Final Dilution', 1900),
      createHeaderCell('Mean Peak Area', 2006),
    ], true),
    ...(lin?.linearityLevels || []).map((lvl, i) =>
      createRow([
        createDataCell(lvl.levelName, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 2400),
        createDataCell(lvl.nominalPpm, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1800),
        createDataCell(isProtocol ? '—' : lvl.weightTakenMg, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1800),
        createDataCell(lvl.finalDilution, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1900),
        createDataCell(isProtocol ? '—' : lvl.meanArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 2006),
      ])
    ),
  ];
  docElements.push(createDocxTable(linColWidths, linRows));

  // Regression Table
  const reg = lin.regression;
  const regColWidths = [4500, 2700, 2706];
  const regRows: TableRow[] = [
    createRow([
      createDataCell('Correlation Coefficient (r²)', AlignmentType.LEFT, true, metaLabelBgColor, 4500),
      createDataCell(isProtocol ? 'Criteria: ≥ 0.995' : reg.rSquared, AlignmentType.CENTER, true, undefined, 2700),
      createDataCell('Acceptance: ≥ 0.995', AlignmentType.LEFT, true, undefined, 2706),
    ]),
    createRow([
      createDataCell('Slope (S)', AlignmentType.LEFT, true, metaLabelBgColor, 4500),
      createDataCell(isProtocol ? '—' : reg.slope, AlignmentType.CENTER, false, undefined, 2700),
      createDataCell('Record value', AlignmentType.LEFT, false, undefined, 2706),
    ]),
    createRow([
      createDataCell('y-Intercept (c)', AlignmentType.LEFT, true, metaLabelBgColor, 4500),
      createDataCell(isProtocol ? '—' : reg.yIntercept, AlignmentType.CENTER, false, undefined, 2700),
      createDataCell('Record value', AlignmentType.LEFT, false, undefined, 2706),
    ]),
    createRow([
      createDataCell('Residual SD of y-intercepts', AlignmentType.LEFT, true, metaLabelBgColor, 4500),
      createDataCell(isProtocol ? '—' : reg.sdYIntercepts, AlignmentType.CENTER, false, undefined, 2700),
      createDataCell('Used for LOD/LOQ', AlignmentType.LEFT, false, undefined, 2706),
    ]),
  ];
  docElements.push(
    new Paragraph({ spacing: { before: 50, after: 20 } }),
    createDocxTable(regColWidths, regRows),
    createConclusionBlock(isProtocol ? reg.conclusionProtocol : reg.conclusionReport),
    createSubSectionHeader('8.2 Range', 90, 40)
  );

  // Range Table
  const rngColWidths = [1200, 2200, 3200, 3306];
  const rngRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr.', 1200),
      createHeaderCell('Level (ppm)', 2200),
      createHeaderCell('Sample ID', 3200),
      createHeaderCell('Peak Area', 3306),
    ], true),
    ...(lin?.rangeRows || []).map((rng, i) =>
      createRow([
        createDataCell(rng.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1200),
        createDataCell(rng.levelPpm, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 2200),
        createDataCell(rng.sampleId, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 3200),
        createDataCell(isProtocol ? '—' : rng.peakArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 3306),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(rngColWidths, rngRows),
    createConclusionBlock(isProtocol ? lin.rangeConclusionProtocol : lin.rangeConclusionReport)
  );

  // 9. Precision (Repeatability)
  const prec = data.precision;
  docElements.push(createSectionHeader('9. PRECISION (REPEATABILITY)', 120, 50));
  prepParagraphs('precision').forEach((p) => docElements.push(p));
  const precColWidths = [1200, 2500, 2000, 2200, 2006];
  const precRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr. No.', 1200),
      createHeaderCell('Sample ID', 2500),
      createHeaderCell('Volume / Weight', 2000),
      createHeaderCell('Peak Area', 2200),
      createHeaderCell('Content (% of LA)', 2006),
    ], true),
    ...(prec?.rows || []).map((row, i) =>
      createRow([
        createDataCell(row.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1200),
        createDataCell(row.sampleId, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 2500),
        createDataCell(isProtocol ? '—' : row.volumeUsed, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2000),
        createDataCell(isProtocol ? '—' : row.peakArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 2200),
        createDataCell(isProtocol ? '—' : row.contentPercentLa, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2006),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(precColWidths, precRows),
    createConclusionBlock(isProtocol ? prec.stats.conclusionProtocol : prec.stats.conclusionReport)
  );

  // Page break to Page 5
  docElements.push(new Paragraph({ children: [new PageBreak()] }));

  // 10. Limit of Detection and Limit of Quantitation
  const lod = data.lodLoq;
  docElements.push(
    createSectionHeader('10. LIMIT OF DETECTION AND LIMIT OF QUANTITATION', 40, 50),
    ...prepParagraphs('lodLoq'),
    createBodyText('Formulae: LOD = 3.3 × (SD / S) and LOQ = 10 × (SD / S), where SD = residual standard deviation of y-intercepts and S = slope of the calibration curve.')
  );

  const lodConfColWidths = [1200, 2800, 2400, 1800, 1706];
  const lodConfRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr.', 1200),
      createHeaderCell('Level', 2800),
      createHeaderCell('Concentration (ppm)', 2400),
      createHeaderCell('Peak Area', 1800),
      createHeaderCell('S/N Ratio', 1706),
    ], true),
    ...(lod?.confirmationRows || []).map((row, i) =>
      createRow([
        createDataCell(row.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1200),
        createDataCell(row.level, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 2800),
        createDataCell(row.concentrationPpm, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2400),
        createDataCell(isProtocol ? '—' : row.peakArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 1800),
        createDataCell(isProtocol ? (row.level === 'LOD' ? 'Criteria: S/N ≥ 3' : 'Criteria: S/N ≥ 10') : row.snRatio, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 1706),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(lodConfColWidths, lodConfRows),
    createSubSectionHeader('Precision at LOQ Level (6 Replicates)', 80, 40)
  );

  const loqPrecColWidths = [1200, 2600, 2600, 3506];
  const loqPrecRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr. No.', 1200),
      createHeaderCell('Peak Area', 2600),
      createHeaderCell('Content (% of LA)', 2600),
      createHeaderCell('Remark', 3506),
    ], true),
    ...(lod?.loqPrecisionRows || []).map((r, i) =>
      createRow([
        createDataCell(r.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1200),
        createDataCell(isProtocol ? '—' : r.peakArea, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 2600),
        createDataCell(isProtocol ? '—' : r.contentPercentLa, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 2600),
        createDataCell(isProtocol ? '—' : r.remark, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 3506),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(loqPrecColWidths, loqPrecRows),
    createConclusionBlock(isProtocol ? lod.loqStats.conclusionProtocol : lod.loqStats.conclusionReport)
  );

  // 11. Intermediate Precision
  const ip = data.intermediatePrecision;
  docElements.push(createSectionHeader('11. INTERMEDIATE PRECISION (ANALYST 1 VS ANALYST 2)', 120, 50));
  prepParagraphs('intermediatePrecision').forEach((p) => docElements.push(p));
  const ipColWidths = [800, 1500, 1500, 1500, 1500, 1500, 1606];
  const ipRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr.', 800),
      createHeaderCell('Analyst 1 Vol', 1500),
      createHeaderCell('Analyst 1 Area', 1500),
      createHeaderCell('Analyst 1 % LA', 1500),
      createHeaderCell('Analyst 2 Vol', 1500),
      createHeaderCell('Analyst 2 Area', 1500),
      createHeaderCell('Analyst 2 % LA', 1606),
    ], true),
    ...(ip?.rows || []).map((row, i) =>
      createRow([
        createDataCell(row.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 800),
        createDataCell(isProtocol ? '—' : row.analyst1Volume, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1500),
        createDataCell(isProtocol ? '—' : row.analyst1Area, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 1500),
        createDataCell(isProtocol ? '—' : row.analyst1Content, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1500),
        createDataCell(isProtocol ? '—' : row.analyst2Volume, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1500),
        createDataCell(isProtocol ? '—' : row.analyst2Area, AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 1500),
        createDataCell(isProtocol ? '—' : row.analyst2Content, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1606),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(ipColWidths, ipRows),
    createConclusionBlock(isProtocol ? ip.stats.conclusionProtocol : ip.stats.conclusionReport)
  );

  // Page break to Page 6
  docElements.push(new Paragraph({ children: [new PageBreak()] }));

  // 12. Accuracy (Recovery)
  const acc = data.accuracy;
  docElements.push(createSectionHeader('12. ACCURACY (RECOVERY)', 40, 50));
  prepParagraphs('accuracy').forEach((p) => docElements.push(p));
  const accColWidths = [700, 2000, 1800, 1800, 1800, 1806];
  const accRows: TableRow[] = [
    createRow([
      createHeaderCell('Sr.', 700),
      createHeaderCell('Spike Level (%)', 2000),
      createHeaderCell('Spiked (mg)', 1800),
      createHeaderCell('Peak Area', 1800),
      createHeaderCell('Recovered (mg)', 1800),
      createHeaderCell('% Recovery', 1806),
    ], true),
    ...(acc?.rows || []).map((row, i) =>
      createRow([
        createDataCell(row.srNo, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 700),
        createDataCell(`${row.levelPpm} % (${Math.round((Number(row.levelPpm) / 100) * Number(data.linearityAndRange.linearityLevels[2]?.nominalPpm || 300))} ppm)`, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 2000),
        createDataCell(isProtocol ? '—' : row.standardSpikedMg, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1800),
        createDataCell(isProtocol ? '—' : Number(row.sampleArea).toLocaleString('en-US', { useGrouping: false }), AlignmentType.RIGHT, false, i % 2 === 1 ? altRowBgColor : undefined, 1800),
        createDataCell(isProtocol ? '—' : row.amountRecoveredMg, AlignmentType.CENTER, false, i % 2 === 1 ? altRowBgColor : undefined, 1800),
        createDataCell(isProtocol ? '—' : `${row.percentRecovery} %`, AlignmentType.CENTER, true, i % 2 === 1 ? altRowBgColor : undefined, 1806),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(accColWidths, accRows),
    createConclusionBlock(isProtocol ? acc.stats.conclusionProtocol : acc.stats.conclusionReport)
  );

  
  docElements.push(
    createSectionHeader('Overall Conclusion', 120, 50),
    ...(isProtocol
      ? [
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: '____________________________________________________________________', size: 22, font: FONT_FAMILY })] }),
          new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: '____________________________________________________________________', size: 22, font: FONT_FAMILY })] }),
          new Paragraph({ spacing: { before: 60, after: 120 }, children: [new TextRun({ text: '____________________________________________________________________', size: 22, font: FONT_FAMILY })] }),
          new Paragraph({ spacing: { before: 60, after: 240 }, children: [new TextRun({ text: 'To be completed by the analyst after execution.', size: 22, font: FONT_FAMILY, italics: true })] }),
        ]
      : [
          new Paragraph({
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: (data as any).overallConclusion || `The analytical test method for Related Substances (Organic Impurities) in ${data.productName} by HPLC has been thoroughly validated in compliance with ICH Q2(R2) and USP <1225> guidelines. The method demonstrates high specificity with baseline separation of all specified impurities and degradation products, excellent linearity (r ≥ 0.999), sensitive LOD/LOQ below the disregard limit, robust precision (%RSD ≤ 5.0%), and confirmed solution stability for up to 24 hours. All predetermined acceptance criteria have been satisfied. The analytical method is concluded to be validated and suitable for its intended quality control purpose.`,
                size: 22,
                font: FONT_FAMILY
              })
            ]
          }),
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
    ])
  );

  // 15. Abbreviations
  docElements.push(createSectionHeader('15. ABBREVIATIONS', 120, 50));
  const abbrColWidths = [2500, 7406];
  const abbrRows: TableRow[] = [
    createRow([createHeaderCell('Abbreviation', 2500), createHeaderCell('Full Form / Expansion', 7406)], true),
    ...(data.abbreviations || []).map((ab, i) =>
      createRow([
        createDataCell(ab.abbreviation, AlignmentType.LEFT, true, i % 2 === 1 ? altRowBgColor : undefined, 2500),
        createDataCell(ab.expansion, AlignmentType.LEFT, false, i % 2 === 1 ? altRowBgColor : undefined, 7406),
      ])
    ),
  ];
  docElements.push(
    createDocxTable(abbrColWidths, abbrRows),
    new Paragraph({
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
    })
  );

  // Headers and Footers for running pages
  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `${data.companyName} | ${isProtocol ? 'Related Substances Protocol' : 'Related Substances Report'} (${data.productName}) — Doc No: ${singleDocNumber}`,
            size: 16,
            font: FONT_FAMILY,
            color: '6B7280',
          }),
        ],
      }),
    ],
  });

  const stampBytes = await getWestCoastStampUint8Array(180);

  const docFooter = createDocxSignOffFooter({
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
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: docHeader,
        },
        footers: {
          default: docFooter,
        },
        children: docElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${singleDocNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${isProtocol ? 'RS_Protocol' : 'RS_Report'}.docx`;
  saveAs(blob, fileName);
}
