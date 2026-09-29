/**
 * Client-Side Finished Product Specification (FPS) & Method of Analysis (MOA) PDF Parser
 * Implements Part H & Part I specifications:
 *  - 100% Client-side extraction in browser (pdfjs-dist) with zero server upload (Vercel Part G compliant).
 *  - High-precision regex pattern matcher mapping FPS acceptance limits and MOA Assay chromatographic conditions.
 *  - Dedicated ground-truth verification against Vildagliptin Tablets 100 mg (Spec.No. VD/QC/SP/0529 / MOA.No. VD/QC/MOA/0529).
 */

import * as pdfjsLib from 'pdfjs-dist';

export interface ExtractedFpsMoaData {
  // Document and Product Identity
  productName: string;
  specNo: string;
  moaNo: string;
  strength: string;
  dosageForm: string;
  specificationType: string; // e.g. "INHOUSE"
  effectiveDate: string;
  description?: string;
  averageWeight?: string;
  hardness?: string;
  friability?: string;
  disintegrationTime?: string;

  // HPLC Method Parameters (from MOA Assay section -> Chromatographic System)
  column: string;
  mobilePhase: string;
  bufferText?: string;
  rawMobilePhaseText?: string;
  flowRate: string;
  wavelength: string;
  injectionVolume: string;
  columnTemperature: string;
  runTime: string; // Blank if not explicitly in Assay section (do not confuse with Dissolution 45 min)
  diluent: string; // From Assay section (never Dissolution medium)
  sampleConcentration: string;
  standardConcentration: string;
  workingConcentration: string;
  approxRetentionTime?: string;
  standardSolution?: string;
  sampleSolution?: string;
  activeSubstance?: string;
  standardWeight?: string;
  sampleWeight?: string;
  stdDilution?: string;
  sampleDilution?: string;
  standardPurity?: string;
  concentrationOptions: { label: string; value: string; isNominal: boolean }[];

  // Acceptance Limits (from FPS section)
  dissolutionLimit: string;
  assayRange: string;
  rsLimits: string;
  rsIndividualLimit?: string;
  rsTotalLimit?: string;
  uduLimit: string;

  // Dissolution Conditions (from MOA Dissolution section)
  dissolutionMedium?: string;
  dissolutionApparatus?: string;
  dissolutionRpm?: string;
  dissolutionTime?: string;
  dissolutionTemperature?: string;
  dissolutionWavelength?: string;

  // Audit and Source Metadata
  sourceSummary: string;
  extractionTimestamp: string;
}

// Ensure PDF.js worker is configured in browser environments
if (typeof window !== 'undefined') {
  try {
    // Point to official standard worker bundle or CDN fallback
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }
  } catch (_e) {
    // Silently continue with inline worker fallback
  }
}

/**
 * Extracts raw plain text from PDF bytes entirely client-side inside the user's browser.
 * This guarantees 0 bytes uploaded to Vercel serverless functions (Part G1, G2, G6).
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (item.str !== undefined ? item.str : ''))
        .join(' ');
      fullText += `\n--- PAGE ${pageNum} ---\n` + pageText;
    }

    return fullText;
  } catch (err: any) {
    console.warn('Direct PDF.js binary extraction notice:', err?.message || err);
    throw new Error(`Unable to read PDF in browser: ${err?.message || 'Invalid or corrupted PDF file'}`);
  }
}

/**
 * Extracts text from a Base64-encoded PDF string client-side.
 */
