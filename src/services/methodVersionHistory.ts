/**
 * Method Version History & Parameter Baseline Service
 * 
 * Enforces GMP Change Control (ALCOA+) and ICH Q2(R2) Validation Integrity:
 * - Exact String Consistency for Document & Report Numbers
 * - Mandatory Specific Explanations for Major Method Parameter Changes (>5% RT, Wavelength, Column, Mobile Phase)
 * - Template-Aware Retention Time Section Registry
 */

export interface CoreMethodParameters {
  retentionTime: number; // in minutes
  wavelength: number; // in nm
  column: string; // Column name and dimensions
  mobilePhase: string; // Mobile phase composition and ratio
  flowRate: number; // in mL/min
  columnTemperature: number; // in °C
}

export interface MethodDiffItem {
  parameter: 'Retention Time' | 'Wavelength' | 'Column' | 'Mobile Phase' | 'Flow Rate' | 'Column Temperature';
  oldValue: string | number;
  newValue: string | number;
  percentChange?: number;
  isSignificant: boolean;
  thresholdDescription: string;
}

export interface MethodDiffResult {
  hasMajorChanges: boolean;
  changedParameters: MethodDiffItem[];
  explanationNeeded: boolean;
  isValidJustification: boolean;
  justificationIssues: string[];
}

/**
 * Standard baseline database for reference pharmaceutical monographs
 */
export const DEFAULT_METHOD_BASELINES: Record<string, CoreMethodParameters> = {
  // Dissolution monographs
  tibolone_dissolution: {
    retentionTime: 5.20,
    wavelength: 210,
    column: 'Inertsil ODS-3V, C18, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Acetonitrile : Water (80:20 v/v)',
    flowRate: 1.0,
    columnTemperature: 25,
  },
  pregabalin_dissolution: {
    retentionTime: 4.80,
    wavelength: 210,
    column: 'Hypersil BDS C18, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Acetonitrile : 10 mM Potassium Dihydrogen Phosphate pH 6.8 (15:85 v/v)',
    flowRate: 1.0,
    columnTemperature: 30,
  },
  paracetamol_dissolution: {
    retentionTime: 3.50,
    wavelength: 243,
    column: 'C18, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Methanol : Water (25:75 v/v)',
    flowRate: 1.0,
    columnTemperature: 30,
  },
  metformin_dissolution: {
    retentionTime: 4.20,
    wavelength: 218,
    column: 'Inertsil ODS-3V, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Acetonitrile : 10 mM Potassium Phosphate buffer pH 3.0 (10:90 v/v)',
    flowRate: 1.0,
    columnTemperature: 30,
  },
  atorvastatin_dissolution: {
    retentionTime: 6.20,
    wavelength: 246,
    column: 'C18, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Acetonitrile : 0.1% Phosphoric Acid (50:50 v/v)',
    flowRate: 1.2,
    columnTemperature: 30,
  },
  ibuprofen_dissolution: {
    retentionTime: 4.50,
    wavelength: 222,
    column: 'C18, 150 x 4.6 mm, 5 µm',
    mobilePhase: 'Acetonitrile : Water : Phosphoric Acid (60:40:0.1 v/v)',
    flowRate: 1.5,
    columnTemperature: 30,
  },

  // Related Substances monographs
  sodium_valproate_related_substances: {
    retentionTime: 8.50,
    wavelength: 215,
    column: 'Inertsil ODS-3, C18, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Methanol : Phosphate Buffer pH 3.0 (70:30 v/v)',
    flowRate: 1.0,
    columnTemperature: 30,
  },
  paracetamol_related_substances: {
    retentionTime: 3.80,
    wavelength: 243,
    column: 'Inertsil ODS-3V, C18, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Methanol : 0.05 M Potassium Dihydrogen Phosphate (15:85 v/v)',
    flowRate: 1.0,
    columnTemperature: 30,
  },
  metformin_related_substances: {
    retentionTime: 4.10,
    wavelength: 218,
    column: 'Inertsil ODS-3V, 250 x 4.6 mm, 5 µm',
    mobilePhase: 'Acetonitrile : 10 mM Phosphate Buffer pH 3.0 (10:90 v/v)',
    flowRate: 1.0,
    columnTemperature: 30,
  },

  // Assay monographs
  acarbose_assay: {
    retentionTime: 6.51,
    wavelength: 210,
    column: 'Amino L8 column (4.6 mm x 250 mm, 5 µm)',
    mobilePhase: 'Acetonitrile : 0.01 M Potassium Dihydrogen Phosphate Buffer pH 6.0 (75:25 v/v)',
    flowRate: 1.0,
    columnTemperature: 35,
  },
  rosuvastatin_assay: {
    retentionTime: 8.12,
    wavelength: 242,
    column: 'USP L1 C18 (4.6 mm x 250 mm, 5 µm)',
    mobilePhase: 'Acetonitrile : 0.05 M Ammonium Acetate buffer pH 4.0 : THF (30:60:10 v/v)',
    flowRate: 1.2,
    columnTemperature: 35,
  },
  paracetamol_assay: {
    retentionTime: 3.50,
    wavelength: 243,
    column: 'USP L1 C18 column (4.6 mm x 150 mm, 5 µm)',
    mobilePhase: 'Methanol : Water (25:75 v/v)',
    flowRate: 1.0,
    columnTemperature: 25,
  },
};

