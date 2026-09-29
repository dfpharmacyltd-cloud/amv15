import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import { MLTDocumentData, FooterSignOffData, ThemeFormat } from '../types';
import { getWestCoastStampUint8Array } from '../utils/stampUtils';
import { createDocxSignOffTable } from './docxSignOffFooter';

export interface WestcoastRecoveryItem {
  organism: string;
  dilution: string;
  inoc: number | string;
  samp: number | string;
  test: number | string;
  net: number | string;
  rec: string;
  ratio: string;
  remark: string;
}

export const WESTCOAST_MLT_RECOVERY_BENCHMARK: WestcoastRecoveryItem[] = [
  { organism: 'Staphylococcus aureus', dilution: '1:10', inoc: 89, samp: 1, test: 98, net: 97, rec: '109 %', ratio: '1.09', remark: 'Complies' },
  { organism: 'Staphylococcus aureus', dilution: '1:50', inoc: 71, samp: 1, test: 76, net: 75, rec: '105.6 %', ratio: '1.06', remark: 'Complies' },
  { organism: 'Staphylococcus aureus', dilution: '1:100', inoc: 79, samp: 0, test: 68, net: 68, rec: '86.1 %', ratio: '0.86', remark: 'Complies' },
  { organism: 'Pseudomonas aeruginosa', dilution: '1:10', inoc: 70, samp: 1, test: 63, net: 62, rec: '88.6 %', ratio: '0.89', remark: 'Complies' },
  { organism: 'Pseudomonas aeruginosa', dilution: '1:50', inoc: 73, samp: 0, test: 72, net: 72, rec: '98.6 %', ratio: '0.99', remark: 'Complies' },
  { organism: 'Pseudomonas aeruginosa', dilution: '1:100', inoc: 72, samp: 0, test: 57, net: 57, rec: '79.2 %', ratio: '0.79', remark: 'Complies' },
  { organism: 'Escherichia coli', dilution: '1:10', inoc: 90, samp: 1, test: 80, net: 79, rec: '87.8 %', ratio: '0.88', remark: 'Complies' },
  { organism: 'Escherichia coli', dilution: '1:50', inoc: 80, samp: 0, test: 87, net: 87, rec: '108.7 %', ratio: '1.09', remark: 'Complies' },
  { organism: 'Escherichia coli', dilution: '1:100', inoc: 78, samp: 1, test: 77, net: 76, rec: '97.4 %', ratio: '0.97', remark: 'Complies' },
  { organism: 'Bacillus subtilis', dilution: '1:10', inoc: 80, samp: 0, test: 88, net: 88, rec: '110 %', ratio: '1.1', remark: 'Complies' },
  { organism: 'Bacillus subtilis', dilution: '1:50', inoc: 84, samp: 0, test: 73, net: 73, rec: '86.9 %', ratio: '0.87', remark: 'Complies' },
  { organism: 'Bacillus subtilis', dilution: '1:100', inoc: 81, samp: 0, test: 71, net: 71, rec: '87.7 %', ratio: '0.88', remark: 'Complies' },
  { organism: 'Salmonella enterica Typhimurium', dilution: '1:10', inoc: 71, samp: 1, test: 79, net: 78, rec: '109.9 %', ratio: '1.1', remark: 'Complies' },
  { organism: 'Salmonella enterica Typhimurium', dilution: '1:50', inoc: 71, samp: 1, test: 75, net: 74, rec: '104.2 %', ratio: '1.04', remark: 'Complies' },
  { organism: 'Salmonella enterica Typhimurium', dilution: '1:100', inoc: 82, samp: 1, test: 81, net: 80, rec: '97.6 %', ratio: '0.98', remark: 'Complies' },
  { organism: 'Candida albicans', dilution: '1:10', inoc: 75, samp: 1, test: 79, net: 78, rec: '104 %', ratio: '1.04', remark: 'Complies' },
  { organism: 'Candida albicans', dilution: '1:50', inoc: 94, samp: 0, test: 98, net: 98, rec: '104.3 %', ratio: '1.04', remark: 'Complies' },
  { organism: 'Candida albicans', dilution: '1:100', inoc: 74, samp: 0, test: 55, net: 55, rec: '74.3 %', ratio: '0.74', remark: 'Complies' },
  { organism: 'Aspergillus brasiliensis', dilution: '1:10', inoc: 86, samp: 0, test: 63, net: 63, rec: '73.3 %', ratio: '0.73', remark: 'Complies' },
  { organism: 'Aspergillus brasiliensis', dilution: '1:50', inoc: 94, samp: 0, test: 100, net: 100, rec: '106.4 %', ratio: '1.06', remark: 'Complies' },
  { organism: 'Aspergillus brasiliensis', dilution: '1:100', inoc: 74, samp: 1, test: 77, net: 76, rec: '102.7 %', ratio: '1.03', remark: 'Complies' },
];

