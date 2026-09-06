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
      weightToUse = actualWeight;
      weightType = "Total Body Weight (ABW) for Pure Obesity";
    } else {
      weightToUse = actualWeight;
      weightType = "Total Body Weight (ABW)";
    }
  }

  const minDose = weightToUse * 20;
  const maxDose = weightToUse * 30;
  const targetDose = weightToUse * mgKg;
  let roundedDose = Math.round(targetDose / 250) * 250;

  let isCapped = false;
  let alertMessage = undefined;
  // Single dose capped at 2g (2000 mg) per clinical guidelines
  if (roundedDose > 2000) {
    alertMessage = "Single loading dose capped at 2g (2000 mg) per clinical guidelines to prevent infusion-related reactions (Red Man syndrome) and nephrotoxicity.";
    roundedDose = 2000;
    isCapped = true;
  }

  return {
    dose: roundedDose,
    range: `${Math.round(minDose)} - ${Math.round(Math.min(maxDose, 2000))} mg`,
    usedWeight: weightToUse,
    usedWeightType: weightType,
    isCapped,
    alertMessage
  };
}

/**
 * Vancomycin Maintenance Dose
 * Default 15 mg/kg/dose (actual body weight), range 15-20
 * Single dose capped at 2g (2000 mg)
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
  
  // Single dose capped at 2g (2000mg) per dose
  dose = Math.min(dose, 2000);

  return { 
    dose, 
    interval, 
    range: `${Math.round(minDose)} - ${Math.round(Math.min(maxDose, 2000))} mg` 
  };
}

/**
 * Vancomycin Administration & Dilution Details
 * - Dilution concentration: 5 mg/mL (Peripheral line) or up to 10 mg/mL (Central line)
 * - Loading dose tweak: 1g - 2g in 400 mL NS over 3-4 hours
 * - HD dilution rules:
 *   - <= 1g: dilute in 100 mL NS, start on last hour of HD
 *   - > 1g: dilute in 200 mL NS, start on last hour of HD and continue 1 hour post-HD
 */
export function getVancoAdminDetails(
  dose: number, 
  isHD: boolean = false, 
  isLoading: boolean = false
): { 
  diluent: string; 
  time: string; 
  conc: string; 
  instruction: string;
  peripheralLineSafe: boolean;
  centralLineOnly: boolean;
} {
  // Hemodialysis administration
  if (isHD) {
    if (dose <= 1000) {
      const conc = (dose / 100).toFixed(1);
      return {
        diluent: "100 mL NS",
        time: "1 hour",
        conc: `${conc} mg/mL`,
        instruction: "Dose ≤ 1g: Dilute in 100 mL NS. Start on last hour of HD.",
        peripheralLineSafe: parseFloat(conc) <= 5.0,
        centralLineOnly: parseFloat(conc) > 5.0
      };
    } else {
      const conc = (dose / 200).toFixed(1);
      return {
        diluent: "200 mL NS",
        time: "2 hours",
        conc: `${conc} mg/mL`,
        instruction: "Dose > 1g: Dilute in 200 mL NS. Start on last hour of HD and continue 1 hour post-HD.",
        peripheralLineSafe: parseFloat(conc) <= 5.0,
        centralLineOnly: parseFloat(conc) > 5.0
      };
    }
  }

  // Loading Dose administration tweak: 1g - 2g in 400 mL NS over 3-4 hours
  if (isLoading) {
    if (dose >= 1000) {
      const conc = (dose / 400).toFixed(1);
      return {
        diluent: "400 mL NS",
        time: "3-4 hours",
        conc: `${conc} mg/mL`,
        instruction: "Loading dose (1g–2g): Dilute in 400 mL NS over 3–4 hours.",
        peripheralLineSafe: parseFloat(conc) <= 5.0,
        centralLineOnly: parseFloat(conc) > 5.0
      };
    } else {
      const conc = (dose / 250).toFixed(1);
      return {
        diluent: "250 mL NS",
        time: "2 hours",
        conc: `${conc} mg/mL`,
        instruction: "Loading dose (< 1g): Dilute in 250 mL NS over 2 hours.",
        peripheralLineSafe: parseFloat(conc) <= 5.0,
        centralLineOnly: parseFloat(conc) > 5.0
      };
    }
  }

  // Standard Maintenance Infusion
  let diluent = 250;
  let time = "2 hours";

  if (dose <= 500) {
    diluent = 100;
    time = "1 hour";
  } else if (dose <= 1000) {
    diluent = 250;
    time = "2 hours";
  } else if (dose <= 2000) {
    diluent = 400; // 400 mL for 1.25g - 2g
    time = "3-4 hours";
  } else {
    diluent = 500;
    time = "4-5 hours";
  }

  const conc = (dose / diluent).toFixed(1);
  return { 
    diluent: `${diluent} mL NS`, 
    time, 
    conc: `${conc} mg/mL`,
    instruction: `Dilute in ${diluent} mL NS, infuse over ${time}.`,
    peripheralLineSafe: parseFloat(conc) <= 5.0,
    centralLineOnly: parseFloat(conc) > 5.0
  };
}

