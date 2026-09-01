/**
 * Medical calculation utilities for Vancomycin and Bactrim
 */

export interface PatientData {
  age: number;
  sex: 'male' | 'female';
  weight: number; // kg
  height: number; // cm
  scr: number; // umol/L
}

/**
 * Calculate Ideal Body Weight (IBW)
 * Male: 50 + (0.91 x (height - 152.4))
 * Female: 45.5 + (0.91 x (height - 152.4))
 */
export function calculateIBW(sex: 'male' | 'female', heightCm: number): number {
  const baseWeight = sex === 'male' ? 50 : 45.5;
  const ibw = baseWeight + 0.91 * (heightCm - 152.4);
  return Math.max(ibw, 0);
}

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

/**
 * Determine which weight to use for CrCl and dosing
 * - Use ABW if TBW < IBW
 * - Use ABW for non-obese
 * - Use AdjBW for obese (TBW > 1.2 * IBW or BMI > 30)
 */
export function getDosingWeight(actualWeight: number, ibw: number, heightCm: number): { weight: number; type: string } {
  const bmi = calculateBMI(actualWeight, heightCm);
  const isObese = actualWeight > (1.2 * ibw) || bmi > 30;

  if (actualWeight < ibw) {
    return { weight: actualWeight, type: 'Actual (Underweight)' };
  }
  if (isObese) {
    const adjbw = ibw + 0.4 * (actualWeight - ibw);
    return { weight: adjbw, type: 'Adjusted (Obese)' };
  }
  return { weight: actualWeight, type: 'Actual (Non-obese)' };
}

/**
 * Calculate Creatinine Clearance (Cockcroft-Gault)
 * Male: [(140-age) x weight x 1.23] / SCr
 * Female: [(140-age) x weight x 1.04] / SCr
 */
export function calculateCrCl(patient: PatientData): number {
  const ibw = calculateIBW(patient.sex, patient.height);
  const dosingWeight = getDosingWeight(patient.weight, ibw, patient.height).weight;
  
  const factor = patient.sex === 'male' ? 1.23 : 1.04;
  const crcl = ((140 - patient.age) * dosingWeight * factor) / patient.scr;
  
  return crcl;
}

/**
 /**
 * Vancomycin Loading Dose
 * - For pure obese (non-HD): 25-30 mg/kg based on Total Body Weight (Actual Body Weight), cap/alert at 3g.
 * - For HD patients: 25-30 mg/kg (use Dosing Weight/AdjBW if obese, Actual Weight if non-obese).
 * - For non-obese standard patients: 25-30 mg/kg based on Actual Body Weight.
 */
export function calculateVancoLoadingDose(
  actualWeight: number,
  dosingWeight: number,
  isObese: boolean,
  isHD: boolean,
  mgKg: number = 25
): { dose: number; range: string; usedWeight: number; usedWeightType: string; isCapped: boolean; alertMessage?: string } {
  let weightToUse = actualWeight;
  let weightType = "Total Body Weight (ABW)";

  if (isHD) {
    if (isObese) {
      weightToUse = dosingWeight;
      weightType = "Dosing Weight (AdjBW) for HD + Obesity";
    } else {
      weightToUse = actualWeight;
      weightType = "Total Body Weight (ABW) for HD";
    }
  } else {
    if (isObese) {
      weightToUse = actualWeight; // "For pure obese only, loading dose is also 25-30 mg/kg based on total body weight"
      weightType = "Total Body Weight (ABW) for Pure Obesity";
    } else {
      weightToUse = actualWeight;
      weightType = "Total Body Weight (ABW)";
    }
  }

  const minDose = weightToUse * 25;
  const maxDose = weightToUse * 30;
  const targetDose = weightToUse * mgKg;
  let roundedDose = Math.round(targetDose / 250) * 250;

  let isCapped = false;
  let alertMessage = undefined;
  if (roundedDose > 3000) {
    alertMessage = "Dose exceeds the maximum recommended single loading dose of 3g (3000 mg). Capped at 3g.";
    roundedDose = 3000;
    isCapped = true;
  }

  return {
    dose: roundedDose,
    range: `${Math.round(minDose)} - ${Math.round(Math.min(maxDose, 3000))} mg`,
    usedWeight: weightToUse,
    usedWeightType: weightType,
    isCapped,
    alertMessage
  };
}

/**
 * Vancomycin Maintenance Dose
 * Default 15 mg/kg/dose (actual body weight), range 15-20
 */
