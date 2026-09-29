/**
 * Section preparations.
 *
 * Every validation table in the protocol is preceded by the preparation that
 * produces it, written the way a bench method is written: what to weigh, into
 * which flask, in which solvent, and what further dilution to make. The numbers
 * are solved from the working concentration, so the text above the table and
 * the values inside it always describe the same solutions.
 */

import { solveDilution, chooseLinearityStock } from './dilutionSolver';

export interface SectionPreparation {
  /** Explanatory paragraph shown before the steps. */
  intro?: string;
  /** Numbered preparation steps. */
  steps: string[];
}

export interface AMVSectionPreparations {
  systemSuitability: SectionPreparation;
  specificity: SectionPreparation;
  linearity: SectionPreparation;
  accuracy: SectionPreparation;
  precision: SectionPreparation;
  intermediatePrecision: SectionPreparation;
  robustness: SectionPreparation;
  solutionStability: SectionPreparation;
}

export interface PreparationInputs {
  /** "HPLC" or "UV Visible Spectroscopy"; nothing below hard-codes a technique. */
  techniqueName?: string;
  instrumentName?: string;
  activeSubstance: string;
  /** How the working standard is named on its label, e.g. "TIBOLONE BP WS". */
  standardName: string;
  /** Nominal working concentration in µg/mL. */
  workingConc: number;
  diluent: string;
  /** Level percentages actually used for linearity, e.g. [50, 75, 100, 125, 150]. */
  levelPercents: number[];
  /** Label strength in mg per dosage unit. */
  strengthMg: number;
  injectionVolume: string;
  flowRate: string;
  columnTemperature: string;
}

export interface SolvedLevelPreparation {
  levelPercent: number;
  targetConc: number;
  achievedConc: number;
  stockMg: number;
  stockFlaskMl: number;
  dilution: string;
  text: string;
}

/**
 * Solves a real preparation for every linearity level from one weighable stock,
 * and writes each one out in the "For 50 ppm : Weigh accurately about ..." form.
 */
export function solveLinearityPreparations(inputs: PreparationInputs): SolvedLevelPreparation[] {
  const targets = inputs.levelPercents.map((pct) => (inputs.workingConc * pct) / 100);
  const stock = chooseLinearityStock(targets);

  return inputs.levelPercents.map((levelPercent, idx) => {
    const targetConc = targets[idx];
    const dil = solveDilution(stock.stockConc, targetConc);
    const achievedConc = dil.achievedConc;
    return {
      levelPercent,
      targetConc,
      achievedConc,
      stockMg: stock.stockMg,
      stockFlaskMl: stock.finalVolumeMl,
      dilution: dil.description,
      text:
        `For ${levelPercent} % (${achievedConc.toFixed(2)} \u00B5g/mL) : Weigh accurately about ` +
        `${stock.stockMg} mg of ${inputs.standardName} into a ${stock.finalVolumeMl.toFixed(1)} mL volumetric flask, ` +
        `dissolve in about 60 % of the ${inputs.diluent} with sonication and dilute to volume with the same ` +
        `(${stock.stockConc.toFixed(1)} \u00B5g/mL). Further dilute ${dil.description} with ${inputs.diluent}.`,
    };
  });
}