/**
 * Straightforward Vancomycin Hemodialysis (HD) Dose Adjustment Protocol
 * - < 10 mg/L: increase 25% - 50% from last dose
 * - 10 - 20 mg/L: target achieved, maintain current dose
 * - > 20 and <= 24.65 mg/L: reduce 25% - 50% from last dose
 * - > 24.65 mg/L: withhold vanco until next HD
 */
export interface VancoHDAdjustmentResult {
  status: 'low' | 'target' | 'high' | 'critical';
  recommendation: string;
  recommendedDoseMin: number;
  recommendedDoseMax: number;
  actionText: string;
  badgeColor: string;
  details: string;
}

export function adjustVancoHD(currentDose: number, measuredLevel: number): VancoHDAdjustmentResult {
  const safeDose = Math.max(250, currentDose || 1000);

  if (measuredLevel < 10) {
    const minDose = Math.min(2000, Math.round((safeDose * 1.25) / 250) * 250);
    const maxDose = Math.min(2000, Math.round((safeDose * 1.50) / 250) * 250);
    return {
      status: 'low',
      recommendation: `Sub-therapeutic (< 10 mg/L). Increase dose by 25% – 50% from last dose.`,
      recommendedDoseMin: minDose,
      recommendedDoseMax: maxDose,
      actionText: `Increase by 25%–50%: Recommend ${minDose}${minDose !== maxDose ? ` – ${maxDose}` : ''} mg post-HD (capped at 2g).`,
      badgeColor: 'amber',
      details: 'Level below 10 mg/L risks therapeutic failure and resistance. Administer adjusted dose during/post-HD.'
    };
  } else if (measuredLevel <= 20) {
    return {
      status: 'target',
      recommendation: `Therapeutic target achieved (10 – 20 mg/L). Maintain current dose.`,
      recommendedDoseMin: safeDose,
      recommendedDoseMax: safeDose,
      actionText: `Maintain current dose of ${safeDose} mg post-HD on dialysis days.`,
      badgeColor: 'emerald',
      details: 'Patient is within therapeutic pre-dialysis target range (10–20 mg/L). Continue same maintenance schedule.'
    };
  } else if (measuredLevel <= 24.65) {
    const minDose = Math.max(250, Math.round((safeDose * 0.50) / 250) * 250);
    const maxDose = Math.max(250, Math.round((safeDose * 0.75) / 250) * 250);
    return {
      status: 'high',
      recommendation: `Elevated level (20 – 24.65 mg/L). Reduce dose by 25% – 50% from last dose.`,
      recommendedDoseMin: minDose,
      recommendedDoseMax: maxDose,
      actionText: `Reduce by 25%–50%: Recommend ${minDose}${minDose !== maxDose ? ` – ${maxDose}` : ''} mg post-HD.`,
      badgeColor: 'amber',
      details: 'Pre-dialysis level exceeds 20 mg/L. Reduce dose by 25–50% to prevent cumulative accumulation and ototoxicity.'
    };
  } else {
    return {
      status: 'critical',
      recommendation: `CRITICAL HIGH LEVEL (> 24.65 mg/L): Withhold Vancomycin until next HD.`,
      recommendedDoseMin: 0,
      recommendedDoseMax: 0,
      actionText: `WITHHOLD Vancomycin. Do NOT administer dose post-HD.`,
      badgeColor: 'red',
      details: 'Serum concentration > 24.65 mg/L carries severe ototoxicity and toxicity risk. Withhold vancomycin and recheck pre-dialysis level prior to next HD.'
    };
  }
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
  const safeWeight = Math.max(1, actualWeight || 70);
  const safeCrCl = Math.max(0, isNaN(crcl) ? 100 : crcl);
  const safeVdCoeff = Math.max(0.1, vdCoeff || 0.7);
  
  const vd = safeVdCoeff * safeWeight;
  let cl_ml_min = (0.695 * safeCrCl) + 0.05;
  
  if (isAnuric) {
    cl_ml_min = 0.05; // Base non-renal clearance
  }

  const cl_l_h = Math.max(0.001, cl_ml_min * 0.06);
  const ke = Math.max(0.0001, cl_l_h / vd);
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
  if (!pk || !pk.ke || pk.ke <= 0 || !pk.vd || pk.vd <= 0 || !interval || interval <= 0 || !dose || dose <= 0) {
    return { cmax: 0, cEndOfInfusion: 0, cmin: 0, auc24: 0, aucMic: 0 };
  }
  const { ke, vd, cl } = pk;
  
  const tau = Math.max(1, interval);
  const tinf = Math.max(0.1, tInfusion || 1);
  const safeMic = Math.max(0.1, mic || 1);
  const safeCl = Math.max(0.001, cl || 1);
  
  const denomAccum = Math.max(0.00001, 1 - Math.exp(-ke * tau));
  const accumulationFactor = 1 / denomAccum;
  const infusionFactor = (1 - Math.exp(-ke * tinf)) / (ke * tinf);
  
  // Concentration at the exact end of IV infusion (t = tinf)
  const cEndOfInfusion = Math.max(0, (dose / vd) * accumulationFactor * infusionFactor);
  
  // True Clinical Peak (Cmax) sampled 1 hour after infusion completion (post-distribution)
  const cmax = Math.max(0, cEndOfInfusion * Math.exp(-ke * 1.0));
  
  // Trough (Cmin) sampled immediately prior to the next dose (t = tau)
  const cmin = Math.max(0, cEndOfInfusion * Math.exp(-ke * Math.max(0, tau - tinf)));
  
  const dailyDose = dose * (24 / tau);
  const auc24 = Math.max(0, dailyDose / safeCl);
  const aucMic = Math.max(0, auc24 / safeMic);

  return { 
    cmax: isFinite(cmax) ? cmax : 0, 
    cEndOfInfusion: isFinite(cEndOfInfusion) ? cEndOfInfusion : 0, 
    cmin: isFinite(cmin) ? cmin : 0, 
    auc24: isFinite(auc24) ? auc24 : 0, 
    aucMic: isFinite(aucMic) ? aucMic : 0 
  };
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
  
  const allOptions = standardDoses.map(dose => {
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

  // Limit 'above target' (high_risk, > 20 mg/L) to at most 2 choices to avoid cluttering
  let aboveTargetCount = 0;
  return allOptions.filter(opt => {
    if (opt.suitability === 'high_risk' || opt.cmin > 20) {
      aboveTargetCount++;
      return aboveTargetCount <= 2;
    }
    return true;
  });
}

/**
 * Gentamicin / Amikacin Pharmacokinetics (PK) Model
 * 1. CL (L/H) = [ (0.73 x CLCR / IBW ) + 0.06 ] x IBW x 0.06
 * 2. Ke = 0.0024 x CLCR( ml/min ) + 0.01
 * 3. Vd (L) = CL / Ke (note: may be > 0.3L/kg in ascites/cancer/oedema/spinal cord injury) or = 0.28 L/kg
 * 4. T ½ (H) = ln 2 / Ke
 */
export interface AminoglycosidePK {
  cl: number;        // L/h
  ke: number;        // h^-1
  vd: number;        // L
  vdPerKg: number;   // L/kg
  halfLife: number;  // h
  method: 'cl_ke' | 'fixed_028' | 'expanded_035';
  methodLabel: string;
}

export function calculateAminoglycosidePK(
  crcl: number,
  ibw: number,
  actualWeight: number,
  vdMode: 'cl_ke' | 'fixed_028' | 'expanded_035' = 'cl_ke'
): AminoglycosidePK {
  const safeCrCl = Math.max(0, crcl || 0);
  const safeIBW = Math.max(1, ibw || 50);
  const safeWeight = Math.max(1, actualWeight || 60);

  // 1. CL (L/H) = [ (0.73 x CLCR / IBW ) + 0.06 ] x IBW x 0.06
  const cl = ((0.73 * safeCrCl / safeIBW) + 0.06) * safeIBW * 0.06;

  // 2. Ke = 0.0024 x CLCR( ml/min ) + 0.01
  const ke = (0.0024 * safeCrCl) + 0.01;

  // 3. Vd (L) = CL / Ke (note: may be > 0.3L/kg in ascites/cancer/oedema/spinal cord injury) or = 0.28 L/kg
  let vd = 0;
  let methodLabel = "CL / Ke (Dynamic Clearance/Ke)";
  if (vdMode === 'fixed_028') {
    vd = 0.28 * safeWeight;
    methodLabel = "0.28 L/kg (Fixed Population Standard)";
  } else if (vdMode === 'expanded_035') {
    vd = 0.35 * safeWeight;
    methodLabel = "> 0.3 L/kg (Ascites / Cancer / Oedema / SCI)";
  } else {
    vd = cl / ke;
    methodLabel = "CL / Ke (Pharmacokinetic Ratio)";
  }

  // 4. T 1/2 = ln 2 / Ke
  const halfLife = Math.log(2) / ke;

  return {
    cl: +cl.toFixed(2),
    ke: +ke.toFixed(4),
    vd: +vd.toFixed(1),
    vdPerKg: +(vd / safeWeight).toFixed(2),
    halfLife: +halfLife.toFixed(1),
    method: vdMode,
    methodLabel
  };
}

/**
 * Aminoglycoside Dosing Calculator Result
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
  isHD?: boolean;
}

/**
 * Gentamicin Dosing Options and Indication Targets
 */
export type GentamicinIndication = 
  | 'odd_mild'            // Once daily: mild to moderate
  | 'odd_severe'          // Once daily: severe / critically ill
  | 'conv_pneumonia'      // Conventional: pneumonia
  | 'conv_staph_endo'     // Conventional: endocarditis staph aureus
  | 'conv_strep_endo'     // Conventional: endocarditis strep/enterococci
  | 'conv_strep_endo_od'  // Conventional: endocarditis strep/enterococci single daily
  | 'conv_bacteremia'     // Conventional: bacteremia
  | 'conv_uti'            // Conventional: UTI
  | 'conv_general'        // Conventional: general
  | 'synergy_cpen'        // Endocarditis with C-Pen
  | 'hd';                 // Intermittent Hemodialysis

export function calculateGentamicinDose(
  actualWeight: number,
  ibw: number,
  crcl: number,
  regimen: 'odd' | 'conventional' | 'synergy' | 'hd' = 'odd',
  indication: GentamicinIndication = 'odd_mild'
): AminoglycosideResult {
  // Dosing weight: if actual > 1.2 * IBW, use AdjBW = IBW + 0.4*(ABW - IBW)
  let dosingWeight = actualWeight;
  let weightType = "Actual Body Weight (ABW)";
  if (actualWeight > 1.2 * ibw) {
    dosingWeight = ibw + 0.4 * (actualWeight - ibw);
    weightType = "Adjusted Body Weight (AdjBW 0.4)";
  }

  // 1. HEMODIALYSIS PROTOCOL
  // For HD, gentamicin: loading dose 3 mg/kg followed by 2 mg/kg on HD days.
  // Genta trough: < 2 mg/L, peak: 5-10 mg/L
  if (regimen === 'hd' || indication === 'hd') {
    const rawLoadDose = dosingWeight * 3.0;
    const loadDose = Math.round(rawLoadDose / 20) * 20;
    const rawMaintDose = dosingWeight * 2.0;
    const maintDose = Math.round(rawMaintDose / 20) * 20;

    return {
      drug: 'gentamicin',
      dose: maintDose,
      interval: 0,
      frequencyText: "Post-HD on Dialysis Days (Loading: " + loadDose + " mg, Maintenance: " + maintDose + " mg)",
      regimenType: "Hemodialysis (HD) Protocol: 3 mg/kg load, then 2 mg/kg post-HD",
      targetPeak: "5 – 10 mg/L (Post-dialysis peak)",
      targetTrough: "< 2.0 mg/L (Pre-dialysis trough)",
      infusionTime: "Infuse over 30 – 60 minutes in 100 mL NS post-HD (or during last hour of HD)",
      samplingTime: "Pre-HD level prior to dialysis; Peak 1h after infusion completion.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Gentamicin HD protocol: Administer 3 mg/kg loading dose, then 2 mg/kg after each hemodialysis session.",
      isHD: true
    };
  }

  // 2. ENDOCARDITIS WITH CRYSTALLINE PENICILLIN (C-PEN)
  // For endocarditis, gentamicin dose when given with c-pen is 3 mg/kg/24 hour or in 3 divided dose.
  if (regimen === 'synergy' || indication === 'synergy_cpen') {
    const totalDailyDose = Math.round((dosingWeight * 3.0) / 20) * 20;
    const dividedDose = Math.round((dosingWeight * 1.0) / 10) * 10;
    let interval = 8;
    let freq = `1 mg/kg q8h (TDS: ${dividedDose} mg q8h) or 3 mg/kg OD (${totalDailyDose} mg OD)`;

    if (crcl < 30) {
      interval = 24;
      freq = `q24h (${dividedDose} mg OD - Renal adjusted)`;
    } else if (crcl < 50) {
      interval = 12;
      freq = `q12h (${dividedDose} mg BD - Renal adjusted)`;
    }

    return {
      drug: 'gentamicin',
      dose: dividedDose,
      interval,
      frequencyText: freq,
      regimenType: "Endocarditis Synergy with C-Pen (3 mg/kg/24h)",
      targetPeak: "3 – 4 mg/L (1h post-infusion for divided dose) or 10 – 12 mg/L (if single daily dose)",
      targetTrough: "< 1.0 mg/L (Pre-dose trough)",
      infusionTime: "Infuse over 30 minutes in 50–100 mL NS",
      samplingTime: "Peak: 1h after completion of infusion. Trough: ≤ 30 mins before next dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Co-prescribed with Crystalline Penicillin (C-Pen). Dose is 3 mg/kg/24 hour either Once Daily or in 3 divided doses (1 mg/kg q8h)."
    };
  }

  // 3. ONCE DAILY DOSING (ODD / HARTFORD) - Preferably for Gram (-) infection
  // Mild to mod infections: peak level 12-15 mg/L, trough < 1 mg/L
  // Severe infections in critically ill: peak level 16-20 mg/L, trough < 1 mg/L
  if (regimen === 'odd') {
    const isSevere = indication === 'odd_severe';
    const mgKg = isSevere ? 7.0 : 5.0;
    const rawDose = dosingWeight * mgKg;
    const dose = Math.round(rawDose / 20) * 20;
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

    const peakTarget = isSevere ? "16 – 20 mg/L (Severe / Critically ill)" : "12 – 15 mg/L (Mild to moderate)";

    return {
      drug: 'gentamicin',
      dose,
      interval,
      frequencyText: freq,
      regimenType: `Once Daily Dosing (${mgKg} mg/kg) — Preferred for Gram (-)`,
      targetPeak: peakTarget,
      targetTrough: "< 1.0 mg/L (Pre-dose trough)",
      infusionTime: "Infuse over 30 – 60 minutes in 100 mL NS or D5W",
      samplingTime: "Random level 6–14 hours post-infusion (Hartford Nomogram) or trough ≤ 30 min before next dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Preferably use Once Daily Dosing for Gram (-) infections. Maximizes Cmax/MIC bactericidal killing with prolonged post-antibiotic effect (PAE)."
    };
  }

  // 4. CONVENTIONAL MULTIPLE DAILY DOSING - Preferably for Gram (+) infection
  // Targets based on indication:
  // - Pneumonia: 8-12 mg/L peak, < 2 mg/L trough
  // - Endocarditis (Staph aureus): 5-10 mg/L peak, < 2 mg/L trough
  // - Endocarditis (Strep/enterococci): 3-4 mg/L (or 10-12 mg/L if single daily), < 1 mg/L trough
  // - Bacteremia: 5-8 mg/L peak, < 2 mg/L trough
  // - UTI: 4-6 mg/L peak, < 2 mg/L trough
  // - General: < 2 mg/L trough
  const rawDose = dosingWeight * 1.5;
  const dose = Math.round(rawDose / 20) * 20;
  let interval = 8;
  let freq = "q8h (TDS)";
  if (crcl < 30) {
    interval = 24;
    freq = "q24h (OD - Renal adjusted)";
  } else if (crcl < 60) {
    interval = 12;
    freq = "q12h (BD - Renal adjusted)";
  }

  let peakTarget = "5 – 10 mg/L (Peak 1h post-infusion)";
  let troughTarget = "< 2.0 mg/L (< 1.0 mg/L preferred)";

  switch (indication) {
    case 'conv_pneumonia':
      peakTarget = "8 – 12 mg/L (Pneumonia)";
      troughTarget = "< 2.0 mg/L";
      break;
    case 'conv_staph_endo':
      peakTarget = "5 – 10 mg/L (Staph aureus endocarditis)";
      troughTarget = "< 2.0 mg/L";
      break;
    case 'conv_strep_endo':
      peakTarget = "3 – 4 mg/L (Strep / Enterococci endocarditis)";
      troughTarget = "< 1.0 mg/L";
      break;
    case 'conv_strep_endo_od':
      peakTarget = "10 – 12 mg/L (Single daily dose strep/enterococci endocarditis)";
      troughTarget = "< 1.0 mg/L";
      break;
    case 'conv_bacteremia':
      peakTarget = "5 – 8 mg/L (Bacteremia / Sepsis)";
      troughTarget = "< 2.0 mg/L";
      break;
    case 'conv_uti':
      peakTarget = "4 – 6 mg/L (Urinary Tract Infection)";
      troughTarget = "< 2.0 mg/L";
      break;
    default:
      peakTarget = "5 – 10 mg/L (Conventional)";
      troughTarget = "< 2.0 mg/L (General)";
      break;
  }

  return {
    drug: 'gentamicin',
    dose,
    interval,
    frequencyText: freq,
    regimenType: "Conventional Dosing (1.5 mg/kg) — Preferred for Gram (+)",
    targetPeak: peakTarget,
    targetTrough: troughTarget,
    infusionTime: "Infuse over 30 – 60 minutes in 100 mL NS",
    samplingTime: "Peak: exactly 1h after completion of 30-min infusion. Trough: ≤ 30 mins prior to next dose.",
    dosingWeightUsed: +dosingWeight.toFixed(1),
    dosingWeightType: weightType,
    note: "Preferably use Conventional Dosing for Gram (+) infections and endocarditis synergy."
  };
}

/**
 * Amikacin Dosing Calculator
 * - Once daily dosing: Peak 30 - 50 mg/L, Trough < 2.5 mg/L
 * - Conventional dosing: Peak 20 - 30 mg/L, Trough < 10 mg/L
 * - HD: Loading dose 10 mg/kg followed by 7.5 mg/kg on HD days. Trough < 10 mg/L, Peak 20 - 30 mg/L.
 */
export function calculateAmikacinDose(
  actualWeight: number,
  ibw: number,
  crcl: number,
  regimen: 'extended' | 'conventional' | 'hd' = 'extended'
): AminoglycosideResult {
  let dosingWeight = actualWeight;
  let weightType = "Actual Body Weight (ABW)";
  if (actualWeight > 1.2 * ibw) {
    dosingWeight = ibw + 0.4 * (actualWeight - ibw);
    weightType = "Adjusted Body Weight (AdjBW 0.4)";
  }

  // 1. HEMODIALYSIS PROTOCOL
  // Amikacin loading dose 10 mg/kg followed by 7.5 mg/kg on HD days.
  // Amikacin trough: < 10 mg/L, peak 20-30 mg/L
  if (regimen === 'hd') {
    const rawLoadDose = dosingWeight * 10.0;
    const loadDose = Math.round(rawLoadDose / 50) * 50;
    const rawMaintDose = dosingWeight * 7.5;
    const maintDose = Math.round(rawMaintDose / 50) * 50;

    return {
      drug: 'amikacin',
      dose: maintDose,
      interval: 0,
      frequencyText: "Post-HD on Dialysis Days (Loading: " + loadDose + " mg, Maintenance: " + maintDose + " mg)",
      regimenType: "Hemodialysis (HD) Protocol: 10 mg/kg load, then 7.5 mg/kg post-HD",
      targetPeak: "20 – 30 mg/L (Post-dialysis peak)",
      targetTrough: "< 10.0 mg/L (Pre-dialysis trough)",
      infusionTime: "Infuse over 30 – 60 minutes in 100–250 mL NS post-HD",
      samplingTime: "Pre-HD level prior to dialysis session; Peak 1h post-infusion completion.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Amikacin HD protocol: Administer 10 mg/kg loading dose, then 7.5 mg/kg after each hemodialysis session.",
      isHD: true
    };
  }

  // 2. ONCE DAILY / HIGH-DOSE EXTENDED INTERVAL (Gram - preferred)
  // Peak for amikacin 30-50 mg/L, trough level < 2.5 mg/L
  if (regimen === 'extended') {
    const rawDose = dosingWeight * 15.0;
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
      regimenType: "High-Dose Once Daily Dosing (15 mg/kg) — Preferred for Gram (-)",
      targetPeak: "30 – 50 mg/L (High bactericidal peak)",
      targetTrough: "< 2.5 mg/L (Undetectable preferred to avoid ototoxicity)",
      infusionTime: "Infuse over 30 – 60 minutes in 100–250 mL NS or D5W",
      samplingTime: "Peak: 1h after 30-min infusion. Trough: ≤ 30 mins prior to next scheduled dose.",
      dosingWeightUsed: +dosingWeight.toFixed(1),
      dosingWeightType: weightType,
      note: "Once Daily Dosing preferred for Gram (-) infections. Maximizes Cmax/MIC concentration-dependent bactericidal killing."
    };
  }

  // 3. CONVENTIONAL DIVIDED DOSING
  // Amikacin: pre < 10 mg/L & post 20-30 mg/L
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
    targetTrough: "< 10.0 mg/L (Pre-dose trough)",
    infusionTime: "Infuse over 30 – 60 minutes in 100–200 mL NS",
    samplingTime: "Peak: 1 hour post-infusion; Trough: ≤ 30 mins before next dose.",
    dosingWeightUsed: +dosingWeight.toFixed(1),
    dosingWeightType: weightType,
    note: "Conventional divided dosing for severe renal impairment, non-qualifying criteria, or when once-daily is contraindicated."
  };
}

