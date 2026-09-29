export interface MLTOrganism {
  id: string;
  name: string;
  atcc: string;
  source: string;
  lotNo: string;
  passageNo: number;
  dateOfPreparation: string;
  medium61: string; // e.g. SCDA
  temp61: string; // e.g. 30-35C
  time61: string; // e.g. 3-5 d
  medium62: string; // e.g. MSA, Cetrimide agar, MacConkey agar
}

export interface MLTMedia {
  id: string;
  name: string;
  lotNo: string;
  mfgDate: string;
  expiryDate: string;
  sterilityCheck: string;
  gptDate: string;
  gptResult: 'Pass' | 'Fail' | '';
}

export interface MLTEquipment {
  id: string;
  type: string;
  makeModel: string;
  calibrationDueDate: string;
}


export interface MLTRecoveryRow {
  organismId: string;
  organismNameOverride?: string;
  dilution: string; // '1:10', '1:50', '1:100'
  inoculumControl1: number;
  inoculumControl2: number;
  sampleControl1: number;
  sampleControl2: number;
  testPlate1: number;
  testPlate2: number;
}

export interface MLTSuitabilityRow {
  organismId: string;
  neutralizer: string;
  neutralizerLevel: string;
  testPlate1: number;
  testPlate2: number;
  sampleControl1: number;
  sampleControl2: number;
  inoculumControl1: number;
  inoculumControl2: number;
}

export interface MLTSpecifiedOrganismRow {
  organismId: string;
  enrichmentMedium: string;
  enrichmentLot: string;
  enrichmentExpiry: string;
  selectiveMedium: string;
  selectiveLot: string;
  selectiveExpiry: string;
  incubationTemp: string;
  incubationTime: string;
  positiveControl: 'Growth' | 'No growth' | '';
  negativeControl: 'Growth' | 'No growth' | '';
  testProduct: 'Growth' | 'No growth' | '';
  morphology: string;
  identificationResult: string;
}

export interface MLTDocumentData {
  /** Preparation narrative printed above each table, keyed by section. */
  sectionPreparations?: Record<string, { intro?: string; steps: string[] }>;
  productName: string;
  strength: string;
  dosageForm: string;
  batchNo: string;
  arNo: string;
  mfgDate: string;
  sampleQty_g: number;
  protocolNo: string;
  protocolDate: string;
  supersedes?: string;
  reportNo: string;
  reportDate: string;
  analysisStartDate: string;
  analysisEndDate: string;
  
  specTAMC_cfu_per_g: number;
  specTYMC_cfu_per_g: number;
  specifiedOrganismsSpec: string;
  references: string[];
  
  organisms: MLTOrganism[];
  media: MLTMedia[];
  equipment: MLTEquipment[];
  
  samplePrepDiluent: string;
  samplePrepFactor: number; // calculated from aliquot and diluent
  aliquot_mL: number;
  diluent_mL: number;
  
  inoculumCfuPerMl: number;
  inoculumVolumeAdded_mL: number;
  
  suitabilityRows: MLTSuitabilityRow[];
  recoveryRows: MLTRecoveryRow[];
  controlsRows: any[];
  specifiedOrganismRows: MLTSpecifiedOrganismRow[];

  routineMethodSelected: string;
  
  companyName: string;
  preparedBy: string;
  checkedBy: string;
  reviewedBy: string;
  approvedBy: string;
  
  conclusion?: string;
  isSuitable?: boolean;
}