export function buildSectionPreparations(inputs: PreparationInputs): AMVSectionPreparations {
  const {
    activeSubstance,
    standardName,
    workingConc,
    diluent,
    strengthMg,
    injectionVolume,
    flowRate,
    columnTemperature,
  } = inputs;

  const levels = solveLinearityPreparations(inputs);
  const stockMg = levels[0]?.stockMg ?? 25;
  const stockFlask = levels[0]?.stockFlaskMl ?? 100;

  const standardText =
    `Weigh accurately about ${stockMg} mg of ${standardName} into a ${stockFlask.toFixed(1)} mL volumetric flask, ` +
    `dissolve in about 60 % of the ${diluent} with sonication and dilute to volume with the same. ` +
    `Dilute further with ${diluent} to obtain a solution of about ${workingConc.toFixed(1)} \u00B5g/mL.`;

  const sampleText =
    `Weigh 20 dosage units, determine the average weight and finely powder them. Transfer powder equivalent to ` +
    `${strengthMg} mg of ${activeSubstance} into a volumetric flask, add about 70 % of the ${diluent}, sonicate for ` +
    `20 minutes with intermittent shaking, dilute to volume with the same and filter through a 0.45 \u00B5m membrane, ` +
    `discarding the first few mL. Dilute further with ${diluent} to obtain about ${workingConc.toFixed(1)} \u00B5g/mL.`;

  return {
    systemSuitability: {
      intro:
        'System suitability establishes that the chromatographic system is performing adequately before any sample ' +
        'is analysed. The standard preparation is injected repeatedly and the peak response, tailing factor and ' +
        'theoretical plates are recorded from each injection.',
      steps: [
        `1) Standard preparation : ${standardText}`,
        `2) Equilibrate the column with the mobile phase at ${flowRate} and ${columnTemperature} until a stable baseline is obtained.`,
        `3) Inject the ${injectionVolume} of the blank, then five replicate injections of the standard preparation.`,
        '4) Record the peak area, USP tailing factor and theoretical plates of each injection and calculate the mean and the % RSD.',
      ],
    },

    specificity: {
      intro:
        'Specificity demonstrates that the response measured is due to the analyte alone, and that nothing in the ' +
        'blank, the placebo or the sample matrix interferes at the retention time of the analyte.',
      steps: [
        `1) Blank : the ${diluent}, injected alone.`,
        '2) Placebo preparation : quantity of placebo equivalent to that present in the test preparation, carried through the complete sample preparation.',
        `3) Standard preparation : ${standardText}`,
        `4) Sample preparation : ${sampleText}`,
        '5) Inject each solution separately and examine the chromatograms for any peak eluting at the retention time of the analyte. Evaluate the peak purity of the analyte peak using the PDA detector.',
      ],
    },

    linearity: {
      intro:
        'A calibration curve is a general method for determining the concentration of a substance in an unknown ' +
        'sample by comparing it with a set of samples of known concentration. Concentration is plotted along the ' +
        'x-axis and the peak response along the y-axis. Several calibration standards are prepared at different ' +
        'concentrations, each is injected and its area recorded, and the points are plotted and fitted with a ' +
        'straight line. That line is the calibration curve.',
      steps: [
        `A. 1) Prepare five standard solutions with concentrations covering the range of detection ` +
          `(${inputs.levelPercents.join(' %; ')} % of the nominal concentration of ${workingConc.toFixed(1)} \u00B5g/mL), using ${standardName}.`,
        ...levels.map((l) => l.text),
        '2) Inject each level in triplicate, record the mean peak area, and plot the mean area against the concentration.',
        '3) Calculate the correlation coefficient, the coefficient of determination, the slope and the y-intercept by least squares regression, and calculate the y-intercept bias at the 100 % level.',
      ],
    },

    accuracy: {
      intro:
        'Accuracy is established by recovery. A known amount of the working standard is added to the placebo at ' +
        'three concentration levels spanning the range, each in triplicate, and the amount recovered is compared ' +
        'with the amount added.',
      steps: [
        `1) Standard preparation : ${standardText}`,
        `2) Spiked preparations : to a quantity of placebo equivalent to that in the test preparation, add ${activeSubstance} working standard equivalent to 50 %, 100 % and 150 % of the label strength (${(strengthMg * 0.5).toPrecision(3)} mg, ${strengthMg} mg and ${(strengthMg * 1.5).toPrecision(3)} mg).`,
        '3) Prepare three independent preparations at each level, giving nine determinations in all, and carry each through the complete sample preparation.',
        '4) Inject each preparation and calculate the amount recovered and the percentage recovery against the standard preparation.',
      ],
    },

    precision: {
      intro:
        'Method precision expresses the closeness of agreement between a series of measurements obtained from ' +
        'multiple sampling of the same homogeneous sample under the prescribed conditions.',
      steps: [
        `1) Standard preparation : ${standardText}`,
        `2) Sample preparations : prepare six independent preparations from the same batch as described. ${sampleText}`,
        '3) Inject each preparation once, calculate the assay of each and calculate the mean, the standard deviation and the % RSD of the six results.',
      ],
    },

    intermediatePrecision: {
      intro:
        'Intermediate precision expresses the variation that arises within the same laboratory on different days, ' +
        'with a different analyst and a different instrument.',
      steps: [
        `1) A second analyst repeats the method precision study on a different day, on a different ${inputs.instrumentName || 'HPLC system'} and with a different ${/spectro/i.test(inputs.instrumentName || '') ? 'pair of matched cells' : 'column of the same specification'}.`,
        `2) Sample preparations : six independent preparations from the same batch. ${sampleText}`,
        '3) Calculate the mean, the standard deviation and the % RSD for the second analyst, the cumulative % RSD of all twelve determinations, and the absolute difference between the two analyst means.',
      ],
    },

    robustness: {
      intro:
        'Robustness measures the capacity of the method to remain unaffected by small deliberate variations in the ' +
        'chromatographic parameters, and indicates its reliability during normal use.',
      steps: [
        `1) Standard preparation : ${standardText}`,
        `2) Vary one parameter at a time from the normal condition: flow rate \u00B1 0.1 mL/min from ${flowRate}, column temperature \u00B1 2 \u00B0C from ${columnTemperature}, and the mobile phase organic proportion or buffer pH as stated in the table.`,
        '3) Under each varied condition, equilibrate the system and make five replicate injections of the standard preparation.',
        '4) Record the % RSD of peak area, the tailing factor and the theoretical plates under each condition and compare them with the system suitability criteria.',
      ],
    },

    solutionStability: {
      intro:
        'Solution stability establishes the period for which the prepared standard and sample solutions may be ' +
        'held before analysis without a significant change in response.',
      steps: [
        `1) Prepare the standard and sample solutions as described and store them at room temperature, protected from light.`,
        '2) Inject both solutions initially and then at 3, 6, 12, 18 and 24 hours, against a freshly prepared standard.',
        '3) Calculate the cumulative percentage difference in response at each time point against the initial response.',
      ],
    },
  };
}

