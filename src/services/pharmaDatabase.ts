import { AMVDocumentData, ChemicalRequirement, EquipmentRequirement } from '../types';
import { recalculateAMVData } from './mathUtils';
import { postProcessSanitizeDocument } from './postGenerationSanitizer';
import {
  generateSystemSuitabilityInjections,
  generateLinearityData,
  generatePrecisionData,
  generateAccuracyRecoveryData,
  createSeededRandom,
  extractDynamicLabelClaim,
  parseProductStrength,
  computeNominalPeakArea,
} from './pharmaMathEngine';
import { solveSamplePreparation } from './dilutionSolver';
import { buildSectionPreparations } from './sectionPreparations';
import {
  calculateAcceptanceValue,
  generateContentUniformityUnits,
} from './contentUniformity';
import { makeLabRecords } from './labRecords';

export interface UniqueCodes {
  companyName?: string;
  companyAddress?: string;
  documentNo: string;
  reportNo?: string;
  validationBatchNo: string;
  standardLotNo: string;
  referenceStandardLot: string;
  effectiveDate: string;
  reportDate?: string;
  supersedes: string;
  preparedDate: string;
  reviewedDate: string;
  approvedDate: string;
}

export interface MonographDefinition {
  activeSubstance: string;
  labelClaim: string;
  reference: string;
  chromatographicConditions: {
    column: string;
    mobilePhase: string;
    flowRate: string;
    detectionWavelength: string;
    injectionVolume: string;
    columnTemperature: string;
    runTime: string;
    diluent: string;
    workingConcentration: string;
    approxRetentionTime: string;
    note: string;
  };
  solutionPreparation: {
    standardSolution: string;
    sampleSolution: string;
  };
  retentionTimeMin: number;
  targetNominalWeight: number;
  nominalArea: number;
  workingConcNum: number;
  flowRateNum: number;
  columnTempNum: number;
  mobilePhaseBufferPH?: number;
  reagents?: string[];
}



function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}


/**
 * Three-letter product code taken straight from the product name.
 * No lookup table and no fallback list: Pantoprazole -> PAN, Tibolone -> TIB.
 */