export async function extractTextFromPdfBase64(base64: string): Promise<string> {
  const binaryString = window.atob(base64.replace(/^data:.*?;base64,/, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return extractTextFromPdfArrayBuffer(bytes.buffer);
}

/**
 * High-precision parsing engine mapping FPS & MOA text into structured AMV fields.
 * Follows Part H2, H3, H4 and Part I Ground Truth rules strictly.
 */
export function parseFpsMoaText(rawText: string): ExtractedFpsMoaData {
  const text = rawText || '';

  // 1. Identify Sections
  // Locate ASSAY section inside MOA (skip test limit references in FPS)
  const assayBlockMatch = text.match(/(?:^|\n)\s*(?:MOA[\s\S]*?)?ASSAY(?:\s+OF|\s*\([^)]*\))?\s*\n([\s\S]*?)(?=\n\s*(?:RELATED\s+SUBSTANCES|ORGANIC\s+IMPURITIES|DISSOLUTION|UNIFORMITY\s+OF|MICROBIAL|STABILITY\s+STUDIES|FINISHED\s+PRODUCT\s+SPECIFICATION|PAGE\s+\d+|$))/i);
  const assayBlock = assayBlockMatch ? assayBlockMatch[1] : text;

  // Locate Chromatographic System sub-block inside Assay (strictly on its own line)
  const chromaMatch = assayBlock.match(/(?:^|\n)\s*Chromatographic\s+system\s*\n([\s\S]*?)(?=\n\s*(?:Procedure|Calculation|Standard\s+solution|Sample\s+solution|\n\s*\n\s*[A-Z]|$))/i) ||
                     text.match(/(?:^|\n)\s*Chromatographic\s+system\s*\n([\s\S]*?)(?=\n\s*(?:Procedure|Calculation|\n\s*\n\s*[A-Z]|$))/i);
  const chromaBlock = chromaMatch ? chromaMatch[1] : assayBlock;

  // Locate MOA Dissolution sub-block for dissolution medium/apparatus
  const dissBlockMatch = text.match(/(?:^|\n)\s*MOA[\s\S]*?Dissolution\s+method[\s\S]*?\n([\s\S]*?)(?=\n\s*(?:ASSAY|RELATED|UNIFORMITY|FINISHED|$))/i) ||
                         text.match(/(?:^|\n)\s*DISSOLUTION(?:\s+METHOD)?\s*\n([\s\S]*?)(?=\n\s*(?:ASSAY|RELATED|FINISHED|$))/i);
  const dissBlock = dissBlockMatch ? dissBlockMatch[1] : '';

  // 2. Extract HPLC Method Parameters (from Assay Chromatographic System)
  // Column
  const colMatch = chromaBlock.match(/Column\s*:\s*([^\r\n]+)/i);
  const column = colMatch ? colMatch[1].trim() : '';

  // Detection Wavelength (specifically Assay detector UV, never Dissolution 210 nm)
  const detMatch = chromaBlock.match(/(?:Detector\s*:\s*(?:UV\s*)?|Wavelength\s*:\s*(?:UV\s*)?)([0-9]{3}\s*nm)/i);
  const wavelength = detMatch ? ('UV ' + detMatch[1].trim()).replace('UV UV', 'UV') : '';

  // Flow Rate
  const flowMatch = chromaBlock.match(/Flow\s*rate\s*:\s*([0-9.]+\s*mL\/min)/i);
  const flowRate = flowMatch ? flowMatch[1].trim() : '';

  // Injection Volume
  const injMatch = chromaBlock.match(/Injection\s*volume\s*:\s*([0-9.]+\s*(?:µL|uL|μL|microliter|ml|mL))/i);
  const injectionVolume = injMatch ? injMatch[1].trim() : '';

  // Column Temperature
  const tempMatch = chromaBlock.match(/Column\s*temperature\s*:\s*([0-9.]+\s*(?:°C|°|deg(?:ree)?s?(?:\s*C)?))/i);
  const columnTemperature = tempMatch ? tempMatch[1].trim() : '';

  // Run Time (in Assay section; if absent, leave as "" per Part H2/I2)
  const runMatch = chromaBlock.match(/Run\s*time\s*:\s*([^\r\n]+)/i);
  const runTime = runMatch ? runMatch[1].trim() : '';

  // Buffer line in Assay
  const bufMatch = assayBlock.match(/Buffer\s*:\s*([^\r\n]+(?:\r?\n(?!\s*(?:Mobile\s+phase|Diluent|Standard\s+solution|Sample\s+solution|Sample\s+stock|Dilute|Chromatographic|[A-Z][a-z]+:))[^\r\n]+)*)/i);
  const bufferText = bufMatch ? bufMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Mobile phase line in Assay
  const mpMatch = assayBlock.match(/Mobile\s*phase\s*:\s*([^\r\n]+(?:\r?\n(?!\s*(?:Buffer|Diluent|Standard\s+solution|Sample\s+solution|Sample\s+stock|Dilute|Chromatographic|[A-Z][a-z]+:))[^\r\n]+)*)/i);
  const rawMobilePhaseText = mpMatch ? mpMatch[1].replace(/\s+/g, ' ').trim() : '';

  let mobilePhaseCombined = '';
  if (rawMobilePhaseText && bufferText) {
    mobilePhaseCombined = `Mobile phase: ${rawMobilePhaseText}; Buffer: ${bufferText}`;
  } else if (rawMobilePhaseText) {
    mobilePhaseCombined = rawMobilePhaseText;
  }

  // Diluent inside Assay (Pitfall I3: Never take Dissolution medium)
  const dilMatch = assayBlock.match(/Diluent\s*:\s*([^\r\n]+(?:\r?\n(?!\s*(?:Standard\s+solution|Sample\s+solution|Sample\s+stock|Chromatographic|[A-Z][a-z]+:))[^\r\n]+)*)/i);
  const diluent = dilMatch ? dilMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Concentrations in Assay (Sample solution vs Standard solution)
  const sampleConcMatch = assayBlock.match(/Sample\s*solution\s*:\s*(?:Nominally\s*)?([0-9.]+\s*(?:mg\/mL|µg\/mL|ug\/mL))/i);
  const stdConcMatch = assayBlock.match(/Standard\s*solution\s*:\s*([0-9.]+\s*(?:mg\/mL|µg\/mL|ug\/mL))/i);
  const sampleConcentration = sampleConcMatch ? sampleConcMatch[1].trim() : '';
  const standardConcentration = stdConcMatch ? stdConcMatch[1].trim() : '';

  const concentrationOptions: { label: string; value: string; isNominal: boolean }[] = [];
  if (sampleConcentration) {
    concentrationOptions.push({
      label: `Sample solution: ${sampleConcentration} (Nominal Working Conc.)`,
      value: `${sampleConcentration} (Sample solution)`,
      isNominal: true,
    });
  }
  if (standardConcentration) {
    concentrationOptions.push({
      label: `Standard solution: ${standardConcentration} (Reference Standard)`,
      value: `${standardConcentration} (Standard solution)`,
      isNominal: false,
    });
  }

  const workingConcentration = sampleConcentration
    ? `${sampleConcentration} (Sample solution)`
    : standardConcentration
    ? `${standardConcentration} (Standard solution)`
    : '';

  // 3. Extract FPS Acceptance Limits & Product Metadata
  const prodMatch = text.match(/Product\s*Name\s*:\s*([^\r\n]+)/i);
  const specMatch = text.match(/Spec\.?\s*No\.?\s*:\s*([A-Za-z0-9/_-]+)/i);
  const moaMatch = text.match(/MOA\.?\s*No\.?\s*:\s*([A-Za-z0-9/_-]+)/i);
  const strMatch = text.match(/Strength\s*:\s*([^\r\n\t]+?)(?:\s{2,}|Supersedes|Effective|$)/i);
  const specTypeMatch = text.match(/Specification\s*:\s*([^\r\n\t]+?)(?:\s{2,}|Revised|$)/i);
  const effDateMatch = text.match(/Effective\s*Date\s*:\s*([^\r\n\t]+?)(?:\s{2,}|$)/i);

  // Dissolution Limit
  const dissLimitMatch = text.match(/Dissolution\s+(Not\s+less\s+than[^\r\n]+|N\.?L\.?T\.?[^\r\n]+)/i) ||
                         text.match(/Tolerance\s*:\s*([^\r\n]+)/i);
  const dissolutionLimit = dissLimitMatch ? dissLimitMatch[1].trim() : '';

  // Assay Range
  const assayLimitMatch = text.match(/Assay(?:\s*\([^)]+\))?\s+([0-9.]+\s*%\s*(?:to|-)\s*[0-9.]+\s*%(?:\s+of\s+labeled\s+amount)?)/i);
  const assayRange = assayLimitMatch ? assayLimitMatch[1].trim() : '';

  // Related Substances Limits
  const rsMatch = text.match(/Related\s*substances\s+([^\r\n]+)/i);
  const rsLimits = rsMatch ? rsMatch[1].trim() : '';
  let rsIndividualLimit = '';
  let rsTotalLimit = '';
  if (rsLimits) {
    const indMatch = rsLimits.match(/Individual\s*:\s*(NMT\s*[0-9.]+\s*%|[0-9.]+\s*%)/i);
    const totMatch = rsLimits.match(/Total\s*:\s*(NMT\s*[0-9.]+\s*%|[0-9.]+\s*%)/i);
    if (indMatch) rsIndividualLimit = indMatch[1].trim();
    if (totMatch) rsTotalLimit = totMatch[1].trim();
  }

  // Uniformity of Dosage Units
  const uduMatch = text.match(/Uniformity\s*of\s*Dosage\s*units\s+([^\r\n]+)/i);
  const uduLimit = uduMatch ? uduMatch[1].trim() : '';

  // Additional Physical Tests
  const avgWtMatch = text.match(/Average\s*weight\s+([^\r\n]+)/i);
  const hardMatch = text.match(/Hardness\s+([^\r\n]+)/i);
  const friabMatch = text.match(/Friability\s+([^\r\n]+)/i);
  const disintMatch = text.match(/Disintegration\s*time\s+([^\r\n]+)/i);

  // Approximate Retention Time extraction
  const rtMatch = text.match(/(?:Approx\.?\s*(?:Retention\s*Time|RT)|Retention\s*Time)\s*[:\s]+(?:is\s*(?:about\s*)?)?([0-9.]+\s*min(?:utes)?)/i);
  const approxRetentionTime = rtMatch ? rtMatch[1].trim() : '';

  // Standard and Sample solution preparation procedures
  const stdSolMatch = text.match(/(?:Standard\s*solution|Standard\s*preparation)\s*[:\s]+([^\r\n]+(?:\r?\n(?!\s*(?:Sample\s+solution|Sample\s+stock|Chromatographic|Calculation|Procedure|[0-9]+\.\s+[A-Z]))[^\r\n]+)*)/i);
  const standardSolution = stdSolMatch ? stdSolMatch[1].replace(/\s+/g, ' ').trim() : '';

  const smpSolMatch = text.match(/(?:Sample\s*solution|Sample\s*preparation)\s*[:\s]+([^\r\n]+(?:\r?\n(?!\s*(?:Standard\s+solution|Chromatographic|Calculation|Procedure|[0-9]+\.\s+[A-Z]))[^\r\n]+)*)/i);
  const sampleSolution = smpSolMatch ? smpSolMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Active substance
  const activeSubMatch = text.match(/(?:Active\s*Substance|Drug\s*Substance|Generic\s*Name)\s*[:\s]+([^\r\n]+)/i);
  const detectedActiveSubstance = activeSubMatch ? activeSubMatch[1].trim() : '';

  // Standard Weight (WS) and Dilution (DS)
  const wsMatch = text.match(/(?:Weight\s*of\s*(?:Standard|RS)|Standard\s*Weight|WS)\s*[:\s=]+([0-9.]+)\s*mg/i) ||
                  text.match(/(?:weigh\s*(?:accurately)?|take)\s*(?:about\s*)?([0-9.]+)\s*mg\s*(?:of)?\s*(?:[A-Za-z0-9\s-]+)?(?:working\s*standard|reference\s*standard|RS)/i);
  const standardWeight = wsMatch ? wsMatch[1].trim() : '';

  const dsMatch = text.match(/(?:Standard\s*dilution|DS)\s*[:\s=]+([0-9.]+)\s*mL/i) ||
                  (stdSolMatch && stdSolMatch[0].match(/(?:dilute\s*to|into\s*a\s*|in\s*a\s*)([0-9.]+)\s*mL/i));
  const stdDilution = dsMatch ? dsMatch[1].trim() : '';

  // Sample Weight (WT) and Dilution (DT)
  const wtMatch = text.match(/(?:Weight\s*of\s*Sample|Sample\s*Weight|WT)\s*[:\s=]+([0-9.]+)\s*mg/i) ||
                  text.match(/(?:weigh\s*(?:accurately)?|take)\s*(?:powder\s*equivalent\s*to\s*(?:about\s*)?|sample\s*powder\s*about\s*|about\s*)?([0-9.]+)\s*mg/i);
  const sampleWeight = wtMatch ? wtMatch[1].trim() : '';

  const dtMatch = text.match(/(?:Sample\s*dilution|DT)\s*[:\s=]+([0-9.]+)\s*mL/i) ||
                  (smpSolMatch && smpSolMatch[0].match(/(?:dilute\s*to|into\s*a\s*|in\s*a\s*)([0-9.]+)\s*mL/i));
  const sampleDilution = dtMatch ? dtMatch[1].trim() : '';

  // Standard Purity / Potency %
  const purMatch = text.match(/(?:Potency|Purity)\s*[:\s=]+([0-9.]+\s*%)/i) ||
                   text.match(/([0-9.]+)\s*%\s*(?:purity|potency|as-is)/i);
  const standardPurity = purMatch ? purMatch[1].replace('%', '').trim() : '';

  // Dissolution Conditions (if Dissolution block exists)
  const dissMedMatch = dissBlock.match(/Medium\s*:\s*([^\r\n]+)/i);
  const dissAppMatch = dissBlock.match(/Apparatus\s*:\s*([^\r\n]+)/i);
  const dissRpmMatch = dissBlock.match(/RPM\s*:\s*([^\r\n]+)/i);
  const dissTimeMatch = dissBlock.match(/Time\s*:\s*([^\r\n]+)/i);
  const dissTempMatch = dissBlock.match(/Temperature\s*:\s*([^\r\n]+)/i);
  const dissWavMatch = dissBlock.match(/UV\s*wavelength\s*:\s*([^\r\n]+)/i);

  const specNo = specMatch ? specMatch[1].trim() : '';
  const moaNo = moaMatch ? moaMatch[1].trim() : '';

  return {
    productName: prodMatch ? prodMatch[1].trim() : '',
    specNo,
    moaNo,
    strength: strMatch ? strMatch[1].trim() : '',
    dosageForm: text.includes('TABLET') ? 'Tablets' : text.includes('CAPSULE') ? 'Capsules' : 'Tablets',
    specificationType: specTypeMatch ? specTypeMatch[1].trim() : 'INHOUSE',
    effectiveDate: effDateMatch ? effDateMatch[1].trim() : '',
    averageWeight: avgWtMatch ? avgWtMatch[1].trim() : '',
    hardness: hardMatch ? hardMatch[1].trim() : '',
    friability: friabMatch ? friabMatch[1].trim() : '',
    disintegrationTime: dtMatch ? dtMatch[1].trim() : '',

    column,
    mobilePhase: mobilePhaseCombined,
    bufferText,
    rawMobilePhaseText,
    flowRate,
    wavelength,
    injectionVolume,
    columnTemperature,
    runTime,
    diluent,
    sampleConcentration,
    standardConcentration,
    workingConcentration,
    approxRetentionTime,
    standardSolution,
    sampleSolution,
    activeSubstance: detectedActiveSubstance,
    standardWeight,
    sampleWeight,
    stdDilution,
    sampleDilution,
    standardPurity,
    concentrationOptions,

    dissolutionLimit,
    assayRange,
    rsLimits,
    rsIndividualLimit,
    rsTotalLimit,
    uduLimit,

    dissolutionMedium: dissMedMatch ? dissMedMatch[1].trim() : undefined,
    dissolutionApparatus: dissAppMatch ? dissAppMatch[1].trim() : undefined,
    dissolutionRpm: dissRpmMatch ? dissRpmMatch[1].trim() : undefined,
    dissolutionTime: dissTimeMatch ? dissTimeMatch[1].trim() : undefined,
    dissolutionTemperature: dissTempMatch ? dissTempMatch[1].trim() : undefined,
    dissolutionWavelength: dissWavMatch ? dissWavMatch[1].trim() : undefined,

    sourceSummary: specNo ? `Spec.No. ${specNo}${moaNo ? ` / MOA.No. ${moaNo}` : ''}` : 'Uploaded Specification',
    extractionTimestamp: new Date().toISOString(),
  };
}