export function calculateVancoMaintenance(crcl: number, actualWeight: number, mgKg: number = 15, isAnuric: boolean = false): { dose: number; interval: number; range: string } {
  let interval = 12;
  
  if (isAnuric) {
    interval = 0; // PRN
  } else if (crcl > 80) interval = 8;
  else if (crcl >= 55) interval = 12;
  else if (crcl >= 35) interval = 24;
  else if (crcl >= 20) interval = 48;
  else interval = 0; // PRN

  const minDose = actualWeight * 15;
  const maxDose = actualWeight * 20;
  const targetDose = actualWeight * mgKg;
  let dose = Math.round(targetDose / 250) * 250;
  
  // Cap at 2000mg per dose
  dose = Math.min(dose, 2000);

  return { 
    dose, 
    interval, 
    range: `${Math.round(minDose)} - ${Math.round(Math.min(maxDose, 2000))} mg` 
  };
}

/**
 * Vancomycin Administration Details
 * Special HD dilution rules:
 * - < 1g: dilute in 100 ml NS, start on last hour of HD.
 * - >= 1g: dilute in 200 ml, start on last hour of HD and continue 1 hour post-HD.
 */
export function getVancoAdminDetails(dose: number, isHD: boolean = false): { diluent: string; time: string; conc: string; instruction?: string } {
  if (isHD) {
    if (dose < 1000) {
      const conc = (dose / 100).toFixed(1);
      return {
        diluent: "100 mL NS",
        time: "1 hour",
        conc: `${conc} mg/mL`,
        instruction: "Dilute in 100 mL NS. Start on last hour of HD."
      };
    } else {
      const conc = (dose / 200).toFixed(1);
      return {
        diluent: "200 mL NS",
        time: "2 hours",
        conc: `${conc} mg/mL`,
        instruction: "Dilute in 200 mL NS. Start on last hour of HD and continue 1 hour post-HD."
      };
    }
  }

  let diluent = 0;
  let time = "";
  
  if (dose < 500) {
    diluent = 100;
    time = "1 hour";
  } else if (dose <= 1000) {
    diluent = 250;
    time = "2 hours";
  } else if (dose <= 2000) {
    diluent = 300; // 200-400 range
    time = "3-4 hours";
  } else {
    diluent = 500; // 500-600 range
    time = "5-6 hours";
  }
  
  const conc = (dose / diluent).toFixed(1);
  return { 
    diluent: `${diluent} mL`, 
    time, 
    conc: `${conc} mg/mL`,
    instruction: `Dilute in ${diluent} mL, infuse over ${time}.`
  };
}

/**
 * Vancomycin Pharmacokinetics (PK) Parameters
 */
export interface VancoPK {
  vd: number;      // L
  cl: number;      // L/h
  ke: number;      // h^-1
  halfLife: number; // h
}

/**
 * Calculate Population Vancomycin PK
 * Vd = 0.7 L/kg (Actual Weight)
 * Cl = (0.695 * CrCl + 0.05) mL/min (Matzke)
 */
export function calculateVancoPopPK(actualWeight: number, crcl: number, vdCoeff: number = 0.7, isAnuric: boolean = false): VancoPK {
  const vd = vdCoeff * actualWeight;
  let cl_ml_min = (0.695 * crcl) + 0.05;
  
  if (isAnuric) {
    cl_ml_min = 0.05; // Base non-renal clearance
  }

  const cl_l_h = cl_ml_min * 0.06;
  const ke = cl_l_h / vd;
  const halfLife = 0.693 / ke;

  return { vd, cl: cl_l_h, ke, halfLife };
}

/**
 * Predict Vancomycin Levels (Steady State)
 * One-compartment model with 1-hour post-infusion distribution phase
 */
export function predictVancoLevels(
  dose: number, 
  interval: number, 
  pk: VancoPK, 
  tInfusion: number = 2,
  mic: number = 1
): { cmax: number; cEndOfInfusion: number; cmin: number; auc24: number; aucMic: number } {
  const { ke, vd, cl } = pk;
  
  const tau = interval;
  const tinf = tInfusion;
  
  const accumulationFactor = 1 / (1 - Math.exp(-ke * tau));
  const infusionFactor = (1 - Math.exp(-ke * tinf)) / (ke * tinf);
  
  // Concentration at the exact end of IV infusion (t = tinf)
  const cEndOfInfusion = (dose / vd) * accumulationFactor * infusionFactor;
  
  // True Clinical Peak (Cmax) sampled 1 hour after infusion completion (post-distribution)
  const cmax = cEndOfInfusion * Math.exp(-ke * 1.0);
  
  // Trough (Cmin) sampled immediately prior to the next dose (t = tau)
  const cmin = cEndOfInfusion * Math.exp(-ke * (tau - tinf));
  
  const dailyDose = dose * (24 / interval);
  const auc24 = dailyDose / cl;
  const aucMic = auc24 / mic;

  return { cmax, cEndOfInfusion, cmin, auc24, aucMic };
}

