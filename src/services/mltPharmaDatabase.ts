import { buildMLTSectionPreparations } from './sectionPreparations';
import { parseProductStrength } from './pharmaMathEngine';
import { generateUniqueValidationCodes } from './pharmaDatabase';
import { MLTDocumentData, MLTOrganism, MLTMedia, MLTEquipment, MLTSuitabilityRow, MLTSpecifiedOrganismRow } from '../types';
import { hashStr, mulberry32 } from './mathUtils';

const DEFAULT_ORGANISMS = [
  { name: 'Staphylococcus aureus', atcc: '6538', medium61: 'SCDA', temp61: '30-35°C', time61: '3-5 d', medium62: 'MSA' },
  { name: 'Pseudomonas aeruginosa', atcc: '9027', medium61: 'SCDA', temp61: '30-35°C', time61: '3-5 d', medium62: 'Cetrimide agar' },
  { name: 'Bacillus subtilis', atcc: '6633', medium61: 'SCDA', temp61: '30-35°C', time61: '3-5 d', medium62: '-' },
  { name: 'Candida albicans', atcc: '10231', medium61: 'SDA', temp61: '20-25°C', time61: '5-7 d', medium62: 'SDB -> SDA' },
  { name: 'Aspergillus brasiliensis', atcc: '16404', medium61: 'SDA', temp61: '20-25°C', time61: '5-7 d', medium62: '-' },
  { name: 'Escherichia coli', atcc: '8739', medium61: 'SCDA', temp61: '30-35°C', time61: '3-5 d', medium62: 'MacConkey broth -> MacConkey agar' },
  { name: 'Salmonella enterica Typhimurium', atcc: '14028', medium61: 'SCDA', temp61: '30-35°C', time61: '3-5 d', medium62: 'RVS broth -> XLD agar' },
  { name: 'Bile-tolerant Gram-negative bacteria (E. coli)', atcc: '8739', medium61: 'SCDA', temp61: '30-35°C', time61: '3-5 d', medium62: 'Enterobacteria enrichment broth-Mossel -> VRBGA' }
];

