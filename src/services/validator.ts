import { toPpm, mean } from './calculations';

export interface Issue { 
  severity: "BLOCKER" | "WARN"; 
  where: string; 
  msg: string; 
}

// Minimal interface definitions for the validator payload
export interface ReportData {
  testType: 'Assay' | 'RS' | 'Dissolution';
  method: {
    sampleWeightMg: number;
    finalVolumeMl: number;
    internalStandardUsed?: boolean;
  };
  linearity: {
    loq: number;
    levels: {
      label: string;
      weightMg: number;
      dilutionMl: number;
      nominalPpm: number;
    }[];
  };
  systemSuitability: {
    platesReported?: number;
    injections: {
      theoreticalPlates?: number;
      isPeakArea?: number;
    }[];
  };
  sections: Record<string, boolean>;
  chromatograms?: any[];
}

export function validateReport(r: ReportData): Issue[] {
  const issues: Issue[] = [];
  
  const near = (a: number, b: number, tolPct = 1) =>
    Math.abs(a - b) / Math.abs(b) * 100 <= tolPct;

  // R1: Har level ka labelled ppm weight/dilution se match kare
  r.linearity?.levels?.forEach(l => {
    const calc = toPpm(l.weightMg, l.dilutionMl);
    if (!near(calc, l.nominalPpm, 2)) {
      issues.push({ 
        severity: "BLOCKER", 
        where: `Linearity ${l.label}`,
        msg: `${l.weightMg} mg / ${l.dilutionMl} mL = ${calc.toFixed(1)} ppm, but labelled ${l.nominalPpm} ppm` 
      });
    }
  });

  // R2: Summary row ka plates/tailing per-injection data se match kare
  const platesData = (r.systemSuitability?.injections || [])
    .map(i => i.theoreticalPlates)
    .filter(Boolean) as number[];
    
  if (platesData.length && r.systemSuitability?.platesReported && !near(r.systemSuitability.platesReported, mean(platesData), 5)) {
    issues.push({ 
      severity: "BLOCKER", 
      where: "System Suitability",
      msg: `Reported plates ${r.systemSuitability.platesReported} vs data mean ${mean(platesData).toFixed(0)}` 
    });
  }

  // R3: Koi bhi summary value bina supporting data na ho
  if (r.systemSuitability?.platesReported && !platesData.length) {
    issues.push({ 
      severity: "BLOCKER", 
      where: "System Suitability",
      msg: "Plates reported in summary but no per-injection plates column" 
    });
  }

  // R4: LOQ spec limit se neeche hona chahiye (0.1% limit assumption)
  const testConc = toPpm(r.method.sampleWeightMg, r.method.finalVolumeMl);
  const R = testConc * 0.001; // 0.1 % limit
  
  if (r.linearity?.loq > R) {
    issues.push({ 
      severity: "BLOCKER", 
      where: "LOD/LOQ",
      msg: `LOQ ${r.linearity.loq.toFixed(2)} ppm is above the 0.1 % limit (${R.toFixed(2)} ppm) — method cannot quantify at spec` 
    });
  }

  // R5: Linearity range spec limit ko bracket kare (RS methods)
  if (r.testType === "RS" && r.linearity?.levels?.[0]?.nominalPpm > R * 1.2) {
    issues.push({ 
      severity: "WARN", 
      where: "Linearity",
      msg: `Lowest level ${r.linearity.levels[0].nominalPpm} ppm does not bracket the ${R.toFixed(2)} ppm limit` 
    });
  }

  // R6: RS method mein internal standard ratio mandatory
  if (r.testType === "RS" && r.method.internalStandardUsed !== false &&
      r.systemSuitability?.injections?.some(i => !i.isPeakArea)) {
    issues.push({ 
      severity: "BLOCKER", 
      where: "All tables",
      msg: "Monograph limits are ratios to internal standard, but IS peak area missing" 
    });
  }

  // R7: Required sections
  const required = r.testType === "RS"
    ? ["systemSuitability", "specificity", "linearity", "range", "precision", "lodLoq",
       "intermediatePrecision", "accuracy", "robustness", "solutionStability", "filterValidation"]
    : ["systemSuitability", "specificity", "linearity", "range", "accuracy", "precision",
       "intermediatePrecision", "robustness", "solutionStability"];
       
  required.forEach(s => {
    if (!r.sections?.[s]) {
      issues.push({ 
        severity: "BLOCKER", 
        where: "Structure",
        msg: `Missing mandatory section: ${s}` 
      });
    }
  });

  // R8: Chromatograms attached
  if (!r.chromatograms?.length) {
    issues.push({ 
      severity: "BLOCKER", 
      where: "Annexure",
      msg: "No chromatograms attached but report claims integration reports compiled" 
    });
  }

  return issues;
}
