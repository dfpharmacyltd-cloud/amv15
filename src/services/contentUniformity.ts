/**
 * Uniformity of Dosage Units — USP <905> / Ph. Eur. 2.9.40.
 *
 * Content uniformity is judged by the Acceptance Value, which combines how far
 * the mean of the individual contents sits from the reference value M with the
 * spread of those contents. Stage 1 tests 10 units and requires an acceptance
 * value of not more than 15.0.
 */

export interface ContentUniformityUnit {
  unitNo: number;
  /** Peak area of the individual dosage unit. */
  peakArea: number;
  /** Individual content, as a percentage of the label claim. */
  contentPercent: number;
}

export interface ContentUniformityResult {
  units: ContentUniformityUnit[];
  n: number;
  /** Target test concentration T, as a percentage of the label claim. */
  target: number;
  mean: number;
  sd: number;
  rsd: number;
  minContent: number;
  maxContent: number;
  /** Reference value M as defined in USP <905>. */
  referenceValueM: number;
  /** Acceptability constant k: 2.4 for 10 units, 2.0 for 30 units. */
  kValue: number;
  acceptanceValue: number;
  /** Maximum allowed acceptance value at stage 1 (L1). */
  l1Limit: number;
  /** Maximum allowed deviation of any single unit from M (L2). */
  l2Limit: number;
  /** No unit may fall outside these bounds. */
  lowerUnitBound: number;
  upperUnitBound: number;
  complies: boolean;
  /** How the acceptance value was arrived at, for printing under the table. */
  workings: string[];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1);
}

function sampleSd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * @param target the label claim percentage the batch is targeted at, T. For a
 * finished product this is normally 100.0.
 */
export function calculateAcceptanceValue(
  units: ContentUniformityUnit[],
  target = 100.0
): ContentUniformityResult {
  const contents = units.map((u) => u.contentPercent);
  const n = contents.length;
  const xBar = Number(mean(contents).toFixed(2));
  const sd = Number(sampleSd(contents).toFixed(3));
  const rsd = xBar > 0 ? Number(((sd / xBar) * 100).toFixed(2)) : 0;
  const kValue = n >= 30 ? 2.0 : 2.4;
  const l1Limit = 15.0;
  const l2Limit = 25.0;

  // Reference value M, for the usual case where the target is at or below 101.5 %.
  let referenceValueM: number;
  let avRaw: number;
  let mExplanation: string;

  if (target <= 101.5) {
    if (xBar < 98.5) {
      referenceValueM = 98.5;
      avRaw = 98.5 - xBar + kValue * sd;
      mExplanation = `the mean ${xBar.toFixed(2)} % is below 98.5 %, so M = 98.5 % and AV = 98.5 \u2212 X\u0304 + ks`;
    } else if (xBar > 101.5) {
      referenceValueM = 101.5;
      avRaw = xBar - 101.5 + kValue * sd;
      mExplanation = `the mean ${xBar.toFixed(2)} % is above 101.5 %, so M = 101.5 % and AV = X\u0304 \u2212 101.5 + ks`;
    } else {
      referenceValueM = xBar;
      avRaw = kValue * sd;
      mExplanation = `the mean ${xBar.toFixed(2)} % lies between 98.5 % and 101.5 %, so M = X\u0304 and AV = ks`;
    }
  } else {
    // Target above 101.5 % is unusual for a finished product but is covered.
    if (xBar < 98.5) {
      referenceValueM = 98.5;
      avRaw = 98.5 - xBar + kValue * sd;
      mExplanation = `the mean ${xBar.toFixed(2)} % is below 98.5 %, so M = 98.5 %`;
    } else if (xBar > target) {
      referenceValueM = target;
      avRaw = xBar - target + kValue * sd;
      mExplanation = `the mean ${xBar.toFixed(2)} % is above the target ${target.toFixed(1)} %, so M = T`;
    } else {
      referenceValueM = xBar;
      avRaw = kValue * sd;
      mExplanation = `the mean ${xBar.toFixed(2)} % lies between 98.5 % and the target, so M = X\u0304`;
    }
  }

  const acceptanceValue = Number(avRaw.toFixed(2));
  const lowerUnitBound = Number((referenceValueM * 0.75).toFixed(2));
  const upperUnitBound = Number((referenceValueM * 1.25).toFixed(2));
  const minContent = Math.min(...contents);
  const maxContent = Math.max(...contents);

  const complies =
    acceptanceValue <= l1Limit && minContent >= lowerUnitBound && maxContent <= upperUnitBound;

  return {
    units,
    n,
    target,
    mean: xBar,
    sd,
    rsd,
    minContent: Number(minContent.toFixed(2)),
    maxContent: Number(maxContent.toFixed(2)),
    referenceValueM: Number(referenceValueM.toFixed(2)),
    kValue,
    acceptanceValue,
    l1Limit,
    l2Limit,
    lowerUnitBound,
    upperUnitBound,
    complies,
    workings: [
      `n = ${n}; mean X\u0304 = ${xBar.toFixed(2)} %; sample standard deviation s = ${sd.toFixed(3)}; acceptability constant k = ${kValue.toFixed(1)}.`,
      `Reference value: ${mExplanation}.`,
      `Acceptance Value = ${acceptanceValue.toFixed(2)} (limit L1 = ${l1Limit.toFixed(1)}).`,
      `No individual unit may fall outside ${lowerUnitBound.toFixed(2)} % to ${upperUnitBound.toFixed(2)} % of M; the observed range is ${minContent.toFixed(2)} % to ${maxContent.toFixed(2)} %.`,
    ],
  };
}

/** Seeded generation of ten individual dosage unit contents around the target. */
export function generateContentUniformityUnits(
  rand: () => number,
  nominalArea: number,
  targetContent = 99.6,
  n = 10
): ContentUniformityUnit[] {
  return Array.from({ length: n }, (_, i) => {
    // Unit to unit variation of a well controlled tablet batch: about 1 % RSD.
    const contentPercent = Number((targetContent + (rand() - 0.5) * 2.6).toFixed(1));
    return {
      unitNo: i + 1,
      peakArea: Math.round((nominalArea * contentPercent) / 100),
      contentPercent,
    };
  });
}