/**
 * Banned generic phrases for Revision History "Reason for Change" when analytical parameters change
 */
export const BANNED_GENERIC_CHANGE_PHRASES = [
  'comprehensive document revision',
  'routine update',
  'general revision',
  'updated as per requirements',
  'document revision',
  'annual review',
  'general update',
  'periodic update',
  'routine method review',
  'updated document',
  'revised protocol',
  'revised report',
  'periodic review',
  'minor updates',
  'routine change',
  'administrative update',
];

/**
 * Normalizes text to extract drug identifier key
 */
export function getBaselineLookupKey(productName: string, validationMethod: string): string {
  const clean = (productName || '').toLowerCase().trim();
  let drug = 'generic';
  if (clean.includes('tibolone')) drug = 'tibolone';
  else if (clean.includes('pregabalin')) drug = 'pregabalin';
  else if (clean.includes('valproate')) drug = 'sodium_valproate';
  else if (clean.includes('paracetamol')) drug = 'paracetamol';
  else if (clean.includes('metformin')) drug = 'metformin';
  else if (clean.includes('acarbose')) drug = 'acarbose';
  else if (clean.includes('rosuvastatin')) drug = 'rosuvastatin';
  else if (clean.includes('atorvastatin')) drug = 'atorvastatin';
  else if (clean.includes('ibuprofen')) drug = 'ibuprofen';
  else if (clean.includes('ciprofloxacin')) drug = 'ciprofloxacin';
  else if (clean.includes('pantoprazole')) drug = 'pantoprazole';

  return `${drug}_${validationMethod}`;
}

/**
 * Extracts core chromatographic and method parameters from any AMV document data
 */
export function extractCoreMethodParameters(
  docData: any,
  validationMethod: 'dissolution' | 'related_substances' | 'assay'
): CoreMethodParameters {
  const chromConds =
    docData?.chromatographicConditions ||
    docData?.methodSummary?.chromatographicConditions ||
    docData?.hplcConditions ||
    {};

  let rt = 0;
  if (validationMethod === 'dissolution') {
    rt =
      Number(docData?.hplcConditions?.retentionTime) ||
      Number(chromConds?.retentionTime) ||
      Number(docData?.systemSuitability?.meanRt) ||
      Number(
        docData?.specificity?.solutionRows?.find((r: any) =>
          String(r.solutionName || '').toLowerCase().includes('standard')
        )?.retentionTime
      ) ||
      0;
  } else if (validationMethod === 'related_substances') {
    rt =
      Number(chromConds?.retentionTime) ||
      Number(docData?.systemSuitability?.retentionTime) ||
      0;
  } else {
    // Assay format
    const approxMatch = String(chromConds?.approxRetentionTime || '').match(/[\d.]+/);
    rt =
      Number(docData?.retentionTimeMin) ||
      Number(docData?.systemSuitability?.meanRt) ||
      (approxMatch ? parseFloat(approxMatch[0]) : 0) ||
      Number(docData?.hplcConditions?.retentionTime) ||
      0;
  }

  // Wavelength extraction
  let wl = 0;
  const rawWl =
    chromConds?.detectionWavelength ||
    chromConds?.detectorTempOrWavelength ||
    chromConds?.wavelength ||
    docData?.hplcConditions?.wavelength ||
    '';
  const wlMatch = String(rawWl).match(/\b(\d{3})\b/);
  if (wlMatch) {
    wl = parseInt(wlMatch[1], 10);
  }

  // Column extraction
  const column = String(chromConds?.column || docData?.hplcConditions?.column || '').trim();

  // Mobile Phase extraction
  const mobilePhase = String(
    chromConds?.mobilePhase ||
    chromConds?.carrierGasOrMobilePhase ||
    docData?.hplcConditions?.mobilePhase ||
    ''
  ).trim();

  // Flow rate extraction
  let flow = 0;
  const rawFlow =
    chromConds?.flowRate ||
    chromConds?.injectionTempOrFlowRate ||
    docData?.hplcConditions?.flowRate ||
    '';
  const flowMatch = String(rawFlow).match(/[\d.]+/);
  if (flowMatch) {
    flow = parseFloat(flowMatch[0]);
  }

  // Temperature extraction
  let temp = 25;
  const rawTemp =
    chromConds?.columnTemperature ||
    chromConds?.detectorTempOrWavelength ||
    docData?.hplcConditions?.columnTemperature ||
    '';
  const tempMatch = String(rawTemp).match(/(\d+(?:\.\d+)?)\s*°?C?/i);
  if (tempMatch) {
    temp = parseFloat(tempMatch[1]);
  }

  return {
    retentionTime: rt,
    wavelength: wl,
    column,
    mobilePhase,
    flowRate: flow,
    columnTemperature: temp,
  };
}