/**
 * Vancomycin Regimen Comparison Option
 */
export interface VancoDosingOption {
  dose: number;
  mgKg: number;
  totalDailyDose: number;
  interval: number;
  cmax: number;            // 1h post-infusion peak
  cEndOfInfusion: number;
  cmin: number;            // Trough
  auc24: number;
  aucMic: number;
  clinicalTag: string;
  suitability: 'standard_target' | 'high_target' | 'low' | 'high_risk';
  description: string;
}

/**
 * Generate multiple dosing regimen comparisons (500mg - 2000mg) for Vancomycin
 */
export function getVancoDosingOptions(
  actualWeight: number,
  interval: number,
  pk: VancoPK,
  tInfusion: number = 2,
  mic: number = 1
): VancoDosingOption[] {
  if (!interval || interval <= 0 || !pk || pk.cl <= 0) return [];

  const standardDoses = [500, 750, 1000, 1250, 1500, 1750, 2000];
  
  return standardDoses.map(dose => {
    const levels = predictVancoLevels(dose, interval, pk, tInfusion, mic);
    const mgKg = +(dose / actualWeight).toFixed(1);
    const totalDailyDose = dose * (24 / interval);
    
    let suitability: 'standard_target' | 'high_target' | 'low' | 'high_risk' = 'low';
    let clinicalTag = '';
    let description = '';

    if (levels.cmin >= 10 && levels.cmin <= 15) {
      suitability = 'standard_target';
      clinicalTag = 'Standard Target (10–15 mg/L)';
      description = `Optimal for moderate infections, cellulitis, UTI, and standard bacteremia (AUC/MIC: ${levels.aucMic.toFixed(0)}).`;
    } else if (levels.cmin > 15 && levels.cmin <= 20) {
      suitability = 'high_target';
      clinicalTag = 'Severe MRSA Target (15–20 mg/L)';
      description = `Recommended for severe MRSA, hospital pneumonia, osteomyelitis, endocarditis, or CNS infections (AUC/MIC: ${levels.aucMic.toFixed(0)}).`;
    } else if (levels.cmin < 10) {
      suitability = 'low';
      clinicalTag = 'Sub-therapeutic (< 10 mg/L)';
      description = `Risk of clinical failure and emergence of resistance (Trough: ${levels.cmin.toFixed(1)} mg/L).`;
    } else {
      suitability = 'high_risk';
      clinicalTag = 'Above Target (> 20 mg/L)';
      description = `Increased risk of nephrotoxicity / AKI (Trough: ${levels.cmin.toFixed(1)} mg/L, AUC: ${levels.auc24.toFixed(0)}).`;
    }

    return {
      dose,
      mgKg,
      totalDailyDose,
      interval,
      cmax: levels.cmax,
      cEndOfInfusion: levels.cEndOfInfusion,
      cmin: levels.cmin,
      auc24: levels.auc24,
      aucMic: levels.aucMic,
      clinicalTag,
      suitability,
      description
    };
  });
}

/**
 * Gentamicin / Tobramycin Dosing Calculator
 */
export interface AminoglycosideResult {
  drug: 'gentamicin' | 'amikacin';
  dose: number;
  interval: number;
  frequencyText: string;
  regimenType: string;
  targetPeak: string;
  targetTrough: string;
  infusionTime: string;
  samplingTime: string;
  dosingWeightUsed: number;
  dosingWeightType: string;
  note: string;
}