/* =========================================================================
   RELATED SUBSTANCES
========================================================================= */

export interface RSPreparationInputs {
  activeSubstance: string;
  standardName: string;
  /** Final test concentration in µg/mL. */
  testConc: number;
  sampleWeightMg: number;
  finalVolumeMl: number;
  /** Concentration at the specification limit, µg/mL. */
  limitConc: number;
  /** Reporting threshold as a percentage of the test concentration. */
  disregardPercent: number;
  diluent: string;
  injectionVolume: string;
  /** Preparation text already solved for each linearity level. */
  linearityLevels: { levelName: string; nominalPpm: number; finalDilution: string }[];
}

export function buildRSSectionPreparations(i: RSPreparationInputs): Record<string, SectionPreparation> {
  const testSolution =
    `Weigh and powder 20 dosage units. Transfer powder equivalent to ${i.sampleWeightMg} mg of ${i.activeSubstance} into a ` +
    `${i.finalVolumeMl.toFixed(1)} mL volumetric flask, add about 70 % of the ${i.diluent}, sonicate for 20 minutes with ` +
    `intermittent shaking, dilute to volume with the same and filter through a 0.45 \u00B5m PVDF membrane, discarding the ` +
    `first few mL (${i.testConc.toFixed(1)} \u00B5g/mL).`;

  const referenceSolution =
    `Dilute the test solution stepwise with the ${i.diluent} to obtain a solution containing about ` +
    `${((i.testConc * i.disregardPercent) / 100).toPrecision(3)} \u00B5g/mL, corresponding to the reporting threshold of ` +
    `${i.disregardPercent} % of the test concentration.`;

  return {
    systemSuitability: {
      intro:
        'System suitability is established before the sequence to show that the chromatographic system resolves the ' +
        'analyte from the specified impurities and gives a reproducible response at the specification level.',
      steps: [
        `1) System suitability solution : ${i.activeSubstance} working standard spiked with the available impurity standards at about ${i.limitConc.toPrecision(3)} \u00B5g/mL, which is the specification limit concentration.`,
        `2) Equilibrate the column with the initial mobile phase composition until a stable baseline is obtained.`,
        `3) Inject ${i.injectionVolume} of the blank, then six replicate injections of the system suitability solution.`,
        '4) Record the resolution between the closest eluting pair, the % RSD of peak response, the tailing factor and the theoretical plates.',
      ],
    },

    specificity: {
      intro:
        'Specificity demonstrates that each impurity peak is resolved from the principal peak and from every other ' +
        'peak, and that neither the blank nor the placebo contributes a response at those retention times.',
      steps: [
        `1) Blank : the ${i.diluent}, injected alone.`,
        '2) Placebo preparation : placebo equivalent to that present in the test preparation, taken through the complete sample preparation.',
        `3) Individual impurity solutions : each specified impurity standard prepared separately at about ${i.limitConc.toPrecision(3)} \u00B5g/mL.`,
        `4) Test solution : ${testSolution}`,
        '5) Spiked test solution : the test solution spiked with every specified impurity at the specification limit.',
        '6) Inject each solution, record the retention times and relative retention times, and confirm resolution and peak purity by PDA.',
      ],
    },

    linearityAndRange: {
      intro:
        'Linearity for an impurity method is established from the reporting threshold up to above the specification ' +
        'limit. A stock of the impurity standard is prepared and diluted to each level, the levels are injected, and ' +
        'the peak response is regressed against concentration.',
      steps: [
        `1) Prepare a stock of the impurity standard and dilute it to five levels spanning the validated range, as follows.`,
        ...i.linearityLevels.map(
          (l) => `${l.levelName} \u2014 ${l.nominalPpm} \u00B5g/mL : ${l.finalDilution}.`
        ),
        '2) Inject each level in triplicate and record the mean peak area.',
        '3) Regress the mean area against concentration by least squares and report the correlation coefficient, the coefficient of determination, the slope, the y-intercept and the residual standard deviation.',
      ],
    },

    precision: {
      intro:
        'Precision at the specification level shows that the impurity content obtained from independent preparations ' +
        'of the same batch agrees closely.',
      steps: [
        `1) Reference solution : ${referenceSolution}`,
        `2) Sample preparations : six independent preparations from the same batch. ${testSolution}`,
        '3) Inject each preparation once and calculate the content of each specified impurity as a percentage of the label amount.',
        '4) Calculate the mean, the standard deviation and the % RSD of the six results.',
      ],
    },

    lodLoq: {
      intro:
        'The limit of detection and the limit of quantitation are calculated from the residual standard deviation of ' +
        'the regression line and the slope of the calibration curve, and are then confirmed experimentally by the ' +
        'signal-to-noise ratio of injected solutions at those concentrations.',
      steps: [
        '1) Calculate LOD as 3.3 \u00D7 (residual standard deviation / slope) and LOQ as 10 \u00D7 (residual standard deviation / slope) from the linearity regression.',
        '2) Prepare solutions of the impurity standard at the calculated LOD and LOQ concentrations by serial dilution of the linearity stock.',
        '3) Inject each solution and measure the signal-to-noise ratio against the baseline noise of the blank.',
        '4) At the LOQ level, make six replicate injections and calculate the % RSD of peak area and of the calculated content.',
      ],
    },

    intermediatePrecision: {
      intro:
        'Intermediate precision establishes that the impurity results are unaffected by a change of analyst, day and ' +
        'instrument within the same laboratory.',
      steps: [
        '1) A second analyst repeats the precision study on a different day, on a different HPLC system and with a different column of the same specification.',
        `2) Sample preparations : six independent preparations from the same batch. ${testSolution}`,
        '3) Calculate the mean, the standard deviation and the % RSD for each analyst, the cumulative % RSD of all twelve results, and the absolute difference between the two analyst means.',
      ],
    },

    accuracy: {
      intro:
        'Accuracy is established by spiking the placebo with known amounts of each specified impurity at three levels ' +
        'across the validated range, each in triplicate, and comparing the amount recovered with the amount added.',
      steps: [
        `1) Spiking levels : 50 %, 100 % and 150 % of the specification limit concentration of ${i.limitConc.toPrecision(3)} \u00B5g/mL.`,
        '2) At each level, add the impurity standard to a quantity of placebo equivalent to that in the test preparation, and prepare three independent preparations.',
        `3) Carry each preparation through the complete sample preparation. ${testSolution}`,
        '4) Inject each preparation and calculate the amount recovered and the percentage recovery at each level, then the mean recovery and the % RSD across all nine determinations.',
      ],
    },
  };
}

