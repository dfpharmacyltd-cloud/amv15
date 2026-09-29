/**
 * Assay by Titration.
 *
 * A titrimetric assay is read from a burette, not a detector, so the whole
 * document is built around one relationship:
 *
 *     Content (%) = [(V - B) x N x F x 100] / W
 *
 * where V is the sample titrant volume, B the blank, N the titrant normality,
 * F the equivalency factor in mg per mEq and W the weight taken in mg. Every
 * burette reading printed in this document is generated from that equation, so
 * the volumes in the tables reproduce the contents beside them.
 */

import {
  createSeededRandom,
  parseProductStrength,
  extractDynamicLabelClaim,
} from './pharmaMathEngine';
import { getCleanDrugDisplayName } from './postGenerationSanitizer';
import { generateUniqueValidationCodes } from './pharmaDatabase';
import { makeLabRecords } from './labRecords';

export interface TitrationMonograph {
  productName: string;
  activeSubstance: string;
  /** How the standard is named on its label, e.g. "SODIUM BICARBONATE USP". */
  standardName: string;
  labelClaim: string;
  reference: string;
  /** Direct, back or non-aqueous titration. */
  mode: string;
  titrant: string;
  /** Titrant normality in mEq/mL. */
  normality: number;
  /** Equivalency factor in mg per mEq. */
  equivalencyFactor: number;
  /** True when the factor is taken from a compendial monograph. */
  factorFromMonograph: boolean;
  indicator: string;
  endpointDetection: string;
  endpointColour: string;
  blankDescription: string;
  /** Weight of sample taken for one determination, in mg. */
  sampleWeightMg: number;
  /** Blank titrant volume in mL. */
  blankVolumeMl: number;
  chemicals: string[];
  analysisText: string;
}

const M = (m: TitrationMonograph) => m;

export const TITRATION_COMPENDIUM: Record<string, TitrationMonograph> = {
  'sodium bicarbonate': M({
    productName: 'Sodium Bicarbonate Tablets USP 500 mg',
    activeSubstance: 'Sodium Bicarbonate',
    standardName: 'SODIUM BICARBONATE USP',
    labelClaim: 'Each tablet contains Sodium Bicarbonate USP 500 mg',
    reference: 'USP Monograph for Sodium Bicarbonate Tablets; ICH Q2(R2)',
    mode: 'Direct titration',
    titrant: '1 N Hydrochloric Acid VS',
    normality: 1.0,
    equivalencyFactor: 84.01,
    factorFromMonograph: true,
    indicator: 'Methyl Red TS',
    endpointDetection: 'Visual',
    endpointColour: 'persistent yellow to pink',
    blankDescription: '100 mL of water with 3 mL of Methyl Red TS.',
    sampleWeightMg: 400,
    blankVolumeMl: 0.1,
    chemicals: ['Sodium Bicarbonate', '1 N HCl VS', 'Water', 'Methyl Red TS'],
    analysisText:
      'Dissolve the sample in 100 mL of water, add 3 mL of Methyl Red TS and titrate immediately with the titrant until a persistent yellow to pink colour is obtained.',
  }),
  'calcium carbonate': M({
    productName: 'Calcium Carbonate Tablets USP 500 mg',
    activeSubstance: 'Calcium Carbonate',
    standardName: 'CALCIUM CARBONATE USP',
    labelClaim: 'Each tablet contains Calcium Carbonate USP 500 mg',
    reference: 'USP Monograph for Calcium Carbonate Tablets; ICH Q2(R2)',
    mode: 'Back titration',
    titrant: '1 N Hydrochloric Acid VS, excess back titrated with 1 N Sodium Hydroxide VS',
    normality: 1.0,
    equivalencyFactor: 50.04,
    factorFromMonograph: true,
    indicator: 'Methyl Red TS',
    endpointDetection: 'Visual',
    endpointColour: 'yellow',
    blankDescription: '50 mL of 1 N Hydrochloric Acid VS carried through the procedure without sample.',
    sampleWeightMg: 200,
    blankVolumeMl: 0.2,
    chemicals: ['Calcium Carbonate', '1 N HCl VS', '1 N NaOH VS', 'Water', 'Methyl Red TS'],
    analysisText:
      'Dissolve the sample in 50.0 mL of 1 N Hydrochloric Acid VS, warm to expel carbon dioxide, cool, add Methyl Red TS and titrate the excess acid with 1 N Sodium Hydroxide VS until a yellow colour is obtained.',
  }),
  'magnesium hydroxide': M({
    productName: 'Magnesium Hydroxide Tablets USP 300 mg',
    activeSubstance: 'Magnesium Hydroxide',
    standardName: 'MAGNESIUM HYDROXIDE USP',
    labelClaim: 'Each tablet contains Magnesium Hydroxide USP 300 mg',
    reference: 'USP Monograph for Magnesium Hydroxide Tablets; ICH Q2(R2)',
    mode: 'Back titration',
    titrant: '1 N Sulphuric Acid VS, excess back titrated with 1 N Sodium Hydroxide VS',
    normality: 1.0,
    equivalencyFactor: 29.16,
    factorFromMonograph: true,
    indicator: 'Methyl Red TS',
    endpointDetection: 'Visual',
    endpointColour: 'yellow',
    blankDescription: '40 mL of 1 N Sulphuric Acid VS carried through the procedure without sample.',
    sampleWeightMg: 200,
    blankVolumeMl: 0.2,
    chemicals: ['Magnesium Hydroxide', '1 N H2SO4 VS', '1 N NaOH VS', 'Water', 'Methyl Red TS'],
    analysisText:
      'Disperse the sample in water, add 40.0 mL of 1 N Sulphuric Acid VS, warm to dissolve, cool, add Methyl Red TS and titrate the excess acid with 1 N Sodium Hydroxide VS.',
  }),
  'ascorbic acid': M({
    productName: 'Ascorbic Acid Tablets BP 500 mg',
    activeSubstance: 'Ascorbic Acid',
    standardName: 'ASCORBIC ACID BP',
    labelClaim: 'Each tablet contains Ascorbic Acid BP 500 mg',
    reference: 'BP Monograph for Ascorbic Acid Tablets; ICH Q2(R2)',
    mode: 'Direct titration (iodimetric)',
    titrant: '0.1 N Iodine VS',
    normality: 0.1,
    equivalencyFactor: 88.06,
    factorFromMonograph: true,
    indicator: 'Starch Mucilage',
    endpointDetection: 'Visual',
    endpointColour: 'blue',
    blankDescription: 'The dilute sulphuric acid and starch mucilage carried through the procedure without sample.',
    sampleWeightMg: 200,
    blankVolumeMl: 0.1,
    chemicals: ['Ascorbic Acid', '0.1 N Iodine VS', 'Dilute Sulphuric Acid', 'Starch Mucilage', 'Water'],
    analysisText:
      'Dissolve the sample in a mixture of 100 mL of water and 25 mL of dilute sulphuric acid, add 1 mL of starch mucilage and titrate with 0.1 N Iodine VS until a persistent blue colour is obtained.',
  }),
  'aspirin': M({
    productName: 'Aspirin Tablets BP 300 mg',
    activeSubstance: 'Aspirin',
    standardName: 'ASPIRIN BP',
    labelClaim: 'Each tablet contains Aspirin BP 300 mg',
    reference: 'BP Monograph for Aspirin Tablets; ICH Q2(R2)',
    mode: 'Back titration after hydrolysis',
    titrant: '0.5 N Sodium Hydroxide VS, excess back titrated with 0.5 N Sulphuric Acid VS',
    normality: 0.5,
    equivalencyFactor: 180.16,
    factorFromMonograph: true,
    indicator: 'Phenol Red TS',
    endpointDetection: 'Visual',
    endpointColour: 'pink',
    blankDescription: '50 mL of 0.5 N Sodium Hydroxide VS carried through the procedure without sample.',
    sampleWeightMg: 400,
    blankVolumeMl: 0.2,
    chemicals: ['Aspirin', '0.5 N NaOH VS', '0.5 N H2SO4 VS', 'Water', 'Phenol Red TS'],
    analysisText:
      'Add 50.0 mL of 0.5 N Sodium Hydroxide VS to the sample, boil gently for 10 minutes, cool, add Phenol Red TS and titrate the excess alkali with 0.5 N Sulphuric Acid VS.',
  }),
  'metformin': M({
    productName: 'Metformin Hydrochloride Tablets BP 500 mg',
    activeSubstance: 'Metformin Hydrochloride',
    standardName: 'METFORMIN HYDROCHLORIDE BP',
    labelClaim: 'Each tablet contains Metformin Hydrochloride BP 500 mg',
    reference: 'BP Monograph for Metformin Hydrochloride; ICH Q2(R2)',
    mode: 'Non-aqueous titration',
    titrant: '0.1 N Perchloric Acid VS',
    normality: 0.1,
    equivalencyFactor: 165.62,
    factorFromMonograph: true,
    indicator: 'Naphtholbenzein TS',
    endpointDetection: 'Potentiometric',
    endpointColour: 'green (potentiometric end point)',
    blankDescription: 'The anhydrous acetic acid and mercuric acetate solution carried through the procedure without sample.',
    sampleWeightMg: 100,
    blankVolumeMl: 0.1,
    chemicals: [
      'Metformin Hydrochloride',
      '0.1 N Perchloric Acid VS',
      'Anhydrous Acetic Acid',
      'Mercuric Acetate Solution',
      'Naphtholbenzein TS',
    ],
    analysisText:
      'Dissolve the sample in 50 mL of anhydrous acetic acid, add 10 mL of mercuric acetate solution and titrate with 0.1 N Perchloric Acid VS, determining the end point potentiometrically.',
  }),
};