export function calculateGentamicinDose(
  actualWeight: number,
  ibw: number,
  crcl: number,
  regimen: 'hartford' | 'conventional' | 'synergy' = 'hartford'
): AminoglycosideResult {
  // Dosing weight: if actual > 1.2 * IBW, use AdjBW = IBW + 0.4*(ABW - IBW)
  let dosingWeight = actualWeight;
  let weightType = "Actual Body Weight (ABW)";
  if (actualWeight > 1.2 * ibw) {
    dosingWeight = ibw + 0.4 * (actualWeight - ibw);
    weightType = "Adjusted Body Weight (AdjBW 0.4)";
  }

  if (regimen === 'hartford') {
    // Hartford Extended-Interval: 7 mg/kg (or 5 mg/kg)
    const rawDose = dosingWeight * 7;
    const dose = Math.round(rawDose / 20) * 20; // Round to nearest 20-40mg
    let interval = 24;
    let freq = "q24h (Once Daily)";

    if (crcl >= 60) {
      interval = 24;
      freq = "q24h (Once daily)";
    } else if (crcl >= 40) {
      interval = 36;
      freq = "q36h (Extended interval)";
    } else if (crcl >= 20) {
      interval = 48;
      freq = "q48h (Extended interval)";
    } else {
      interval = 0;
      freq = "Conventional / Level-guided PRN (CrCl < 20 mL/min)";
    }

    return {
      drug: 'gentamicin',
      dose,
      interval,
      frequencyText: freq,
      regimenType: "Extended-Interval (Hartford 7 mg/kg)",
      targetPeak: "16 – 24 mg/L (Concentration-dependent kill)",
      targetTrough: "< 1.0 mg/L (Pre-dose / 18–24h post-infusion)",
      infusionTime: "Infuse over 30 – 60 minutes in 100 mL NS/D5W",
      samplingTime: "Random level 6–14 hours after start of first infusion (plot on Hartford Nomogram), or trough 30m prior to next dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Hartford once-daily maximizes Cmax/MIC bactericidal killing with prolonged post-antibiotic effect (PAE) and lowers nephrotoxicity risk."
    };
  } else if (regimen === 'synergy') {
    // Gram-Positive Enterococcal / Streptococcal Endocarditis Synergy: 1 mg/kg q8h (or 3 mg/kg OD)
    const rawDose = dosingWeight * 1.0;
    const dose = Math.round(rawDose / 10) * 10;
    let interval = 8;
    let freq = "q8h (TDS)";
    if (crcl < 30) {
      interval = 24;
      freq = "q24h (OD - Renal adjusted)";
    } else if (crcl < 50) {
      interval = 12;
      freq = "q12h (BD - Renal adjusted)";
    }

    return {
      drug: 'gentamicin',
      dose,
      interval,
      frequencyText: freq,
      regimenType: "Gram-Positive Synergy (1 mg/kg)",
      targetPeak: "3 – 5 mg/L (Sample drawn 1h post-infusion)",
      targetTrough: "< 1.0 mg/L (Pre-dose trough)",
      infusionTime: "Infuse over 30 minutes in 50–100 mL NS",
      samplingTime: "Peak 1h post-infusion; Trough 30 mins before 3rd or 4th dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Low-dose synergy with beta-lactams or vancomycin for Enterococcal/Streptococcal endocarditis."
    };
  } else {
    // Conventional Multiple Daily Dosing: 1.5 - 2 mg/kg loading, then 1.5 mg/kg q8h
    const rawDose = dosingWeight * 1.7;
    const dose = Math.round(rawDose / 20) * 20;
    let interval = 8;
    let freq = "q8h (TDS)";
    if (crcl < 30) {
      interval = 24;
      freq = "q24h (OD)";
    } else if (crcl < 60) {
      interval = 12;
      freq = "q12h (BD)";
    }

    return {
      drug: 'gentamicin',
      dose,
      interval,
      frequencyText: freq,
      regimenType: "Conventional Multiple Daily Dosing (1.5–2 mg/kg)",
      targetPeak: "5 – 10 mg/L (Peak 1h post-infusion)",
      targetTrough: "< 2.0 mg/L (< 1.0 mg/L preferred)",
      infusionTime: "Infuse over 30 – 60 minutes in 100 mL NS",
      samplingTime: "Peak: 1h after completion of 30-min infusion. Trough: ≤ 30 mins prior to next dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Traditional multiple-daily dosing for patients not qualifying for extended-interval (e.g. ascites, pregnancy, severe burns, CrCl < 20)."
    };
  }
}

/**
 * Amikacin Dosing Calculator
 */