/* =========================================================================
   DISSOLUTION
========================================================================= */

export interface DissolutionPreparationInputs {
  activeSubstance: string;
  standardName: string;
  labelClaimMg: number;
  apparatus: string;
  mediumName: string;
  mediumVolumeMl: number;
  rpm: string;
  timePointMin: string;
  workingConc: number;
  filterType: string;
}

export function buildDissolutionSectionPreparations(
  i: DissolutionPreparationInputs
): Record<string, SectionPreparation> {
  const standardText =
    `Weigh accurately about ${i.labelClaimMg} mg of ${i.standardName} into a volumetric flask, dissolve in a small ` +
    `volume of the dissolution medium with sonication and dilute to volume with the medium. Dilute further with the ` +
    `medium to obtain about ${i.workingConc.toFixed(1)} \u00B5g/mL, which corresponds to 100 % of the label claim ` +
    `dissolved in ${i.mediumVolumeMl} mL.`;

  return {
    systemSuitability: {
      intro:
        'System suitability establishes that the analytical finish used to measure the dissolved drug is performing ' +
        'correctly before any vessel is sampled.',
      steps: [
        `1) Standard preparation : ${standardText}`,
        '2) Inject or read five replicate preparations of the standard and record the response of each.',
        '3) Calculate the mean response and the % RSD, and record the tailing factor and theoretical plates where a chromatographic finish is used.',
      ],
    },

    specificity: {
      intro:
        'Specificity for a dissolution method shows that neither the dissolution medium nor the placebo contributes ' +
        'to the measured response at the wavelength or retention time of the analyte.',
      steps: [
        `1) Blank : the dissolution medium, ${i.mediumName}.`,
        `2) Placebo preparation : placebo equivalent to that in one dosage unit, added to ${i.mediumVolumeMl} mL of the medium and stirred under the test conditions (${i.apparatus}, ${i.rpm}) for ${i.timePointMin}.`,
        `3) Standard preparation : ${standardText}`,
        `4) Sample preparation : one dosage unit released in ${i.mediumVolumeMl} mL of the medium under the test conditions and sampled at ${i.timePointMin}.`,
        `5) Filter each solution through a ${i.filterType} and measure the response of each, then compare the blank and placebo responses with that of the standard.`,
      ],
    },

    linearity: {
      intro:
        'Linearity is established across the range of the dissolution test, typically from well below the earliest ' +
        'time point up to above the specification, so that every result the test can produce falls inside the ' +
        'validated range.',
      steps: [
        `1) Prepare a stock of ${i.standardName} in the dissolution medium equivalent to the label claim of ${i.labelClaimMg} mg dissolved in ${i.mediumVolumeMl} mL.`,
        '2) Dilute the stock with the medium to five levels covering the range stated in the table below, each corresponding to a percentage of the label claim dissolved.',
        '3) Measure each level in triplicate and record the mean response.',
        '4) Regress the mean response against concentration and report the correlation coefficient, the slope and the y-intercept.',
      ],
    },

    filterSuitability: {
      intro:
        'Filter suitability shows that the filter used to clarify the withdrawn sample neither adsorbs the drug nor ' +
        'releases anything that interferes with the measurement.',
      steps: [
        `1) Prepare a standard solution at about 100 % of the expected dissolved concentration in the medium.`,
        `2) Divide the solution: measure one part after centrifugation and the other after filtration through the ${i.filterType}, discarding the first few mL.`,
        '3) Repeat with a sample solution withdrawn from a dissolution vessel.',
        '4) Calculate the percentage difference between the filtered and the unfiltered response for both the standard and the sample.',
      ],
    },

    precision: {
      intro:
        'Precision is established by running a full set of six vessels and calculating the agreement between the ' +
        'individual percentages dissolved.',
      steps: [
        `1) Set up six vessels of the ${i.apparatus} with ${i.mediumVolumeMl} mL of ${i.mediumName}, equilibrated to 37 \u00B1 0.5 \u00B0C, at ${i.rpm}.`,
        '2) Introduce one dosage unit into each vessel and start the apparatus.',
        `3) At ${i.timePointMin}, withdraw an aliquot from the standard sampling zone of each vessel and filter through the ${i.filterType}, discarding the first few mL.`,
        `4) Measure each filtrate against the standard preparation and calculate the percentage of the label claim dissolved in each vessel, then the mean and the % RSD of the six results.`,
      ],
    },

    intermediatePrecision: {
      intro:
        'Intermediate precision repeats the six vessel study under changed laboratory conditions to show that the ' +
        'result does not depend on the analyst, the day or the equipment used.',
      steps: [
        '1) A second analyst repeats the study on a different day, on a different dissolution apparatus and with a different lot of medium.',
        `2) Run six vessels as described and calculate the percentage dissolved in each.`,
        '3) Calculate the mean and % RSD for each analyst, the cumulative % RSD of the twelve vessels and the absolute difference between the two means.',
      ],
    },

    accuracy: {
      intro:
        'Accuracy is established by recovery from the medium: a known amount of the working standard is added to the ' +
        'placebo in the vessel at three levels across the range and the amount recovered is compared with that added.',
      steps: [
        `1) Add placebo equivalent to one dosage unit to each vessel containing ${i.mediumVolumeMl} mL of ${i.mediumName}.`,
        `2) Spike each vessel with ${i.standardName} equivalent to 50 %, 100 % and 130 % of the label claim of ${i.labelClaimMg} mg, three vessels at each level.`,
        `3) Operate the apparatus under the test conditions, withdraw and filter through the ${i.filterType}.`,
        '4) Measure each filtrate against the standard and calculate the percentage recovery at each level, the mean recovery and the % RSD.',
      ],
    },

    robustness: {
      intro:
        'Robustness measures the effect of small deliberate changes in the dissolution and measurement conditions on ' +
        'the result.',
      steps: [
        `1) Vary one condition at a time from the normal test: rotation speed \u00B1 5 % of ${i.rpm}, medium volume \u00B1 2 %, medium temperature \u00B1 0.5 \u00B0C and, where applicable, medium pH \u00B1 0.05.`,
        '2) Under each varied condition run the required vessels and measure the percentage dissolved.',
        '3) Compare the mean percentage dissolved under each condition with that obtained under the normal condition.',
      ],
    },

    solutionStability: {
      intro:
        'Solution stability establishes how long the withdrawn and filtered sample solutions, and the standard ' +
        'solution, may be held before measurement.',
      steps: [
        '1) Prepare the standard and sample solutions as described and hold them at room temperature, protected from light.',
        '2) Measure both solutions initially and then at the intervals stated in the table, against a freshly prepared standard.',
        '3) Calculate the cumulative percentage difference in response at each interval against the initial value.',
      ],
    },
  };
}