/**
 * Predict Aminoglycoside Steady-State Levels
 * One-compartment intermittent IV infusion model
 */
export function predictAminoglycosideLevels(
  dose: number,
  interval: number,
  pk: AminoglycosidePK,
  tInfusion: number = 0.5
): { cmax: number; cEndOfInfusion: number; cmin: number } {
  if (!pk || !pk.ke || pk.ke <= 0 || !pk.vd || pk.vd <= 0 || !interval || interval <= 0 || !dose || dose <= 0) {
    return { cmax: 0, cEndOfInfusion: 0, cmin: 0 };
  }

  const ke = pk.ke;
  const vd = pk.vd;
  const tau = interval;
  const tinf = Math.max(0.1, tInfusion);

  const accumulationFactor = 1 / (1 - Math.exp(-ke * tau));
  const infusionFactor = (1 - Math.exp(-ke * tinf)) / (ke * tinf);

  // Concentration at end of infusion
  const cEndOfInfusion = Math.max(0, (dose / vd) * accumulationFactor * infusionFactor);

  // Peak sampled 1 hour after infusion ends (or post-distribution)
  const cmax = Math.max(0, cEndOfInfusion * Math.exp(-ke * 1.0));

  // Trough at end of interval (tau)
  const cmin = Math.max(0, cEndOfInfusion * Math.exp(-ke * Math.max(0, tau - tinf)));

  return {
    cmax: isFinite(cmax) ? cmax : 0,
    cEndOfInfusion: isFinite(cEndOfInfusion) ? cEndOfInfusion : 0,
    cmin: isFinite(cmin) ? cmin : 0
  };
}

