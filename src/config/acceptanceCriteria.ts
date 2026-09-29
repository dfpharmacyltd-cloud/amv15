export const CRITERIA = {
  systemSuitability: {
    rsdPeakArea:      { op: "NMT", value: 2.0,  unit: "%" },
    theoreticalPlates:{ op: "NLT", value: 1500, unit: "" },
    tailingFactor:    { op: "NMT", value: 1.5,  unit: "" },
    resolution:       { op: "NLT", value: 2.0,  unit: "" },
  },
  linearity:  { r2: { op: "NLT", value: 0.995, unit: "" } },
  precision:  { rsdContent: { op: "NMT", value: 2.0, unit: "%" } },
  loq:        { snRatio: { op: "NLT", value: 10, unit: ":1" },
                rsdAtLoq: { op: "NMT", value: 5.0, unit: "%" } },
  lod:        { snRatio: { op: "NLT", value: 3,  unit: ":1" } },
  accuracy:   { recoveryMin: 98.0, recoveryMax: 102.0,
                rsd: { op: "NMT", value: 2.0, unit: "%" } },
} as const;

export const fmtCriterion = (c: {op: string; value: number; unit: string}) =>
  `${c.op} ${c.value}${c.unit ? " " + c.unit : ""}`;

export const precisionNarrative = (v: number[]) => {
  const val = (Math.sqrt(v.reduce((a, b) => a + (b - (v.reduce((a, b) => a + b, 0) / v.length)) ** 2, 0) / (v.length - 1)) / (v.reduce((a, b) => a + b, 0) / v.length)) * 100;
  const crit = CRITERIA.precision.rsdContent;
  return `The %RSD of ${v.length} determinations is ${val.toFixed(2)} % ` +
         `(${fmtCriterion(crit)}). Repeatability is ${val <= crit.value ? "confirmed" : "NOT confirmed"}.`;
};