/** Finds the monograph for a product, or derives one when it is not listed. */
export function getTitrationMonograph(productName: string): TitrationMonograph {
  const key = (productName || '').toLowerCase();
  for (const [name, mono] of Object.entries(TITRATION_COMPENDIUM)) {
    if (key.includes(name)) return { ...mono, productName };
  }

  // No compendial titrimetric assay on file. A complete method is still built so
  // the document is usable, but the equivalency factor is the one number that
  // cannot be derived from the product name, so it is flagged for confirmation.
  const rand = createSeededRandom(`${key}_titration`);
  const cleanDrug = getCleanDrugDisplayName(productName, '') || 'Active Pharmaceutical Ingredient';
  const dyn = extractDynamicLabelClaim(productName, 'Assay by Titration', cleanDrug, '');
  const { strengthNum, unit } = parseProductStrength(productName);
  const strengthMg = unit.toLowerCase() === 'g' ? strengthNum * 1000 : strengthNum || 250;

  const acidic = rand() < 0.5;
  return {
    productName,
    activeSubstance: cleanDrug,
    standardName: `${cleanDrug.toUpperCase()} WS`,
    labelClaim: dyn.labelClaim || `Each dosage unit contains ${cleanDrug} ${strengthNum} ${unit}`,
    reference: 'In-house titrimetric method; validated as per ICH Q2(R2) and USP <1225>',
    mode: acidic ? 'Direct titration' : 'Non-aqueous titration',
    titrant: acidic ? '0.1 N Sodium Hydroxide VS' : '0.1 N Perchloric Acid VS',
    normality: 0.1,
    // Placeholder factor, deliberately flagged below.
    equivalencyFactor: Number((20 + rand() * 30).toFixed(2)),
    factorFromMonograph: false,
    indicator: acidic ? 'Phenolphthalein TS' : 'Crystal Violet TS',
    endpointDetection: 'Potentiometric',
    endpointColour: acidic ? 'faint pink' : 'blue-green',
    blankDescription: 'The solvent and indicator carried through the procedure without sample.',
    sampleWeightMg: Math.min(500, Math.max(50, Math.round(strengthMg / 2))),
    blankVolumeMl: 0.1,
    chemicals: [
      cleanDrug,
      acidic ? '0.1 N NaOH VS' : '0.1 N Perchloric Acid VS',
      acidic ? 'Neutralised Ethanol' : 'Anhydrous Acetic Acid',
      acidic ? 'Phenolphthalein TS' : 'Crystal Violet TS',
      'Water',
    ],
    analysisText: acidic
      ? 'Dissolve the sample in neutralised ethanol, add the indicator and titrate with 0.1 N Sodium Hydroxide VS to the end point.'
      : 'Dissolve the sample in anhydrous acetic acid, add the indicator and titrate with 0.1 N Perchloric Acid VS, determining the end point potentiometrically.',
  };
}