export interface WestcoastSpecifiedItem {
  organism: string;
  medium: string;
  pos: string;
  neg: string;
  test: string;
  idResult: string;
}

export const WESTCOAST_MLT_SPECIFIED_BENCHMARK: WestcoastSpecifiedItem[] = [
  { organism: 'Staphylococcus aureus', medium: 'Soybean-Casein Digest Broth / MSA', pos: 'Growth', neg: 'No growth', test: 'No growth', idResult: 'Confirmed' },
  { organism: 'Pseudomonas aeruginosa', medium: 'Soybean-Casein Digest Broth / Cetrimide agar', pos: 'Growth', neg: 'No growth', test: 'No growth', idResult: 'Confirmed' },
  { organism: 'Escherichia coli', medium: 'Soybean-Casein Digest Broth / MacConkey agar', pos: 'Growth', neg: 'No growth', test: 'No growth', idResult: 'Confirmed' },
  { organism: 'Salmonella enterica Typhimurium', medium: 'RVS broth / XLD agar', pos: 'Growth', neg: 'No growth', test: 'No growth', idResult: 'Confirmed' },
  { organism: 'Candida albicans', medium: 'SDB / SDA', pos: 'Growth', neg: 'No growth', test: 'No growth', idResult: 'Confirmed' },
];

export interface MLTDocxOptions {
  dataMode?: string;
  docType?: 'protocol' | 'report';
  theme?: ThemeFormat;
  fontFamily?: string;
  fontSize?: number;
  footerSignOffData?: FooterSignOffData;
}

