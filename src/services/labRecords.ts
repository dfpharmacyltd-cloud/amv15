/**
 * Laboratory record generator.
 *
 * Equipment identification numbers, calibration dates and material lot numbers
 * are normally written on the bench. Every document produced by this suite is
 * marked DEMO / FORMAT-DEMONSTRATION ONLY, so these fields are filled with
 * seeded, internally consistent values instead of being left blank: the same
 * product always produces the same records, calibration always precedes the
 * report date, and the due date always follows it.
 */

import { createSeededRandom } from './pharmaMathEngine';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parses a "20-Apr-2026" style date. Falls back to the current date. */
export function parseDocDate(value?: string): Date {
  if (value) {
    const m = String(value).match(/(\d{1,2})[-\s/]([A-Za-z]{3})[a-z]*[-\s/](\d{4})/);
    if (m) {
      const monthIdx = MONTHS.findIndex((mm) => mm.toLowerCase() === m[2].toLowerCase());
      if (monthIdx >= 0) return new Date(Number(m[3]), monthIdx, Number(m[1]));
    }
    const iso = new Date(value);
    if (!isNaN(iso.getTime())) return iso;
  }
  return new Date(2026, 3, 20);
}

export function formatDocDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + days);
  return out;
}

export interface EquipmentRecord {
  idNo: string;
  calibrationDate: string;
  dueDate: string;
}

export interface LabRecordGenerator {
  /** "QC/HPLC/07" style identification number for a named instrument. */
  equipmentId(name: string, index: number): string;
  /** Calibration done in the last few months, due one year later. */
  calibration(name: string, index: number): EquipmentRecord;
  /** Supplier lot number for a reagent or solvent. */
  reagentLot(name: string, index: number): string;
  /** In-house lot number for a working or reference standard. */
  standardLot(substance: string): string;
}

/** Short instrument code taken from the equipment name. */
function equipmentCode(name: string): string {
  const n = name.toLowerCase();
  // Checked before the instrument itself, otherwise "HPLC Column" reads as HPLC.
  if (n.includes('column')) return 'COL';
  if (n.includes('hplc') || n.includes('chromatograph')) return 'HPLC';
  if (n.includes('balance')) return 'BAL';
  if (n.includes('ultrasonic') || n.includes('sonicator')) return 'USB';
  if (n.includes('ph meter') || n.includes('ph-meter')) return 'PHM';
  if (n.includes('glassware') || n.includes('volumetric')) return 'GLW';
  if (n.includes('dissolution')) return 'DIS';
  if (n.includes('incubator')) return 'INC';
  if (n.includes('autoclave')) return 'ACL';
  if (n.includes('laminar') || n.includes('lafu')) return 'LAF';
  if (n.includes('oven')) return 'OVN';
  if (n.includes('centrifuge')) return 'CFG';
  if (n.includes('water bath') || n.includes('bath')) return 'WBT';
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.slice(0, 3) || 'EQP';
}

/** Three letter supplier code so a lot number looks like it came from a label. */
function supplierCode(make: string): string {
  const n = (make || '').toLowerCase();
  if (n.includes('merck')) return 'MER';
  if (n.includes('rankem')) return 'RAN';
  if (n.includes('sigma')) return 'SIG';
  if (n.includes('millipore')) return 'MIL';
  if (n.includes('edqm')) return 'EDQ';
  if (n.includes('usp')) return 'USP';
  if (n.includes('in-house') || n.includes('house')) return 'WCP';
  const letters = (make || 'GEN').replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.slice(0, 3) || 'GEN';
}

export function makeLabRecords(seed: string, reportDate?: string): LabRecordGenerator {
  const reportOn = parseDocDate(reportDate);
  const rand = createSeededRandom(`${seed}_lab_records`);

  return {
    equipmentId(name, index) {
      const code = equipmentCode(name);
      const serial = String(1 + Math.floor(rand() * 40) + index).padStart(2, '0');
      return `QC/${code}/${serial}`;
    },

    calibration(name, index) {
      // Calibrated between one and eight months before the report, valid one year.
      const daysBefore = 30 + Math.floor(rand() * 210) + index;
      const calibratedOn = addDays(reportOn, -daysBefore);
      const dueOn = addDays(calibratedOn, 365);
      return {
        idNo: this.equipmentId(name, index),
        calibrationDate: formatDocDate(calibratedOn),
        dueDate: formatDocDate(dueOn),
      };
    },

    reagentLot(name, index) {
      const made = addDays(reportOn, -(60 + Math.floor(rand() * 300) + index));
      const code = supplierCode(name);
      const serial = String(1000 + Math.floor(rand() * 8999));
      return `${code}${String(made.getMonth() + 1).padStart(2, '0')}${String(made.getFullYear()).slice(2)}-${serial}`;
    },

    standardLot(substance) {
      const letters = (substance || 'STD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'STD';
      const serial = String(100 + Math.floor(rand() * 899));
      return `WS/${letters}/${String(reportOn.getFullYear()).slice(2)}${String(reportOn.getMonth() + 1).padStart(2, '0')}-${serial}`;
    },
  };
}