export function calculateAmikacinDose(
  actualWeight: number,
  ibw: number,
  crcl: number,
  regimen: 'extended' | 'conventional' = 'extended'
): AminoglycosideResult {
  let dosingWeight = actualWeight;
  let weightType = "Actual Body Weight (ABW)";
  if (actualWeight > 1.2 * ibw) {
    dosingWeight = ibw + 0.4 * (actualWeight - ibw);
    weightType = "Adjusted Body Weight (AdjBW 0.4)";
  }

  if (regimen === 'extended') {
    // Extended-Interval: 15–20 mg/kg q24h
    const rawDose = dosingWeight * 15;
    const dose = Math.round(rawDose / 50) * 50;
    let interval = 24;
    let freq = "q24h (Once daily)";

    if (crcl >= 60) {
      interval = 24;
      freq = "q24h (Once daily)";
    } else if (crcl >= 40) {
      interval = 36;
      freq = "q36h (Extended interval)";
    } else if (crcl >= 20) {
      interval = 48;
      freq = "q48h (Extended interval)";
    } else {
      interval = 0;
      freq = "Level-guided PRN (CrCl < 20 mL/min)";
    }

    return {
      drug: 'amikacin',
      dose,
      interval,
      frequencyText: freq,
      regimenType: "Extended-Interval Amikacin (15–20 mg/kg)",
      targetPeak: "40 – 60 mg/L (High peak for bactericidal kill)",
      targetTrough: "< 2.5 – 5.0 mg/L (Undetectable preferred)",
      infusionTime: "Infuse over 30 – 60 minutes in 100–250 mL NS or D5W",
      samplingTime: "Peak: 1h after 30-min infusion. Trough: ≤ 30 mins prior to next scheduled dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "High-dose extended interval provides superior bactericidal concentration-dependent kill against resistant Gram-negative bacilli."
    };
  } else {
    // Conventional: 7.5 mg/kg q12h (15 mg/kg/day divided)
    const rawDose = dosingWeight * 7.5;
    const dose = Math.round(rawDose / 50) * 50;
    let interval = 12;
    let freq = "q12h (BD)";
    if (crcl < 30) {
      interval = 24;
      freq = "q24h (OD - Renal adjusted)";
    }

    return {
      drug: 'amikacin',
      dose,
      interval,
      frequencyText: freq,
      regimenType: "Conventional Divided Dosing (7.5 mg/kg q12h)",
      targetPeak: "20 – 30 mg/L (Peak 1h post-infusion)",
      targetTrough: "< 5.0 – 10.0 mg/L",
      infusionTime: "Infuse over 30 – 60 minutes in 100–200 mL NS",
      samplingTime: "Peak: 1 hour post-infusion; Trough: ≤ 30 mins before next dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Conventional divided dosing for patients with severe renal impairment, meningitis, or non-qualifying ICU criteria."
    };
  }
}

/**
 * Predict Vancomycin Level at any time after Nth dose (Non-steady state)
 */
export function predictLevelAfterDoseN(
  dose: number,
  interval: number,
  doseNumber: number,
  timeSinceNthDose: number, // hours since start of Nth infusion
  pk: VancoPK,
  tInfusion: number = 2
): number {
  const { ke, vd } = pk;
  const tau = interval;
  const tinf = tInfusion;
  const t = timeSinceNthDose;

  // Concentration during infusion (t <= tinf)
  // C(t) = (Dose / (tinf * Vd * ke)) * (1 - e^-ke*t) * [(1 - e^-n*ke*tau) / (1 - e^-ke*tau)]
  // Concentration after infusion (t > tinf)
  // C(t) = C(tinf) * e^-ke*(t - tinf)

  const accumulation = (1 - Math.exp(-doseNumber * ke * tau)) / (1 - Math.exp(-ke * tau));
  
  if (t <= tinf) {
    return (dose / (tinf * vd * ke)) * (1 - Math.exp(-ke * t)) * accumulation;
  } else {
    const cInfEnd = (dose / (tinf * vd * ke)) * (1 - Math.exp(-ke * tinf)) * accumulation;
    return cInfEnd * Math.exp(-ke * (t - tinf));
  }
}

/**
 * Fluconazole Dosing
 */
export function calculateFluconazoleDose(crcl: number, baseDose: number): { dose: number; loadingDose: number; note: string } {
  let adjustedDose = baseDose;
  let loadingDose = baseDose * 2;
  let note = "";

  if (crcl <= 50) {
    adjustedDose = baseDose * 0.5;
    loadingDose = baseDose; // For CrCl <= 50, loading dose is usually the standard maintenance dose
    note = "Maintenance dose reduced by 50% for renal impairment (CrCl ≤ 50 mL/min). Loading dose should still be given (usually 100% of standard maintenance).";
  } else {
    note = "Standard dosing (CrCl > 50 mL/min). Loading dose is double the maintenance dose.";
  }

  return { dose: adjustedDose, loadingDose, note };
}

/**
 * Fluconazole TDM Adjustment
 * Linear kinetics: New Dose = Old Dose * (Target / Measured)
 */
export function adjustFluconazoleDose(currentDose: number, measuredLevel: number, targetLevel: number = 15): number {
  if (measuredLevel <= 0) return currentDose;
  const ratio = targetLevel / measuredLevel;
  const newDose = currentDose * ratio;
  
  // Round to common tablet/vial sizes (50, 100, 150, 200)
  // We'll round to nearest 50mg for flexibility
  return Math.round(newDose / 50) * 50;
}

/**
 * Calculate Vancomycin PK from a single level (Non-Steady State / Random)
 * Uses assumed Vd to find Ke
 */