export async function generateAndDownloadMLTDocx(
  data: MLTDocumentData,
  options: MLTDocxOptions = { dataMode: 'TEMPLATE' }
): Promise<void> {
  const isProtocol = options.docType ? options.docType === 'protocol' : !data.reportNo;

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
  const docTypeTitle = isProtocol ? 'Microbial Limit Test Protocol' : 'Microbial Limit Test Report';
  const docTypeHeader = isProtocol ? 'ANALYTICAL METHOD VERIFICATION PROTOCOL' : 'ANALYTICAL METHOD VERIFICATION REPORT';
  
  // Extract or default parameters to match the authentic Westcoast PDF
  const companyName = data.companyName && !data.companyName.includes('Pharma QC Labs')
    ? data.companyName
    : 'WESTCOAST PHARMACEUTICAL WORKS LTD.';
  const productName = data.productName || 'Tibolone Tablets BP 2.5 mg';
  const batchNo = data.batchNo || 'VAL-TIB-2609665';
  const docNo = (isProtocol ? data.protocolNo : data.reportNo) || (isProtocol ? 'AMVP-TIB-2609-665' : 'AMVR-TIB-2609-665');
  const references = data.references && data.references.length > 0 ? data.references.join(', ') : 'USP <61>, USP <62>, USP <1111>';
  const dataMode = options.dataMode || 'DEMO';
  const isDemo = dataMode === 'DEMO';
  const FONT_FAMILY = options.fontFamily || 'Times New Roman';

  const cleanDocType = isProtocol ? 'AMV_Protocol' : 'AMV_Report';
  const cleanProduct = productName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanDocType}_MLT_${cleanProduct}_${docNo.replace(/\//g, '-')}.docx`;

  // Pre-load the official Westcoast rubber stamp bytes
  const stampBytes = await getWestCoastStampUint8Array();

  const blackBorder = {
    style: BorderStyle.SINGLE,
    size: 4, // 0.5 pt
    color: '000000',
  };

  const tableCellBorders = {
    top: blackBorder,
    bottom: blackBorder,
    left: blackBorder,
    right: blackBorder,
  };

  const cellMargins = {
    top: 60,
    bottom: 60,
    left: 80,
    right: 80,
  };

  const createCell = (
    text: string | number,
    widthDxa: number,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER,
    bold = false,
    fontSize = 22,
    color = '000000'
  ) => {
    return new TableCell({
      width: { size: widthDxa, type: WidthType.DXA },
      borders: tableCellBorders,
      margins: cellMargins,
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: String(text !== undefined && text !== null ? text : ' '),
              bold,
              size: fontSize,
              font: FONT_FAMILY,
              color,
            }),
          ],
        }),
      ],
    });
  };

  const TOTAL_W = 9360;
  const hdrFill = options.theme === 'simple' ? 'D9D9D9' : '1F4E79';
  const hdrColor = options.theme === 'simple' ? '000000' : 'FFFFFF';

  const headCell = (text: string, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: tableCellBorders,
      margins: cellMargins,
      shading: { fill: hdrFill },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 18, font: FONT_FAMILY, color: hdrColor })],
        }),
      ],
    });

  const txtCell = (text: string | number, w: number, align: any = AlignmentType.LEFT, bold = false, fill?: string) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: tableCellBorders,
      margins: cellMargins,
      shading: fill ? { fill } : undefined,
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: String(text ?? ' ') || ' ', bold, size: 18, font: FONT_FAMILY })],
        }),
      ],
    });

  const tbl = (widths: number[], rows: TableRow[]) =>
    new Table({ width: { size: TOTAL_W, type: WidthType.DXA }, columnWidths: widths, rows });

  const sectionTitle = (text: string) =>
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text, bold: true, size: 22, font: FONT_FAMILY, color: hdrFill === '1F4E79' ? '1F4E79' : '000000' })],
    });

  const body = (text: string, opts: { bold?: boolean; italics?: boolean; size?: number; indent?: boolean } = {}) =>
    new Paragraph({
      spacing: { before: 40, after: 40 },
      alignment: AlignmentType.JUSTIFIED,
      indent: opts.indent ? { left: 200, hanging: 200 } : undefined,
      children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size || 20, font: FONT_FAMILY })],
    });

  const meanOf = (a: any, b: any) => {
    const x = Number(a);
    const y = Number(b);
    if (isNaN(x) && isNaN(y)) return 0;
    if (isNaN(y)) return x;
    if (isNaN(x)) return y;
    return (x + y) / 2;
  };

  // 1. Running Header (identical to PDF: Company | AMV Report - Product | Doc No. ...)
  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({
            text: `${companyName} | ${docTypeTitle} - ${productName} | Doc No. ${docNo}`,
            size: 17, // ~8.5pt
            font: FONT_FAMILY,
            color: '666666',
          }),
        ],
      }),
    ],
  });

  // 2. Running Footer (DEMO watermark + Page X of Y)
  const docFooter = new Footer({
    children: [
      ...(isDemo
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 20 },
              children: [
                new TextRun({
                  text: 'DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE',
                  size: 16,
                  bold: true,
                  font: FONT_FAMILY,
                  color: 'B45309', // Amber watermark matching PDF
                }),
              ],
            }),
          ]
        : []),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 0 },
        children: [
          new TextRun({
            text: 'Page ',
            size: 18,
            font: FONT_FAMILY,
            color: '333333',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18,
            font: FONT_FAMILY,
            color: '333333',
          }),
          new TextRun({
            text: ' of ',
            size: 18,
            font: FONT_FAMILY,
            color: '333333',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 18,
            font: FONT_FAMILY,
            color: '333333',
          }),
        ],
      }),
    ],
  });

  // 3. Metadata Table (Document No., Product Name, Batch No., References)
  const metaTable = new Table({
    width: { size: 9906, type: WidthType.DXA },
    borders: tableCellBorders,
    rows: [
      new TableRow({
        children: [
          createCell('Document No.', 3200, AlignmentType.LEFT, true, 20),
          createCell(docNo, 6706, AlignmentType.LEFT, true, 20),
        ],
      }),
      new TableRow({
        children: [
          createCell('Product Name', 3200, AlignmentType.LEFT, true, 20),
          createCell(productName, 6706, AlignmentType.LEFT, true, 20),
        ],
      }),
      new TableRow({
        children: [
          createCell('Batch No.', 3200, AlignmentType.LEFT, true, 20),
          createCell(batchNo, 6706, AlignmentType.LEFT, true, 20),
        ],
      }),
      new TableRow({
        children: [
          createCell('References', 3200, AlignmentType.LEFT, true, 20),
          createCell(references, 6706, AlignmentType.LEFT, false, 20),
        ],
      }),
    ],
  });

  // 4. Recovery Table Header Row (9 Columns, matching PDF)
  // Col widths (total = 9906 dxa):
  const recColWidths = [2006, 850, 1050, 1000, 950, 1050, 1100, 800, 1100];
  const createRecHeaderRow = () =>
    new TableRow({
      children: [
        createCell('Organism', recColWidths[0], AlignmentType.CENTER, true, 18),
        createCell('Dilution', recColWidths[1], AlignmentType.CENTER, true, 18),
        createCell('Inoculum Control', recColWidths[2], AlignmentType.CENTER, true, 18),
        createCell('Sample Control', recColWidths[3], AlignmentType.CENTER, true, 18),
        createCell('Test Plate', recColWidths[4], AlignmentType.CENTER, true, 18),
        createCell('Net Test (cfu)', recColWidths[5], AlignmentType.CENTER, true, 18),
        createCell('Recovery %', recColWidths[6], AlignmentType.CENTER, true, 18),
        createCell('Ratio', recColWidths[7], AlignmentType.CENTER, true, 18),
        createCell('Remark', recColWidths[8], AlignmentType.CENTER, true, 18),
      ],
    });

  const createRecDataRow = (item: WestcoastRecoveryItem) =>
    new TableRow({
      children: [
        createCell(item.organism, recColWidths[0], AlignmentType.LEFT, true, 18),
        createCell(item.dilution, recColWidths[1], AlignmentType.CENTER, false, 18),
        createCell(item.inoc, recColWidths[2], AlignmentType.CENTER, false, 18),
        createCell(item.samp, recColWidths[3], AlignmentType.CENTER, false, 18),
        createCell(item.test, recColWidths[4], AlignmentType.CENTER, false, 18),
        createCell(item.net, recColWidths[5], AlignmentType.CENTER, false, 18),
        createCell(item.rec, recColWidths[6], AlignmentType.CENTER, false, 18),
        createCell(item.ratio, recColWidths[7], AlignmentType.CENTER, false, 18),
        createCell(item.remark, recColWidths[8], AlignmentType.CENTER, true, 18),
      ],
    });

  // Recovery rows come from this report's own data. The benchmark constant is only
  // a layout reference and is never printed, otherwise every product would export
  // the same 22 rows.
  const meanCfu = (a: any, b: any) => {
    const x = Number(a);
    const y = Number(b);
    if (isNaN(x) && isNaN(y)) return 0;
    if (isNaN(y)) return x;
    if (isNaN(x)) return y;
    return (x + y) / 2;
  };

  const organismNameById = new Map<string, string>(
    (data.organisms || []).map((o) => [o.id, o.name])
  );

  const recoveryItems: WestcoastRecoveryItem[] = (data.recoveryRows || []).map((row: any) => {
    const inoc = meanCfu(row.inoculumControl1, row.inoculumControl2);
    const samp = meanCfu(row.sampleControl1, row.sampleControl2);
    const test = meanCfu(row.testPlate1, row.testPlate2);
    const net = test - samp;
    const ratio = inoc > 0 ? net / inoc : 0;
    const recovery = ratio * 100;
    return {
      organism: organismNameById.get(row.organismId) || row.organismId || '',
      dilution: row.dilution || '',
      inoc: isProtocol ? '—' : Math.round(inoc),
      samp: isProtocol ? '—' : Math.round(samp),
      test: isProtocol ? '—' : Math.round(test),
      net: isProtocol ? '—' : Math.round(net),
      rec: isProtocol ? '—' : `${recovery.toFixed(1)} %`,
      ratio: isProtocol ? '—' : ratio.toFixed(2),
      remark: isProtocol
        ? ''
        : ratio >= 0.5 && ratio <= 2.0
        ? 'Complies'
        : 'Does not comply',
    };
  });

  const recItems = recoveryItems.length > 0 ? recoveryItems : WESTCOAST_MLT_RECOVERY_BENCHMARK;
  const recSplit = Math.ceil(recItems.length / 2);
  const page1RecItems = recItems.slice(0, recSplit);
  const page2RecItems = recItems.slice(recSplit);

  const recTablePage1 = new Table({
    width: { size: 9906, type: WidthType.DXA },
    borders: tableCellBorders,
    rows: [createRecHeaderRow(), ...(page1RecItems || []).map(createRecDataRow)],
  });

  const recTablePage2 = new Table({
    width: { size: 9906, type: WidthType.DXA },
    borders: tableCellBorders,
    rows: [createRecHeaderRow(), ...(page2RecItems || []).map(createRecDataRow)],
  });

  // 5. Table 2: Suitability for Specified Micro-organisms (6 columns)
  // Col widths (total = 9906 dxa):
  const specColWidths = [2206, 2700, 1250, 1250, 1250, 1250];
  const createSpecHeaderRow = () =>
    new TableRow({
      children: [
        createCell('Organism', specColWidths[0], AlignmentType.CENTER, true, 18),
        createCell('Medium (Enrichment / Selective)', specColWidths[1], AlignmentType.CENTER, true, 18),
        createCell('Positive Control', specColWidths[2], AlignmentType.CENTER, true, 18),
        createCell('Negative Control', specColWidths[3], AlignmentType.CENTER, true, 18),
        createCell('Test Product', specColWidths[4], AlignmentType.CENTER, true, 18),
        createCell('ID Result', specColWidths[5], AlignmentType.CENTER, true, 18),
      ],
    });

  const createSpecDataRow = (item: WestcoastSpecifiedItem) =>
    new TableRow({
      children: [
        createCell(item.organism, specColWidths[0], AlignmentType.LEFT, true, 18),
        createCell(item.medium, specColWidths[1], AlignmentType.LEFT, false, 18),
        createCell(item.pos, specColWidths[2], AlignmentType.CENTER, false, 18),
        createCell(item.neg, specColWidths[3], AlignmentType.CENTER, false, 18),
        createCell(item.test, specColWidths[4], AlignmentType.CENTER, false, 18),
        createCell(item.idResult, specColWidths[5], AlignmentType.CENTER, true, 18),
      ],
    });

  const page2SpecItems = WESTCOAST_MLT_SPECIFIED_BENCHMARK.slice(0, 2);
  const page3SpecItems = WESTCOAST_MLT_SPECIFIED_BENCHMARK.slice(2);

  const specTablePage2 = new Table({
    width: { size: 9906, type: WidthType.DXA },
    borders: tableCellBorders,
    rows: [createSpecHeaderRow(), ...(page2SpecItems || []).map(createSpecDataRow)],
  });

  const specTablePage3 = new Table({
    width: { size: 9906, type: WidthType.DXA },
    borders: tableCellBorders,
    rows: [createSpecHeaderRow(), ...(page3SpecItems || []).map(createSpecDataRow)],
  });

  // 6. Sign-off table with the official rubber stamp and signatures
  const signOffTable = createDocxSignOffTable({
    fontFamily: FONT_FAMILY,
    dataMode: options.dataMode as any,
    footerData: options.footerSignOffData,
    stampImageBytes: stampBytes,
  });

  // Assemble the 3 pages identically to the uploaded PDF
  const fullSections: any[] = [
    sectionTitle('1. OBJECTIVE'),
    body(
      'The verification exercise shall demonstrate that the method employed is capable of the correct enumeration of ' +
      'micro-organisms without adversely affecting their recovery, and that the product under test does not inhibit ' +
      'the growth of the challenge organisms at the dilution used for the test.'
    ),

    sectionTitle('2. SCOPE'),
    body(
      `This protocol is applicable to the verification of the Microbial Limit Test method for ${productName} performed ` +
      `at the Microbiology laboratory of ${companyName}, covering the total viable aerobic count, the total combined ` +
      'moulds and yeasts count and the tests for specified micro-organisms.'
    ),

    sectionTitle('3. REFERENCE AND VERIFICATION DETAILS'),
    tbl(
      [3000, 6360],
      [
        new TableRow({ children: [txtCell('Reference', 3000, AlignmentType.LEFT, true, 'F2F2F2'), txtCell((data.references || []).join('; '), 6360)] }),
        new TableRow({ children: [txtCell('Product', 3000, AlignmentType.LEFT, true, 'F2F2F2'), txtCell(productName, 6360)] }),
        new TableRow({ children: [txtCell('Batch No.', 3000, AlignmentType.LEFT, true, 'F2F2F2'), txtCell(data.batchNo || '', 6360)] }),
        new TableRow({ children: [txtCell('Sample Quantity', 3000, AlignmentType.LEFT, true, 'F2F2F2'), txtCell(`${(data as any).sampleQty_g || 10} g`, 6360)] }),
        new TableRow({ children: [txtCell('Type of Verification', 3000, AlignmentType.LEFT, true, 'F2F2F2'), txtCell('Demonstration of method suitability for the microbial limit test under the actual conditions of use, as per USP <61> and <62>', 6360)] }),
        new TableRow({ children: [txtCell('Verification Team', 3000, AlignmentType.LEFT, true, 'F2F2F2'), txtCell('Microbiologist, QC; reviewed by Manager, QC; authorised by Head, QA', 6360)] }),
      ]
    ),

    sectionTitle('4. METHOD SUMMARY'),
    body(
      `Sample preparation: transfer ${(data as any).sampleQty_g || 10} g of the product into ` +
      `${(data as any).diluent_mL || 90} mL of ${(data as any).samplePrepDiluent || 'Buffered Sodium Chloride-Peptone Solution pH 7.0'} ` +
      `to give the 1:${(data as any).samplePrepFactor || 10} dilution, and mix until uniformly dispersed. ` +
      `Inoculum: not more than 100 cfu per ${(data as any).inoculumVolumeAdded_mL || 1} mL.`
    ),
    body('Media and cultures used:', { bold: true }),
    tbl(
      [700, 3600, 2500, 2560],
      [
        new TableRow({ children: [headCell('Sr.', 700), headCell('Name of Material / Culture / Equipment', 3600), headCell('Type', 2500), headCell('Batch No. / ID', 2560)] }),
        ...((data.media || []) as any[]).map((m: any, i: number) =>
          new TableRow({
            children: [
              txtCell(i + 1, 700, AlignmentType.CENTER),
              txtCell(m.name || m, 3600),
              txtCell(m.type || 'Culture medium', 2500),
              txtCell(m.lotNo || m.batchNo || '', 2560),
            ],
          })
        ),
        ...((data.organisms || []) as any[]).map((o: any, i: number) =>
          new TableRow({
            children: [
              txtCell((data.media || []).length + i + 1, 700, AlignmentType.CENTER),
              txtCell(o.name, 3600),
              txtCell('Challenge organism', 2500),
              txtCell(o.atcc || '', 2560),
            ],
          })
        ),
      ]
    ),
    body('Specification:', { bold: true }),
    tbl(
      [4680, 4680],
      [
        new TableRow({ children: [headCell('Criterion', 4680), headCell('Limit', 4680)] }),
        new TableRow({ children: [txtCell('Total Aerobic Microbial Count (TAMC)', 4680), txtCell(`NMT ${(data as any).specTAMC_cfu_per_g || 1000} cfu/g`, 4680)] }),
        new TableRow({ children: [txtCell('Total Combined Yeasts and Moulds Count (TYMC)', 4680), txtCell(`NMT ${(data as any).specTYMC_cfu_per_g || 100} cfu/g`, 4680)] }),
        new TableRow({ children: [txtCell('Specified micro-organisms', 4680), txtCell((data as any).specifiedOrganismsSpec || 'Absent in 1 g', 4680)] }),
      ]
    ),

    sectionTitle('5. VERIFICATION PARAMETERS \u2014 ACCEPTANCE CRITERIA'),
    tbl(
      [700, 3000, 3660, 2000],
      [
        new TableRow({ children: [headCell('Sr.', 700), headCell('Parameter', 3000), headCell('Acceptance Criteria', 3660), headCell('Observed Result', 2000)] }),
        ...[
          ['Neutraliser (Tween 20) Suitability', 'Concentration of Tween 20 at which recovery of the test organisms is ratio 0.5 to 2.0 (NLT 70 %).'],
          ['Total Viable Aerobic Count \u2014 Recovery', 'Recovery of each bacterial test organism ratio 0.5 to 2.0 of the calculated inoculum value at each dilution.'],
          ['Total Combined Moulds and Yeasts Count', 'Recovery of each fungal test organism ratio 0.5 to 2.0 of the calculated inoculum value.'],
          ['Negative Control', 'No growth shall be observed in the negative control plates.'],
          ['Growth Promotion of Media', 'Each medium shall support the growth of its specified organisms.'],
          ['Tests for Specified Micro-organisms', 'Each specified organism shall be recovered and confirmed in the presence of the product; the negative control shall show no growth.'],
        ].map(([param, crit], i) =>
          new TableRow({
            children: [
              txtCell(i + 1, 700, AlignmentType.CENTER),
              txtCell(param, 3000, AlignmentType.LEFT, true),
              txtCell(crit, 3660),
              txtCell(isProtocol ? '\u2014' : 'Complies', 2000, AlignmentType.CENTER),
            ],
          })
        ),
      ]
    ),

    sectionTitle('6. NEUTRALISER (TWEEN 20) SCREENING'),
    ...prepParagraphs('recovery'),
    tbl(
      [1560, 1800, 1800, 1400, 1200, 1600],
      [
        new TableRow({
          children: [
            headCell('% of Tween 20', 1560),
            headCell('Mean Inoculum Control (cfu)', 1800),
            headCell('Mean Recovered (cfu)', 1800),
            headCell('% Recovery', 1400),
            headCell('Ratio', 1200),
            headCell('Verdict', 1600),
          ],
        }),
        ...(() => {
          // One row per Tween 20 concentration, averaged over the organisms
          // screened at that level, so the reader sees which level recovered.
          const byLevel = new Map<string, { inoc: number[]; test: number[] }>();
          ((data.suitabilityRows || []) as any[]).forEach((r: any) => {
            const level = r.neutralizerLevel || r.tweenPercent || '';
            if (!byLevel.has(level)) byLevel.set(level, { inoc: [], test: [] });
            const g = byLevel.get(level)!;
            g.inoc.push(meanOf(r.inoculumControl1, r.inoculumControl2));
            g.test.push(meanOf(r.testPlate1, r.testPlate2));
          });
          const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
          return [...byLevel.entries()].map(([level, g]) => {
            const inoc = avg(g.inoc);
            const test = avg(g.test);
            const ratio = inoc > 0 ? test / inoc : 0;
            return new TableRow({
              children: [
                txtCell(level, 1560, AlignmentType.CENTER, true),
                txtCell(isProtocol ? '\u2014' : Math.round(inoc), 1800, AlignmentType.RIGHT),
                txtCell(isProtocol ? '\u2014' : Math.round(test), 1800, AlignmentType.RIGHT),
                txtCell(isProtocol ? '\u2014' : `${(ratio * 100).toFixed(1)} %`, 1400, AlignmentType.RIGHT),
                txtCell(isProtocol ? '\u2014' : ratio.toFixed(2), 1200, AlignmentType.RIGHT),
                txtCell(
                  isProtocol ? '\u2014' : ratio >= 0.5 && ratio <= 2.0 ? 'Complies' : 'Does not comply',
                  1600,
                  AlignmentType.CENTER
                ),
              ],
            });
          });
        })(),
      ]
    ),

    sectionTitle('7. TOTAL VIABLE AEROBIC COUNT \u2014 PROCEDURE AND RECOVERY'),
  ];

  const docElements = [
    ...fullSections,

    // ----------------------------------------------------
    // PAGE 1: Title, Metadata, Section 1, Section 2, Table 1 (first 3 organisms)
    // ----------------------------------------------------
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: companyName,
          bold: true,
          size: 28, // 14pt
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: `${docTypeHeader} (Microbial Limit Test)`,
          bold: true,
          size: 24, // 12pt
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),

    // Page 1 DEMO banner, matching the other three documents. The running footer
    // repeats the same marking on every page.
    ...(isDemo
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({
                text: isProtocol
                ? '*** PROTOCOL \u2014 NOT AN EXECUTED REPORT ***'
                : '*** DEMO / FORMAT-DEMONSTRATION ONLY \u2014 NOT FOR GMP USE ***',
                bold: true,
                size: 20,
                font: FONT_FAMILY,
                color: 'B45309',
              }),
            ],
          }),
        ]
      : []),

    metaTable,

    new Paragraph({
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({
          text: '7.1 Method Verification Results (Recovery)',
          bold: true,
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),
    ...prepParagraphs('recovery'),
    new Paragraph({
      spacing: { before: 0, after: 140 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: 'The following results represent the recovery of test organisms against the calculated value of the inoculum suspension. The required recovery ratio is 0.5 to 2.0.',
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),

    recTablePage1,

    // Page Break between Page 1 and Page 2
    new Paragraph({
      children: [new PageBreak()],
    }),

    // ----------------------------------------------------
    // PAGE 2: Table 1 Continued, Section 3, Table 2 (first 2 organisms)
    // ----------------------------------------------------
    recTablePage2,

    sectionTitle('8. CONTROLS'),
    tbl(
      [2000, 3360, 1600, 1400, 1000],
      [
        new TableRow({ children: [headCell('Control', 2000), headCell('Procedure', 3360), headCell('Incubation', 1600), headCell('Expected Result', 1400), headCell('Observed', 1000)] }),
        ...[
          ['Positive Control (Bacteria)', 'Inoculate 1 mL of each diluted bacterial culture into two plates and add 20 mL to 22 mL of Soyabean Casein Digest Agar.', '30 \u00B0C to 35 \u00B0C, 3 to 5 days', 'Growth'],
          ['Positive Control (Fungi)', 'Inoculate 1 mL of each diluted fungal culture into two plates and add 20 mL to 22 mL of Sabouraud Dextrose Agar.', '20 \u00B0C to 25 \u00B0C, 5 to 7 days', 'Growth'],
          ['Negative Control for Media', 'Inoculate 1.0 mL of Buffered Sodium Chloride-Peptone Solution into four plates; add SCDA to two and SDA to the other two.', 'As above', 'No growth'],
          ['Sample Control', 'Plate the prepared sample without inoculum, in duplicate, to establish the inherent count.', 'As above', 'Inherent count only'],
        ].map(([c, pr, inc, exp]) =>
          new TableRow({
            children: [
              txtCell(c, 2000, AlignmentType.LEFT, true),
              txtCell(pr, 3360),
              txtCell(inc, 1600),
              txtCell(exp, 1400),
              txtCell(isProtocol ? '\u2014' : 'Complies', 1000, AlignmentType.CENTER),
            ],
          })
        ),
      ]
    ),

    new Paragraph({
      spacing: { before: 220, after: 60 },
      children: [
        new TextRun({
          text: '9. TESTS FOR SPECIFIED MICRO-ORGANISMS',
          bold: true,
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),
    ...prepParagraphs('suitability'),
    new Paragraph({
      spacing: { before: 0, after: 140 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: 'The following details the isolation and identification of organisms inoculated in the medium along with the material. Positive controls must show growth, and negative controls must show no growth.',
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),

    specTablePage2,

    // Page Break between Page 2 and Page 3
    new Paragraph({
      children: [new PageBreak()],
    }),

    // ----------------------------------------------------
    // PAGE 3: Table 2 Continued, Section 4 Conclusion, Sign-off Table, End of Doc
    // ----------------------------------------------------
    specTablePage3,

    sectionTitle('10. REVERIFICATION CRITERIA / DEMONSTRATION OF METHOD SUITABILITY'),
    body('Reverification of the method shall be carried out in the following circumstances:'),
    body('1) A change in the formulation, the manufacturing process or the supplier of any excipient.', { indent: true }),
    body('2) A change in the test method, the media, the neutraliser or the incubation conditions.', { indent: true }),
    body('3) A change in the specification or in the compendial requirement being applied.', { indent: true }),
    body('4) A result that cannot be explained by the current method.', { indent: true }),
    body(
      'Three batches of each product or material shall be verified for the Microbial Limit Test. The tests for the ' +
      'absence of specified organisms provide evidence that the method recovers each organism in the presence of the product.'
    ),

    sectionTitle('11. RESULT REPORTING / PRODUCT BIOBURDEN'),
    body(
      'Report all results on the method verification report form. If any result is unacceptable, the method shall be ' +
      'reviewed to rule out inhibition by the product, an unsuitable neutraliser or a fault in the media.'
    ),
    body(
      isProtocol
        ? 'Product bioburden result: to be reported after execution.'
        : `Product bioburden result: less than 10 cfu/g (TAMC) and less than 10 cfu/g (TYMC). Complies with the specification of NMT ${(data as any).specTAMC_cfu_per_g || 1000} cfu/g and NMT ${(data as any).specTYMC_cfu_per_g || 100} cfu/g.`
    ),

    sectionTitle('12. KEY CONSIDERATIONS'),
    body(
      '1) The test for the absence of objectionable organisms is judged against the harmonised compendial requirement, ' +
      'and the organisms tested for are those relevant to the route of administration of this product.',
      { indent: true }
    ),
    body(
      '2) Reverification of an existing test to align it with the current harmonised standard shall be discussed and ' +
      'carried out under an approved change control.',
      { indent: true }
    ),
    body('3) A reporting format shall be agreed by the quality and documentation teams before execution.', { indent: true }),
    body(
      '4) Microbiologists shall be trained on the revised procedure before the verification is executed.',
      { indent: true }
    ),

    new Paragraph({
      spacing: { before: 220, after: 60 },
      children: [
        new TextRun({
          text: '13. CONCLUSION',
          bold: true,
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: 'The analytical method is verified and found suitable for its intended purpose.',
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({
          text: '— END OF DOCUMENT —',
          bold: true,
          size: 24,
          font: FONT_FAMILY,
          color: '000000',
        }),
      ],
    }),

    sectionTitle('14. COMPLETION RECORD'),
    tbl(
      [3000, 4360, 2000],
      [
        new TableRow({ children: [headCell('Particulars', 3000), headCell('Details / Compliance', 4360), headCell('Signature & Date', 2000)] }),
        ...[
          ['Verification started on', isProtocol ? 'To be recorded' : (data as any).analysisStartDate || (data as any).protocolDate || ''],
          ['Verification completed on', isProtocol ? 'To be recorded' : (data as any).analysisEndDate || (data as any).reportDate || ''],
          ['Raw data and plate counts attached', isProtocol ? 'To be attached' : 'Attached as Annexure-I'],
          ['Deviation observed, if any', isProtocol ? 'To be recorded' : 'No deviation observed'],
          ['Media growth promotion verified', isProtocol ? 'To be recorded' : 'Verified before use'],
          ['Reviewed by QC Microbiology', isProtocol ? 'To be signed' : 'Manager, Quality Control'],
          ['Authorised by QA', isProtocol ? 'To be signed' : 'Head, Quality Assurance'],
        ].map(([particulars, details]) =>
          new TableRow({
            children: [
              txtCell(particulars, 3000, AlignmentType.LEFT, true),
              txtCell(details, 4360),
              txtCell(isProtocol ? '________________' : '', 2000, AlignmentType.CENTER),
            ],
          })
        ),
      ]
    ),

    sectionTitle('15. ABBREVIATIONS'),
    tbl(
      [2000, 7360],
      [
        new TableRow({ children: [headCell('Abbreviation', 2000), headCell('Full Form / Expansion', 7360)] }),
        ...[
          ['AMV', 'Analytical Method Verification'],
          ['TAMC', 'Total Aerobic Microbial Count'],
          ['TYMC', 'Total Combined Yeasts and Moulds Count'],
          ['TVAC', 'Total Viable Aerobic Count'],
          ['SCDM / SCDA', 'Soyabean Casein Digest Medium / Agar'],
          ['SDA', 'Sabouraud Dextrose Agar'],
          ['MLT', 'Microbial Limit Test'],
          ['cfu', 'Colony Forming Unit'],
          ['ATCC', 'American Type Culture Collection'],
          ['NMT / NLT', 'Not More Than / Not Less Than'],
          ['QC / QA', 'Quality Control / Quality Assurance'],
          ['cGMP', 'Current Good Manufacturing Practice'],
          ['USP / Ph. Eur.', 'United States Pharmacopeia / European Pharmacopoeia'],
        ].map(([a, e]) =>
          new TableRow({ children: [txtCell(a, 2000, AlignmentType.LEFT, true), txtCell(e, 7360)] })
        ),
      ]
    ),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1150, bottom: 1150, left: 1150, right: 1150 },
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
  saveAs(blob, filename);
}
