/**
 * Dissolution by UV Visible Spectroscopy.
 *
 * The test type decides the structure: a dissolution study is six vessels of a
 * stated medium, volume, apparatus and speed, sampled at a stated time and
 * reported against a Q value. The technique decides only how the withdrawn
 * sample is measured, so the response here is an absorbance, read at the
 * analytical wavelength against the medium as the blank.
 *
 *     Result = (AU / AS) x (CS / L) x V x D x 100
 */

import { createSeededRandom, parseProductStrength } from './pharmaMathEngine';
import { getDissolutionMonograph } from './dissolutionPharmaDatabase';
import { generateUniqueValidationCodes } from './pharmaDatabase';
import { makeLabRecords } from './labRecords';

function mean(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / (v.length || 1);
}
function sampleSd(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}
const r2 = (n: number) => Number(n.toFixed(2));
const abs4 = (n: number) => Number(n.toFixed(4));

export interface DissolutionUvAMVData {
  companyName: string;
  companyAddress: string;
  documentTitle: string;
  documentSubTitle: string;
  productName: string;
  testParameter: string;
  labelClaim: string;
  activeSubstance: string;
  standardName: string;
  reference: string;
  protocolNo: string;
  protocolDate: string;
  reportNo: string;
  reportDate: string;
  batchNo: string;
  standardLotNo: string;
  formatNo: string;
  supersedes: string;
  signOffs: { activity: string; designation: string; name: string; date: string }[];
  tableOfContents: { srNo: string; contents: string; pageNo: string }[];
  introduction: string;
  materials: { srNo: number; name: string }[];
  chemicals: { srNo: number; name: string }[];
  wavelengths: { srNo: number; wavelength: string }[];
  methodology: {
    heading: string;
    medium: string;
    apparatus: string;
    time: string;
    standardStockSolution: string;
    standardSolution: string;
    sampleSolution: string;
    blank: string;
    mode: string;
    analyticalWavelengths: string;
    analysis: string;
    resultFormula: string;
    formulaLegend: string[];
    tolerances: string;
  };
  systemSuitability: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { srNo: number; standardWeightMg: number; absorbance: number }[];
    mean: number;
    sd: number;
    rsd: number;
    instrumentChecks: { parameter: string; criterion: string; observed: string }[];
    evaluation: string[];
  };
  linearity: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { srNo: number; levelLabel: string; concentrationMgMl: number; absorbance: number }[];
    rSquared: number;
    correlationR: number;
    slope: number;
    intercept: number;
    evaluation: string[];
  };
  range: {
    intro: string;
    tableTitle: string;
    groups: { levelLabel: string; rows: { srNo: number; sampleId: string; absorbance: number }[]; mean: number; sd: number; rsd: number }[];
    evaluation: string[];
  };
  precision: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { vesselNo: number; absorbance: number; percentReleased: number }[];
    mean: number;
    sd: number;
    rsd: number;
    minReleased: number;
    maxReleased: number;
    qLimit: string;
    evaluation: string[];
  };
  intermediatePrecision: {
    intro: string;
    steps: string[];
    tableTitle: string;
    rows: { vesselNo: number; a1Absorbance: number; a1Released: number; a2Absorbance: number; a2Released: number }[];
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
      rows: { srNo: number; spikedMg: number; absorbance: number; recoveredMg: number; recoveryPercent: number }[];
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

export function buildDissolutionUvAMVData(productName: string, options?: any): DissolutionUvAMVData {
  const mono = getDissolutionMonograph(productName, options?.targetApi);
  const rand = createSeededRandom(`${productName.toLowerCase()}_dissolution_uv`);

  const companyName = options?.companyName || 'WESTCOAST PHARMACEUTICAL WORKS LTD.';
  const codes = generateUniqueValidationCodes(productName);
  const protocolNo = options?.protocolNo || options?.documentNo || codes.documentNo;
  const reportNo = options?.reportNo || `${protocolNo}/R`;
  const reportDate = options?.reportDate || '20-Apr-2026';
  const protocolDate = options?.protocolDate || reportDate;
  const batchNo = options?.batchNo || options?.validationBatchNo || codes.validationBatchNo;
  const lab = makeLabRecords(`${productName}_dissolution_uv`, reportDate);

  const activeSubstance = (mono.productName || productName)
    .replace(/tablets?|capsules?|gastro-resistant|delayed-release|usp|bp|ip|\d+(?:\.\d+)?\s*(?:mg|mcg|g)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Active Pharmaceutical Ingredient';
  const standardName = `${activeSubstance.toUpperCase()} RS`;
  const standardLotNo = options?.standardLotNo || lab.standardLot(activeSubstance);

  const { strengthNum, unit } = parseProductStrength(productName);
  const labelClaimMg = unit.toLowerCase() === 'g' ? strengthNum * 1000 : strengthNum || 100;

  // Medium volume and Q are stated in the monograph; the volume is written once
  // and the medium name printed without it.
  const volumeMatch = String(mono.medium || '').match(/(\d+)\s*mL/i);
  const mediumVolumeMl = volumeMatch ? Number(volumeMatch[1]) : 900;
  const mediumName = String(mono.medium || '').replace(/^\s*\d+\s*mL\s+of\s+/i, '');
  // The sample is read in the medium itself unless the monograph names a
  // separate solvent for the dilution.
  const measuringSolvent =
    mono.diluent && !/mobile phase|dissolution medium/i.test(mono.diluent) ? mono.diluent : mediumName;
  const qMatch = String(mono.qLimit || '').match(/(\d+(?:\.\d+)?)/);
  const qPercent = qMatch ? parseFloat(qMatch[1]) : 80;

  // Concentration in the vessel at 100 % released, and the sample dilution that
  // brings it into the linear range of the spectrophotometer.
  const vesselConcMgMl = labelClaimMg / mediumVolumeMl;
  // Dilutions are made with real glassware, so the factor is one an analyst
  // would actually pipette rather than whatever the arithmetic produced.
  const standardDilutions = [1, 2, 5, 10, 20, 25, 50, 100];
  const dilutionFactor =
    vesselConcMgMl > 0.02
      ? standardDilutions.reduce((best, d) =>
          Math.abs(vesselConcMgMl / d - 0.01) < Math.abs(vesselConcMgMl / best - 0.01) ? d : best
        )
      : 1;
  const standardConcMgMl = Number((vesselConcMgMl / dilutionFactor).toPrecision(3));
  const stockWeightMg = Math.max(25, Math.round(standardConcMgMl * 1000 * 10) / 10 * 10);
  const stockConcMgMl = Number((standardConcMgMl * 40).toPrecision(3));

  /** Absorbance the standard gives at 100 % of the label claim released. */
  const absAt100 = 0.4045;
  const absFor = (percentReleased: number) => abs4((absAt100 * percentReleased) / 100);
  const releasedFrom = (absorbance: number) => r2((absorbance / absAt100) * 100);

  // ---------------------------------------------------------------------
  // 3.1 System suitability: five standard preparations, read in turn
  // ---------------------------------------------------------------------
  const ssRows = Array.from({ length: 5 }, (_, i) => {
    const standardWeightMg = Number((stockWeightMg + (rand() - 0.5) * 0.2).toFixed(2));
    return { srNo: i + 1, standardWeightMg, absorbance: absFor(99.8 + (rand() - 0.5) * 0.8) };
  });
  const ssAbs = ssRows.map((r) => r.absorbance);

  // ---------------------------------------------------------------------
  // 3.2 Linearity: 50 % to 150 % of the concentration at Q
  // ---------------------------------------------------------------------
  const levels = [50, 75, 100, 125, 150];
  const linRows = levels.map((pct, idx) => ({
    srNo: idx + 1,
    levelLabel: `${pct} %`,
    concentrationMgMl: Number(((standardConcMgMl * pct) / 100).toPrecision(3)),
    absorbance: absFor(pct * (1 + (rand() - 0.5) * 0.004)),
  }));
  const xs = linRows.map((r) => r.concentrationMgMl);
  const ys = linRows.map((r) => r.absorbance);
  const mx = mean(xs);
  const my = mean(ys);
  const sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssTot = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  const rangeGroups = [75, 125].map((pct) => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      srNo: i + 1,
      sampleId: `${pct} %`,
      absorbance: absFor(pct * (1 + (rand() - 0.5) * 0.005)),
    }));
    const a = rows.map((r) => r.absorbance);
    return {
      levelLabel: `${pct} %`,
      rows,
      mean: abs4(mean(a)),
      sd: Number(sampleSd(a).toFixed(5)),
      rsd: r2((sampleSd(a) / mean(a)) * 100),
    };
  });

  // ---------------------------------------------------------------------
  // 3.3 Precision: one full set of six vessels
  // ---------------------------------------------------------------------
  const precRows = Array.from({ length: 6 }, (_, i) => {
    const released = 96 + rand() * 4.5;
    const absorbance = absFor(released);
    return { vesselNo: i + 1, absorbance, percentReleased: releasedFrom(absorbance) };
  });
  const precReleased = precRows.map((r) => r.percentReleased);

  // ---------------------------------------------------------------------
  // 3.4 Intermediate precision: a second analyst, second apparatus
  // ---------------------------------------------------------------------
  const ipRows = Array.from({ length: 6 }, (_, i) => {
    const a2 = absFor(95.5 + rand() * 5);
    return {
      vesselNo: i + 1,
      a1Absorbance: precRows[i].absorbance,
      a1Released: precRows[i].percentReleased,
      a2Absorbance: a2,
      a2Released: releasedFrom(a2),
    };
  });
  const a1 = ipRows.map((r) => r.a1Released);
  const a2v = ipRows.map((r) => r.a2Released);
  const cumulative = [...a1, ...a2v];

  // ---------------------------------------------------------------------
  // 3.5 Accuracy: standard added to the medium at three levels, in triplicate
  // ---------------------------------------------------------------------
  const accLevels = [50, 100, 130].map((pct) => {
    const rows = Array.from({ length: 3 }, (_, j) => {
      const spikedMg = Number(((labelClaimMg * pct) / 100).toFixed(1));
      const recovery = 99.2 + rand() * 1.6;
      const absorbance = absFor(pct * (recovery / 100));
      const recoveredMg = Number(((spikedMg * recovery) / 100).toFixed(1));
      return {
        srNo: j + 1,
        spikedMg,
        absorbance,
        recoveredMg,
        recoveryPercent: r2((recoveredMg / spikedMg) * 100),
      };
    });
    const recs = rows.map((r) => r.recoveryPercent);
    return { levelLabel: `${pct} %`, rows, mean: r2(mean(recs)), rsd: r2((sampleSd(recs) / mean(recs)) * 100) };
  });
  const allRecoveries = accLevels.flatMap((l) => l.rows.map((r) => r.recoveryPercent));

  const wavelengthText = mono.wavelength || `${mono.wavelengthNum || 254} nm`;

  return {
    companyName,
    companyAddress:
      options?.companyAddress ||
      'Plot No. 1 to 5, Vasna-Chacharwadi, Ta. Sanand, Dist. Ahmedabad - 382 213, Gujarat, India',
    documentTitle: 'ANALYTICAL METHOD VERIFICATION',
    documentSubTitle: '(For Dissolution Method)',
    productName,
    testParameter: `DISSOLUTION OF ${productName.toUpperCase()} BY UV VISIBLE SPECTROSCOPY`,
    labelClaim: mono.labelClaim || `Each tablet contains ${activeSubstance} ${strengthNum} ${unit}`,
    activeSubstance,
    standardName,
    reference: mono.reference,
    protocolNo,
    protocolDate,
    reportNo,
    reportDate,
    batchNo,
    standardLotNo,
    formatNo: options?.formatNo || 'WC/QC/01/08-F01',
    supersedes: options?.supersedes || 'Nil',

    signOffs: [
      { activity: 'Prepared By', designation: 'Chemist, Quality Control', name: 'SMIT PATEL', date: protocolDate },
      { activity: 'Checked By', designation: 'Executive, Quality Control', name: 'SONI VAGHELA', date: protocolDate },
      { activity: 'Reviewed By', designation: 'Manager, Quality Control', name: 'ANIL PARMAR', date: protocolDate },
      { activity: 'Authorized By', designation: 'Manager, Quality Assurance', name: 'ANKITA DARJI', date: protocolDate },
    ],

    tableOfContents: [
      { srNo: '1.0', contents: 'Introduction', pageNo: '2' },
      { srNo: '2.0', contents: 'Materials, Chemicals, Reagents, Equipment and Methodology used', pageNo: '2' },
      { srNo: '3.0', contents: 'Verification Parameters', pageNo: '4' },
      { srNo: '3.1', contents: 'System Suitability', pageNo: '4' },
      { srNo: '3.2', contents: 'Linearity and Range', pageNo: '4' },
      { srNo: '3.3', contents: 'Precision', pageNo: '7' },
      { srNo: '3.4', contents: 'Intermediate Precision', pageNo: '8' },
      { srNo: '3.5', contents: 'Accuracy', pageNo: '9' },
    ],

    introduction:
      `The method for the determination of Dissolution of ${productName} is as per ${String(mono.reference).split(';')[0]}, ` +
      `measured by UV Visible Spectroscopy. The verification parameters were evaluated in the Quality Control laboratory ` +
      `of ${companyName} to establish that the method is suitable for its intended use.`,

    materials: [
      { srNo: 1, name: `${standardName} WORKING STANDARD` },
      { srNo: 2, name: productName.toUpperCase() },
    ],
    chemicals: [
      { srNo: 1, name: mediumName },
      { srNo: 2, name: measuringSolvent },
      { srNo: 3, name: 'Purified Water' },
      { srNo: 4, name: 'Membrane filter, 0.45 \u00B5m' },
    ],
    wavelengths: [{ srNo: 1, wavelength: wavelengthText }],

    methodology: {
      heading: 'DISSOLUTION',
      medium: `${mediumName}; ${mediumVolumeMl} mL`,
      apparatus: `${mono.apparatus}: ${mono.paddleSpeed}`,
      time: mono.samplingTime,
      standardStockSolution:
        `${stockConcMgMl} mg/mL of ${standardName}, prepared as follows. Dissolve about ${stockWeightMg} mg of ` +
        `${standardName}, accurately weighed, in a suitable volume of ${measuringSolvent} and dilute to volume with the same.`,
      standardSolution:
        `${standardConcMgMl} mg/mL of ${standardName} in ${measuringSolvent}, from the Standard stock solution.`,
      sampleSolution:
        `Pass a portion of the solution under test through a 0.45 \u00B5m filter, discarding the first few mL. ` +
        (dilutionFactor > 1
          ? `Prepare a 1-in-${dilutionFactor} dilution of the filtrate with ${measuringSolvent}.`
          : `Measure the filtrate directly.`),
      blank: measuringSolvent,
      mode: 'UV',
      analyticalWavelengths: `Maximum absorbance at about ${wavelengthText}`,
      analysis:
        `Samples: Standard solution and Sample solution. Calculate the percentage of the labelled amount of ` +
        `${activeSubstance} dissolved:`,
      resultFormula: 'Result = (AU / AS) \u00D7 (CS / L) \u00D7 V \u00D7 D \u00D7 100',
      formulaLegend: [
        'AU = absorbance of the Sample solution',
        'AS = absorbance of the Standard solution',
        `CS = concentration of ${standardName} in the Standard solution (${standardConcMgMl} mg/mL)`,
        `L = label claim (${labelClaimMg} mg per unit)`,
        `V = volume of Medium, ${mediumVolumeMl} mL`,
        `D = dilution factor of the Sample solution, ${dilutionFactor}`,
      ],
      tolerances: `NLT ${qPercent} % (Q) of the labelled amount is dissolved in ${mono.samplingTime}.`,
    },

    systemSuitability: {
      intro:
        'System suitability establishes that the spectrophotometer is performing correctly before any vessel is ' +
        'sampled. Five preparations of the standard are measured and the spread of the readings is calculated, ' +
        'together with the instrument qualification checks.',
      steps: [
        `1) Standard preparation: ${standardConcMgMl} mg/mL of ${standardName} in ${measuringSolvent}, prepared in five separate weighings.`,
        `2) Zero the instrument against the blank (${measuringSolvent}) in 1 cm matched quartz cells.`,
        `3) Measure the absorbance of each preparation at ${wavelengthText} and record the reading.`,
        '4) Calculate the mean absorbance, the standard deviation and the % RSD of the five readings.',
      ],
      tableTitle: `Table 1 ${standardName}`,
      rows: ssRows,
      mean: abs4(mean(ssAbs)),
      sd: Number(sampleSd(ssAbs).toFixed(5)),
      rsd: r2((sampleSd(ssAbs) / mean(ssAbs)) * 100),
      instrumentChecks: [
        { parameter: 'Absorbance % RSD (n = 6)', criterion: 'NMT 1.0 %', observed: `${(0.2 + rand() * 0.5).toFixed(2)} %` },
        { parameter: 'Wavelength accuracy', criterion: '\u00B1 1 nm', observed: `${(rand() * 0.6 - 0.3).toFixed(1)} nm` },
        { parameter: 'Photometric accuracy', criterion: '\u00B1 0.01 A', observed: `${(rand() * 0.008 - 0.004).toFixed(3)} A` },
        { parameter: 'Stray light at 220 nm', criterion: 'NMT 1.0 %', observed: `${(0.05 + rand() * 0.15).toFixed(2)} %` },
        { parameter: 'Baseline flatness', criterion: '\u00B1 0.002 A', observed: `${(rand() * 0.0016 - 0.0008).toFixed(4)} A` },
        { parameter: 'Cell pathlength', criterion: '1.00 cm \u00B1 0.01', observed: `${(1 + (rand() * 0.008 - 0.004)).toFixed(3)} cm` },
      ],
      evaluation: ['- % RSD of absorbance: \u2264 2.0 %', '- Instrument qualification checks shall comply'],
    },

    linearity: {
      intro:
        'A calibration curve is a general method for determining the concentration of a substance in an unknown ' +
        'sample by comparing it with a set of samples of known concentration. Concentration is plotted along the ' +
        'x-axis and absorbance along the y-axis, and the points are fitted with a straight line.',
      steps: [
        `A.1) Prepare five standard solutions covering 50 % to 150 % of the concentration obtained at 100 % release ` +
          `(${standardConcMgMl} mg/mL), by dilution of the Standard stock solution with ${measuringSolvent}.`,
        ...levels.map(
          (pct) =>
            `For ${pct} %: dilute the Standard stock solution to obtain ${Number(((standardConcMgMl * pct) / 100).toPrecision(3))} mg/mL and measure the absorbance at ${wavelengthText}.`
        ),
        '2) Measure each level in triplicate and record the mean absorbance.',
        '3) Regress the mean absorbance against concentration and report the correlation coefficient, the slope and the y-intercept.',
      ],
      tableTitle: `Table 3 ${standardName}`,
      rows: linRows,
      rSquared: Number(rSquared.toPrecision(6)),
      correlationR: Number(Math.sqrt(rSquared).toPrecision(6)),
      slope: Number(slope.toPrecision(6)),
      intercept: Number(intercept.toPrecision(4)),
      evaluation: ['- Correlation coefficient (r\u00B2 > 0.995)'],
    },

    range: {
      intro:
        'The range is assessed from the replicate determinations at the lower and upper ends of the linearity study.',
      tableTitle: `Table 4 ${standardName}`,
      groups: rangeGroups,
      evaluation: ['- % RSD of absorbance: \u2264 2.0 %'],
    },

    precision: {
      intro:
        'Precision is the degree of repeatability of the method under normal operating conditions, established by ' +
        'running one full set of six vessels and calculating the agreement between the individual percentages dissolved.',
      steps: [
        `1) Set up six vessels of the ${mono.apparatus} with ${mediumVolumeMl} mL of ${mediumName}, equilibrated to ${mono.mediumTemperature || '37 \u00B1 0.5 \u00B0C'}, at ${mono.paddleSpeed}.`,
        '2) Introduce one dosage unit into each vessel and start the apparatus.',
        `3) At ${mono.samplingTime}, withdraw an aliquot from the standard sampling zone of each vessel and filter through a 0.45 \u00B5m filter, discarding the first few mL.`,
        `4) Measure the absorbance of each filtrate at ${wavelengthText} against the blank and calculate the percentage of the labelled amount dissolved.`,
      ],
      tableTitle: `Table 5 ${standardName}`,
      rows: precRows,
      mean: r2(mean(precReleased)),
      sd: Number(sampleSd(precReleased).toFixed(3)),
      rsd: r2((sampleSd(precReleased) / mean(precReleased)) * 100),
      minReleased: r2(Math.min(...precReleased)),
      maxReleased: r2(Math.max(...precReleased)),
      qLimit: mono.qLimit || `NLT ${qPercent} % (Q)`,
      evaluation: [
        `- Each unit shall release NLT ${qPercent} % (Q) of the labelled amount`,
        '- % RSD of the six vessels: \u2264 2.0 %',
      ],
    },

    intermediatePrecision: {
      intro:
        'Intermediate precision expresses the variation within the laboratory: a different analyst, on a different ' +
        'day, using a different dissolution apparatus and a different lot of medium.',
      steps: [
        '1) A second analyst repeats the six vessel study on a different day, on a different dissolution apparatus and with a freshly prepared medium.',
        '2) Calculate the percentage dissolved in each vessel as described.',
        '3) Calculate the mean and % RSD for each analyst and the cumulative % RSD of the twelve vessels.',
      ],
      tableTitle: `Table 6 ${standardName}`,
      rows: ipRows,
      analyst1Mean: r2(mean(a1)),
      analyst1Rsd: r2((sampleSd(a1) / mean(a1)) * 100),
      analyst2Mean: r2(mean(a2v)),
      analyst2Rsd: r2((sampleSd(a2v) / mean(a2v)) * 100),
      cumulativeMean: r2(mean(cumulative)),
      cumulativeRsd: r2((sampleSd(cumulative) / mean(cumulative)) * 100),
      evaluation: ['- % RSD of the twelve vessels: \u2264 2.0 %'],
    },

    accuracy: {
      intro:
        'Accuracy is established by recovery from the medium: a known amount of the working standard is added to the ' +
        'placebo in the vessel at three levels across the range and the amount recovered is compared with that added.',
      steps: [
        `1) Add placebo equivalent to one dosage unit to each vessel containing ${mediumVolumeMl} mL of ${mediumName}.`,
        `2) Spike each vessel with ${standardName} equivalent to 50 %, 100 % and 130 % of the label claim of ${labelClaimMg} mg, three vessels at each level.`,
        `3) Operate the apparatus under the test conditions, withdraw and filter as described.`,
        `4) Measure the absorbance at ${wavelengthText} and calculate the amount recovered and the percentage recovery at each level.`,
      ],
      tableTitle: `Table 7 ${standardName}`,
      levels: accLevels,
      overallMean: r2(mean(allRecoveries)),
      overallRsd: r2((sampleSd(allRecoveries) / mean(allRecoveries)) * 100),
      evaluation: ['- Recovery: 98.0 % to 102.0 %', '- % RSD of recovery: \u2264 2.0 %'],
    },

    conclusionProtocol:
      'The study shall establish the System Suitability, Linearity, Range, Precision, Intermediate Precision and ' +
      'Accuracy of the dissolution method measured by UV Visible Spectroscopy.',
    conclusionReport:
      `The dissolution method for ${productName} measured by UV Visible Spectroscopy is linear, precise and accurate ` +
      'over the stated range and meets all predetermined acceptance criteria. The method is verified and suitable ' +
      'for its intended use.',
  };
}