export interface AminoglycosideDosingOption {
  dose: number;
  mgKg: number;
  totalDailyDose: number;
  interval: number;
  cmax: number;
  cmin: number;
  clinicalTag: string;
  suitability: 'target' | 'low' | 'high_risk';
  description: string;
}

export function getAminoglycosideDosingOptions(
  drug: 'gentamicin' | 'amikacin',
  dosingWeight: number,
  interval: number,
  pk: AminoglycosidePK,
  targetPeakMin: number,
  targetPeakMax: number,
  targetTroughMax: number,
  tInfusion: number = 0.5
): AminoglycosideDosingOption[] {
  if (!interval || interval <= 0 || !pk || pk.cl <= 0) return [];

  const standardDoses = drug === 'gentamicin' 
    ? [60, 80, 100, 120, 140, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560]
    : [250, 500, 600, 750, 800, 1000, 1200, 1250, 1500, 1750, 2000];

  const allOptions = standardDoses.map(dose => {
    const levels = predictAminoglycosideLevels(dose, interval, pk, tInfusion);
    const mgKg = +(dose / (dosingWeight || 60)).toFixed(1);
    const totalDailyDose = dose * (24 / interval);

    let suitability: 'target' | 'low' | 'high_risk' = 'low';
    let clinicalTag = '';
    let description = '';

    if (levels.cmin <= targetTroughMax && levels.cmax >= targetPeakMin && levels.cmax <= targetPeakMax) {
      suitability = 'target';
      clinicalTag = `Target (${targetPeakMin}–${targetPeakMax} mg/L)`;
      description = `Optimal therapeutic peak with safe trough < ${targetTroughMax} mg/L.`;
    } else if (levels.cmax < targetPeakMin) {
      suitability = 'low';
      clinicalTag = `Below Target (< ${targetPeakMin} mg/L)`;
      description = `May result in sub-inhibitory Cmax/MIC ratio (Peak: ${levels.cmax.toFixed(1)} mg/L).`;
    } else {
      suitability = 'high_risk';
      clinicalTag = `Above Target (> ${targetPeakMax} mg/L)`;
      description = `Elevated peak (${levels.cmax.toFixed(1)} mg/L) or trough (${levels.cmin.toFixed(1)} mg/L) increasing nephrotoxicity/ototoxicity risk.`;
    }

    return {
      dose,
      mgKg,
      totalDailyDose,
      interval,
      cmax: levels.cmax,
      cmin: levels.cmin,
      clinicalTag,
      suitability,
      description
    };
  });

  // Limit 'above target' (high_risk) to at most 2 choices just like Vancomycin
  let aboveTargetCount = 0;
  return allOptions.filter(opt => {
    if (opt.suitability === 'high_risk') {
      aboveTargetCount++;
      return aboveTargetCount <= 2;
    }
    return true;
  });
}

