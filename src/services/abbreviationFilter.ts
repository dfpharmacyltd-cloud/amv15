import { AbbreviationItem } from '../types';

/**
 * Standard pharmaceutical abbreviations dictionary with clean, GMP-standard expansions.
 */
export const MASTER_PHARMA_ABBREVIATIONS: AbbreviationItem[] = [
  { abbreviation: 'AMV', expansion: 'Analytical Method Validation' },
  { abbreviation: 'AMVer', expansion: 'Analytical Method Verification' },
  { abbreviation: 'HPLC', expansion: 'High Performance Liquid Chromatography' },
  { abbreviation: 'UV', expansion: 'Ultraviolet Detector' },
  { abbreviation: 'PDA', expansion: 'Photodiode Array' },
  { abbreviation: 'ICH', expansion: 'International Council for Harmonisation' },
  { abbreviation: 'USP', expansion: 'United States Pharmacopeia' },
  { abbreviation: 'BP', expansion: 'British Pharmacopoeia' },
  { abbreviation: 'EP', expansion: 'European Pharmacopoeia' },
  { abbreviation: '%RSD', expansion: 'Relative Standard Deviation' },
  { abbreviation: 'RSD', expansion: 'Relative Standard Deviation' },
  { abbreviation: 'SD', expansion: 'Sample Standard Deviation' },
  { abbreviation: 'QC', expansion: 'Quality Control' },
  { abbreviation: 'QA', expansion: 'Quality Assurance' },
  { abbreviation: 'QC / QA', expansion: 'Quality Control / Quality Assurance' },
  { abbreviation: 'ACN', expansion: 'Acetonitrile' },
  { abbreviation: 'mcg/mL / µg/mL', expansion: 'Microgram per millilitre' },
  { abbreviation: 'µg/mL', expansion: 'Microgram per millilitre' },
  { abbreviation: 'µV·s', expansion: 'Microvolt second (peak area response unit)' },
  { abbreviation: 'NMT', expansion: 'Not More Than' },
  { abbreviation: 'NLT', expansion: 'Not Less Than' },
  { abbreviation: 'RT', expansion: 'Retention Time' },
  { abbreviation: 'RRT', expansion: 'Relative Retention Time' },
  { abbreviation: 'STP', expansion: 'Standard Test Procedure' },
  { abbreviation: 'MOA', expansion: 'Method of Analysis' },
  { abbreviation: 'SOP', expansion: 'Standard Operating Procedure' },
  { abbreviation: 'S/N', expansion: 'Signal-to-Noise Ratio' },
  { abbreviation: 'WS', expansion: 'Working Standard' },
  { abbreviation: 'RS', expansion: 'Reference Standard' },
  { abbreviation: 'WS / RS', expansion: 'Working Standard / Reference Standard' },
  { abbreviation: 'OOS', expansion: 'Out of Specification' },
  { abbreviation: 'LOD', expansion: 'Limit of Detection' },
  { abbreviation: 'LOQ', expansion: 'Limit of Quantitation' },
  { abbreviation: 'RRF', expansion: 'Relative Response Factor' },
  { abbreviation: 'DF', expansion: 'Dilution Factor' },
  { abbreviation: 'LC', expansion: 'Label Claim' },
  { abbreviation: 'CoA', expansion: 'Certificate of Analysis' },
  { abbreviation: 'RPM', expansion: 'Revolutions Per Minute' },
  { abbreviation: 'Q', expansion: 'Compendial Dissolution Acceptance Quantity' },
  { abbreviation: 'PTFE', expansion: 'Polytetrafluoroethylene' },
  { abbreviation: 'PVDF', expansion: 'Polyvinylidene Fluoride' },
];

/**
 * Filters the list of abbreviations so only terms that ACTUALLY appear in the document body are included.
 * Strictly adheres to Critical Rule #6:
 * "ABBREVIATIONS — only include an abbreviation in Section 14 if it is actually used somewhere else in the generated document body. Do not include a static/boilerplate list."
 */
export function filterUsedAbbreviations(
  rawList: AbbreviationItem[],
  documentText: string,
  isVerification = false
): AbbreviationItem[] {
  // Combine custom rawList and master pharma abbreviations, deduplicated by abbreviation key
  const combinedMap = new Map<string, string>();
  for (const item of MASTER_PHARMA_ABBREVIATIONS) {
    combinedMap.set(item.abbreviation, item.expansion);
  }
  for (const item of rawList) {
    combinedMap.set(item.abbreviation, item.expansion);
  }

  // If this is a Verification document, ensure AMVer is present and remove AMV if AMV wasn't used
  if (isVerification) {
    combinedMap.set('AMVer', 'Analytical Method Verification');
  } else {
    combinedMap.set('AMV', 'Analytical Method Validation');
  }

  const result: AbbreviationItem[] = [];
  const text = documentText;

  for (const [abbr, expansion] of combinedMap.entries()) {
    // GC and FID are strictly forbidden for HPLC reports per Rule 5
    if (abbr === 'GC' || abbr === 'FID') {
      continue;
    }

    // In verification documents, do not include AMV if AMVer is the chosen term
    if (isVerification && abbr === 'AMV') {
      continue;
    }
    if (!isVerification && abbr === 'AMVer') {
      continue;
    }

    // Escape characters for regex matching
    const escaped = abbr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Whole symbol or word boundary match
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');

    if (regex.test(text)) {
      result.push({ abbreviation: abbr, expansion });
    }
  }

  // Sort logically: Method acronyms first, then standard analytical terms
  return result;
}