/* =========================================================================
   MICROBIAL LIMIT TEST
========================================================================= */

export interface MLTPreparationInputs {
  productName: string;
  /** Sample quantity taken for the test, e.g. "10 g". */
  sampleQuantity: string;
  diluentName: string;
  neutraliser: string;
  method: string;
}

export function buildMLTSectionPreparations(i: MLTPreparationInputs): Record<string, SectionPreparation> {
  return {
    recovery: {
      intro:
        'Method suitability establishes that the product, at the dilution used for the test, does not inhibit the ' +
        'growth of the challenge organisms. Each organism is inoculated at not more than 100 cfu into the prepared ' +
        'sample and the recovery is compared with an inoculum control carried through the same procedure without ' +
        'the product.',
      steps: [
        `1) Sample preparation : transfer ${i.sampleQuantity} of ${i.productName} into ${i.diluentName} to give the 1:10 dilution, and mix until uniformly dispersed. Where the product is inhibitory, prepare the further dilutions stated in the table or add ${i.neutraliser}.`,
        '2) Inoculum preparation : prepare a suspension of each challenge organism and adjust it so that the volume added delivers not more than 100 cfu.',
        `3) Test plates : inoculate the prepared sample with each organism separately and plate by ${i.method}, in duplicate.`,
        '4) Inoculum control : plate the same inoculum volume without the product, in duplicate.',
        '5) Sample control : plate the prepared sample without inoculum, in duplicate, to establish the inherent count.',
        '6) Incubate as specified for each organism, count the colonies and calculate the net test count, the recovery percentage and the ratio against the inoculum control.',
      ],
    },

    suitability: {
      intro:
        'The test for specified micro-organisms is shown to be suitable by demonstrating that each organism is ' +
        'detected in the presence of the product, that the positive control grows and that the negative control ' +
        'shows no growth.',
      steps: [
        `1) Prepare the sample as described and transfer it to the enrichment broth specified for each organism.`,
        '2) Positive control : inoculate the enrichment broth containing the product with not more than 100 cfu of the relevant organism.',
        '3) Negative control : the enrichment broth and the diluent alone, without product and without inoculum.',
        '4) Incubate, subculture onto the selective medium stated for each organism, and examine the colonies for the characteristic appearance.',
        '5) Confirm the identity of the recovered organisms and record growth or absence of growth for each control and for the test product.',
      ],
    },
  };
}
