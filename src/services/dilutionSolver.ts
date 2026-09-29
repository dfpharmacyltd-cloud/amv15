/**
 * Dilution solver.
 *
 * Every concentration printed in a validation document has to be reachable with
 * a real weighing and real volumetric glassware. These helpers take a target
 * concentration and give back the actual preparation, together with the
 * concentration that preparation really delivers, so the printed table and the
 * printed preparation can never disagree.
 */

/** Pipette / burette volumes a laboratory actually measures with (mL). */
export const ALIQUOTS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 15, 20, 25, 50];

/** Volumetric flask sizes (mL). */
export const FLASKS = [10, 20, 25, 50, 100, 200, 250, 500];

/** Weighable amounts for a stock solution (mg). */
export const STOCK_WEIGHTS = [10, 12.5, 15, 20, 25, 30, 40, 50, 75, 100];

export interface SolvedDilution {
  description: string;
  dilutionFactor: number;
  achievedConc: number;
  errorPercent: number;
}

/**
 * Finds a one or two step dilution of the stock that lands closest to the
 * target concentration.
 */
export function solveDilution(stockConc: number, targetConc: number): SolvedDilution {
  const needed = stockConc / targetConc;
  let best: { steps: string[]; factor: number; error: number } | null = null;

  const consider = (steps: string[], factor: number) => {
    const error = Math.abs(factor - needed) / needed;
    if (!best || error < best.error) best = { steps, factor, error };
  };

  for (const a of ALIQUOTS) {
    for (const f of FLASKS) {
      if (f <= a) continue;
      consider([`${a.toFixed(1)} mL to ${f.toFixed(1)} mL`], f / a);
      for (const a2 of ALIQUOTS) {
        for (const f2 of FLASKS) {
          if (f2 <= a2) continue;
          consider(
            [`${a.toFixed(1)} mL to ${f.toFixed(1)} mL`, `${a2.toFixed(1)} mL to ${f2.toFixed(1)} mL`],
            (f / a) * (f2 / a2)
          );
        }
      }
    }
  }

  const chosen = best!;
  return {
    description: chosen.steps.join(', then '),
    dilutionFactor: chosen.factor,
    achievedConc: stockConc / chosen.factor,
    errorPercent: chosen.error * 100,
  };
}

/** Picks the stock weight that prepares every requested level most accurately. */
export function chooseLinearityStock(levelConcs: number[], finalVolumeMl = 100) {
  let best: { stockMg: number; stockConc: number; worstError: number } | null = null;
  for (const stockMg of STOCK_WEIGHTS) {
    const stockConc = (stockMg * 1000) / finalVolumeMl;
    if (stockConc < Math.max(...levelConcs)) continue;
    const worstError = Math.max(...levelConcs.map((c) => solveDilution(stockConc, c).errorPercent));
    if (!best || worstError < best.worstError) best = { stockMg, stockConc, worstError };
  }
  if (!best) {
    const stockMg = STOCK_WEIGHTS[STOCK_WEIGHTS.length - 1];
    best = { stockMg, stockConc: (stockMg * 1000) / finalVolumeMl, worstError: 100 };
  }
  return { ...best, finalVolumeMl };
}

/**
 * Builds a complete sample preparation that reaches a target working
 * concentration from a given amount of drug substance in the test preparation.
 */
export function solveSamplePreparation(sampleWeightMg: number, targetWorkingConc: number) {
  let best: {
    flaskMl: number;
    stockConc: number;
    dilution: SolvedDilution;
  } | null = null;

  for (const flaskMl of FLASKS) {
    const stockConc = (sampleWeightMg * 1000) / flaskMl;
    if (stockConc < targetWorkingConc) continue;
    const dilution = solveDilution(stockConc, targetWorkingConc);
    if (!best || dilution.errorPercent < best.dilution.errorPercent) {
      best = { flaskMl, stockConc, dilution };
    }
  }

  if (!best) {
    // Target is above what the weighed amount can give, so use the neat stock.
    const flaskMl = FLASKS[0];
    const stockConc = (sampleWeightMg * 1000) / flaskMl;
    best = {
      flaskMl,
      stockConc,
      dilution: { description: 'used without further dilution', dilutionFactor: 1, achievedConc: stockConc, errorPercent: 0 },
    };
  }

  return {
    sampleWeightMg,
    flaskMl: best.flaskMl,
    stockConc: best.stockConc,
    dilutionDescription: best.dilution.description,
    dilutionFactor: best.dilution.dilutionFactor,
    workingConc: best.dilution.achievedConc,
  };
}