export function calculateVancoRandomPK(
  dose: number,
  vd: number,
  measuredLevel: number,
  timeSinceStart: number, // hours from start of infusion
  tInfusion: number = 2
): VancoPK {
  // Cmax_calc = (Dose/Vd) * ((1 - e^-ke*tinf) / (ke*tinf))
  // This is iterative, but we can approximate Ke first
  // Simple approximation: Ke = ln(Cpeak / Cmeasured) / (tmeasured - tinf)
  // We'll use a starting Ke of 0.05 and iterate once for better accuracy
  let ke = 0.05;
  for (let i = 0; i < 3; i++) {
    const cmax = (dose / vd) * ((1 - Math.exp(-ke * tInfusion)) / (ke * tInfusion));
    ke = Math.log(cmax / measuredLevel) / (timeSinceStart - tInfusion);
  }
  
  const cl = ke * vd;
  const halfLife = 0.693 / ke;
  
  return { vd, cl, ke, halfLife };
}

/**
 * Calculate Vancomycin Ke from a steady-state trough
 * Assumes Vd
 */
export function calculateVancoKeFromTrough(
  dose: number,
  interval: number,
  vd: number,
  trough: number,
  tInfusion: number = 2
): number {
  // Iterative solution for Ke:
  // Cmin = (Dose/Vd) * ((1-e^-ke*tinf)/(ke*tinf)) * (1/(1-e^-ke*tau)) * e^-ke*(tau-tinf)
  let ke = 0.1; // Starting guess
  for (let i = 0; i < 5; i++) {
    const cmax = (dose / vd) * ((1 - Math.exp(-ke * tInfusion)) / (ke * tInfusion)) * (1 / (1 - Math.exp(-ke * interval)));
    const cmin_calc = cmax * Math.exp(-ke * (interval - tInfusion));
    // Adjust Ke based on ratio
    ke = ke * (cmin_calc / trough);
  }
  return ke;
}

/**
 * Calculate Vancomycin Ke from an early, pre-steady state level (e.g. after Dose 1, 2, etc.)
 * Assumes Vd (L)
 */
export function calculateVancoKeFromEarlyLevel(
  dose: number,
  interval: number,
  doseNumber: number,
  measuredLevel: number, // mg/L
  timeSinceDose: number, // hours since start of infusion of doseNumber
  vd: number,
  tInfusion: number = 1
): number {
  let ke = 0.1; // Starting guess
  for (let i = 0; i < 6; i++) {
    const calcLevel = predictLevelAfterDoseN(
      dose,
      interval,
      doseNumber,
      timeSinceDose,
      { vd, cl: ke * vd, ke, halfLife: 0.693 / ke },
      tInfusion
    );
    // Adjust Ke dynamically based on the ratio of calculated to measured level
    if (calcLevel > 0 && measuredLevel > 0) {
      ke = ke * (calcLevel / measuredLevel);
    }
  }
  // Clamp ke to reasonable physiological range (0.015 - 0.5 h^-1)
  return Math.max(0.015, Math.min(0.5, ke));
}

/**
 * Vancomycin TDM Adjustment (Linear / Proportional Kinetics)
 * Standard Target: 10 - 15 mg/L (midpoint ~12.5 mg/L) for mild-moderate infections
 * High Target: 15 - 20 mg/L (midpoint ~17.5 mg/L) for severe/MRSA infections
 */
export function adjustVancoDose(
  currentDose: number, 
  currentInterval: number, 
  measuredLevelMgL: number, 
  targetLevelMgL: number = 15
): { dose: number; interval: number; ratio: number; calculatedRawDose: number } {
  if (measuredLevelMgL <= 0) {
    return { dose: currentDose, interval: currentInterval, ratio: 1, calculatedRawDose: currentDose };
  }
  // New Dose = Old Dose * (Target / Measured)
  const ratio = targetLevelMgL / measuredLevelMgL;
  const calculatedRawDose = currentDose * ratio;
  const newDose = Math.round(calculatedRawDose / 250) * 250;
  
  return { 
    dose: Math.max(250, Math.min(newDose, 2000)), 
    interval: currentInterval,
    ratio,
    calculatedRawDose
  };
}

/**
 * Bactrim (TMP/SMX) Dosing
 * Dosing based on TMP component (1:5 ratio with SMX)
 */
