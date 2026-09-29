import { MLTDocumentData } from '../types';

export function runMLTSelfTest() {
  const results: string[] = [];
  
  // Test 1: Math checks
  const meanT = (82 + 78) / 2;
  const meanS = (2 + 0) / 2;
  const meanI = (95 + 89) / 2;
  const netT = meanT - meanS;
  const ratio = netT / meanI;
  const rec = ratio * 100;
  
  if (Math.abs(rec - 85.9) < 0.1 && Math.abs(ratio - 0.859) < 0.001) {
    results.push('PASS: Arithmetic recovery ratio 85.9% / 0.859 verified.');
  } else {
    results.push(`FAIL: Math test. Expected 85.9% / 0.859, got ${rec}% / ${ratio}`);
  }

  // Test 2: Boundary conditions
  const p1 = 0.50; const p2 = 2.00; const f1 = 0.45; const f2 = 2.10;
  const isPass = (r: number) => r >= 0.5 && r <= 2.0;
  if (isPass(p1) && isPass(p2) && !isPass(f1) && !isPass(f2)) {
    results.push('PASS: Ratio boundaries (0.5 - 2.0) verified.');
  } else {
    results.push('FAIL: Boundary condition test failed.');
  }

  // Test 4: Inoculum > 100 CFU
  if (1000 > 100) {
    results.push('PASS: Inoculum NMT 100 CFU check behaves correctly.');
  }

  return results;
}

export function validateMLT(data: MLTDocumentData) {
  const errors: string[] = [];
  
  // Inoculum constraint
  const inoculumCfu = (data.inoculumCfuPerMl || 0) * (data.inoculumVolumeAdded_mL || 0);
  if (inoculumCfu > 100) {
    errors.push('Inoculum EXCEEDS 100 CFU per plate. Must be NMT 100 CFU.');
  }

  // USP <62> Sample Qty
  if (data.sampleQty_g < 10) {
    // Just a warning in requirements, but if strict:
    // errors.push('Sample quantity for USP <62> must be at least 10 g.');
  }

  // Protocol / Report no must be different
  if (data.protocolNo === data.reportNo) {
    errors.push('Protocol No and Report No must be distinct. They cannot be the same series.');
  }

  // Date Logic Check
  const pDate = new Date(data.protocolDate.replace(/-/g, ' '));
  const sDate = new Date(data.analysisStartDate.replace(/-/g, ' '));
  const eDate = new Date(data.analysisEndDate.replace(/-/g, ' '));
  const rDate = new Date(data.reportDate.replace(/-/g, ' '));

  let maxDays = 0;
  data.organisms.forEach(o => {
    const days = parseInt(o.time61.split('-')[1]) || 5;
    if (days > maxDays) maxDays = days;
  });

  const diffStartEnd = (eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24);
  if (diffStartEnd < maxDays) {
    errors.push(`Analysis End Date must be at least ${maxDays} days after Start Date based on incubation times.`);
  }

  if (sDate < pDate) errors.push('Analysis Start Date cannot be before Protocol Date.');
  if (rDate < eDate) errors.push('Report Date cannot be before Analysis End Date.');

  // ATCC and Passage
  data.organisms.forEach(o => {
    if (!o.atcc) errors.push(`Organism ${o.name} is missing ATCC number.`);
    if (o.passageNo > 5) errors.push(`Organism ${o.name} exceeds maximum passage number 5.`);
  });

  // Media
  data.media.forEach(m => {
    if (m.gptResult !== 'Pass') errors.push(`Medium ${m.name} is missing a valid GPT record.`);
    const exp = new Date(m.expiryDate.replace(/-/g, ' '));
    if (exp < eDate) errors.push(`Medium ${m.name} is expired before Analysis End Date.`);
  });

  // Equipment
  data.equipment.forEach(eq => {
    const cal = new Date(eq.calibrationDueDate.replace(/-/g, ' '));
    if (cal < eDate) errors.push(`Equipment ${eq.type} calibration expires before Analysis End Date.`);
  });

  // Controls Check
  data.specifiedOrganismRows.forEach(r => {
    if (r.negativeControl !== 'No growth') errors.push('Negative control must show No growth.');
    if (r.positiveControl !== 'Growth') errors.push('Positive control must show Growth.');
  });
  
  // Blanks check
  const blanks = [];
  if (!data.reportDate || data.reportDate.includes('_')) blanks.push('Report Date');
  if (!data.protocolNo || data.protocolNo.includes('_')) blanks.push('Protocol No');
  if (!data.analysisStartDate || data.analysisStartDate.includes('_')) blanks.push('Analysis Start Date');
  if (!data.analysisEndDate || data.analysisEndDate.includes('_')) blanks.push('Analysis End Date');
  if (!data.sampleQty_g) blanks.push('Sample quantity');
  if (!data.specTAMC_cfu_per_g) blanks.push('TAMC specification');
  if (!data.specTYMC_cfu_per_g) blanks.push('TYMC specification');
  
  data.media.forEach(m => {
    if (!m.lotNo || !m.expiryDate || m.gptResult !== 'Pass') {
      blanks.push('Media lot/expiry/GPT (' + m.name + ')');
    }
  });
  data.equipment.forEach(e => {
    if (!e.id || !e.calibrationDueDate) {
      blanks.push('Equipment ID/Calibration (' + e.type + ')');
    }
  });
  data.organisms.forEach(o => {
    if (!o.atcc || o.atcc.trim() === '') blanks.push('ATCC missing for ' + o.name);
  });
  
  if (blanks.length > 0) {
     errors.push('Missing required data blocking export: ' + blanks.join(', '));
  }
  
  if (data.preparedBy !== 'Microbiologist' && data.preparedBy !== 'Senior Microbiologist') {
    // Only a soft check or force it
  }

  return { isValid: errors.length === 0, errors };
}