/**
 * Ground Truth Reference Sample (Part I: Vildagliptin Tablets 100 MG)
 * Can be loaded with 1 click to test or demonstrate complete compliant extraction.
 */
export const GROUND_TRUTH_VILDAGLIPTIN_RAW_TEXT = `
WESTCOAST PHARMACEUTICAL WORKS LTD.
FINISHED PRODUCT SPECIFICATION

Product Name: VILDAGLIPTIN TABLETS 100 MG
Spec.No.: VD/QC/SP/0529        Supersedes: NIL
Strength: 100 MG               Effective Date: 01/01/2025
Specification: INHOUSE         Revised Date: ----

1. Description        White colour round shape flat uncoated tablet with break line on one side.
2. Average weight      200 mg ± 7.5 %
3. Uniformity of weight  ± 7.5 % of actual average weight
4. Hardness            Not less than 2.0 kg/cm2
5. Friability          Not more than 1.0 %
6. Disintegration time Not more than 15 mins
8. Dissolution         Not less than 70.0 % of labeled amount in 45 mins
9. Uniformity of Dosage units  85.0 % to 115.0 % of labeled amount
10. Related substances  Individual: NMT 1.0 % | Total: NMT 2.0 %
12. Assay (Vildagliptin 100 mg)  90.0 % to 110.0 % of labeled amount

FINISHED PRODUCT METHOD OF ANALYSIS
MOA.No.: VD/QC/MOA/0529

MOA section — Dissolution method (page 2):
Medium       : 900 ml of phosphate buffer pH 6.8
Apparatus    : Paddle
RPM          : 100
Time         : 45 minutes
Temperature  : 37°C ± 0.05
Tolerance    : N.L.T. 70.0 % of label claim in 45 minutes
UV wavelength: 210 nm

MOA section — Assay / Chromatographic System (page 5):

ASSAY
VILDAGLIPTIN
Buffer: 1.36 g/L of monobasic potassium phosphate, adjusted with phosphoric acid to a pH of 2.0
Mobile phase: Acetonitrile and Buffer (15:85)
Dilute phosphoric acid: 1 mL phosphoric acid → 1-L volumetric flask, dilute with water to volume
Diluent: Acetonitrile and Dilute phosphoric acid (5:95)
Standard solution: 0.1 mg/mL of Vildagliptin RS in Diluent
Sample stock solution: Nominally 1.0 mg/mL — 10 Tablets in volumetric flask, dilute with Diluent, stir 1 h
Sample solution: Nominally 0.08 mg/mL — 8.0 mL stock diluted to 100 mL with Diluent, centrifuge 10 min, use supernatant

Chromatographic system
Mode: LC
Detector: UV 205 nm
Column: 4.6-mm × 15-cm; 5-µm packing L10
Column temperature: 30°
Flow rate: 1.0 mL/min
Injection volume: 20 µL
`;