/**
 * Compares current parameters against baseline/previous version parameters
 * Emits diff items and flags any parameter exceeding defined thresholds
 */
export function compareCoreMethodParameters(
  current: CoreMethodParameters,
  baseline?: CoreMethodParameters
): MethodDiffItem[] {
  if (!baseline) return [];

  const diffs: MethodDiffItem[] = [];

  // 1. Retention Time (>5% difference is significant)
  if (baseline.retentionTime > 0 && current.retentionTime > 0) {
    const diff = Math.abs(current.retentionTime - baseline.retentionTime);
    const pct = (diff / baseline.retentionTime) * 100;
    if (pct > 5.0) {
      diffs.push({
        parameter: 'Retention Time',
        oldValue: `${baseline.retentionTime.toFixed(2)} min`,
        newValue: `${current.retentionTime.toFixed(2)} min`,
        percentChange: pct,
        isSignificant: true,
        thresholdDescription: `Changed by ${pct.toFixed(1)}% (exceeds 5.0% threshold)`,
      });
    }
  }

  // 2. Wavelength (>5 nm difference is significant)
  if (baseline.wavelength > 0 && current.wavelength > 0) {
    const diff = Math.abs(current.wavelength - baseline.wavelength);
    if (diff > 5) {
      diffs.push({
        parameter: 'Wavelength',
        oldValue: `${baseline.wavelength} nm`,
        newValue: `${current.wavelength} nm`,
        percentChange: (diff / baseline.wavelength) * 100,
        isSignificant: true,
        thresholdDescription: `Shifted by ${diff} nm (exceeds 5 nm threshold)`,
      });
    }
  }

  // 3. Column Packing / Dimensions change
  const normColCurrent = current.column.toLowerCase().replace(/[\s\-_]/g, '');
  const normColBase = baseline.column.toLowerCase().replace(/[\s\-_]/g, '');
  if (normColBase.length > 5 && normColCurrent.length > 5 && normColBase !== normColCurrent) {
    diffs.push({
      parameter: 'Column',
      oldValue: baseline.column,
      newValue: current.column,
      isSignificant: true,
      thresholdDescription: 'Stationary phase / dimensions altered',
    });
  }

  // 4. Mobile Phase composition change
  const normMpCurrent = current.mobilePhase.toLowerCase().replace(/[\s\-_]/g, '');
  const normMpBase = baseline.mobilePhase.toLowerCase().replace(/[\s\-_]/g, '');
  if (normMpBase.length > 5 && normMpCurrent.length > 5 && normMpBase !== normMpCurrent) {
    diffs.push({
      parameter: 'Mobile Phase',
      oldValue: baseline.mobilePhase,
      newValue: current.mobilePhase,
      isSignificant: true,
      thresholdDescription: 'Solvent composition or buffer ratio modified',
    });
  }

  // 5. Flow Rate (>5% change)
  if (baseline.flowRate > 0 && current.flowRate > 0) {
    const diff = Math.abs(current.flowRate - baseline.flowRate);
    const pct = (diff / baseline.flowRate) * 100;
    if (pct > 5.0) {
      diffs.push({
        parameter: 'Flow Rate',
        oldValue: `${baseline.flowRate.toFixed(2)} mL/min`,
        newValue: `${current.flowRate.toFixed(2)} mL/min`,
        percentChange: pct,
        isSignificant: true,
        thresholdDescription: `Altered by ${pct.toFixed(1)}% (exceeds 5.0% threshold)`,
      });
    }
  }

  // 6. Column Temperature (>2 °C change)
  if (baseline.columnTemperature > 0 && current.columnTemperature > 0) {
    const diff = Math.abs(current.columnTemperature - baseline.columnTemperature);
    if (diff > 2.0) {
      diffs.push({
        parameter: 'Column Temperature',
        oldValue: `${baseline.columnTemperature} °C`,
        newValue: `${current.columnTemperature} °C`,
        percentChange: (diff / baseline.columnTemperature) * 100,
        isSignificant: true,
        thresholdDescription: `Thermostating changed by ${diff.toFixed(1)} °C`,
      });
    }
  }

  return diffs;
}

