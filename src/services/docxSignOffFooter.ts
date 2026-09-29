import {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  Footer,
  PageNumber
} from 'docx';
import { FooterSignOffData, DataMode } from '../types';

export const DEFAULT_FOOTER_SIGN_OFF_DATA: FooterSignOffData = {
  preparedBy: { title: 'Prepared By', name: 'Prepared By', designation: 'QC. Chemist', date: '24/01/2024' },
  checkedBy: { title: 'Checked By', name: 'Checked By', designation: 'QC. In-charge', date: '24/01/2024' },
  qaInCharge: { title: 'QA In-charge', name: 'QA In-charge', designation: 'QA In-charge', date: '24/01/2024' },
  plantHead: { title: 'Plant Head', name: 'Plant Head', designation: 'Plant Head', date: '24/01/2024' },
  formatNo: 'WC/QC/01/0F01',
};

export interface CreateDocxSignOffFooterOptions {
  fontFamily?: string;
  dataMode?: DataMode;
  footerData?: FooterSignOffData;
  stampImageBytes?: Uint8Array;
  theme?: string;
  /** A protocol is signed on issue, so its signature and date cells stay open. */
  docType?: 'protocol' | 'report';
}

export function createDocxSignOffTable(options: CreateDocxSignOffFooterOptions): Table {
  return new Table({
    width: { size: 0, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [],
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            }
          })
        ]
      })
    ]
  });
}

export function createDocxSignOffFooter(options: CreateDocxSignOffFooterOptions): Footer {
  const FONT_FAMILY = options.fontFamily || 'Times New Roman';
  const dataMode = options.dataMode || 'DEMO';
  const isWestcoast = options.theme === 'westcoast';
  const isProtocol = options.docType === 'protocol';
  const SIGN_LINE = '________________';

  const children: any[] = [];

  if (isWestcoast) {
    const data = options.footerData || DEFAULT_FOOTER_SIGN_OFF_DATA;
    const cellBorder = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    };
  
    const createCell = (text: string, colSpan = 1, align = AlignmentType.CENTER, width?: number) => {
      return new TableCell({
        columnSpan: colSpan,
        borders: cellBorder,
        width: width ? { size: width, type: WidthType.DXA } : undefined,
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        children: [
          new Paragraph({
            alignment: align,
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text,
                size: 24,
                font: FONT_FAMILY,
                color: '000000',
              })
            ]
          })
        ]
      });
    };
  
    const signOffTable = new Table({
      width: { size: 9906, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            createCell('', 1, AlignmentType.CENTER, 1980),
            createCell('Prepared By', 1, AlignmentType.CENTER, 1981),
            createCell('Checked By', 1, AlignmentType.CENTER, 1981),
            createCell('Approved By', 2, AlignmentType.CENTER, 3964),
          ]
        }),
        new TableRow({
          children: [
            createCell('Signature', 1),
            createCell(isProtocol ? SIGN_LINE : '', 1),
            createCell(isProtocol ? SIGN_LINE : '', 1),
            createCell(isProtocol ? SIGN_LINE : '', 1, AlignmentType.CENTER, 1982),
            createCell(isProtocol ? SIGN_LINE : '', 1, AlignmentType.CENTER, 1982),
          ]
        }),
        new TableRow({
          children: [
            createCell('Date', 1),
            createCell(isProtocol ? SIGN_LINE : (data?.preparedBy?.date || '11/02/2024'), 1),
            createCell(isProtocol ? SIGN_LINE : (data?.checkedBy?.date || '11/02/2024'), 1),
            createCell(isProtocol ? SIGN_LINE : (data?.qaInCharge?.date || '11/02/2024'), 1),
            createCell(isProtocol ? SIGN_LINE : (data?.plantHead?.date || '11/02/2024'), 1),
          ]
        }),
        new TableRow({
          children: [
            createCell('Designation', 1),
            createCell(data?.preparedBy?.designation || 'QC. Chemist', 1),
            createCell(data?.checkedBy?.designation || 'QC. In-charge', 1),
            createCell(data?.qaInCharge?.designation || 'QA In-charge', 1),
            createCell(data?.plantHead?.designation || 'Plant Head', 1),
          ]
        }),
      ]
    });

    const noBorders = {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const bottomMetaTable = new Table({
      width: { size: 9906, type: WidthType.DXA },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4953, type: WidthType.DXA },
              borders: noBorders,
              margins: { top: 40, bottom: 0, left: 0, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: 'Page ',
                      size: 20,
                      font: FONT_FAMILY,
                      color: '000000',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 20,
                      font: FONT_FAMILY,
                      color: '000000',
                    }),
                    new TextRun({
                      text: ' of ',
                      size: 20,
                      font: FONT_FAMILY,
                      color: '000000',
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 20,
                      font: FONT_FAMILY,
                      color: '000000',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4953, type: WidthType.DXA },
              borders: noBorders,
              margins: { top: 40, bottom: 0, left: 0, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: options.footerData?.formatNo || 'WC/QC/01/08-F01',
                      size: 20,
                      font: FONT_FAMILY,
                      color: '000000',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(signOffTable, bottomMetaTable);

    if (dataMode === 'DEMO') {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 0 },
          children: [
            new TextRun({
              text: 'DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE',
              size: 18,
              bold: true,
              color: 'B45309',
              font: FONT_FAMILY,
            }),
          ],
        })
      );
    }
  } else {
    // Normal / other formats
    if (dataMode === 'DEMO') {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: 'DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE',
              size: 24,
              bold: true,
              color: 'B45309',
              font: FONT_FAMILY,
            }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 0 },
        children: [
          new TextRun({
            text: 'Page ',
            size: 24,
            font: FONT_FAMILY,
            color: '000000',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 24,
            font: FONT_FAMILY,
            color: '000000',
          }),
          new TextRun({
            text: ' of ',
            size: 24,
            font: FONT_FAMILY,
            color: '000000',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 24,
            font: FONT_FAMILY,
            color: '000000',
          }),
        ],
      })
    );
  }

  return new Footer({ children });
}