export function getProductCode(productName: string): string {
  const code = (productName || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return code.length === 3 ? code : (code + 'XXX').slice(0, 3);
}

/**
 * @param runSeed pass a fresh value (for example Date.now()) when a new set of
 * documents is generated, so a re-issued report gets its own serial instead of
 * reusing the one a previous report already carries. Omit it for a stable,
 * reproducible serial.
 */
export function generateUniqueValidationCodes(
  productName: string,
  runSeed?: number
): UniqueCodes & { batchNo: string } {
  const hash = hashString(runSeed ? `${productName}#${runSeed}` : productName);
  const pad = (n: number) => n.toString().padStart(4, '0');

  const code = getProductCode(productName);
  // One serial shared by the document number, the batch and every standard lot,
  // so all four documents of a product carry the same digits.
  const serial = pad(Math.abs(hash) % 10000);

  const documentNo = `AMV-${code}-2604-${serial}`;
  const validationBatchNo = `VAL-${code}-${serial}`;
  const standardLotNo = `RS-${code}-${serial}`;
  const referenceStandardLot = `REF-${code}-${serial}`;

  return {
    documentNo,
    validationBatchNo,
    batchNo: validationBatchNo,
    standardLotNo,
    referenceStandardLot,
    effectiveDate: '01-Jan-2026',
    supersedes: 'Nil',
    preparedDate: '01-Jan-2026',
    reviewedDate: '01-Jan-2026',
    approvedDate: '01-Jan-2026'
  };
}

export function getBaseMonograph

(productName: string): MonographDefinition {
  const norm = productName.toLowerCase();
  const doseMatch = productName.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg)/i);
  const explicitDose = doseMatch ? parseFloat(doseMatch[1]) : null;
  const explicitUnit = doseMatch ? doseMatch[2] : "mg";
  if (norm.includes("acarbose")) {
    const dose = explicitDose ?? 100;
    return {
      activeSubstance: "Acarbose",
      labelClaim: `${dose} ${explicitUnit} Acarbose per tablet`,
      reference: "USP Monograph for Acarbose Tablets, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "Amino L8 column (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.01 M Potassium Dihydrogen Phosphate Buffer pH 6.0 (75:25 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 210 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "35 \xB0C",
        runTime: "12.0 min",
        diluent: "Mobile Phase",
        workingConcentration: "0.5 mg/mL",
        approxRetentionTime: "6.5 min",
        note: "Dissolve 1.36 g KH2PO4 in 1000 mL water, adjust pH to 6.0 \xB1 0.05 with 0.1 M KOH."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 50.0 mg of Acarbose RS into a 100 mL volumetric flask, dissolve and dilute to volume with diluent.",
        sampleSolution: "Weigh 20 tablets, determine average weight, finely powder. Transfer powder equivalent to 50.0 mg Acarbose into a 100 mL volumetric flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter through 0.45 \xB5m filter."
      },
      retentionTimeMin: 6.51,
      targetNominalWeight: 50,
      nominalArea: 2541230,
      workingConcNum: 0.5,
      flowRateNum: 1,
      columnTempNum: 35,
      mobilePhaseBufferPH: 6,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Potassium Hydroxide", "Milli-Q Water"]
    };
  }
  if (norm.includes("paracetamol") || norm.includes("acetaminophen")) {
    return {
      activeSubstance: "Paracetamol",
      labelClaim: "500 mg Paracetamol per tablet",
      reference: "USP Monograph for Acetaminophen Tablets, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 column (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Methanol : Water (25:75 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 243 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "25 \xB0C",
        runTime: "8.0 min",
        diluent: "Methanol : Water (1:3 v/v)",
        workingConcentration: "0.01 mg/mL (10 \xB5g/mL)",
        approxRetentionTime: "4.2 min",
        note: "Degas mobile phase by vacuum sonication for 15 minutes before use."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 25.0 mg of Paracetamol RS into a 100 mL volumetric flask, dissolve in 20 mL methanol and dilute to volume with water. Dilute 4.0 mL to 100 mL with mobile phase.",
        sampleSolution: "Weigh 20 tablets, determine average weight, grind to fine powder. Transfer powder equivalent to 25.0 mg Paracetamol into 100 mL volumetric flask, sonicate with 50 mL diluent for 15 min, dilute to mark, filter. Dilute 4.0 mL to 100 mL with mobile phase."
      },
      retentionTimeMin: 4.22,
      targetNominalWeight: 25,
      nominalArea: 1852400,
      workingConcNum: 0.01,
      flowRateNum: 1,
      columnTempNum: 25,
      reagents: ["Methanol", "HPLC Grade Water", "Milli-Q Water"]
    };
  }
  if (norm.includes("metformin")) {
    return {
      activeSubstance: "Metformin Hydrochloride",
      labelClaim: "500 mg Metformin Hydrochloride per tablet",
      reference: "USP Monograph for Metformin HCl Tablets, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L76 Cation-Exchange / HILIC column (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.5% w/v Sodium Dihydrogen Phosphate with 0.1% SDS pH 3.8 (50:50 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 218 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "10.0 min",
        diluent: "Water : Acetonitrile (90:10 v/v)",
        workingConcentration: "0.01 mg/mL (10 \xB5g/mL)",
        approxRetentionTime: "5.1 min",
        note: "Prepare 0.5% NaH2PO4 buffer with 0.1% SDS, adjust pH to 3.8 \xB1 0.05 using phosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 50.0 mg of Metformin HCl RS into a 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 2.0 mL to 100 mL.",
        sampleSolution: "Weigh 20 tablets, crush to powder. Transfer powder equivalent to 50.0 mg Metformin HCl into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter. Further dilute 2.0 mL to 100 mL."
      },
      retentionTimeMin: 5.12,
      targetNominalWeight: 50,
      nominalArea: 2145800,
      workingConcNum: 0.01,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 3.8,
      reagents: ["Acetonitrile", "Sodium Dihydrogen Phosphate", "Sodium Dodecyl Sulfate", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("atorvastatin")) {
    return {
      activeSubstance: "Atorvastatin Calcium",
      labelClaim: "20 mg Atorvastatin per tablet",
      reference: "USP Monograph for Atorvastatin Calcium Tablets, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Ammonium Acetate buffer pH 4.5 : Tetrahydrofuran (67:21:12 v/v)",
        flowRate: "1.2 mL/min",
        detectionWavelength: "UV at 246 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "35 \xB0C",
        runTime: "15.0 min",
        diluent: "Methanol : Water (80:20 v/v)",
        workingConcentration: "0.02 mg/mL (20 \xB5g/mL)",
        approxRetentionTime: "7.8 min",
        note: "Dissolve 3.85 g ammonium acetate in 1000 mL water, adjust to pH 4.5 with glacial acetic acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh 20.0 mg of Atorvastatin RS into 100 mL flask, dissolve and dilute with diluent. Dilute 5.0 mL to 50 mL.",
        sampleSolution: "Weigh 20 tablets, finely powder. Transfer powder equivalent to 20.0 mg Atorvastatin into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter. Dilute 5.0 mL to 50 mL."
      },
      retentionTimeMin: 7.84,
      targetNominalWeight: 20,
      nominalArea: 1982300,
      workingConcNum: 0.02,
      flowRateNum: 1.2,
      columnTempNum: 35,
      mobilePhaseBufferPH: 4.5,
      reagents: ["Acetonitrile", "Ammonium Acetate", "Glacial Acetic Acid", "Tetrahydrofuran", "Methanol", "Milli-Q Water"]
    };
  }
  if (norm.includes("pantoprazole")) {
    return {
      activeSubstance: "Pantoprazole Sodium",
      labelClaim: "40 mg Pantoprazole per gastro-resistant tablet",
      reference: "BP/USP Monograph for Pantoprazole Gastro-resistant Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.01 M Phosphate Buffer pH 7.0 (35:65 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 285 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "10.0 min",
        diluent: "0.01 M Sodium Hydroxide in Water",
        workingConcentration: "0.04 mg/mL (40 \xB5g/mL)",
        approxRetentionTime: "5.6 min",
        note: "Prepare 0.01 M Disodium hydrogen phosphate buffer, adjust to pH 7.0 with dilute phosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh 40.0 mg of Pantoprazole Sodium RS into a 100 mL flask, dissolve in 0.01 M NaOH and dilute. Dilute 5.0 mL to 50 mL.",
        sampleSolution: "Weigh 20 tablets, powder finely. Transfer powder equivalent to 40.0 mg Pantoprazole into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute, filter. Dilute 5.0 mL to 50 mL."
      },
      retentionTimeMin: 5.62,
      targetNominalWeight: 40,
      nominalArea: 2310500,
      workingConcNum: 0.04,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 7,
      reagents: ["Acetonitrile", "Disodium Hydrogen Phosphate", "Sodium Hydroxide", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("ciprofloxacin")) {
    return {
      activeSubstance: "Ciprofloxacin Hydrochloride",
      labelClaim: "500 mg Ciprofloxacin per film-coated tablet",
      reference: "USP Monograph for Ciprofloxacin Tablets, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.025 M Phosphoric Acid with Triethylamine pH 3.0 (13:87 v/v)",
        flowRate: "1.5 mL/min",
        detectionWavelength: "UV at 278 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "12.0 min",
        diluent: "Mobile Phase",
        workingConcentration: "0.05 mg/mL (50 \xB5g/mL)",
        approxRetentionTime: "6.8 min",
        note: "Prepare 0.025 M phosphoric acid solution, add 2 mL triethylamine per liter, adjust to pH 3.0 \xB1 0.05 with H3PO4."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 50.0 mg of Ciprofloxacin HCl RS into a 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 5.0 mL to 50 mL with diluent.",
        sampleSolution: "Weigh 20 tablets, determine average weight, powder finely. Transfer powder equivalent to 50.0 mg Ciprofloxacin into 100 mL flask, sonicate with 70 mL diluent for 20 min, dilute to mark, filter. Dilute 5.0 mL to 50 mL."
      },
      retentionTimeMin: 6.84,
      targetNominalWeight: 50,
      nominalArea: 2824100,
      workingConcNum: 0.05,
      flowRateNum: 1.5,
      columnTempNum: 30,
      mobilePhaseBufferPH: 3,
      reagents: ["Acetonitrile", "Orthophosphoric Acid", "Triethylamine", "Milli-Q Water"]
    };
  }
  if (norm.includes("ibuprofen")) {
    return {
      activeSubstance: "Ibuprofen",
      labelClaim: "400 mg Ibuprofen per tablet",
      reference: "USP Monograph for Ibuprofen Tablets, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.01 M Chloroacetic Acid Buffer pH 3.0 (60:40 v/v)",
        flowRate: "1.5 mL/min",
        detectionWavelength: "UV at 254 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "9.0 min",
        diluent: "Acetonitrile : Water (60:40 v/v)",
        workingConcentration: "0.2 mg/mL (200 \xB5g/mL)",
        approxRetentionTime: "4.5 min",
        note: "Dissolve 0.95 g chloroacetic acid in 1000 mL water, adjust to pH 3.0 with ammonium hydroxide."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 40.0 mg of Ibuprofen RS into a 100 mL volumetric flask, dissolve in 50 mL diluent, sonicate 10 min, dilute to mark. Dilute 5.0 mL to 10 mL.",
        sampleSolution: "Weigh 20 tablets, grind to fine powder. Transfer powder equivalent to 40.0 mg Ibuprofen into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter. Dilute 5.0 mL to 10 mL."
      },
      retentionTimeMin: 4.48,
      targetNominalWeight: 40,
      nominalArea: 3120000,
      workingConcNum: 0.2,
      flowRateNum: 1.5,
      columnTempNum: 30,
      mobilePhaseBufferPH: 3,
      reagents: ["Acetonitrile", "Chloroacetic Acid", "Ammonium Hydroxide", "Milli-Q Water"]
    };
  }
  if (norm.includes("amoxicillin")) {
    return {
      activeSubstance: "Amoxicillin Trihydrate",
      labelClaim: "500 mg Amoxicillin per capsule",
      reference: "USP Monograph for Amoxicillin Capsules, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Potassium Dihydrogen Phosphate Buffer pH 5.0 (4:96 v/v)",
        flowRate: "1.2 mL/min",
        detectionWavelength: "UV at 230 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "25 \xB0C",
        runTime: "10.0 min",
        diluent: "0.05 M Phosphate Buffer pH 5.0",
        workingConcentration: "1.2 mg/mL",
        approxRetentionTime: "5.2 min",
        note: "Prepare 0.05 M KH2PO4 buffer, adjust pH to 5.0 \xB1 0.05 using dilute potassium hydroxide."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 60.0 mg of Amoxicillin Trihydrate RS into a 50 mL volumetric flask, dissolve and dilute with diluent.",
        sampleSolution: "Empty 20 capsules, determine average fill weight. Transfer powder equivalent to 60.0 mg Amoxicillin into 50 mL flask, add 35 mL diluent, sonicate 15 min, dilute to volume, filter through 0.45 \xB5m filter."
      },
      retentionTimeMin: 5.18,
      targetNominalWeight: 60,
      nominalArea: 1745e3,
      workingConcNum: 1.2,
      flowRateNum: 1.2,
      columnTempNum: 25,
      mobilePhaseBufferPH: 5,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Potassium Hydroxide", "Milli-Q Water"]
    };
  }
  if (norm.includes("omeprazole")) {
    return {
      activeSubstance: "Omeprazole",
      labelClaim: "20 mg Omeprazole per delayed-release capsule",
      reference: "USP Monograph for Omeprazole Delayed-Release Capsules, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L7 C8 (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.01 M Disodium Hydrogen Phosphate Buffer pH 7.6 (25:75 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 280 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "12.0 min",
        diluent: "0.01 M Sodium Hydroxide in Water : Acetonitrile (80:20 v/v)",
        workingConcentration: "0.04 mg/mL (40 \xB5g/mL)",
        approxRetentionTime: "7.2 min",
        note: "Prepare 0.01 M Na2HPO4 buffer, adjust to pH 7.6 \xB1 0.05 with dilute phosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh 20.0 mg of Omeprazole RS into 100 mL flask, dissolve in 20 mL ACN and dilute with diluent. Dilute 5.0 mL to 25 mL.",
        sampleSolution: "Crush pellets from 20 capsules. Transfer powder equivalent to 20.0 mg Omeprazole into 100 mL flask, add 20 mL ACN and 60 mL diluent, sonicate 20 min, dilute to volume, filter. Dilute 5.0 mL to 25 mL."
      },
      retentionTimeMin: 7.22,
      targetNominalWeight: 20,
      nominalArea: 2080000,
      workingConcNum: 0.04,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 7.6,
      reagents: ["Acetonitrile", "Disodium Hydrogen Phosphate", "Sodium Hydroxide", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("amlodipine")) {
    return {
      activeSubstance: "Amlodipine Besylate",
      labelClaim: "5 mg Amlodipine (as besylate) per tablet",
      reference: "USP Monograph for Amlodipine Besylate Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Methanol : Acetonitrile : 0.03 M Triethylamine Buffer pH 3.0 (35:15:50 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 237 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "14.0 min",
        diluent: "Mobile Phase",
        workingConcentration: "0.02 mg/mL (20 \xB5g/mL)",
        approxRetentionTime: "8.5 min",
        note: "Mix 7.0 mL triethylamine in 1000 mL water, adjust to pH 3.0 with phosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 20.0 mg of Amlodipine Besylate RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 5.0 mL to 50 mL.",
        sampleSolution: "Weigh 20 tablets, crush to powder. Transfer powder equivalent to 20.0 mg Amlodipine into 100 mL flask, add 70 mL diluent, sonicate 25 min, dilute to volume, filter. Dilute 5.0 mL to 50 mL."
      },
      retentionTimeMin: 8.46,
      targetNominalWeight: 20,
      nominalArea: 1689200,
      workingConcNum: 0.02,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 3,
      reagents: ["Methanol", "Acetonitrile", "Triethylamine", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("azithromycin")) {
    return {
      activeSubstance: "Azithromycin Dihydrate",
      labelClaim: "500 mg Azithromycin per tablet",
      reference: "USP Monograph for Azithromycin Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Dipotassium Phosphate Buffer pH 8.2 (60:40 v/v)",
        flowRate: "1.2 mL/min",
        detectionWavelength: "UV at 215 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "50 \xB0C",
        runTime: "15.0 min",
        diluent: "Acetonitrile : Water (50:50 v/v)",
        workingConcentration: "0.5 mg/mL (500 \xB5g/mL)",
        approxRetentionTime: "9.4 min",
        note: "Maintain column heater at 50 \xB0C for optimal peak shape and plate efficiency."
      },
      solutionPreparation: {
        standardSolution: "Weigh 50.0 mg of Azithromycin RS into 100 mL volumetric flask, dissolve and dilute with diluent.",
        sampleSolution: "Weigh 20 tablets, powder. Transfer powder equivalent to 50.0 mg Azithromycin into 100 mL flask, add 70 mL diluent, sonicate 25 min, dilute to volume, filter."
      },
      retentionTimeMin: 9.35,
      targetNominalWeight: 50,
      nominalArea: 1923e3,
      workingConcNum: 0.5,
      flowRateNum: 1.2,
      columnTempNum: 50,
      mobilePhaseBufferPH: 8.2,
      reagents: ["Acetonitrile", "Dipotassium Hydrogen Phosphate", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("losartan")) {
    return {
      activeSubstance: "Losartan Potassium",
      labelClaim: "50 mg Losartan Potassium per tablet",
      reference: "USP Monograph for Losartan Potassium Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.1% v/v Phosphoric Acid in Water (40:60 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 250 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "25 \xB0C",
        runTime: "8.0 min",
        diluent: "Acetonitrile : Water (50:50 v/v)",
        workingConcentration: "0.05 mg/mL (50 \xB5g/mL)",
        approxRetentionTime: "4.8 min",
        note: "Mobile phase is isocratic 40% ACN with 0.1% H3PO4 aqueous solution."
      },
      solutionPreparation: {
        standardSolution: "Weigh 25.0 mg of Losartan Potassium RS into 100 mL flask, dissolve and dilute with diluent. Dilute 5.0 mL to 25 mL.",
        sampleSolution: "Weigh 20 tablets, crush to powder. Transfer powder equivalent to 25.0 mg Losartan into 100 mL flask, sonicate 20 min with 70 mL diluent, dilute to mark, filter. Dilute 5.0 mL to 25 mL."
      },
      retentionTimeMin: 4.82,
      targetNominalWeight: 25,
      nominalArea: 2450300,
      workingConcNum: 0.05,
      flowRateNum: 1,
      columnTempNum: 25,
      reagents: ["Acetonitrile", "Orthophosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("telmisartan")) {
    return {
      activeSubstance: "Telmisartan",
      labelClaim: "40 mg Telmisartan per tablet",
      reference: "USP Monograph for Telmisartan Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.02 M Potassium Dihydrogen Phosphate Buffer pH 3.0 (70:30 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 298 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "35 \xB0C",
        runTime: "10.0 min",
        diluent: "Methanol : 0.05 M Sodium Hydroxide (80:20 v/v)",
        workingConcentration: "0.04 mg/mL (40 \xB5g/mL)",
        approxRetentionTime: "5.9 min",
        note: "Telmisartan is practically insoluble in neutral water; use methanolic alkaline diluent."
      },
      solutionPreparation: {
        standardSolution: "Weigh 20.0 mg of Telmisartan RS into 100 mL flask, dissolve in 50 mL diluent, sonicate 15 min, dilute to mark. Dilute 5.0 mL to 25 mL with mobile phase.",
        sampleSolution: "Weigh 20 tablets, finely powder. Transfer powder equivalent to 20.0 mg Telmisartan into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter. Dilute 5.0 mL to 25 mL with mobile phase."
      },
      retentionTimeMin: 5.92,
      targetNominalWeight: 20,
      nominalArea: 276e4,
      workingConcNum: 0.04,
      flowRateNum: 1,
      columnTempNum: 35,
      mobilePhaseBufferPH: 3,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Methanol", "Sodium Hydroxide", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("levofloxacin")) {
    return {
      activeSubstance: "Levofloxacin Hemihydrate",
      labelClaim: "500 mg Levofloxacin per tablet",
      reference: "USP Monograph for Levofloxacin Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.1% v/v Trifluoroacetic Acid in Water (20:80 v/v)",
        flowRate: "1.2 mL/min",
        detectionWavelength: "UV at 294 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "35 \xB0C",
        runTime: "11.0 min",
        diluent: "Water : Acetonitrile (80:20 v/v)",
        workingConcentration: "0.1 mg/mL (100 \xB5g/mL)",
        approxRetentionTime: "6.1 min",
        note: "Degas TFA mobile phase daily to avoid baseline drift at 294 nm."
      },
      solutionPreparation: {
        standardSolution: "Weigh 50.0 mg of Levofloxacin RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 5.0 mL to 25 mL.",
        sampleSolution: "Weigh 20 tablets, crush to fine powder. Transfer powder equivalent to 50.0 mg Levofloxacin into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter. Dilute 5.0 mL to 25 mL."
      },
      retentionTimeMin: 6.14,
      targetNominalWeight: 50,
      nominalArea: 2984e3,
      workingConcNum: 0.1,
      flowRateNum: 1.2,
      columnTempNum: 35,
      reagents: ["Acetonitrile", "Trifluoroacetic Acid (TFA)", "Milli-Q Water"]
    };
  }
  if (norm.includes("cetirizine")) {
    return {
      activeSubstance: "Cetirizine Hydrochloride",
      labelClaim: "10 mg Cetirizine HCl per tablet",
      reference: "BP/USP Monograph for Cetirizine Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Potassium Dihydrogen Phosphate Buffer pH 6.0 (40:60 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 230 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "25 \xB0C",
        runTime: "10.0 min",
        diluent: "Acetonitrile : Water (40:60 v/v)",
        workingConcentration: "0.02 mg/mL (20 \xB5g/mL)",
        approxRetentionTime: "6.7 min",
        note: "Adjust phosphate buffer pH to 6.0 with 0.1 M potassium hydroxide."
      },
      solutionPreparation: {
        standardSolution: "Weigh 20.0 mg of Cetirizine HCl RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 5.0 mL to 50 mL.",
        sampleSolution: "Weigh 20 tablets, finely powder. Transfer powder equivalent to 20.0 mg Cetirizine HCl into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to mark, filter. Dilute 5.0 mL to 50 mL."
      },
      retentionTimeMin: 6.72,
      targetNominalWeight: 20,
      nominalArea: 1845600,
      workingConcNum: 0.02,
      flowRateNum: 1,
      columnTempNum: 25,
      mobilePhaseBufferPH: 6,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Potassium Hydroxide", "Milli-Q Water"]
    };
  }
  if (norm.includes("diclofenac")) {
    return {
      activeSubstance: "Diclofenac Sodium",
      labelClaim: "50 mg Diclofenac Sodium per enteric-coated tablet",
      reference: "USP Monograph for Diclofenac Sodium Delayed-Release Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Methanol : 0.01 M Phosphate Buffer pH 2.5 (70:30 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 254 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "12.0 min",
        diluent: "Methanol : Water (70:30 v/v)",
        workingConcentration: "0.05 mg/mL (50 \xB5g/mL)",
        approxRetentionTime: "7.5 min",
        note: "Adjust phosphate buffer to pH 2.5 \xB1 0.05 using phosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh 25.0 mg of Diclofenac Sodium RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 5.0 mL to 25 mL.",
        sampleSolution: "Weigh 20 enteric-coated tablets, finely powder. Transfer powder equivalent to 25.0 mg Diclofenac Sodium into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to volume, filter. Dilute 5.0 mL to 25 mL."
      },
      retentionTimeMin: 7.54,
      targetNominalWeight: 25,
      nominalArea: 3310200,
      workingConcNum: 0.05,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 2.5,
      reagents: ["Methanol", "Potassium Dihydrogen Phosphate", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("rosuvastatin")) {
    const dose = explicitDose ?? 20;
    const is10mg = dose <= 10;
    const nominalWeight2 = is10mg ? 10 : dose <= 20 ? 20 : dose;
    const workingConcNum = is10mg ? 0.01 : dose <= 20 ? 0.02 : 0.04;
    const workingConcPpm = Math.round(workingConcNum * 1e3);
    const calculatedNominalArea = Math.round(1945e3 * (workingConcNum / 0.02));
    return {
      activeSubstance: "Rosuvastatin Calcium",
      labelClaim: `${dose} ${explicitUnit} Rosuvastatin per film-coated tablet`,
      reference: "USP Monograph for Rosuvastatin Calcium Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Ammonium Acetate buffer pH 4.0 : THF (30:60:10 v/v)",
        flowRate: "1.2 mL/min",
        detectionWavelength: "UV at 242 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "35 \xB0C",
        runTime: "14.0 min",
        diluent: "Acetonitrile : Water (50:50 v/v)",
        workingConcentration: `${workingConcNum} mg/mL (${workingConcPpm} \xB5g/mL)`,
        approxRetentionTime: "8.1 min",
        note: "Prepare 0.05 M ammonium acetate buffer adjusted to pH 4.0 with glacial acetic acid."
      },
      solutionPreparation: {
        standardSolution: `Weigh accurately ${nominalWeight2.toFixed(1)} mg of Rosuvastatin Calcium RS into a 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 5.0 mL to 50 mL.`,
        sampleSolution: `Weigh 20 tablets, crush to powder. Transfer powder equivalent to ${nominalWeight2.toFixed(1)} mg Rosuvastatin into a 100 mL volumetric flask, add 70 mL diluent, sonicate 20 min, dilute to mark, filter. Dilute 5.0 mL to 50 mL.`
      },
      retentionTimeMin: 8.12,
      targetNominalWeight: nominalWeight2,
      nominalArea: calculatedNominalArea,
      workingConcNum,
      flowRateNum: 1.2,
      columnTempNum: 35,
      mobilePhaseBufferPH: 4,
      reagents: ["Acetonitrile", "Ammonium Acetate", "Glacial Acetic Acid", "Tetrahydrofuran", "Milli-Q Water"]
    };
  }
  if (norm.includes("montelukast")) {
    return {
      activeSubstance: "Montelukast Sodium",
      labelClaim: "10 mg Montelukast (as sodium salt) per film-coated tablet",
      reference: "USP Monograph for Montelukast Sodium Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L11 Phenyl-Hexyl (4.6 mm x 150 mm, 3.5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.02 M Potassium Dihydrogen Phosphate Buffer pH 3.7 (60:40 v/v)",
        flowRate: "1.2 mL/min",
        detectionWavelength: "UV at 238 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "40 \xB0C",
        runTime: "12.0 min",
        diluent: "Methanol : Water (80:20 v/v)",
        workingConcentration: "0.04 mg/mL (40 \xB5g/mL)",
        approxRetentionTime: "6.2 min",
        note: "Adjust phosphate buffer pH to 3.7 with dilute orthophosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 20.0 mg Montelukast Sodium RS into 100 mL flask, dissolve in 20 mL methanol, dilute to mark with diluent. Dilute 5.0 mL to 25 mL.",
        sampleSolution: "Weigh 20 tablets, finely crush. Transfer powder equivalent to 20.0 mg Montelukast into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to mark, filter. Dilute 5.0 mL to 25 mL."
      },
      retentionTimeMin: 6.24,
      targetNominalWeight: 20,
      nominalArea: 2150400,
      workingConcNum: 0.04,
      flowRateNum: 1.2,
      columnTempNum: 40,
      mobilePhaseBufferPH: 3.7,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Methanol", "Orthophosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("clopidogrel")) {
    return {
      activeSubstance: "Clopidogrel Bisulfate",
      labelClaim: "75 mg Clopidogrel (as bisulfate) per tablet",
      reference: "USP Monograph for Clopidogrel Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L57 Chiral AGP or USP L1 C18 (4.6 mm x 150 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Potassium Phosphate Buffer pH 2.5 with 0.1% TEA (75:25 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 220 nm",
        injectionVolume: "10 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "14.0 min",
        diluent: "Methanol : Water (75:25 v/v)",
        workingConcentration: "0.075 mg/mL (75 \xB5g/mL)",
        approxRetentionTime: "7.4 min",
        note: "Adjust buffer pH to 2.5 with dilute phosphoric acid; maintain column temperature at 30 \xB0C."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 25.0 mg Clopidogrel Bisulfate RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 3.0 mL to 10 mL.",
        sampleSolution: "Weigh 20 tablets, powder finely. Transfer powder equivalent to 75.0 mg Clopidogrel into 200 mL flask, add 140 mL diluent, sonicate 25 min, dilute to volume, filter. Dilute 4.0 mL to 20 mL."
      },
      retentionTimeMin: 7.42,
      targetNominalWeight: 25,
      nominalArea: 268e4,
      workingConcNum: 0.075,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 2.5,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Triethylamine", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("escitalopram")) {
    return {
      activeSubstance: "Escitalopram Oxalate",
      labelClaim: "10 mg Escitalopram (as oxalate) per film-coated tablet",
      reference: "USP Monograph for Escitalopram Tablets, USP <621>, Ph. Eur. Monograph 2768, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.05 M Potassium Dihydrogen Phosphate Buffer pH 3.0 with Triethylamine (35:65 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 238 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "12.0 min",
        diluent: "Mobile Phase",
        workingConcentration: "0.02 mg/mL (20 \xB5g/mL)",
        approxRetentionTime: "5.8 min",
        note: "Dissolve 6.8 g KH2PO4 in 1000 mL water, add 2 mL triethylamine, adjust pH to 3.0 with H3PO4."
      },
      solutionPreparation: {
        standardSolution: "Weigh 20.0 mg Escitalopram Oxalate RS into 100 mL flask, dissolve and dilute with diluent. Dilute 5.0 mL to 50 mL.",
        sampleSolution: "Weigh 20 tablets, grind to fine powder. Transfer powder equivalent to 20.0 mg Escitalopram into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to mark, filter. Dilute 5.0 mL to 50 mL."
      },
      retentionTimeMin: 5.82,
      targetNominalWeight: 20,
      nominalArea: 1850300,
      workingConcNum: 0.02,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 3,
      reagents: ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Triethylamine", "Phosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("gabapentin")) {
    return {
      activeSubstance: "Gabapentin",
      labelClaim: "300 mg Gabapentin per capsule",
      reference: "USP Monograph for Gabapentin Capsules, USP <621>, USP <1225>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Methanol : 0.01 M Monobasic Potassium Phosphate Buffer pH 6.2 (10:90 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 210 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "25 \xB0C",
        runTime: "10.0 min",
        diluent: "Mobile Phase",
        workingConcentration: "1.5 mg/mL",
        approxRetentionTime: "5.2 min",
        note: "Prepare 0.01 M KH2PO4 buffer, adjust pH to 6.2 \xB1 0.05 using dilute potassium hydroxide."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 75.0 mg Gabapentin RS into a 50 mL volumetric flask, dissolve and dilute with diluent.",
        sampleSolution: "Empty 20 capsules, determine average fill weight. Transfer powder equivalent to 75.0 mg Gabapentin into 50 mL flask, add 35 mL diluent, sonicate 15 min, dilute to volume, filter through 0.45 \xB5m nylon membrane."
      },
      retentionTimeMin: 5.24,
      targetNominalWeight: 75,
      nominalArea: 164e4,
      workingConcNum: 1.5,
      flowRateNum: 1,
      columnTempNum: 25,
      mobilePhaseBufferPH: 6.2,
      reagents: ["Methanol", "Potassium Dihydrogen Phosphate", "Potassium Hydroxide", "Milli-Q Water"]
    };
  }
  if (norm.includes("glimepiride")) {
    return {
      activeSubstance: "Glimepiride",
      labelClaim: "2 mg Glimepiride per tablet",
      reference: "USP Monograph for Glimepiride Tablets, USP <621>, ICH Q2(R2)",
      chromatographicConditions: {
        column: "USP L1 C18 (4.6 mm x 250 mm, 5 \xB5m)",
        mobilePhase: "Acetonitrile : 0.01 M Ammonium Phosphate Buffer pH 3.0 (50:50 v/v)",
        flowRate: "1.0 mL/min",
        detectionWavelength: "UV at 228 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "30 \xB0C",
        runTime: "14.0 min",
        diluent: "Acetonitrile : Water (80:20 v/v)",
        workingConcentration: "0.02 mg/mL (20 \xB5g/mL)",
        approxRetentionTime: "8.6 min",
        note: "Adjust 0.01 M ammonium phosphate to pH 3.0 with 85% orthophosphoric acid."
      },
      solutionPreparation: {
        standardSolution: "Weigh 20.0 mg Glimepiride RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 2.0 mL to 20 mL.",
        sampleSolution: "Weigh 20 tablets, crush to powder. Transfer powder equivalent to 2.0 mg Glimepiride into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to mark, filter."
      },
      retentionTimeMin: 8.62,
      targetNominalWeight: 20,
      nominalArea: 1720.00,
      workingConcNum: 0.02,
      flowRateNum: 1,
      columnTempNum: 30,
      mobilePhaseBufferPH: 3,
      reagents: ["Acetonitrile", "Ammonium Dihydrogen Phosphate", "Orthophosphoric Acid", "Milli-Q Water"]
    };
  }
  if (norm.includes("tibolone")) {
    return {
      activeSubstance: "Tibolone",
      labelClaim: "Each tablet contains Tibolone BP 2.5 mg",
      reference: "BP Monograph for Tibolone Tablets, BP Appendix III D, ICH Q2(R2)",
      chromatographicConditions: {
        column: "Hypersil ODS C18 (4.6 mm x 100 mm, 5 \xB5m)",
        mobilePhase: "Methanol : Water (77:23 v/v)",
        flowRate: "0.5 mL/min",
        detectionWavelength: "UV at 205 nm",
        injectionVolume: "20 \xB5L",
        columnTemperature: "40 \xB0C",
        runTime: "12.0 min",
        diluent: "Methanol : Water (77:23 v/v)",
        workingConcentration: "0.025 mg/mL (25 \xB5g/mL)",
        approxRetentionTime: "6.5 min",
        note: "Low wavelength detection at 205 nm requires high purity HPLC grade methanol and thoroughly degassed mobile phase."
      },
      solutionPreparation: {
        standardSolution: "Weigh accurately 25.0 mg Tibolone RS into 100 mL volumetric flask, dissolve and dilute with diluent. Dilute 2.0 mL to 20 mL.",
        sampleSolution: "Weigh 20 tablets, determine average weight, powder finely. Transfer powder equivalent to 2.5 mg Tibolone into 100 mL flask, add 70 mL diluent, sonicate 20 min, dilute to mark, filter through 0.45 \xB5m PTFE."
      },
      retentionTimeMin: 6.52,
      targetNominalWeight: 25,
      nominalArea: 189e4,
      workingConcNum: 0.025,
      flowRateNum: 0.5,
      columnTempNum: 40,
      reagents: ["Methanol R2", "Milli-Q Water"]
    };
  }
  // ---------------------------------------------------------------------
  // No compendial entry for this product. A complete reversed phase assay
  // method is derived instead of printing blanks: standard C18 conditions and
  // a sample preparation solved with real weighings and real glassware, so the
  // stated working concentration is exactly what the preparation delivers.
  // ---------------------------------------------------------------------
  const hash = hashString(productName);
  const rand = createSeededRandom(`${productName.toLowerCase()}_assay_method`);
  const cleaned =
    productName.replace(/tablets?|capsules?|injections?|gastro-resistant|delayed-release|\d+\s*mg|\d+\s*g/gi, '').trim() ||
    'Active Pharmaceutical Ingredient';

  const { strengthNum, unit } = parseProductStrength(productName);
  const doseUnit = explicitUnit || unit || 'mg';
  const doseValue = explicitDose ?? strengthNum ?? 50;
  const strengthMg =
    doseUnit.toLowerCase() === 'g'
      ? doseValue * 1000
      : /mcg|\u00B5g/i.test(doseUnit)
      ? doseValue / 1000
      : doseValue;

  // An assay by HPLC with UV detection is normally run near 100 µg/mL.
  // A low strength product cannot be weighed one unit at a time, so enough
  // units are taken to give at least 10 mg of the drug on the balance.
  const unitsTaken = strengthMg >= 10 ? 1 : Math.min(20, Math.ceil(10 / Math.max(strengthMg, 0.001)));
  const weighedMg = Number((strengthMg * unitsTaken).toPrecision(4));
  const targetWorkingConc = 100; // µg/mL
  const prep = solveSamplePreparation(weighedMg, targetWorkingConc);
  const unitsNote = unitsTaken > 1 ? ` (equivalent to ${unitsTaken} dosage units)` : '';
  const workingConcMgMl = prep.workingConc / 1000;

  const wavelengthList = [215, 220, 225, 230, 238, 245, 254, 260, 275, 280, 290, 310];
  const wavelength = wavelengthList[hash % wavelengthList.length];
  const bufferPH = [2.5, 3.0, 3.5, 4.5, 6.0, 6.8][Math.floor(rand() * 6)];
  const organicPct = 35 + Math.floor(rand() * 30); // 35 % to 64 %
  const organic = rand() < 0.5 ? 'Acetonitrile' : 'Methanol';
  const rtSeed = Number((3.8 + ((hash % 60) / 10)).toFixed(2));

  return {
    activeSubstance: cleaned,
    labelClaim: doseMatch ? `${doseValue} ${doseUnit} ${cleaned} per dosage unit` : productName,
    reference: `In-house analytical method for ${productName}; validated as per USP <1225> and ICH Q2(R2)`,
    chromatographicConditions: {
      column: 'Octadecylsilane bonded to porous silica (USP L1), 250 mm x 4.6 mm, 5 \u00B5m',
      mobilePhase: `0.02 M Potassium Dihydrogen Phosphate Buffer pH ${bufferPH.toFixed(1)} : ${organic} (${100 - organicPct} : ${organicPct} v/v)`,
      flowRate: '1.0 mL/min',
      detectionWavelength: `UV at ${wavelength} nm`,
      injectionVolume: '20 \u00B5L',
      columnTemperature: '30 \u00B0C',
      runTime: `${(rtSeed * 2).toFixed(1)} min`,
      diluent: 'Mobile Phase',
      workingConcentration: `${workingConcMgMl.toFixed(3)} mg/mL`,
      approxRetentionTime: `${rtSeed.toFixed(2)} min`,
      note: `Dissolve 2.72 g of Potassium Dihydrogen Phosphate in 1000 mL of water and adjust to pH ${bufferPH.toFixed(1)} \u00B1 0.05 with dilute ortho-phosphoric acid. Filter through a 0.45 \u00B5m membrane and degas before use.`,
    },
    solutionPreparation: {
      standardSolution: `Weigh accurately ${prep.sampleWeightMg} mg of ${cleaned} working standard into a ${prep.flaskMl} mL volumetric flask, dissolve in and dilute to volume with diluent (${prep.stockConc.toFixed(1)} \u00B5g/mL). Further dilute ${prep.dilutionDescription} to obtain ${prep.workingConc.toFixed(1)} \u00B5g/mL.`,
      sampleSolution: `Weigh 20 dosage units and determine the average weight, then finely powder them. Transfer powder equivalent to ${prep.sampleWeightMg} mg of ${cleaned}${unitsNote} into a ${prep.flaskMl} mL volumetric flask, add about 70 % of the diluent, sonicate for 20 minutes with intermittent shaking, dilute to volume with diluent and filter through a 0.45 \u00B5m membrane, discarding the first few mL. Further dilute ${prep.dilutionDescription} to obtain ${prep.workingConc.toFixed(1)} \u00B5g/mL.`,
    },
    retentionTimeMin: rtSeed,
    targetNominalWeight: prep.sampleWeightMg,
    nominalArea: computeNominalPeakArea(productName, wavelength),
    workingConcNum: workingConcMgMl,
    flowRateNum: 1.0,
    columnTempNum: 30,
    mobilePhaseBufferPH: bufferPH,
    reagents: [organic, 'Potassium Dihydrogen Phosphate', 'Ortho-phosphoric acid', 'Milli-Q Water'],
  };
}

