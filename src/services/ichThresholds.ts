/**
 * ICH Q3B(R2) thresholds for degradation products in a new drug product.
 *
 * When a product has no compendial related substances monograph, the impurity
 * limits are not invented: they are taken from the ICH Q3B thresholds, which
 * depend on the maximum daily dose. Each threshold is the lower of a percentage
 * of the dose and an absolute total daily intake.
 */

export interface ICHThresholds {
  maxDailyDoseMg: number;
  /** Below this, an impurity need not be reported. */
  reportingPercent: number;
  /** Above this, an impurity must be identified. */
  identificationPercent: number;
  /** Above this, an impurity must be qualified. */
  qualificationPercent: number;
  /** Total degradation products limit applied to the finished product. */
  totalPercent: number;
  basis: string[];
}

/** Rounds a threshold to the significant figures a specification is written in. */
function roundThreshold(pct: number): number {
  if (pct >= 1) return Number(pct.toFixed(1));
  if (pct >= 0.1) return Number(pct.toFixed(2));
  return Number(pct.toPrecision(2));
}

/** Converts an absolute total daily intake (µg) into a percentage of the dose. */
function intakeToPercent(intakeUg: number, maxDailyDoseMg: number): number {
  return (intakeUg / (maxDailyDoseMg * 1000)) * 100;
}

export function ichQ3BThresholds(maxDailyDoseMg: number): ICHThresholds {
  const mdd = maxDailyDoseMg > 0 ? maxDailyDoseMg : 100;

  // Reporting threshold
  const reporting = mdd <= 1000 ? 0.1 : 0.05;

  // Identification threshold: the lower of the percentage and the daily intake
  let identification: number;
  if (mdd < 1) {
    identification = Math.min(1.0, intakeToPercent(5, mdd));
  } else if (mdd <= 10) {
    identification = Math.min(0.5, intakeToPercent(20, mdd));
  } else if (mdd <= 2000) {
    identification = Math.min(0.2, intakeToPercent(2000, mdd));
  } else {
    identification = 0.1;
  }

  // Qualification threshold
  let qualification: number;
  if (mdd < 10) {
    qualification = Math.min(1.0, intakeToPercent(50, mdd));
  } else if (mdd <= 100) {
    qualification = Math.min(0.5, intakeToPercent(200, mdd));
  } else if (mdd <= 2000) {
    qualification = Math.min(0.2, intakeToPercent(3000, mdd));
  } else {
    qualification = 0.15;
  }

  const reportingPercent = roundThreshold(reporting);
  const identificationPercent = roundThreshold(identification);
  const qualificationPercent = roundThreshold(qualification);

  // A total limit of five times the qualification threshold, capped at 1.0 %,
  // is the usual finished product specification where no monograph applies.
  const totalPercent = roundThreshold(Math.min(1.0, qualificationPercent * 5));

  return {
    maxDailyDoseMg: mdd,
    reportingPercent,
    identificationPercent,
    qualificationPercent,
    totalPercent,
    basis: [
      `No compendial related substances monograph is available for this product, so the impurity limits are taken from ICH Q3B(R2).`,
      `Maximum daily dose taken as one dosage unit = ${mdd} mg.`,
      `Reporting threshold ${reportingPercent} %, identification threshold ${identificationPercent} %, qualification threshold ${qualificationPercent} %.`,
    ],
  };
}