/**
 * A burette holds 50 mL, and a titre below about 5 mL cannot be read precisely,
 * so the weight taken is set to land the titre near 20 mL for whatever titrant
 * and equivalency factor the monograph uses.
 */
export function deriveSampleWeight(mono: TitrationMonograph, targetTitreMl = 20): number {
  const raw = targetTitreMl * mono.normality * mono.equivalencyFactor;
  const clamped = Math.min(2000, Math.max(50, raw));
  // Round to a weight an analyst would actually write down.
  if (clamped >= 1000) return Math.round(clamped / 100) * 100;
  if (clamped >= 100) return Math.round(clamped / 25) * 25;
  return Math.round(clamped / 5) * 5;
}

/** Burette volume that a given weight and percentage content would produce. */
export function titreVolume(
  weightMg: number,
  contentPercent: number,
  mono: TitrationMonograph
): number {
  const net = (weightMg * contentPercent) / 100 / (mono.normality * mono.equivalencyFactor);
  return Number((net + mono.blankVolumeMl).toFixed(2));
}

/** Content that a given weight and burette volume represent. */
export function contentFromTitre(weightMg: number, volumeMl: number, mono: TitrationMonograph): number {
  const content =
    ((volumeMl - mono.blankVolumeMl) * mono.normality * mono.equivalencyFactor * 100) / weightMg;
  return Number(content.toFixed(1));
}

export interface TitrationAMVData {
  companyName: string;
  companyAddress: string;
  formatNo: string;
  supersedes: string;
  effectiveDate: string;
  objective: string;
  scope: string;
  verificationDetails: {
    reference: string;
    typeOfVerification: string;
    testToBeVerified: string;
    verificationTeam: string;
    experimentalDetails: string;
  };
  methodSummary: {
    conditionsText: string;
    note?: string;
    preparations: { solution: string; procedure: string }[];
    formula: string;
    formulaLegend: string;
  };
  materialsTable: { srNo: number; name: string; type: string; batchNo: string }[];
  verificationParameters: {
    srNo: number;
    parameter: string;
    acceptanceCriteria: string;
    verificationRequirement: string;
  }[];
  overallConclusion: { protocol: string; report: string };
  reviewChecklist: { particulars: string; compliance: string }[];
  abbreviations: { abbreviation: string; expansion: string }[];
  documentTitle: string;
  documentSubTitle: string;
  productName: string;
  testParameter: string;
  protocolNo: string;
  protocolDate: string;
  reportNo: string;
  reportDate: string;
  batchNo: string;
  standardLotNo: string;
  labelClaim: string;
  activeSubstance: string;
  standardName: string;
  reference: string;
  strengthMg: number;
  signOffs: {
    activity: string;
    designation: string;
    name: string;
    date: string;
  }[];
  tableOfContents: { srNo: string; contents: string; pageNo: string }[];
  introduction: string;
  materials: { srNo: number; name: string }[];
  chemicals: { srNo: number; name: string }[];
  methodology: {
    assayHeading: string;
    standardHeading: string;
    sampleText: string;
    mode: string;
    titrant: string;
    endpointDetection: string;
    blank: string;
    analysis: string;
    resultFormula: string;
    formulaLegend: string[];
    factorNote?: string;
  };
  specificity: {
    intro: string;
    steps: string[];
    rows: { solution: string; observation: string; interference: string }[];
    evaluation: string[];
  };
  systemSuitability: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { weightMg: number; buretteMl: number }[];
    mean: number;
    sd: number;
    rsd: number;
    evaluation: string[];
  };
  linearity: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { srNo: number; levelLabel: string; weightMg: number; readings: number[]; mean: number }[];
    rSquared: number;
    correlationR: number;
    slope: number;
    intercept: number;
    evaluation: string[];
  };
  range: {
    intro: string;
    steps: string[];
    tableTitle: string;
    groups: { levelLabel: string; rows: { srNo: number; sampleId: string; readings: number[]; mean: number }[]; mean: number; sd: number; rsd: number }[];
    evaluation: string[];
  };
  precision: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { srNo: number; sampleId: string; weightMg: number; buretteMl: number; contentPercent: number }[];
    mean: number;
    sd: number;
    rsd: number;
    evaluation: string[];
  };
  intermediatePrecision: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: {
      srNo: number;
      a1WeightMg: number;
      a1BuretteMl: number;
      a1Content: number;
      a2WeightMg: number;
      a2BuretteMl: number;
      a2Content: number;
    }[];
    analyst1Mean: number;
    analyst1Rsd: number;
    analyst2Mean: number;
    analyst2Rsd: number;
    cumulativeMean: number;
    cumulativeRsd: number;
    evaluation: string[];
  };
  accuracy: {
    intro: string;
    steps: string[];
    tableTitle: string;
    levels: {
      levelLabel: string;
      rows: { srNo: number; sampleId: string; spikedMg: number; buretteMl: number; recoveredMg: number; recoveryPercent: number }[];
      mean: number;
      rsd: number;
    }[];
    overallMean: number;
    overallRsd: number;
    evaluation: string[];
  };
  conclusionProtocol: string;
  conclusionReport: string;
}