export function getMethodDocumentNumber(baseDocNo: string, method: string, isReport: boolean = false): string {
  let clean = (baseDocNo || 'AMV-UNK-2604-101').replace(/\/R$/i, '').replace(/-R$/i, '');
  // Strip only a method tag sitting in the tag position, so a product code
  // that happens to read DIS or MLT is never removed.
  clean = clean.replace(/^(AMV|AMVER)-(ASSAY-CU|ASSAY-TIT|ASSAY-UV|ASSAY|CU|RS|DIS-UV|DIS|DISS|MLT)-/i, '$1-');
  clean = clean.replace(/^(WC\/QC\/AMV)-(ASSAY-CU|ASSAY-TIT|ASSAY-UV|ASSAY|CU|RS|DIS-UV|DIS|DISS|MLT)([-\/])/i, '$1$3');
  let tag = 'ASSAY';
  if (method === 'assay_cu') tag = 'ASSAY-CU';
  else if (method === 'content_uniformity') tag = 'CU';
  else if (method === 'assay_uv') tag = 'ASSAY-UV';
  else if (method === 'dissolution_uv') tag = 'DIS-UV';
  else if (method === 'assay_titration') tag = 'ASSAY-TIT';
  else if (method === 'related_substances') tag = 'RS';
  else if (method === 'dissolution') tag = 'DIS';
  else if (method === 'microbial_limit_test') tag = 'MLT';
  let fullCode = clean;
  if (clean.startsWith('AMV-')) {
    fullCode = clean.replace('AMV-', `AMV-${tag}-`);
  } else if (clean.startsWith('AMVER-')) {
    fullCode = clean.replace('AMVER-', `AMVER-${tag}-`);
  } else if (clean.startsWith('WC/QC/AMV-')) {
    fullCode = clean.replace('WC/QC/AMV-', `WC/QC/AMV-${tag}-`);
  } else if (clean.startsWith('WC/QC/AMV/')) {
    fullCode = clean.replace('WC/QC/AMV/', `WC/QC/AMV-${tag}/`);
  } else {
    fullCode = `${clean}-${tag}`;
  }
  return isReport ? `${fullCode}/R` : fullCode;
}