/**
 * Validates whether a Revision History "Reason for Change" meets change control requirements
 * when major method parameters have changed
 */
export function validateRevisionReasonForMajorChanges(
  reasonText: string,
  significantDiffs: MethodDiffItem[]
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerReason = (reasonText || '').toLowerCase().trim();

  if (significantDiffs.length === 0) {
    return { isValid: true, issues: [] };
  }

  if (!lowerReason || lowerReason.length < 20) {
    issues.push('Reason for Change is missing or too brief (minimum 20 characters required).');
    return { isValid: false, issues };
  }

  // 1. Check for banned generic phrases without specific parameter justification
  for (const banned of BANNED_GENERIC_CHANGE_PHRASES) {
    if (lowerReason.startsWith(banned) || lowerReason === banned) {
      // Check if it merely ends after the generic phrase
      if (lowerReason.length < banned.length + 25) {
        issues.push(
          `Generic explanation ("${banned}") is not acceptable when core analytical parameters have been altered.`
        );
        break;
      }
    }
  }

  // 2. Check that at least one of the altered parameters is explicitly named in the reason
  const parameterKeywords: Record<string, string[]> = {
    'Retention Time': ['retention time', 'rt', 'elution time', 'peak retention'],
    Wavelength: ['wavelength', 'nm', 'detection wavelength', 'uv'],
    Column: ['column', 'stationary phase', 'dimension', 'packing', 'c18', 'ods'],
    'Mobile Phase': ['mobile phase', 'solvent', 'buffer', 'acetonitrile', 'methanol', 'ratio'],
    'Flow Rate': ['flow rate', 'flow', 'ml/min'],
    'Column Temperature': ['temperature', 'oven', 'thermostat', '°c'],
  };

  const explicitlyMentioned: string[] = [];
  for (const diff of significantDiffs) {
    const keywords = parameterKeywords[diff.parameter] || [diff.parameter.toLowerCase()];
    const isMentioned = keywords.some((kw) => lowerReason.includes(kw));
    if (isMentioned) {
      explicitlyMentioned.push(diff.parameter);
    }
  }

  if (explicitlyMentioned.length === 0) {
    const missingNames = significantDiffs.map((d) => d.parameter).join(', ');
    issues.push(
      `The altered parameter(s) (${missingNames}) must be explicitly named in the Revision History Reason for Change with a technical rationale.`
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Configuration Registry for Template-Aware RT Consistency Checking
 */
export interface TemplateRtSectionConfig {
  sectionKey: string;
  sectionTitle: string;
  extractRt: (docData: any) => { rt: number; label: string } | null;
}

export const TEMPLATE_RT_SECTIONS_REGISTRY: Record<
  'dissolution' | 'related_substances' | 'assay',
  TemplateRtSectionConfig[]
> = {
  dissolution: [
    {
      sectionKey: 'system_suitability',
      sectionTitle: 'System Suitability (Standard RT)',
      extractRt: (data) => {
        const rt =
          Number(data?.systemSuitability?.meanRt) ||
          Number(data?.systemSuitability?.rows?.[0]?.retentionTime) ||
          Number(data?.hplcConditions?.retentionTime);
        return rt > 0 ? { rt, label: 'System Suitability Standard' } : null;
      },
    },
    {
      sectionKey: 'specificity_solutions',
      sectionTitle: 'Specificity (Standard Solution RT)',
      extractRt: (data) => {
        const stdRow = data?.specificity?.solutionRows?.find((r: any) =>
          String(r.solutionName || '').toLowerCase().includes('standard')
        );
        const rt = Number(stdRow?.retentionTime);
        return rt > 0 ? { rt, label: 'Specificity Standard Solution' } : null;
      },
    },
    {
      sectionKey: 'specificity_sample',
      sectionTitle: 'Specificity (Finished Product Sample RT)',
      extractRt: (data) => {
        const sampleRow = data?.specificity?.solutionRows?.find(
          (r: any) =>
            String(r.solutionName || '').toLowerCase().includes('sample') ||
            String(r.solutionName || '').toLowerCase().includes('finished')
        );
        const rt = Number(sampleRow?.retentionTime);
        return rt > 0 ? { rt, label: 'Specificity Sample Solution' } : null;
      },
    },
    {
      sectionKey: 'specificity_stress',
      sectionTitle: 'Specificity (Forced Degradation Active RT)',
      extractRt: (data) => {
        if (!data?.includeForcedDegradation && (!data?.specificity?.stressRows || data.specificity.stressRows.length === 0)) {
          return null;
        }
        const stressRow = data?.specificity?.stressRows?.[0];
        const rt = Number(stressRow?.activeRtMin);
        return rt > 0 ? { rt, label: 'Specificity Forced Degradation' } : null;
      },
    },
    {
      sectionKey: 'robustness',
      sectionTitle: 'Robustness (Deliberate Variation Baseline RT)',
      extractRt: (data) => {
        const rows = data?.robustness?.rows;
        if (!rows || rows.length === 0) return null;
        const unmodified =
          rows.find(
            (r: any) =>
              String(r.parameter || '').toLowerCase().includes('unmodified') ||
              String(r.condition || '').toLowerCase().includes('unmodified') ||
              String(r.condition || '').toLowerCase().includes('nominal')
          ) || rows[0];
        const rt = Number(unmodified?.retentionTime);
        return rt > 0 ? { rt, label: 'Robustness Baseline' } : null;
      },
    },
  ],
  related_substances: [
    {
      sectionKey: 'system_suitability',
      sectionTitle: 'System Suitability (Active Analyte RT)',
      extractRt: (data) => {
        const rt =
          Number(data?.systemSuitability?.retentionTime) ||
          Number(data?.systemSuitability?.rows?.[0]?.retentionTime) ||
          Number(data?.hplcConditions?.retentionTime) ||
          Number(data?.methodSummary?.chromatographicConditions?.retentionTime);
        return rt > 0 ? { rt, label: 'RS System Suitability' } : null;
      },
    },
    {
      sectionKey: 'rrt_reference_table',
      sectionTitle: 'Chromatographic Conditions (Main Peak RT)',
      extractRt: (data) => {
        const rt =
          Number(data?.methodSummary?.chromatographicConditions?.retentionTime) ||
          Number(data?.impurities?.activeRt);
        return rt > 0 ? { rt, label: 'RS Main Analyte Peak' } : null;
      },
    },
    {
      sectionKey: 'solution_stability',
      sectionTitle: 'Solution Stability (Main Peak RT)',
      extractRt: (data) => {
        const initialRow = data?.solutionStability?.rows?.[0];
        const rt = Number(initialRow?.retentionTime);
        return rt > 0 ? { rt, label: 'RS Solution Stability Initial' } : null;
      },
    },
  ],
  assay: [
    {
      sectionKey: 'system_suitability',
      sectionTitle: 'System Suitability (Standard Replicate RT)',
      extractRt: (data) => {
        const rt =
          Number(data?.systemSuitability?.meanRt) ||
          Number(data?.systemSuitability?.rows?.[0]?.retentionTime) ||
          Number(data?.hplcConditions?.retentionTime);
        return rt > 0 ? { rt, label: 'Assay System Suitability' } : null;
      },
    },
    {
      sectionKey: 'specificity',
      sectionTitle: 'Specificity (Active Peak RT)',
      extractRt: (data) => {
        const stdRow = data?.specificity?.solutionRows?.find((r: any) =>
          String(r.solutionName || '').toLowerCase().includes('standard')
        );
        const rt = Number(stdRow?.retentionTime);
        return rt > 0 ? { rt, label: 'Assay Specificity Standard' } : null;
      },
    },
    {
      sectionKey: 'repeatability',
      sectionTitle: 'Method Precision / Repeatability (Assay Sample RT)',
      extractRt: (data) => {
        const firstRow = data?.repeatability?.rows?.[0];
        const rt = Number(firstRow?.retentionTime);
        return rt > 0 ? { rt, label: 'Assay Method Precision' } : null;
      },
    },
  ],
};