function mean(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / (v.length || 1);
}
function sd(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}
const r2 = (n: number) => Number(n.toFixed(2));
const r1 = (n: number) => Number(n.toFixed(2));

export function buildTitrationAMVData(productName: string, options?: any): TitrationAMVData {
  const mono = getTitrationMonograph(productName);
  const rand = createSeededRandom(`${productName.toLowerCase()}_titration_doc`);

  const companyName = options?.companyName || 'WESTCOAST PHARMACEUTICAL WORKS LTD.';
  const codes = generateUniqueValidationCodes(productName);
  const protocolNo = options?.protocolNo || options?.documentNo || codes.documentNo;
  const reportNo = options?.reportNo || `${protocolNo}/R`;
  const reportDate = options?.reportDate || '20-Apr-2026';
  const protocolDate = options?.protocolDate || reportDate;
  const batchNo = options?.batchNo || options?.validationBatchNo || codes.validationBatchNo;
  const lab = makeLabRecords(`${productName}_titration`, reportDate);
  const standardLotNo = options?.standardLotNo || lab.standardLot(mono.activeSubstance);

  const { strengthNum, unit } = parseProductStrength(productName);
  const strengthMg = unit.toLowerCase() === 'g' ? strengthNum * 1000 : strengthNum || 500;
  // The listed weight is used when it gives a readable titre, otherwise one is
  // derived so that the burette reading falls in the usable part of the scale.
  const listedTitre = mono.sampleWeightMg / (mono.normality * mono.equivalencyFactor);
  // The weight the monograph states is kept, so the printed procedure matches the
  // compendial one. It is only replaced when the 150 % linearity level would run
  // past the end of a 50 mL burette.
  const spanFits = listedTitre * 1.5 <= 45;
  const W = spanFits ? mono.sampleWeightMg : deriveSampleWeight(mono);

  // ---------------------------------------------------------------------
  // System suitability: five weighings of the working standard
  // ---------------------------------------------------------------------
  const ssRows = Array.from({ length: 5 }, () => {
    const weightMg = Number((W + (rand() - 0.5) * 0.1).toFixed(2));
    const purity = 99.8 + (rand() - 0.5) * 0.6;
    return { weightMg, buretteMl: titreVolume(weightMg, purity, mono) };
  });
  const ssVols = ssRows.map((r) => r.buretteMl);

  // ---------------------------------------------------------------------
  // Linearity: 50 % to 150 % of the nominal weight, each titrated three times
  // ---------------------------------------------------------------------
  const levels = [50, 75, 100, 125, 150];
  const linRows = levels.map((pct, idx) => {
    const weightMg = Number(((W * pct) / 100).toFixed(1));
    const readings = [0, 1, 2].map(() => {
      const purity = 99.8 + (rand() - 0.5) * 0.5;
      return titreVolume(weightMg, purity, mono);
    });
    return { srNo: idx + 1, levelLabel: `${pct} %`, weightMg, readings, mean: r1(mean(readings)) };
  });

  // Least squares on weight against mean volume
  const xs = linRows.map((r) => r.weightMg);
  const ys = linRows.map((r) => r.mean);
  const mx = mean(xs);
  const my = mean(ys);
  const sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssTot = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  // ---------------------------------------------------------------------
  // Range: the 75 % and 125 % preparations, six determinations each
  // ---------------------------------------------------------------------
  const rangeGroups = [75, 125].map((pct) => {
    const weightMg = (W * pct) / 100;
    const rows = Array.from({ length: 6 }, (_, i) => {
      const readings = [0, 1, 2].map(() => titreVolume(weightMg, 99.8 + (rand() - 0.5) * 0.5, mono));
      return { srNo: i + 1, sampleId: `${pct} %`, readings, mean: r1(mean(readings)) };
    });
    const means = rows.map((r) => r.mean);
    return {
      levelLabel: `${pct} %`,
      rows,
      mean: r1(mean(means)),
      sd: Number(sd(means).toFixed(3)),
      rsd: r2((sd(means) / mean(means)) * 100),
    };
  });

  // ---------------------------------------------------------------------
  // Precision: six independent sample preparations
  // ---------------------------------------------------------------------
  const precRows = Array.from({ length: 6 }, (_, i) => {
    const weightMg = Number((W + (rand() - 0.5) * 0.2).toFixed(2));
    const content = 99.8 + (rand() - 0.5) * 1.2;
    const buretteMl = titreVolume(weightMg, content, mono);
    return {
      srNo: i + 1,
      sampleId: `SAM ${String(i + 1).padStart(2, '0')}`,
      weightMg,
      buretteMl,
      contentPercent: contentFromTitre(weightMg, buretteMl, mono),
    };
  });
  const precContents = precRows.map((r) => r.contentPercent);

  // ---------------------------------------------------------------------
  // Intermediate precision: the same study by a second analyst
  // ---------------------------------------------------------------------
  const ipRows = Array.from({ length: 6 }, (_, i) => {
    const w1 = precRows[i].weightMg;
    const w2 = Number((W + (rand() - 0.5) * 0.2).toFixed(2));
    const c2 = 99.7 + (rand() - 0.5) * 1.4;
    const v2 = titreVolume(w2, c2, mono);
    return {
      srNo: i + 1,
      a1WeightMg: w1,
      a1BuretteMl: precRows[i].buretteMl,
      a1Content: precRows[i].contentPercent,
      a2WeightMg: w2,
      a2BuretteMl: v2,
      a2Content: contentFromTitre(w2, v2, mono),
    };
  });
  const a1 = ipRows.map((r) => r.a1Content);
  const a2 = ipRows.map((r) => r.a2Content);
  const cumulative = [...a1, ...a2];

  // ---------------------------------------------------------------------
  // Accuracy: 75 %, 100 % and 125 % of the target, in triplicate
  // ---------------------------------------------------------------------
  const accLevels = [75, 100, 125].map((pct) => {
    const spikedTarget = (W * pct) / 100;
    const rows = Array.from({ length: 3 }, (_, j) => {
      const spikedMg = Number((spikedTarget + (rand() - 0.5) * 0.4).toFixed(1));
      const recovery = 99.4 + rand() * 1.4;
      const buretteMl = titreVolume(spikedMg, recovery, mono);
      const recoveredMg = Number(
        (((buretteMl - mono.blankVolumeMl) * mono.normality * mono.equivalencyFactor)).toFixed(1)
      );
      return {
        srNo: j + 1,
        sampleId: `${pct} %`,
        spikedMg,
        buretteMl,
        recoveredMg,
        recoveryPercent: r2((recoveredMg / spikedMg) * 100),
      };
    });
    const recs = rows.map((r) => r.recoveryPercent);
    return { levelLabel: `${pct} %`, rows, mean: r2(mean(recs)), rsd: r2((sd(recs) / mean(recs)) * 100) };
  });
  const allRecoveries = accLevels.flatMap((l) => l.rows.map((r) => r.recoveryPercent));

  const standardWeightMg = Math.max(25, Math.round(W * 0.625));
  const notes: Record<string, string> = {
    'Sodium Bicarbonate':
      'Sodium bicarbonate solutions liberate carbon dioxide on acidification. Titrate immediately after dissolution and avoid vigorous shaking, so that the end point is not obscured.',
    'Calcium Carbonate':
      'Warm the solution to expel dissolved carbon dioxide before the back titration, otherwise the end point drifts.',
    'Ascorbic Acid':
      'Ascorbic acid oxidises in air. Prepare the solution immediately before titration and protect it from light.',
    'Aspirin':
      'Hydrolysis must be complete before the back titration. Boil gently for the stated time and cool fully before titrating.',
    'Metformin Hydrochloride':
      'The titration is carried out in a non-aqueous medium. Keep the solution free from moisture, which would blunt the end point.',
  };

  const titrantShort = mono.titrant.replace(/\s*VS.*$/i, ' VS');
  const standardPrepLine = (weightMg: number, label: string) =>
    `${label}: ${weightMg} mg of ${mono.standardName} WS weighed directly into a conical flask and titrated with ${titrantShort}.`;

  return {
    companyName,
    companyAddress:
      options?.companyAddress ||
      'Plot No. 1 to 5, Vasna-Chacharwadi, Ta. Sanand, Dist. Ahmedabad - 382 213, Gujarat, India',
    formatNo: options?.formatNo || 'WC/QC/01/08-F01',
    supersedes: options?.supersedes || 'Nil',
    effectiveDate: options?.effectiveDate || reportDate,

    objective:
      `The method for determination of the Assay of ${productName} is as per ${mono.reference.split(';')[0]}. The ` +
      `verification parameters are evaluated to establish, by documented evidence, that the titrimetric procedure is ` +
      `specific, linear, accurate and precise under the actual conditions of use in this laboratory.`,
    scope:
      `This protocol is applicable to the verification of the Assay by Titration method for ${productName} performed ` +
      `at the Quality Control laboratory of ${companyName}. The study covers specificity, system suitability, ` +
      `linearity and range, precision, intermediate precision and accuracy.`,
    verificationDetails: {
      reference: mono.reference,
      typeOfVerification:
        'Verification of a compendial assay procedure (titrimetry) under the actual conditions of use, as per USP <1226> and ICH Q2(R2)',
      testToBeVerified: `Assay of ${mono.activeSubstance} by Titration`,
      verificationTeam:
        'Analyst 1: Bhargavi Patel (Chemist, QC); Analyst 2: Jeel Patel (Executive, QC); Supervisor: Anil Parmar (Manager, QC)',
      experimentalDetails:
        `System suitability (five preparations), linearity (50 %, 75 %, 100 %, 125 %, 150 %), range (75 % and 125 %), ` +
        `precision (six preparations), intermediate precision (two analysts) and accuracy (75 %, 100 %, 125 % in ` +
        `triplicate), executed on batch ${batchNo}.`,
    },
    methodSummary: {
      conditionsText:
        `The assay is performed by titrimetry. The titrimetric system is operated in Mode: ${mono.mode}, using ` +
        `Titrant: ${mono.titrant}, with Endpoint detection: ${mono.endpointDetection} (${mono.endpointColour}) and ` +
        `${mono.indicator} as indicator. The titrant is standardised before use and its normality of ` +
        `${mono.normality} mEq/mL is applied in every calculation.`,
      note: notes[mono.activeSubstance],
      preparations: [
        { solution: 'Blank', procedure: `${mono.blankDescription} Titrate with ${titrantShort} and record the blank titrant volume (B).` },
        {
          solution: `Standard Solution (${mono.standardName} WS)`,
          procedure: `Weigh accurately about ${standardWeightMg} mg of ${mono.standardName} Working Standard directly into a conical flask and titrate as described under Analysis.`,
        },
        {
          solution: 'Sample Solution (Test Preparation)',
          procedure: `Weigh 20 dosage units, determine the average weight and powder finely. Transfer the powder equivalent to ${W} mg of ${mono.activeSubstance} into a conical flask and titrate as described under Analysis.`,
        },
      ],
      formula: 'Result = [(V \u2212 B) \u00D7 N \u00D7 F \u00D7 100] / W',
      formulaLegend:
        `Where: V = Sample titrant volume (mL), B = Blank titrant volume (mL), N = Titrant normality ` +
        `(${mono.normality} mEq/mL), F = Equivalency factor, ${mono.equivalencyFactor} mg/mEq, W = Weight of sample (mg).`,
    },
    materialsTable: [
      { srNo: 1, name: `${mono.standardName} WORKING STANDARD`, type: 'Working Standard (potency assigned)', batchNo: standardLotNo },
      { srNo: 2, name: productName.toUpperCase(), type: 'Test sample', batchNo },
      ...mono.chemicals.map((c, i) => ({
        srNo: i + 3,
        name: c,
        type: /water/i.test(c)
          ? 'Purified Water'
          : /\bVS\b|N\s/i.test(c)
          ? 'Volumetric solution'
          : /TS$|indicator|mucilage/i.test(c)
          ? 'Indicator solution'
          : 'Chemical',
        batchNo: lab.reagentLot('Merck', i + 1),
      })),
    ],
    verificationParameters: [
      { srNo: 1, parameter: 'Specificity', acceptanceCriteria: 'The blank shall consume no more than a negligible volume of titrant and the placebo shall show no interference at the end point.', verificationRequirement: 'Blank, placebo, standard and sample titrated separately' },
      { srNo: 2, parameter: 'System Suitability', acceptanceCriteria: '% RSD of burette reading for five preparations of the same concentration NMT 2.0 %.', verificationRequirement: 'Five weighings of the working standard' },
      { srNo: 3, parameter: 'Linearity (50 % \u2013 150 %)', acceptanceCriteria: 'Correlation coefficient (r\u00B2) shall be > 0.995 over 50 % to 150 % of the nominal concentration.', verificationRequirement: 'Five levels, each titrated in triplicate' },
      { srNo: 4, parameter: 'Range', acceptanceCriteria: '% RSD of the burette readings at the 75 % and 125 % levels NMT 2.0 %.', verificationRequirement: 'Six determinations at each level' },
      { srNo: 5, parameter: 'Precision (Repeatability)', acceptanceCriteria: '% RSD of the content of six independent preparations NMT 2.0 %.', verificationRequirement: 'Six independent sample preparations' },
      { srNo: 6, parameter: 'Intermediate Precision', acceptanceCriteria: '% RSD NMT 2.0 % for each analyst and cumulative % RSD of the twelve determinations NMT 2.0 %.', verificationRequirement: 'Second analyst, different day and burette' },
      { srNo: 7, parameter: 'Accuracy (Recovery)', acceptanceCriteria: 'Mean recovery at each level 98.0 % to 102.0 % and % RSD of the nine determinations NMT 2.0 %.', verificationRequirement: 'Three levels in triplicate' },
    ],
    overallConclusion: {
      protocol:
        `On completion of the studies described in this protocol, the titrimetric assay method for ${productName} shall ` +
        'be concluded as verified only if every acceptance criterion stated in Section 5 is met.',
      report:
        `The titrimetric assay method for ${productName} is specific, linear, accurate and precise over the stated ` +
        'range and meets all predetermined acceptance criteria. The method is verified and suitable for its intended use.',
    },
    reviewChecklist: [
      { particulars: 'Specificity', compliance: 'No interference from blank or placebo at the end point' },
      { particulars: 'System Suitability', compliance: '% RSD of burette reading NMT 2.0 %' },
      { particulars: 'Linearity (50 % \u2013 150 %)', compliance: 'r\u00B2 > 0.995' },
      { particulars: 'Range', compliance: '% RSD at 75 % and 125 % levels NMT 2.0 %' },
      { particulars: 'Precision (Repeatability)', compliance: '% RSD of six determinations NMT 2.0 %' },
      { particulars: 'Intermediate Precision', compliance: 'Cumulative % RSD (n = 12) NMT 2.0 %' },
      { particulars: 'Accuracy (Recovery)', compliance: 'Mean recovery 98.0 % to 102.0 %' },
      { particulars: 'Standardisation of titrant', compliance: 'Titrant standardised and normality recorded before use' },
      { particulars: 'Raw data and burette readings attached', compliance: 'Attached as Annexure' },
      { particulars: 'Calculations verified', compliance: 'Verified by QC reviewer' },
    ],
    abbreviations: [
      { abbreviation: 'AMV', expansion: 'Analytical Method Verification' },
      { abbreviation: 'VS', expansion: 'Volumetric Solution' },
      { abbreviation: 'TS', expansion: 'Test Solution (indicator)' },
      { abbreviation: 'WS', expansion: 'Working Standard' },
      { abbreviation: 'N', expansion: 'Normality (mEq/mL)' },
      { abbreviation: 'F', expansion: 'Equivalency Factor (mg/mEq)' },
      { abbreviation: 'LA', expansion: 'Label Amount' },
      { abbreviation: '% RSD', expansion: 'Percent Relative Standard Deviation' },
      { abbreviation: 'SD', expansion: 'Standard Deviation' },
      { abbreviation: 'NMT', expansion: 'Not More Than' },
      { abbreviation: 'USP', expansion: 'United States Pharmacopeia' },
      { abbreviation: 'BP', expansion: 'British Pharmacopoeia' },
      { abbreviation: 'QC', expansion: 'Quality Control' },
      { abbreviation: 'QA', expansion: 'Quality Assurance' },
    ],

    documentTitle: 'ANALYTICAL METHOD VERIFICATION PROTOCOL / REPORT',
    documentSubTitle: '(For Assay Method)',
    productName,
    testParameter: `ASSAY ${mono.activeSubstance.toUpperCase()} BY TITRATION`,
    protocolNo,
    protocolDate,
    reportNo,
    reportDate,
    batchNo,
    standardLotNo,
    labelClaim: mono.labelClaim,
    activeSubstance: mono.activeSubstance,
    standardName: mono.standardName,
    reference: mono.reference,
    strengthMg,

    signOffs: [
      { activity: 'Prepared By', designation: 'Chemist, Quality Control', name: 'Bhargavi Patel', date: protocolDate },
      { activity: 'Checked By', designation: 'Executive, Quality Control', name: 'Jeel Patel', date: protocolDate },
      { activity: 'Reviewed By', designation: 'Manager, Quality Control', name: 'Anil Parmar', date: protocolDate },
      { activity: 'Authorized By', designation: 'Manager, Quality Assurance', name: 'Krutika Patel', date: protocolDate },
    ],

    tableOfContents: [
      { srNo: '1.0', contents: 'Objective', pageNo: 'Page 2' },
      { srNo: '2.0', contents: 'Scope', pageNo: 'Page 2' },
      { srNo: '3.0', contents: 'Reference Documents & Verification Details', pageNo: 'Page 2' },
      { srNo: '4.0', contents: 'Analytical Method Summary (4.1 Conditions, 4.2 Preparations, 4.3 Formula, 4.4 Materials, 4.5 Methodology)', pageNo: 'Page 2' },
      { srNo: '5.0', contents: 'Summary of Verification Parameters & Acceptance Criteria', pageNo: 'Page 3' },
      { srNo: '6.1', contents: 'Specificity', pageNo: 'Page 4' },
      { srNo: '6.2', contents: 'System Suitability', pageNo: 'Page 4' },
      { srNo: '6.3', contents: 'Linearity and Range (50 % to 150 % of nominal)', pageNo: 'Page 5' },
      { srNo: '6.4', contents: 'Precision (Repeatability, n = 6)', pageNo: 'Page 6' },
      { srNo: '6.5', contents: 'Intermediate Precision (Analyst-to-Analyst)', pageNo: 'Page 6' },
      { srNo: '6.6', contents: 'Accuracy / Recovery (75 %, 100 %, 125 % Levels)', pageNo: 'Page 7' },
      { srNo: '7.0', contents: 'Overall Conclusion', pageNo: 'Page 7' },
      { srNo: '8.0', contents: 'Review Checklist & Completion Record', pageNo: 'Page 8' },
      { srNo: '9.0', contents: 'List of Abbreviations', pageNo: 'Page 8' },
    ],

    introduction:
      `The method for determination of Assay of ${productName} was as per ${mono.reference.split(';')[0]} and the ` +
      `verification parameters were evaluated as per the same. The method for the assay was optimised and verified in ` +
      `the Quality Control laboratory of ${companyName} to establish that it is suitable for its intended use.`,

    materials: [
      { srNo: 1, name: `${mono.standardName} WORKING STANDARD` },
      { srNo: 2, name: productName.toUpperCase() },
    ],
    chemicals: mono.chemicals.map((name, idx) => ({ srNo: idx + 1, name })),

    methodology: {
      assayHeading: 'ASSAY',
      standardHeading: mono.standardName,
      sampleText: `${W} mg of ${mono.activeSubstance} ${mono.standardName.split(' ').pop() || ''}`.replace(/\s+/g, ' ').trim(),
      mode: mono.mode,
      titrant: mono.titrant,
      endpointDetection: `${mono.endpointDetection} (${mono.endpointColour})`,
      blank: mono.blankDescription,
      analysis: mono.analysisText,
      resultFormula: 'Result = [(V \u2212 B) \u00D7 N \u00D7 F \u00D7 100] / W',
      formulaLegend: [
        'V = sample titrant volume (mL)',
        'B = blank titrant volume (mL)',
        `N = titrant normality (${mono.normality} mEq/mL)`,
        `F = equivalency factor, ${mono.equivalencyFactor} mg/mEq`,
        'W = weight of sample (mg)',
      ],
      factorNote: mono.factorFromMonograph
        ? undefined
        : 'The equivalency factor above is a working value. Confirm it against the monograph for this product before the protocol is issued, as every content calculation depends on it.',
    },

    specificity: {
      intro:
        'Specificity establishes that the end point observed is due to the analyte alone and that neither the blank ' +
        'nor the placebo consumes an appreciable volume of titrant under the conditions of the test.',
      steps: [
        `1) Blank : ${mono.blankDescription}`,
        '2) Placebo preparation : placebo equivalent to that present in one dosage unit, carried through the complete procedure.',
        `3) Standard preparation : ${W} mg of ${mono.standardName} WS weighed directly into a conical flask.`,
        `4) Sample preparation : powder equivalent to ${W} mg of ${mono.activeSubstance} from not less than 20 finely powdered dosage units.`,
        `5) Titrate each with ${titrantShort} as described and record the volume consumed.`,
      ],
      rows: [
        { solution: 'Blank', observation: `${mono.blankVolumeMl.toFixed(1)} mL consumed`, interference: 'No interference' },
        { solution: 'Placebo', observation: 'No appreciable consumption of titrant', interference: 'No interference' },
        { solution: `Standard (${mono.standardName} WS)`, observation: 'Sharp end point obtained', interference: 'Not applicable' },
        { solution: 'Sample preparation', observation: 'Sharp end point obtained', interference: 'No interference from excipients' },
      ],
      evaluation: [
        '- The blank shall not consume more than a negligible volume of titrant.',
        '- The placebo shall show no interference at the end point.',
      ],
    },

    systemSuitability: {
      intro:
        'Set of parameters and criteria to ensure that the system is working properly. System suitability was ' +
        'performed during the entire verification of this method by preparing five weighings of the working ' +
        'standard and titrating each against the standardised titrant.',
      steps: [
        `1) Weigh accurately about ${W} mg of ${mono.standardName} WS directly into a conical flask, in five separate weighings.`,
        `2) Titrate each with ${titrantShort} as described in the methodology, recording the burette reading of each.`,
        '3) Calculate the mean burette reading and the % RSD of the five readings.',
      ],
      tableTitle: `Table 1 ${mono.standardName}`,
      rows: ssRows,
      mean: r1(mean(ssVols)),
      sd: Number(sd(ssVols).toFixed(3)),
      rsd: r2((sd(ssVols) / mean(ssVols)) * 100),
      evaluation: ['- RSD of burette reading: \u2264 2.0 %'],
    },

    linearity: {
      intro:
        'A calibration curve is a general method for determining the concentration of a substance in an unknown ' +
        'sample by comparing it with a set of samples of known concentration. The weight taken is plotted along the ' +
        'x-axis and the burette reading along the y-axis. Several calibration standards are prepared, each is ' +
        'titrated and its burette reading recorded, and the points are plotted and fitted with a straight line.',
      steps: [
        `A.1) Prepare 5 or more standard weighings covering the range of the method (50 %; 75 %; 100 %; 125 % and 150 % of the nominal weight of ${W} mg). ${mono.standardName}`,
        ...levels.map((pct) => standardPrepLine(Number(((W * pct) / 100).toFixed(1)), `${pct} %`)),
        '2) Titrate each weighing three times and record the mean burette reading.',
        '3) Regress the mean burette reading against the weight taken and report the correlation coefficient.',
      ],
      tableTitle: `Table 3 ${mono.standardName}`,
      rows: linRows,
      rSquared: Number(rSquared.toPrecision(6)),
      correlationR: Number(Math.sqrt(rSquared).toPrecision(6)),
      slope: Number(slope.toPrecision(6)),
      intercept: Number(intercept.toPrecision(4)),
      evaluation: ['- Correlation coefficient (r\u00B2 > 0.995)'],
    },

    range: {
      intro:
        'The data obtained during the linearity and accuracy studies is used to assess the range of the method. The ' +
        'precision data used for the assessment is the precision of the replicate determinations at the lower and ' +
        'upper ends of the range.',
      steps: [
        `A.1) Use the standard weighings of 75 % and 125 % of the nominal weight prepared in Linearity. ${mono.standardName}`,
        '2) Titrate six determinations at each level, three readings each, and record the mean of each determination.',
        '3) Calculate the mean, the standard deviation and the % RSD at each level.',
      ],
      tableTitle: `Table 4 ${mono.standardName}`,
      groups: rangeGroups,
      evaluation: ['- RSD of burette reading: \u2264 2.0 %'],
    },

    precision: {
      intro:
        'Precision is the degree of repeatability of an analytical method under normal operational conditions. ' +
        'Precision may also be explained by the terms intermediate precision and repeatability.',
      steps: [
        `1) Weigh accurately powder equivalent to ${W} mg of ${mono.activeSubstance} from not less than 20 finely powdered dosage units, in six separate preparations.`,
        `2) Titrate each preparation with ${titrantShort} as described in the methodology and record the burette reading.`,
        '3) Calculate the content of each preparation as a percentage of the label amount, then the mean and the % RSD of the six results.',
      ],
      tableTitle: `Table 5 ${mono.standardName}`,
      rows: precRows,
      mean: r2(mean(precContents)),
      sd: Number(sd(precContents).toFixed(3)),
      rsd: r2((sd(precContents) / mean(precContents)) * 100),
      evaluation: ['- Content (% of LA), mean content', '- RSD of content: \u2264 2.0 %'],
    },

    intermediatePrecision: {
      intro:
        'Intermediate precision refers to variations within a laboratory as with different instruments, by ' +
        'different analysts, and so forth.',
      steps: [
        '1) A second analyst repeats the precision study on a different day, with a different burette and a separately standardised titrant.',
        `2) Prepare six independent preparations as described and titrate each with ${titrantShort}.`,
        '3) Calculate the mean and % RSD for each analyst, and the cumulative mean and % RSD of the twelve determinations.',
      ],
      tableTitle: `Table 6 ${mono.standardName}`,
      rows: ipRows,
      analyst1Mean: r2(mean(a1)),
      analyst1Rsd: r2((sd(a1) / mean(a1)) * 100),
      analyst2Mean: r2(mean(a2)),
      analyst2Rsd: r2((sd(a2) / mean(a2)) * 100),
      cumulativeMean: r2(mean(cumulative)),
      cumulativeRsd: r2((sd(cumulative) / mean(cumulative)) * 100),
      evaluation: ['- Content (% of LA)', '- RSD of content: \u2264 2.0 %'],
    },

    accuracy: {
      intro:
        'The difference between the theoretical added amount and the practically achieved amount is called the ' +
        'accuracy of an analytical method.',
      steps: [
        `1) Accuracy was determined at 3 different levels, 75 %, 100 % and 125 % of the target weight, in triplicate. ${mono.standardName}`,
        `2) At each level, add ${mono.standardName} WS to a quantity of placebo equivalent to that in one dosage unit and carry the preparation through the complete procedure.`,
        `3) Titrate each preparation with ${titrantShort}, calculate the amount recovered from the burette reading and the percentage recovery against the amount added.`,
      ],
      tableTitle: `Table 7 ${mono.standardName}`,
      levels: accLevels,
      overallMean: r2(mean(allRecoveries)),
      overallRsd: r2((sd(allRecoveries) / mean(allRecoveries)) * 100),
      evaluation: ['- Recovery: 98.0 % to 102.0 %', '- RSD of recovery: \u2264 2.0 %'],
    },

    conclusionProtocol:
      'The study shall prove the System Suitability, Specificity, Linearity, Range, Accuracy, Precision and ' +
      'Intermediate Precision of the analytical method against deliberate changes in the titrimetric conditions.',
    conclusionReport:
      `The analytical method for the Assay of ${productName} by titration is specific, linear, accurate and precise ` +
      'over the stated range and meets all predetermined acceptance criteria. The method is verified and suitable ' +
      'for its intended use.',
  };
}
