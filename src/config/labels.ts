export const LABELS = {
  HPLC: {
    mobile: "Mobile Phase", 
    detector: "Detector / Wavelength",
    flow: "Flow Rate (mL/min)", 
    program: "Gradient Programme",
    inj: "Injection Volume", 
    temp: "Column Temperature (°C)",
  },
  GC: {
    mobile: "Carrier Gas", 
    detector: "Detector / Detector Temperature",
    flow: "Carrier Gas Flow (mL/min)", 
    program: "Oven Temperature Programme",
    inj: "Injection Volume / Split Ratio", 
    temp: "Injector Temperature (°C)",
  },
  UV: { 
    mobile: "Solvent", 
    detector: "Wavelength (nm)", 
    flow: "—",
    program: "—", 
    inj: "Cell Path Length", 
    temp: "—" 
  },
} as const;