export interface BactrimDosingResult {
  doseMg: number;                // TMP mg per dose
  smxMg: number;                 // SMX mg per dose
  totalSmxTmp: number;           // Total TMP+SMX per dose
  dailyTmpDose: number;          // Total TMP mg/day
  mgKgDay: number;               // Actual achieved mg/kg/day TMP
  targetMgKgDay: number;         // Target mg/kg/day TMP
  interval: number;              // Interval in hours (24 for daily, 0 for 3x weekly)
  frequencyText: string;         // E.g. "q8h (TDS)", "q6h (QID)", "q12h (BD)"
  isProphylaxis: boolean;
  vials: number;                 // 5 mL ampoules (80mg TMP / 400mg SMX)
  ssTabs: number;                // Single Strength (80mg TMP / 400mg SMX)
  standardDilution: string;      // Standard D5W volume & rate
  fluidRestrictedDilution: string; // 75 mL per vial fluid-restricted volume & rate
  hdDose: string;                // Hemodialysis guidance (25-50% post-HD)
  crrtDose: string;              // CRRT guidance
  renalNote: string;             // Renal clearance status
  note: string;                  // General summary note
}

export function calculateBactrimDose(
  weight: number, 
  crcl: number, 
  indication: string = 'severe_pjp',
  isDialysis: boolean = false
): BactrimDosingResult {
  // Prophylaxis Regimens
  if (indication === 'prophylaxis_pjp_daily') {
    const vials = 2;
    const stdVol = 250;
    const fluidVol = 150;
    return {
      doseMg: 160,
      smxMg: 800,
      totalSmxTmp: 960,
      dailyTmpDose: 160,
      mgKgDay: weight > 0 ? +(160 / weight).toFixed(1) : 2.3,
      targetMgKgDay: weight > 0 ? +(160 / weight).toFixed(1) : 2.3,
      interval: 24,
      frequencyText: "Once daily (OD)",
      isProphylaxis: true,
      vials,
      ssTabs: 2,
      standardDilution: `${vials} ampoules (10 mL) in ${stdVol} mL 5% Dextrose (D5W) to be infused over 60–90 minutes.`,
      fluidRestrictedDilution: `${vials} ampoules (10 mL) in ${fluidVol} mL 5% Dextrose (D5W) to be infused over max 60 minutes.`,
      hdDose: "Give 25% – 50% of normal daily dose (1 SS tab or 40–80 mg TMP) as an additional dose after HD.",
      crrtDose: "160 mg TMP (2 SS tabs) once daily.",
      renalNote: "CrCl < 15 mL/min: IV use not recommended. For HD: give 25–50% additional dose post-HD.",
      note: "Standard daily PJP prophylaxis (2 SS tabs or 160mg TMP once daily)."
    };
  }

  if (indication === 'prophylaxis_pjp_tiw') {
    const vials = 2;
    const stdVol = 250;
    const fluidVol = 150;
    return {
      doseMg: 160,
      smxMg: 800,
      totalSmxTmp: 960,
      dailyTmpDose: Math.round(160 * 3 / 7),
      mgKgDay: weight > 0 ? +((160 * 3 / 7) / weight).toFixed(1) : 1.0,
      targetMgKgDay: weight > 0 ? +((160 * 3 / 7) / weight).toFixed(1) : 1.0,
      interval: 48,
      frequencyText: "3 times weekly (Mon/Wed/Fri)",
      isProphylaxis: true,
      vials,
      ssTabs: 2,
      standardDilution: `${vials} ampoules (10 mL) in ${stdVol} mL 5% Dextrose (D5W) to be infused over 60–90 minutes.`,
      fluidRestrictedDilution: `${vials} ampoules (10 mL) in ${fluidVol} mL 5% Dextrose (D5W) to be infused over max 60 minutes.`,
      hdDose: "Give 25% – 50% additional dose after each HD session on dialysis days (Mon/Wed/Fri).",
      crrtDose: "160 mg TMP (2 SS tabs) 3 times weekly.",
      renalNote: "CrCl < 15 mL/min: IV use not recommended. For HD: give 25–50% additional dose post-HD.",
      note: "Intermittent PJP prophylaxis (2 SS tabs 3x weekly on Mon/Wed/Fri)."
    };
  }

  // Therapeutic Indication Parameters
  let targetMgKgDay = 15;
  let interval = 8;
  let frequencyText = "q8h (TDS)";

  if (indication === 'severe_pjp' || indication === 'severe') {
    targetMgKgDay = 15; // 15-20 mg/kg/day
    interval = 8;       // q6h or q8h
    frequencyText = "q8h (TDS) [or q6h QID]";
  } else if (indication === 'severe_steno' || indication === 'severe_nocardia') {
    targetMgKgDay = 15;
    interval = 8;
    frequencyText = "q8h (TDS)";
  } else if (indication === 'standard_systemic' || indication === 'standard') {
    targetMgKgDay = 10;
    interval = 12;
    frequencyText = "q12h (BD)";
  } else if (indication === 'standard_uti') {
    targetMgKgDay = 8;
    interval = 12;
    frequencyText = "q12h (BD)";
  } else if (indication === 'standard_steno_mild') {
    targetMgKgDay = 10;
    interval = 12;
    frequencyText = "q12h (BD)";
  }

  let dailyDose = weight * targetMgKgDay;
  let renalNote = "CrCl > 30 mL/min: Full standard dose (100%).";
  let hdDose = "Not on dialysis";
  let crrtDose = "CVVH/CVVHD: 5–7.5 mg/kg TMP q12h (severe) or 2.5–5 mg/kg TMP q12h (standard).";

  if (isDialysis) {
    dailyDose = weight * 3.75;
    interval = 24;
    frequencyText = "q24h (Post-HD on dialysis days)";
    renalNote = "Hemodialysis (HD): Administer 25% – 50% of normal dose as an additional dose after each HD session.";
    hdDose = `Give 25% – 50% of normal dose (${Math.round(weight * 2.5)} – ${Math.round(weight * 3.75)} mg TMP) as an additional dose after HD.`;
  } else if (crcl < 15) {
    dailyDose = weight * 3.75;
    interval = 24;
    frequencyText = "q24h (IV use not recommended)";
    renalNote = "CrCl < 15 mL/min (Non-HD): IV use not recommended. If patient is on HD, give 25% – 50% of normal dose as additional dose after HD.";
    hdDose = "If patient is on HD: Give 25% – 50% of normal dose as an additional dose after HD.";
  } else if (crcl <= 30) {
    dailyDose = dailyDose * 0.5;
    if (interval === 8) {
      interval = 12;
      frequencyText = "q12h (BD - Renal adjusted 50%)";
    } else if (interval === 12) {
      interval = 24;
      frequencyText = "q24h (OD - Renal adjusted 50%)";
    }
    renalNote = "CrCl 15–30 mL/min: Dose reduced by 50% (or interval extended). Monitor serum K+ and renal function.";
  }

  const dosesPerDay = 24 / interval;
  let dosePerAdmin = dailyDose / dosesPerDay;

  // Round to nearest 80mg (Each Single Strength ampoule/tablet = 80mg TMP)
  const roundedDose = Math.max(80, Math.round(dosePerAdmin / 80) * 80);
  const smxMg = roundedDose * 5;
  const totalSmxTmp = roundedDose * 6;
  const actualDailyDose = roundedDose * dosesPerDay;
  const mgKgDay = weight > 0 ? actualDailyDose / weight : targetMgKgDay;

  const vials = Math.max(1, Math.round(roundedDose / 80));
  const ssTabs = Math.max(1, Math.round(roundedDose / 80));

  // Dilution rules:
  // 1 vial (5 mL) in 125 mL D5W, infused over 60–90 mins
  // 2 vials (10 mL) in 250 mL D5W, infused over 60–90 mins
  // 3 or more vials in 500 mL D5W, infused over 60–90 mins
  let stdVol = 125;
  if (vials === 2) {
    stdVol = 250;
  } else if (vials >= 3) {
    stdVol = 500;
  }
  const standardDilution = `${vials} ampoule(s) (${vials * 5} mL) in ${stdVol} mL 5% Dextrose (D5W) to be infused over 60–90 minutes.`;

  // Fluid-restricted dilution: 1 vial in 75 mL D5W, to be infused over max 60 mins
  const fluidRestrictedVol = vials * 75;
  const fluidRestrictedDilution = `${vials} ampoule(s) (${vials * 5} mL) in ${fluidRestrictedVol} mL 5% Dextrose (D5W) to be infused over max 60 minutes.`;

  return {
    doseMg: roundedDose,
    smxMg,
    totalSmxTmp,
    dailyTmpDose: actualDailyDose,
    mgKgDay,
    targetMgKgDay,
    interval,
    frequencyText,
    isProphylaxis: false,
    vials,
    ssTabs,
    standardDilution,
    fluidRestrictedDilution,
    hdDose,
    crrtDose,
    renalNote,
    note: `Target ${targetMgKgDay} mg/kg/day TMP. Achieved ${mgKgDay.toFixed(1)} mg/kg/day TMP across ${dosesPerDay} doses/day.`
  };
}

export const VANCO_CONVERSION_FACTOR = 0.69; // 1 mg/L = 0.69 umol/L (MW = 1449.3)

export function vancoMgLToUmolL(mgL: number): number {
  return mgL * VANCO_CONVERSION_FACTOR;
}

export function vancoUmolLToMgL(umolL: number): number {
  return umolL / VANCO_CONVERSION_FACTOR;
}