export function generateMLTAMVDataForProduct(
  productName: string,
  batchNo: string,
  overrides?: Partial<MLTDocumentData>
): MLTDocumentData {
  const codes = generateUniqueValidationCodes(productName);
  const derivedBatch = batchNo || codes.batchNo;
  const { strengthNum, unit } = parseProductStrength(productName);
  const safeStrength = `${strengthNum} ${unit}`;

  const runKey = productName + batchNo + "MLT";
  const seed = hashStr(runKey);
  const rand = mulberry32(seed);
  const addDays = (d: Date, days: number) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; };
  const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  

  const now = new Date();
  // We need to set dates logically
  // minDays = max(TAMC, TYMC, <62>) -> typically 5-7 days. Let's use 7 days.
  const protocolDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const analysisStartDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const analysisEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const reportDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  const organisms: MLTOrganism[] = DEFAULT_ORGANISMS.map((o, i) => ({
    id: `org-${i}`,
    name: o.name,
    atcc: o.atcc,
    source: 'ATCC',
    lotNo: `L${rand().toString().slice(2, 8)}`,
    passageNo: 3,
    dateOfPreparation: analysisStartDate,
    medium61: o.medium61,
    temp61: o.temp61,
    time61: o.time61,
    medium62: o.medium62
  }));

    const genLot = (base: string) => {
    return 'L' + (Math.floor(rand() * 900) + 100) + base;
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startDateObj = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const endDateObj = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatRelDate = (baseDate: Date, monthOffset: number, day = 15) => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, day);
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${dayStr}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const media: MLTMedia[] = [
    { id: 'm1', name: 'SCDA', lotNo: genLot('SA'), mfgDate: formatRelDate(startDateObj, -4, 5), expiryDate: formatRelDate(endDateObj, 6, 28), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 10), gptResult: 'Pass' },
    { id: 'm2', name: 'SDA', lotNo: genLot('SD'), mfgDate: formatRelDate(startDateObj, -4, 8), expiryDate: formatRelDate(endDateObj, 6, 28), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 12), gptResult: 'Pass' },
    { id: 'm3', name: 'Buffered Sodium Chloride-Peptone Solution pH 7.0', lotNo: genLot('BS'), mfgDate: formatRelDate(startDateObj, -3, 15), expiryDate: formatRelDate(endDateObj, 8, 15), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -1, 20), gptResult: 'Pass' },
    { id: 'm4', name: 'MacConkey broth', lotNo: genLot('MB'), mfgDate: formatRelDate(startDateObj, -4, 12), expiryDate: formatRelDate(endDateObj, 7, 10), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 15), gptResult: 'Pass' },
    { id: 'm5', name: 'MacConkey agar', lotNo: genLot('MA'), mfgDate: formatRelDate(startDateObj, -4, 15), expiryDate: formatRelDate(endDateObj, 7, 15), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 18), gptResult: 'Pass' },
    { id: 'm6', name: 'MSA', lotNo: genLot('MS'), mfgDate: formatRelDate(startDateObj, -5, 10), expiryDate: formatRelDate(endDateObj, 5, 20), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 22), gptResult: 'Pass' },
    { id: 'm7', name: 'Cetrimide agar', lotNo: genLot('CA'), mfgDate: formatRelDate(startDateObj, -5, 12), expiryDate: formatRelDate(endDateObj, 5, 25), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 25), gptResult: 'Pass' },
    { id: 'm8', name: 'RVS broth', lotNo: genLot('RB'), mfgDate: formatRelDate(startDateObj, -3, 18), expiryDate: formatRelDate(endDateObj, 9, 5), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -1, 25), gptResult: 'Pass' },
    { id: 'm9', name: 'XLD agar', lotNo: genLot('XA'), mfgDate: formatRelDate(startDateObj, -4, 20), expiryDate: formatRelDate(endDateObj, 7, 22), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 28), gptResult: 'Pass' },
    { id: 'm10', name: 'SDB', lotNo: genLot('SB'), mfgDate: formatRelDate(startDateObj, -4, 22), expiryDate: formatRelDate(endDateObj, 8, 18), sterilityCheck: 'Pass', gptDate: formatRelDate(startDateObj, -2, 29), gptResult: 'Pass' },
  ];
  
  const equipment: MLTEquipment[] = [
    { id: 'e1', type: 'Bacterial Incubator', makeModel: 'Thermo', calibrationDueDate: formatRelDate(endDateObj, 6, 15) },
    { id: 'e2', type: 'Fungal Incubator', makeModel: 'Thermo', calibrationDueDate: formatRelDate(endDateObj, 7, 20) },
    { id: 'e3', type: 'Autoclave', makeModel: 'Steris', calibrationDueDate: formatRelDate(endDateObj, 8, 10) },
    { id: 'e4', type: 'LAF', makeModel: 'Esco', calibrationDueDate: formatRelDate(endDateObj, 5, 25) },
    { id: 'e5', type: 'Colony Counter', makeModel: 'Stuart', calibrationDueDate: formatRelDate(endDateObj, 9, 12) },
    { id: 'e6', type: 'Balance', makeModel: 'Mettler', calibrationDueDate: formatRelDate(endDateObj, 6, 30) },
  ];

  
  // Section 6: Neutraliser Screening (using S. aureus as worst case indicator for Tween 20)
  // Tween 20 is screened at the concentrations a laboratory actually trials.
  const neutralizerLevels = ['0.1 % w/v', '0.5 % w/v', '1.0 % w/v', '2.0 % w/v'];
  const suitabilityRows: any[] = [];
  const levelRatios: Record<string, number[]> = {};
  organisms.slice(0, 5).forEach(org => {
    neutralizerLevels.forEach((level, i) => {
      let ratioTarget = 0.4 + (i * 0.1); 
      if (i === 3) ratioTarget = 0.95; // Pass nicely
      ratioTarget += (rand() - 0.5) * 0.1;
      
      const inoc = Math.floor(60 + rand() * 30);
      const net = Math.floor(inoc * ratioTarget);
      const samp = Math.floor(rand() * 2);
      const test = net + samp;
      
      const actualRatio = net / inoc;
      if (!levelRatios[level]) levelRatios[level] = [];
      levelRatios[level].push(actualRatio);
      
      suitabilityRows.push({
        organismId: org.id,
        neutralizer: 'Tween 20',
        neutralizerLevel: level,
        testPlate1: test,
        testPlate2: test,
        sampleControl1: samp,
        sampleControl2: samp,
        inoculumControl1: inoc,
        inoculumControl2: inoc,
        _ratio: actualRatio
      });
    });
  });

  let bestLevel = '0.1 %';
  let bestDist = 999;
  for (const level of neutralizerLevels) {
    const ratios = levelRatios[level];
    const allPass = ratios.every((r) => r >= 0.5 && r <= 2.0 && Math.abs(r - 0.5) > 0.05 && Math.abs(r - 2.0) > 0.05);
    if (allPass) {
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const dist = Math.abs(avg - 1.0);
      if (dist < bestDist) {
        bestDist = dist;
        bestLevel = level;
      }
    }
  }

  const isMembrane = overrides?.routineMethodSelected?.toLowerCase().includes('membrane') || (!overrides?.routineMethodSelected && true);
  const dilutions = isMembrane ? ['100 mL (1x rinse)', '100 mL (2x rinse)', '100 mL (3x rinse)'] : ['1:10', '1:50', '1:100'];
  
  const recoveryRows: any[] = [];
  organisms.slice(0, 5).forEach(org => {
    const screeningRow = suitabilityRows.find(r => r.organismId === org.id && r.neutralizerLevel === bestLevel);
    const baseRatio = screeningRow ? screeningRow._ratio : 0.95;
    
    dilutions.forEach((dil, idx) => {
      let ratioTarget = baseRatio;
      if (idx > 0) {
        ratioTarget = baseRatio + (1.0 - baseRatio) * (idx / 2);
      }
      
      const inoc = Math.floor(70 + rand() * 25);
      const net = Math.floor(inoc * ratioTarget);
      const samp = Math.floor(rand() * 2);

      recoveryRows.push({
        organismId: org.id,
        dilution: dil,
        testPlate1: net + samp,
        testPlate2: net + samp + (Math.floor(rand()*5)-2),
        sampleControl1: samp,
        sampleControl2: samp,
        inoculumControl1: inoc,
        inoculumControl2: inoc + (Math.floor(rand()*5)-2)
      });
    });
  });

  const specifiedOrganismRows: MLTSpecifiedOrganismRow[] = organisms
    .filter(o => o.medium62 !== '-')
    .map(org => {
      let enrichment = 'Soybean-Casein Digest Broth';
      if (org.name.includes('Salmonella')) enrichment = 'RVS broth';
      if (org.name.includes('Candida')) enrichment = 'SDB';
      if (org.name.includes('E. coli')) enrichment = 'MacConkey broth';

      let selective = org.medium62.split('->').pop()?.trim() || org.medium62;

      return {
        organismId: org.id,
        enrichmentMedium: enrichment,
        enrichmentLot: 'M101',
        enrichmentExpiry: '31-Dec-2026',
        selectiveMedium: selective,
        selectiveLot: 'M102',
        selectiveExpiry: '31-Dec-2026',
        incubationTemp: org.temp61, // Simplified
        incubationTime: org.time61,
        positiveControl: 'Growth',
        negativeControl: 'No growth',
        testProduct: 'Growth',
        morphology: 'Typical',
        identificationResult: 'Confirmed'
      };
    });

  const baseData: MLTDocumentData = {
    productName,
    strength: safeStrength,
    dosageForm: 'Tablets',
    batchNo: derivedBatch,
    arNo: `AR-${derivedBatch}`,
    mfgDate: formatRelDate(now, -6, 1),
    sampleQty_g: 10,
    protocolNo: codes.documentNo.replace('AMV-', 'MLTP-'),
    protocolDate,
    reportNo: codes.documentNo.replace('AMV-', 'MLTR-'),
    reportDate,
    analysisStartDate,
    analysisEndDate,
    specTAMC_cfu_per_g: 1000,
    specTYMC_cfu_per_g: 100,
    specifiedOrganismsSpec: 'Escherichia coli: Absent in 1 g',
    references: ['USP <61>', 'USP <62>', 'USP <1111>'],
    organisms,
    media,
    equipment,
    samplePrepDiluent: 'Buffered Sodium Chloride-Peptone Solution pH 7.0',
    samplePrepFactor: 10,
    aliquot_mL: 10,
    diluent_mL: 90,
    inoculumCfuPerMl: 800,
    inoculumVolumeAdded_mL: 0.1,
    suitabilityRows,
    recoveryRows,
    controlsRows: [],
    specifiedOrganismRows,
    routineMethodSelected: 'Membrane Filtration',
    companyName: 'Pharma QC Labs',
    preparedBy: 'Microbiologist',
    checkedBy: 'Microbiology Reviewer',
    reviewedBy: 'QA Manager',
    approvedBy: 'Lab Head',
  };
  // Preparation narrative printed above each table.
  const sectionPreparations = buildMLTSectionPreparations({
    productName,
    sampleQuantity: '10 g (or 10 mL)',
    diluentName: '90 mL of sterile Buffered Sodium Chloride-Peptone Solution pH 7.0',
    neutraliser: 'a validated neutralising agent such as polysorbate 80 with lecithin',
    method: 'the pour plate method on Soybean-Casein Digest Agar for bacteria and Sabouraud Dextrose Agar for fungi',
  });

  return { ...baseData, sectionPreparations, ...overrides };
}