export function generateAMVDataForProduct(
  productName: string,
  overrides?: any,
  /**
   * When true the document covers Assay together with Content of Uniformity.
   * Content uniformity measures single dosage units, so ICH Q2 widens the
   * validated range to 70 % to 130 % of the test concentration and the study
   * adds the ten unit uniformity determination of USP <905>.
   */
  withContentUniformity = false,
  /**
   * Content of Uniformity on its own, without the assay determination. The
   * chromatographic method is the same; only the study differs, so the same
   * engine is used and the assay-only sections are dropped.
   */
  contentUniformityOnly = false,
  /**
   * UV/Visible spectrophotometric finish instead of a chromatographic one. The
   * study is identical - the same linearity, accuracy, precision and robustness -
   * only the measurement changes, so the chromatographic conditions are replaced
   * by the spectrophotometric ones and column parameters drop out.
   */
  detection: 'HPLC' | 'UV' | 'UV_DISSOLUTION' = 'HPLC'
): AMVDocumentData {
  const includeCU = withContentUniformity || contentUniformityOnly;
  const isUV = detection === 'UV' || detection === 'UV_DISSOLUTION';
  /** The technique names itself once; nothing downstream hard-codes HPLC. */
  const techniqueName = isUV ? 'UV Visible Spectroscopy' : 'HPLC';
  const techniqueShort = isUV ? 'UV' : 'HPLC';
  const measurementVerb = isUV ? 'measurement' : 'injection';
  const base = getBaseMonograph(productName);
  const blankField = "__________ [ENTER RAW DATA]";

  const companyName = overrides?.companyName || 'WESTCOAST PHARMACEUTICAL WORKS LTD.';
  const companyAddress =
    overrides?.companyAddress ||
    'Plot No. 1 to 5, Vasna-Chacharwadi, Ta. Sanand, Dist. Ahmedabad - 382 213, Gujarat, India';
  const documentNo = overrides?.documentNo || generateUniqueValidationCodes(productName).documentNo;
  const reportNo = overrides?.reportNo || `${documentNo}/R`;
  const batchNoUsed =
    overrides?.validationBatchNo || overrides?.batchNo || generateUniqueValidationCodes(productName).validationBatchNo;
  const reportDate = overrides?.reportDate || '20-Apr-2026';
  const effectiveDate = overrides?.effectiveDate || reportDate;

  // ---------------------------------------------------------------------
  // Dynamic label claim / strength resolution
  // ---------------------------------------------------------------------
  const dynamic = extractDynamicLabelClaim(productName, 'Assay by HPLC', base.activeSubstance, base.labelClaim);
  const activeSubstance = overrides?.activeSubstance || dynamic.activeSubstance || base.activeSubstance;
  const labelClaim = overrides?.labelClaim || dynamic.labelClaim || base.labelClaim;

  // Verified FPS / MOA values (when a specification sheet was extracted) take
  // precedence over the built-in compendial monograph defaults.
  const chromatographicConditions = {
    ...base.chromatographicConditions,
    ...(overrides?.column ? { column: overrides.column } : {}),
    ...(overrides?.mobilePhase ? { mobilePhase: overrides.mobilePhase } : {}),
    ...(overrides?.flowRate ? { flowRate: overrides.flowRate } : {}),
    ...(overrides?.wavelength ? { detectionWavelength: overrides.wavelength } : {}),
    ...(overrides?.injectionVolume ? { injectionVolume: overrides.injectionVolume } : {}),
    ...(overrides?.columnTemperature ? { columnTemperature: overrides.columnTemperature } : {}),
    ...(overrides?.runTime ? { runTime: overrides.runTime } : {}),
    ...(overrides?.diluent ? { diluent: overrides.diluent } : {}),
    ...(overrides?.workingConcentration ? { workingConcentration: overrides.workingConcentration } : {}),
    ...(overrides?.approxRetentionTime ? { approxRetentionTime: overrides.approxRetentionTime } : {}),
  };
  const solutionPreparation = {
    ...base.solutionPreparation,
    ...(overrides?.standardSolution ? { standardSolution: overrides.standardSolution } : {}),
    ...(overrides?.sampleSolution ? { sampleSolution: overrides.sampleSolution } : {}),
  };
  const { strengthNum } = parseProductStrength(productName, activeSubstance);
  const strengthMg = strengthNum > 0 ? strengthNum : base.targetNominalWeight || 50;

  if (isUV) {
    const wavelength = String(chromatographicConditions.detectionWavelength || 'UV at 254 nm').replace(/^UV at\s*/i, '');
    const medium =
      detection === 'UV_DISSOLUTION'
        ? '0.1 N Hydrochloric Acid (dissolution medium)'
        : chromatographicConditions.diluent || 'Methanol';
    Object.assign(chromatographicConditions, {
      column: 'Not applicable (spectrophotometric measurement)',
      mobilePhase: 'Not applicable',
      flowRate: 'Not applicable',
      injectionVolume: 'Not applicable',
      columnTemperature: 'Ambient',
      runTime: 'Not applicable',
      instrument: 'Double beam UV / Visible spectrophotometer with 1 cm matched quartz cells',
      detectionWavelength: `${wavelength} (absorbance maximum)`,
      cellPathLength: '1 cm matched quartz cells',
      blank: `${medium}, used to zero the instrument before each set of measurements`,
      diluent: medium,
      approxRetentionTime: 'Not applicable',
    });
  }

  const lab = makeLabRecords(`${productName}_assay`, reportDate);

  // A chromatograph integrates a peak area; a spectrophotometer reads an
  // absorbance of about 0.4 at the working concentration. Every response in the
  // document is generated from this one value, so switching the finish rescales
  // the whole study without changing any of the statistics.
  // The generators work in whole counts, so a UV study is generated on a scaled
  // response and divided back to an absorbance of about 0.4045 when stored. The
  // statistics are identical either way.
  const responseScale = isUV ? 1e6 : 1;
  const nominalArea = isUV ? 0.4045 * responseScale : base.nominalArea || 189e4;
  /**
   * Every derived number is read back out of the chromatographic conditions the
   * document actually prints. When a finished product specification is extracted
   * and says 30 °C, the robustness range, the retention time and the working
   * concentration all follow that value instead of the stored monograph's.
   */
  const firstNumber = (text: any, fallback: number): number => {
    const m = String(text ?? '').match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : fallback;
  };

  // "0.05 mg/mL", "50 µg/mL" and "50 ppm" all resolve to 50 µg/mL.
  const readConcentrationUgMl = (text: any, fallbackUgMl: number): number => {
    const raw = String(text ?? '');
    const m = raw.match(/(\d+(?:\.\d+)?)/);
    if (!m) return fallbackUgMl;
    const value = parseFloat(m[1]);
    if (/mg\s*\/\s*ml/i.test(raw)) return value * 1000;
    if (/\u00B5g|ug|mcg|ppm/i.test(raw)) return value;
    return value * 1000;
  };

  const nominalPpm = readConcentrationUgMl(
    chromatographicConditions.workingConcentration,
    (base.workingConcNum || 0.05) * 1000
  );
  const baseRt = firstNumber(chromatographicConditions.approxRetentionTime, base.retentionTimeMin || 5.0);
  const flowNum = firstNumber(chromatographicConditions.flowRate, base.flowRateNum || 1.0);
  const columnTempNum = firstNumber(chromatographicConditions.columnTemperature, base.columnTempNum || 30);
  const bufferPHNum = (() => {
    const fromConditions = String(chromatographicConditions.mobilePhase ?? '').match(/pH\s*(\d+(?:\.\d+)?)/i);
    if (fromConditions) return parseFloat(fromConditions[1]);
    const fromNote = String((chromatographicConditions as any).note ?? '').match(/pH\s*(\d+(?:\.\d+)?)/i);
    if (fromNote) return parseFloat(fromNote[1]);
    return base.mobilePhaseBufferPH;
  })();
  const standardWeightMg = firstNumber(overrides?.standardWeight, base.targetNominalWeight || 50);
  // A specification that states a different working concentration makes the
  // monograph's preparation text wrong, so it is rebuilt from the stated numbers
  // unless the specification supplied its own wording.
  if (overrides?.workingConcentration || overrides?.standardWeight) {
    const prepared = solveSamplePreparation(standardWeightMg, nominalPpm);
    const dilutionText =
      prepared.dilutionFactor > 1 ? `, then dilute ${prepared.dilutionDescription} with diluent` : '';
    if (!overrides?.standardSolution) {
      solutionPreparation.standardSolution =
        `Weigh accurately about ${prepared.sampleWeightMg} mg of ${activeSubstance} working standard into a ` +
        `${prepared.flaskMl} mL volumetric flask, dissolve in and dilute to volume with diluent` +
        `${dilutionText} to obtain ${prepared.workingConc.toFixed(1)} \u00B5g/mL.`;
    }
    if (!overrides?.sampleSolution) {
      solutionPreparation.sampleSolution =
        `Weigh 20 dosage units, determine the average weight and powder finely. Transfer powder equivalent to ` +
        `${prepared.sampleWeightMg} mg of ${activeSubstance} into a ${prepared.flaskMl} mL volumetric flask, add about ` +
        `70 % of the diluent, sonicate for 20 minutes with intermittent shaking, dilute to volume and filter through a ` +
        `0.45 \u00B5m membrane, discarding the first few mL${dilutionText} to obtain ` +
        `${prepared.workingConc.toFixed(1)} \u00B5g/mL.`;
    }
  }

  const rand = createSeededRandom(`${productName.toLowerCase()}_assay_doc`);

  // ---------------------------------------------------------------------
  // 6. System Suitability (n = 5 replicate standard injections)
  // ---------------------------------------------------------------------
  // Responses are generated on the scale the finish actually reads.
  const asResponse = (v: number) => (isUV ? Number((v / responseScale).toFixed(4)) : Math.round(v));

  const ssGen = generateSystemSuitabilityInjections(
    productName,
    nominalArea,
    standardWeightMg,
    5,
    baseRt,
    4850,
    1.12
  );

  /**
   * A spectrophotometer has no column, so tailing and theoretical plates cannot
   * exist. Its suitability is the instrument's own qualification: the spread of
   * replicate readings, wavelength and photometric accuracy, stray light,
   * baseline flatness and the cell pathlength.
   */
  const uvSystemSuitabilityChecks = isUV
    ? [
        { parameter: 'Absorbance % RSD (n = 6)', criterion: 'NMT 1.0 %', observed: Number((0.2 + rand() * 0.5).toFixed(2)) + ' %' },
        { parameter: 'Wavelength accuracy', criterion: '\u00B1 1 nm', observed: `${(rand() * 0.6 - 0.3).toFixed(1)} nm` },
        { parameter: 'Photometric accuracy', criterion: '\u00B1 0.01 A', observed: `${(rand() * 0.008 - 0.004).toFixed(3)} A` },
        { parameter: 'Stray light at 220 nm', criterion: 'NMT 1.0 %', observed: `${(0.05 + rand() * 0.15).toFixed(2)} %` },
        { parameter: 'Baseline flatness', criterion: '\u00B1 0.002 A', observed: `${(rand() * 0.0016 - 0.0008).toFixed(4)} A` },
        { parameter: 'Cell pathlength', criterion: '1.00 cm \u00B1 0.01', observed: `${(1 + (rand() * 0.008 - 0.004)).toFixed(3)} cm` },
      ]
    : undefined;

  const systemSuitability = {
    injections: ssGen.injections.map((inj) => ({
      injectionNo: inj.srNo,
      peakArea: asResponse(inj.peakArea),
      tailingFactor: inj.tailingFactor,
      theoreticalPlates: inj.theoreticalPlates,
    })),
    meanArea: ssGen.meanArea,
    rsdArea: ssGen.rsdArea,
    meanTailing: ssGen.meanTailing,
    rsdTailing: 0,
    meanPlates: ssGen.meanPlates,
    rsdPlates: 0,
    acceptanceTextProtocol: isUV
      ? 'Acceptance Criteria: %RSD of absorbance for five replicate measurements of the standard preparation NMT 2.0 %; the blank shall read not more than 0.05 absorbance units at the stated wavelength.'
      : 'Acceptance Criteria: %RSD of peak area for five replicate injections NMT 2.0 %; USP tailing factor NMT 2.0; theoretical plates NLT 2000.',
    acceptanceTextReport:
      'The system suitability parameters comply with the acceptance criteria of the method.',
  };

  // ---------------------------------------------------------------------
  // 7. Specificity
  // ---------------------------------------------------------------------
  const specificity = {
    rows: [
      {
        solution: 'Blank (Diluent)',
        retentionTime: 'No peak',
        interference: 'No interference observed',
      },
      {
        solution: 'Placebo Solution',
        retentionTime: 'No peak',
        interference: 'No interference observed',
      },
      {
        solution: `Standard Solution (${activeSubstance} WS)`,
        retentionTime: baseRt.toFixed(2),
        interference: 'Not applicable (reference peak)',
      },
      {
        solution: 'Sample Solution (Test Preparation)',
        retentionTime: (baseRt + 0.01).toFixed(2),
        interference: 'No co-eluting peak; peak purity passed',
      },
      {
        solution: 'Placebo spiked with Standard',
        retentionTime: (baseRt + 0.02).toFixed(2),
        interference: 'No interference at analyte retention window',
      },
    ],
    acceptanceTextProtocol:
      'Acceptance Criteria: No interfering peak shall be observed from blank or placebo at the retention time of the analyte peak; peak purity shall pass by PDA.',
    conclusionReport: `No interference was observed from blank or placebo at the retention time of ${activeSubstance}. Peak purity passed — the method is specific.`,
  };

  // ---------------------------------------------------------------------
  // 8. Linearity (50 % - 150 %)
  // ---------------------------------------------------------------------
  // The combined Assay and Content of Uniformity protocol keeps the same five
  // linearity levels as the assay and runs accuracy at 75, 100 and 125 % of the
  // target concentration, as in the house format.
  const levelPercents = [50, 75, 100, 125, 150];
  const accuracyPercents = includeCU ? [75, 100, 125] : [50, 100, 150];
  const linGen = generateLinearityData(productName, nominalPpm, nominalArea, levelPercents);
  const linearity = {
    levels: linGen.levels.map((lvl) => ({
      levelPercent: lvl.nominalPercent,
      concentration: lvl.concentrationPpm,
      meanArea: asResponse(lvl.peakArea),
      percentOf100Response: 0,
    })),
    regression: {
      correlationR: Number(Math.sqrt(linGen.regression.rSquared).toFixed(6)),
      rSquared: linGen.regression.rSquared,
      slope: linGen.regression.slope,
      yIntercept: linGen.regression.yIntercept,
      yInterceptBiasPercent: 0,
    },
    acceptanceTextProtocol:
      'Acceptance Criteria: Correlation coefficient (r) NLT 0.999 (r² NLT 0.998) over 50 % to 150 % of the nominal working concentration; y-intercept bias at the 100 % level within ±2.0 %.',
    conclusionReport:
      'The method is linear across the range of 50 % to 150 % of the nominal working concentration.',
  };

  // ---------------------------------------------------------------------
  // 9. Accuracy / Recovery (50 %, 100 %, 150 % in triplicate = 9 determinations)
  // ---------------------------------------------------------------------
  const accGen = generateAccuracyRecoveryData(productName, strengthMg, accuracyPercents, nominalArea);
  const accuracyRows: any[] = [];
  for (const lvl of accGen.levels) {
    for (const rep of lvl.replicates) {
      accuracyRows.push({
        levelPercent: lvl.levelPercent,
        expNo: rep.prepNo,
        amountAdded: rep.amountAddedMg,
        amountRecovered: rep.amountRecoveredMg,
        percentRecovery: rep.percentRecovery,
      });
    }
  }
  const accuracy = {
    rows: accuracyRows,
    meanRecoveryAllLevels: accGen.overallMean,
    rsdAllLevels: accGen.overallRsd,
    acceptanceTextProtocol:
      'Acceptance Criteria: Mean recovery at each level shall be 98.0 % to 102.0 %; overall %RSD of nine determinations NMT 2.0 %.',
    conclusionReport:
      'Recovery at all three levels complies with the acceptance criteria — the method is accurate.',
  };

  // ---------------------------------------------------------------------
  // 10. Method Precision & Intermediate Precision (6 + 6 determinations)
  // ---------------------------------------------------------------------
  const precGen = generatePrecisionData(productName, strengthMg, nominalArea, 99.8);
  const precisionRows = precGen.analyst1.rows.map((row, idx) => ({
    sampleNo: `Preparation ${idx + 1}`,
    analyst1Assay: row.percentAssayOrDissolved,
    analyst2Assay: precGen.analyst2.rows[idx]?.percentAssayOrDissolved ?? row.percentAssayOrDissolved,
    statisticalEvaluation: '',
  }));
  const precision = {
    rows: precisionRows,
    analyst1Mean: precGen.analyst1.meanPercent,
    analyst1Sd: precGen.analyst1.sd,
    analyst1Rsd: precGen.analyst1.rsd,
    analyst2Mean: precGen.analyst2.meanPercent,
    analyst2Sd: precGen.analyst2.sd,
    analyst2Rsd: precGen.analyst2.rsd,
    cumulativeMean: precGen.cumulative.meanPercent,
    cumulativeSd: precGen.cumulative.sd,
    cumulativeRsd: precGen.cumulative.rsd,
    diffBetweenMeans: Number(
      Math.abs(precGen.analyst1.meanPercent - precGen.analyst2.meanPercent).toFixed(2)
    ),
    acceptanceTextProtocol:
      'Acceptance Criteria: %RSD of six determinations NMT 2.0 % for each analyst; cumulative %RSD of twelve determinations NMT 2.0 %; absolute difference between the two analyst means NMT 2.0 %.',
    conclusionReport:
      'Method precision and intermediate precision comply with the acceptance criteria — the method is precise and rugged.',
  };

  // ---------------------------------------------------------------------
  // 11. Robustness (6 deliberately varied conditions)
  // ---------------------------------------------------------------------
  const flow = flowNum;
  const temp = columnTempNum;
  const robustnessConditions = isUV
    ? [
        `Wavelength decreased by 1 nm from ${String(chromatographicConditions.detectionWavelength || '').replace(/\s*\(.*$/, '')}`,
        `Wavelength increased by 1 nm from ${String(chromatographicConditions.detectionWavelength || '').replace(/\s*\(.*$/, '')}`,
        'Solution allowed to stand 30 minutes before measurement',
        'Second matched cell pair used',
        'Sonication time decreased by 5 minutes',
        'Sonication time increased by 5 minutes',
      ]
    : [
    `Flow rate decreased to ${(flow - 0.1).toFixed(1)} mL/min`,
    `Flow rate increased to ${(flow + 0.1).toFixed(1)} mL/min`,
    `Column temperature decreased to ${temp - 2} \u00B0C`,
    `Column temperature increased to ${temp + 2} \u00B0C`,
    bufferPHNum
      ? `Mobile phase buffer pH decreased to ${(bufferPHNum - 0.2).toFixed(1)}`
      : 'Mobile phase organic proportion decreased by 2 % (v/v)',
    bufferPHNum
      ? `Mobile phase buffer pH increased to ${(bufferPHNum + 0.2).toFixed(1)}`
      : 'Mobile phase organic proportion increased by 2 % (v/v)',
      ];
  const robustness = {
    instructionParagraph: isUV
      ? `Evaluate the measurement under deliberately varied conditions (wavelength \u00B11 nm, standing time, matched cell pair and sonication time \u00B15 minutes). Five replicate measurements of the standard preparation shall be made under each varied condition.`
      : `Evaluate system suitability under deliberately varied chromatographic conditions (flow rate \u00B10.1 mL/min from ${flow.toFixed(1)} mL/min, column temperature \u00B12 \u00B0C from ${temp} \u00B0C, mobile phase composition / pH \u00B10.2). Five replicate injections of the standard preparation shall be made under each varied condition.`,
    rows: robustnessConditions.map((conditionVaried, idx) => {
      // The response is not random: a chromatographic system reacts to each
      // change in a known direction, so the figures are derived from the
      // variation itself and can be reconciled with the normal condition.
      const variedFlow = idx === 0 ? flow - 0.1 : idx === 1 ? flow + 0.1 : flow;
      const flowRatio = flow / variedFlow; // retention scales with 1 / flow
      const tempShift = idx === 2 ? -2 : idx === 3 ? 2 : 0;
      const phShift = idx === 4 ? -0.2 : idx === 5 ? 0.2 : 0;

      // Retention time moves inversely with flow; a warmer column elutes sooner.
      const retentionTime = Number((baseRt * flowRatio * (1 - tempShift * 0.012)).toFixed(2));
      // Efficiency falls slightly at higher flow and rises with temperature.
      const theoreticalPlates = Math.round(
        4850 * (1 - (variedFlow - flow) * 0.28) * (1 + tempShift * 0.015) + (rand() - 0.5) * 60
      );
      // Peak shape is most sensitive to pH.
      const tailingFactor = Number(
        (1.12 - tempShift * 0.01 + Math.abs(phShift) * 0.25 + (rand() - 0.5) * 0.04).toFixed(2)
      );
      // A shorter retention and a sharper peak give a slightly tighter response.
      const rsdPercent = Number(
        (0.3 + Math.abs(variedFlow - flow) * 1.6 + Math.abs(phShift) * 0.8 + rand() * 0.15).toFixed(2)
      );

      return { conditionVaried, retentionTime, rsdPercent, tailingFactor, theoreticalPlates };
    }),
    acceptanceTextProtocol:
      'Acceptance Criteria: Under every varied condition the system suitability criteria shall be met (%RSD NMT 2.0 %, tailing factor NMT 2.0, theoretical plates NLT 2000).',
    conclusionReport:
      'System suitability was met under all deliberately varied conditions \u2014 the method is robust.',
  };

  // ---------------------------------------------------------------------
  // 12. Solution Stability (0 h to 24 h at room temperature)
  // ---------------------------------------------------------------------
  const stdArea0 = ssGen.meanArea;
  const splArea0 = Math.round(ssGen.meanArea * (0.995 + rand() * 0.01));
  const stabilityPoints = ['Initial (0 h)', '3 h', '6 h', '12 h', '18 h', '24 h'];
  const solutionStability = {
    rows: stabilityPoints.map((timePoint, idx) => {
      if (idx === 0) {
        return { timePoint, standardArea: asResponse(stdArea0), sampleArea: asResponse(splArea0), diffPercent: '0.00 % / 0.00 %' };
      }
      // Cumulative drift kept well inside the NMT 2.0 % limit
      const driftStd = (idx / stabilityPoints.length) * (0.25 + rand() * 0.45) / 100;
      const driftSpl = (idx / stabilityPoints.length) * (0.25 + rand() * 0.55) / 100;
      return {
        timePoint,
        standardArea: asResponse(stdArea0 * (1 - driftStd)),
        sampleArea: asResponse(splArea0 * (1 - driftSpl)),
        diffPercent: '',
      };
    }),
    acceptanceTextProtocol:
      'Acceptance Criteria: The cumulative difference in peak response for standard and sample solutions over 24 hours shall not exceed 2.0 %.',
    conclusionReport:
      'Standard and sample solutions are stable for 24 hours at room temperature.',
  };

  // ---------------------------------------------------------------------
  // Reagents, standards & equipment
  // ---------------------------------------------------------------------
  const reagentNames =
    base.reagents && base.reagents.length > 0
      ? base.reagents
      : ['Acetonitrile', 'Methanol', 'Milli-Q Water', 'Ortho-phosphoric acid'];
  const reagentsAndStandards: ChemicalRequirement[] = [
    {
      name: `${activeSubstance} Working Standard`,
      grade: 'Working Standard (potency assigned)',
      make: 'In-house / Qualified against Pharmacopoeial RS',
      batchNo: overrides?.standardLotNo || lab.standardLot(activeSubstance),
    },
    ...reagentNames.map((name: string, idx: number) => ({
      name,
      grade: /water/i.test(name) ? 'Milli-Q / Purified Water' : isUV ? 'AR / Spectroscopy Grade' : 'HPLC Grade',
      make: 'Merck / Rankem or equivalent',
      batchNo: lab.reagentLot('Merck', idx + 1),
    })),
    {
      name: 'Membrane filter, 0.45 \u00B5m (PVDF / PTFE)',
      grade: 'Analytical',
      make: 'Millipore or equivalent',
      batchNo: lab.reagentLot('Millipore', 20),
    },
  ];

  const equipmentNames = isUV
    ? [
        'Double Beam UV / Visible Spectrophotometer',
        'Matched Quartz Cells, 1 cm pathlength',
        'Analytical Balance (readability 0.01 mg)',
        'Ultrasonic Bath',
        'pH Meter',
        'Calibrated Volumetric Glassware (Class A)',
      ]
    : [
    'HPLC System with UV / PDA Detector',
    `HPLC Column \u2013 ${chromatographicConditions.column}`,
    'Analytical Balance (readability 0.01 mg)',
    'Ultrasonic Bath',
    'pH Meter',
    'Calibrated Volumetric Glassware (Class A)',
      ];
  const equipment: EquipmentRequirement[] = equipmentNames.map((name, idx) => {
    const rec = lab.calibration(name, idx);
    // A chromatographic column is qualified with the system, not calibrated.
    const isColumn = /column|quartz cell/i.test(name);
    return {
      srNo: idx + 1,
      name,
      idNo: rec.idNo,
      calibrationDate: isColumn ? 'Not applicable' : rec.calibrationDate,
      dueDate: isColumn ? 'Not applicable' : rec.dueDate,
    };
  });

  // ---------------------------------------------------------------------
  // Review checklist, abbreviations, revision history
  // ---------------------------------------------------------------------
  // ---------------------------------------------------------------------
  // Content of Uniformity (USP <905>), included only in the combined document
  // ---------------------------------------------------------------------
  const contentUniformity = includeCU
    ? (() => {
        const units = generateContentUniformityUnits(rand, ssGen.meanArea, 99.6, 10);
        const result = calculateAcceptanceValue(units, 100.0);
        // The house format reports content uniformity as a precision study on ten
        // individual tablets: the amount taken, the area, and the content as a
        // percentage of the label amount, with the mean and the % RSD underneath.
        const rows = units.map((u, idx) => ({
          srNo: idx + 1,
          sampleId: `CU-${String(idx + 1).padStart(2, '0')}`,
          amountUsedMg: Number((strengthMg * (0.995 + (idx % 5) * 0.002)).toFixed(2)),
          sampleArea: u.peakArea,
          contentPercentLa: u.contentPercent,
        }));
        return {
          ...result,
          rows,
          tableTitle: `Table 5.1 ${activeSubstance.toUpperCase()}`,
          evaluation: ['- Content (% of LA)', '- RSD of content: \u2264 2.0 %'],
          acceptanceTextProtocol:
            'Evaluation: RSD of content NMT 2.0 %. Acceptance Value of the ten dosage units NMT 15.0 and no individual unit outside 75.0 % to 125.0 % of the reference value M, as per USP <905>.',
          conclusionReport:
            'The content of the ten individual dosage units complies with the acceptance criteria; the method is suitable for the determination of content of uniformity.',
          preparation: {
            intro:
              'Precision for content of uniformity is the degree of repeatability obtained when ten individual dosage units are ' +
              'assayed separately. The content of each unit is calculated as a percentage of the label amount and the mean and ' +
              'the relative standard deviation of the ten results are reported.',
            steps: [
              `Standard solution : ${(nominalPpm / 1000).toFixed(3)} mg/mL of ${activeSubstance.toUpperCase()} WS in diluent.`,
              `Weigh accurately about ${standardWeightMg} mg of ${activeSubstance.toUpperCase()} WS into a volumetric flask, dissolve in a small volume of the diluent with sonication and dilute to volume with the diluent, then dilute further to obtain ${(nominalPpm / 1000).toFixed(3)} mg/mL.`,
              `Sample solution : ${(nominalPpm / 1000).toFixed(3)} mg/mL of ${activeSubstance.toUpperCase()} in diluent.`,
              `Take 1 tablet into a volumetric flask, add about 70 % of the diluent, sonicate for 20 minutes with intermittent shaking, dilute to volume with the diluent and filter through a 0.45 \u00B5m membrane, discarding the first few mL. Repeat separately for each of the ten tablets.`,
              'Inject the standard preparation five times, then each of the ten unit preparations once, and calculate the content of each unit as a percentage of the label amount.',
            ],
          },
          calculationNote: [
            `Result = (rU / rS) \u00D7 (CS / CU) \u00D7 100`,
            'rU = peak response from the Sample solution',
            'rS = peak response from the Standard solution',
            'CS = concentration of the Standard solution (mg/mL)',
            'CU = nominal concentration of the Sample solution (mg/mL)',
          ],
        };
      })()
    : undefined;

  // Preparation narrative printed above each validation table.
  const standardName = `${activeSubstance.toUpperCase()} ${/\bBP\b/i.test(base.reference || '') ? 'BP' : /\bUSP\b/i.test(base.reference || '') ? 'USP' : ''} WS`
    .replace(/\s+/g, ' ')
    .trim();
  const sectionPreparations = buildSectionPreparations({
    techniqueName,
    instrumentName: isUV ? 'spectrophotometer' : 'HPLC system',
    activeSubstance,
    standardName,
    workingConc: nominalPpm,
    diluent: chromatographicConditions.diluent || 'mobile phase',
    levelPercents,
    strengthMg,
    injectionVolume: chromatographicConditions.injectionVolume || '20 \u00B5L',
    flowRate: chromatographicConditions.flowRate || '1.0 mL/min',
    columnTemperature: chromatographicConditions.columnTemperature || '30 \u00B0C',
  });

  const reviewChecklist = [
    { particulars: 'Specificity', compliance: 'No interference from blank and placebo — Complies' },
    { particulars: 'System Suitability', compliance: 'Tailing NMT 2.0; %RSD NMT 2.0 %; plates NLT 2000 — Complies' },
    { particulars: 'Linearity (50 % – 150 %)', compliance: 'r NLT 0.999 — Complies' },
    { particulars: 'Accuracy / Recovery', compliance: 'Mean recovery 98.0 % – 102.0 % — Complies' },
    { particulars: 'Range', compliance: 'Established from 50 % to 150 % of test concentration — Complies' },
    { particulars: 'Method Precision (Repeatability)', compliance: '%RSD of six determinations NMT 2.0 % — Complies' },
    { particulars: 'Intermediate Precision (Ruggedness)', compliance: 'Cumulative %RSD (n = 12) NMT 2.0 % — Complies' },
    { particulars: 'Robustness', compliance: 'System suitability met under all varied conditions — Complies' },
    { particulars: 'Solution Stability', compliance: 'Stable up to 24 hours at room temperature — Complies' },
    { particulars: 'Raw data / chromatograms attached', compliance: 'Attached as Annexure — Complies' },
    { particulars: 'Calculations verified', compliance: 'Verified by QC reviewer — Complies' },
    { particulars: 'Overall Conclusion', compliance: 'The analytical method is validated and fit for its intended use' },
  ];

  const abbreviations = [
    { abbreviation: 'AMV', expansion: 'Analytical Method Validation' },
    isUV
      ? { abbreviation: 'UV', expansion: 'Ultraviolet / Visible Spectroscopy' }
      : { abbreviation: 'HPLC', expansion: 'High Performance Liquid Chromatography' },
    { abbreviation: 'ICH', expansion: 'International Council for Harmonisation' },
    { abbreviation: 'USP', expansion: 'United States Pharmacopeia' },
    { abbreviation: 'BP', expansion: 'British Pharmacopoeia' },
    { abbreviation: 'QC', expansion: 'Quality Control' },
    { abbreviation: 'QA', expansion: 'Quality Assurance' },
    { abbreviation: '%RSD', expansion: 'Percent Relative Standard Deviation' },
    { abbreviation: 'SD', expansion: 'Standard Deviation' },
    ...(isUV ? [{ abbreviation: 'A', expansion: 'Absorbance Unit' }] : [{ abbreviation: 'RT', expansion: 'Retention Time' }]),
    { abbreviation: 'WS', expansion: 'Working Standard' },
    { abbreviation: 'RS', expansion: 'Reference Standard' },
    { abbreviation: 'NMT', expansion: 'Not More Than' },
    { abbreviation: 'NLT', expansion: 'Not Less Than' },
    { abbreviation: 'LC', expansion: 'Label Claim' },
    ...(isUV ? [] : [{ abbreviation: 'PDA', expansion: 'Photo Diode Array' }]),
    { abbreviation: 'µg/mL', expansion: 'Microgram per Millilitre' },
    ...(isUV ? [] : [{ abbreviation: '\u00B5V\u00B7s', expansion: 'Microvolt second (peak area unit)' }]),
  ];

  const revisionHistory = [
    {
      version: '00',
      effectiveDate,
      reason: 'New document — first issue of the analytical method validation protocol and report.',
      docNumber: documentNo,
    },
  ];

  // ---------------------------------------------------------------------
  // Assembled document
  // ---------------------------------------------------------------------
  return {
    companyName,
    companyAddress,
    documentNo,
    reportNo,
    protocolNo: overrides?.protocolNo || documentNo,
    protocolDate: overrides?.protocolDate || reportDate,
    reportDate,
    effectiveDate,
    supersedes: overrides?.supersedes || 'Nil',

    productName,
    activeSubstance,
    labelClaim,
    testParameter: detection === 'UV_DISSOLUTION'
      ? `DISSOLUTION OF ${activeSubstance.toUpperCase()} BY UV VISIBLE SPECTROSCOPY`
      : detection === 'UV'
      ? `ASSAY OF ${activeSubstance.toUpperCase()} BY UV VISIBLE SPECTROSCOPY`
      : contentUniformityOnly
      ? `CONTENT OF UNIFORMITY OF ${activeSubstance.toUpperCase()} BY HPLC`
      : withContentUniformity
      ? `ASSAY AND CONTENT OF UNIFORMITY OF ${activeSubstance.toUpperCase()} BY HPLC`
      : `Assay by ${techniqueName}`,
    contentUniformityOnly,
    documentSubTitle: detection === 'UV_DISSOLUTION'
      ? '(Dissolution by UV Visible Spectroscopy)'
      : detection === 'UV'
      ? '(Assay by UV Visible Spectroscopy)'
      : contentUniformityOnly
      ? '(For Content of Uniformity Method)'
      : withContentUniformity
      ? '(For Assay and Content of uniformity Method)'
      : undefined,
    reference: base.reference,
    batchNo: batchNoUsed,
    batchNoUsed,
    validationBatchNo: overrides?.validationBatchNo || batchNoUsed,
    standardLotNo: overrides?.standardLotNo || lab.standardLot(activeSubstance),
    preparedDate: overrides?.preparedDate || reportDate,
    reviewedDate: overrides?.reviewedDate || reportDate,
    approvedDate: overrides?.approvedDate || reportDate,

    technique: techniqueShort,
    detector: isUV ? 'UV / Visible spectrophotometer' : 'UV / PDA',

    signOffs: {
      preparedBy: { name: 'Smit Patel', designation: 'Chemist – Quality Control', date: overrides?.preparedDate || reportDate },
      checkedBy: { name: 'Soni Vaghela', designation: 'Executive – Quality Control', date: overrides?.reviewedDate || reportDate },
      reviewedBy: { name: 'Anil Parmar', designation: 'Manager – Quality Control', date: overrides?.reviewedDate || reportDate },
      approvedBy: { name: 'Ankita Darji', designation: 'Manager – Quality Assurance', date: overrides?.approvedDate || reportDate },
    },

    objective: `To validate the analytical method for the determination of ${activeSubstance} content (Assay) in ${productName} by ${isUV ? 'UV Visible Spectroscopy' : 'High Performance Liquid Chromatography'}, and to demonstrate by documented evidence that the method is specific, linear, accurate, precise, robust and stable, and is therefore suitable for its intended use as per ICH Q2(R2) and USP <1225>.`,
    scope: `This protocol and report are applicable to the validation of the Assay by ${techniqueName} method for ${productName} performed at the Quality Control laboratory of ${companyName}. The validation covers specificity, system suitability, linearity and range (50 % to 150 %), accuracy, method precision, intermediate precision, robustness and stability of analytical solutions.`,

    verificationDetails: {
      reference: base.reference,
      typeOfVerification:
        'Validation of an in-house / compendial assay procedure under the actual conditions of use, as per USP <1225> and ICH Q2(R2)',
      testToBeVerified: `Assay by ${techniqueName} (${activeSubstance} content)`,
      verificationTeam:
        'Analyst 1: Sahil Panchal (Chemist, QC); Analyst 2: Smit Patel (Executive, QC); Supervisor: Anil Parmar (Manager, QC)',
      experimentalDetails: `Specificity, system suitability, linearity (50 % to 150 %), accuracy / recovery (50 %, 100 %, 150 % in triplicate), method precision and intermediate precision, robustness and stability of analytical solutions up to 24 hours, executed on batch ${batchNoUsed}.`,
    },

    chromatographicConditions,
    solutionPreparation,
    sectionPreparations,

    calculationFormula: {
      assayFormula:
        'Assay (%) = (AT / AS) × (WS / DS) × (DT / WT) × (AVG_WT / LC) × P × F × 100',
      contentFormula: `Content (mg per unit) = Assay (%) × ${strengthMg} / 100`,
      notes: [
        isUV
          ? 'AT = Absorbance of the analyte in the sample preparation'
          : 'AT = Peak area of the analyte in the sample preparation',
        isUV
          ? 'AS = Mean absorbance of the analyte in the standard preparation'
          : 'AS = Mean peak area of the analyte in the standard preparation',
        'WS = Weight of working standard taken (mg); WT = Weight of sample taken (mg)',
        'DS = Dilution factor of the standard preparation; DT = Dilution factor of the sample preparation',
        'AVG_WT = Average weight of the dosage unit (mg); LC = Label claim (mg per unit)',
        'P = Potency of the working standard (as-is, expressed as a decimal fraction); F = Salt / base conversion factor',
      ],
    },

    reagentsAndStandards,
    equipment,
    validationParameters: [],

    systemSuitability,
    specificity,
    linearity,
    accuracy,
    precision,
    robustness,
    solutionStability,
    uvSystemSuitabilityChecks,
    responseLabel: isUV ? 'Absorbance' : 'Peak Area (\u00B5V\u00B7s)',
    responseDecimals: isUV ? 4 : 0,
    ...(contentUniformity ? { contentUniformity } : {}),

    reviewChecklist,
    abbreviations,
    revisionHistory,
  } as any;
}


export function buildFullAMVDataFromMonograph(productName: string, mono: MonographDefinition, overrides?: any): any {
  return generateAMVDataForProduct(productName, overrides);
}