/**
 * Aminoglycoside TDM Dose Adjustment (Sawchuk-Zaske 2-Point Pre & Post PK Method)
 * Calculates individual patient Ke, Vd, Half-Life, and Clearance from measured Pre and Post levels.
 * Generates revised dosing options to achieve target Peak and Trough.
 */
export interface AminoglycosideTdmAdjustmentResult {
  ke: number;        // h^-1
  halfLife: number;  // h
  vd: number;        // L
  vdPerKg: number;   // L/kg
  cl: number;        // L/h
  truePeak: number;  // Extrapolated Cmax at end of infusion (mg/L)
  trueTrough: number;// Extrapolated Cmin at end of interval (mg/L)
  peakEvaluation: 'low' | 'target' | 'high';
  troughEvaluation: 'target' | 'high';
  optimalInterval: number; // calculated continuous tau
  regimenOptions: {
    interval: number;
    dose: number;
    predictedPeak: number;
    predictedTrough: number;
    frequencyText: string;
    isRecommended: boolean;
  }[];
}

export function adjustAminoglycosideTdm(
  currentDose: number,
  currentInterval: number,
  tInfusion: number,        // hours (e.g. 0.5 or 1.0)
  measuredPre: number,       // mg/L (Trough)
  measuredPost: number,      // mg/L (Peak drawn after infusion)
  tPostInfusion: number,     // hours after infusion completion (typically 1.0)
  patientWeight: number,
  targetPeak: number,        // Target peak mg/L
  targetTrough: number,      // Target trough mg/L
  drug: 'gentamicin' | 'amikacin' = 'gentamicin'
): AminoglycosideTdmAdjustmentResult | null {
  if (currentDose <= 0 || currentInterval <= 0 || measuredPre <= 0 || measuredPost <= 0) return null;
  if (measuredPost <= measuredPre) return null; // Peak must exceed trough

  const safeWeight = Math.max(1, patientWeight || 60);
  const tPeakSample = tInfusion + tPostInfusion;
  const deltaT = currentInterval - tPeakSample;

  if (deltaT <= 0) return null;

  // 1. Elimination rate constant Ke
  const ke = Math.log(measuredPost / measuredPre) / deltaT;
  if (!isFinite(ke) || ke <= 0) return null;

  // 2. Patient Half-Life
  const halfLife = Math.log(2) / ke;

  // 3. True Peak (Cmax) at completion of infusion (extrapolate back)
  const truePeak = measuredPost * Math.exp(ke * tPostInfusion);

  // 4. True Trough (Cmin) immediately before next dose (extrapolate forward)
  const trueTrough = truePeak * Math.exp(-ke * (currentInterval - tInfusion));

  // 5. Volume of Distribution (Vd)
  // Sawchuk-Zaske: deltaC = truePeak - (measuredPre * exp(-ke * tInfusion))
  const deltaC = Math.max(0.1, truePeak - (measuredPre * Math.exp(-ke * tInfusion)));
  const vd = (currentDose * (1 - Math.exp(-ke * tInfusion))) / (tInfusion * ke * deltaC);
  const vdPerKg = vd / safeWeight;
  const cl = ke * vd;

  // 6. Optimal Interval Tau = ln(targetPeak / targetTrough) / Ke + tInfusion
  const optimalTau = (Math.log(targetPeak / Math.max(0.1, targetTrough)) / ke) + tInfusion;

  // 7. Clinical Evaluation
  const peakEvaluation = truePeak < targetPeak * 0.85 ? 'low' : truePeak > targetPeak * 1.25 ? 'high' : 'target';
  const troughEvaluation = trueTrough > targetTrough ? 'high' : 'target';

  // 8. Generate Regimen Options for Standard Intervals
  const standardIntervals = drug === 'amikacin' ? [12, 24, 36, 48] : [8, 12, 24, 36, 48];
  const roundStep = drug === 'amikacin' ? 50 : 20;

  // Find closest standard interval to optimalTau
  const closestInterval = standardIntervals.reduce((prev, curr) => 
    Math.abs(curr - optimalTau) < Math.abs(prev - optimalTau) ? curr : prev
  );

  const regimenOptions = standardIntervals.map(tau => {
    // Required dose to achieve targetPeak at steady state:
    // Dose = targetPeak * Vd * Ke * tInf * (1 - exp(-Ke * tau)) / (1 - exp(-Ke * tInf))
    const rawReqDose = targetPeak * vd * ke * tInfusion * (1 - Math.exp(-ke * tau)) / (1 - Math.exp(-ke * tInfusion));
    const dose = Math.max(roundStep, Math.round(rawReqDose / roundStep) * roundStep);

    // Predict steady-state Peak and Trough for this rounded dose
    const predPeak = (dose * (1 - Math.exp(-ke * tInfusion))) / (vd * ke * tInfusion * (1 - Math.exp(-ke * tau)));
    const predTrough = predPeak * Math.exp(-ke * (tau - tInfusion));

    const freqText = tau === 8 ? 'q8h (TDS)' : tau === 12 ? 'q12h (BD)' : tau === 24 ? 'q24h (Once Daily)' : `q${tau}h (Extended)`;

    return {
      interval: tau,
      dose,
      predictedPeak: +predPeak.toFixed(1),
      predictedTrough: +predTrough.toFixed(2),
      frequencyText: freqText,
      isRecommended: tau === closestInterval
    };
  });

  return {
    ke: +ke.toFixed(4),
    halfLife: +halfLife.toFixed(1),
    vd: +vd.toFixed(1),
    vdPerKg: +vdPerKg.toFixed(2),
    cl: +cl.toFixed(2),
    truePeak: +truePeak.toFixed(1),
    trueTrough: +trueTrough.toFixed(2),
    peakEvaluation,
    troughEvaluation,
    optimalInterval: +optimalTau.toFixed(1),
    regimenOptions
  };
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
  if (!pk || !pk.ke || pk.ke <= 0 || !pk.vd || pk.vd <= 0 || !interval || interval <= 0 || !dose || dose <= 0) {
    return 0;
  }
  const { ke, vd } = pk;
  const tau = Math.max(1, interval);
  const tinf = Math.max(0.1, tInfusion || 1);
  const t = Math.max(0, timeSinceNthDose);
  const n = Math.max(1, doseNumber);

  const denomAccum = Math.max(0.00001, 1 - Math.exp(-ke * tau));
  const accumulation = (1 - Math.exp(-n * ke * tau)) / denomAccum;
  const rateCoeff = dose / (tinf * vd * ke);
  
  if (t <= tinf) {
    const conc = rateCoeff * (1 - Math.exp(-ke * t)) * accumulation;
    return isFinite(conc) && !isNaN(conc) ? Math.max(0, conc) : 0;
  } else {
    const cInfEnd = rateCoeff * (1 - Math.exp(-ke * tinf)) * accumulation;
    const conc = cInfEnd * Math.exp(-ke * (t - tinf));
    return isFinite(conc) && !isNaN(conc) ? Math.max(0, conc) : 0;
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
