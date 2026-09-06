import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Pill, 
  Sparkles, 
  HelpCircle, 
  FlaskConical, 
  ArrowRightLeft, 
  Copy, 
  Check,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Scale,
  Info,
  RotateCcw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  calculateGentamicinDose, 
  calculateAmikacinDose, 
  calculateAminoglycosidePK,
  adjustAminoglycosideTdm,
  predictAminoglycosideLevels,
  getAminoglycosideDosingOptions,
  GentamicinIndication,
  AminoglycosideResult,
  AminoglycosideDosingOption
} from '../lib/calculations';

interface AminoglycosideCalculatorProps {
  drug: 'gentamicin' | 'amikacin';
  patient: {
    age: number;
    weight: number;
    height: number;
    sex: 'male' | 'female';
    scr: number;
    crcl: number;
    ibw: number;
    bmi: number;
  };
  isHD?: boolean;
}

// Helper functions for default indication parameters
function getGentDefaultParams(indication: GentamicinIndication, isHD: boolean, crcl: number) {
  if (isHD || indication === 'hd') {
    return {
      loadingMgKg: 3.0,
      maintMgKg: 2.0,
      interval: 'hd',
      minPeak: 5.0,
      maxPeak: 10.0,
      maxTrough: 2.0,
      infusionTime: 0.5,
      regimenLabel: "Hemodialysis (HD)"
    };
  }
  switch (indication) {
    case 'odd_mild':
      return {
        loadingMgKg: 0,
        maintMgKg: 5.0,
        interval: 'auto',
        minPeak: 12.0,
        maxPeak: 15.0,
        maxTrough: 1.0,
        infusionTime: 0.5,
        regimenLabel: "Once Daily (5 mg/kg)"
      };
    case 'odd_severe':
      return {
        loadingMgKg: 7.0,
        maintMgKg: 7.0,
        interval: 'auto',
        minPeak: 16.0,
        maxPeak: 20.0,
        maxTrough: 1.0,
        infusionTime: 0.5,
        regimenLabel: "Once Daily Severe (7 mg/kg)"
      };
    case 'conv_pneumonia':
      return {
        loadingMgKg: 2.0,
        maintMgKg: 1.5,
        interval: 'auto',
        minPeak: 8.0,
        maxPeak: 12.0,
        maxTrough: 2.0,
        infusionTime: 0.5,
        regimenLabel: "Pneumonia (1.5 mg/kg)"
      };
    case 'conv_staph_endo':
      return {
        loadingMgKg: 2.0,
        maintMgKg: 1.5,
        interval: 'auto',
        minPeak: 5.0,
        maxPeak: 10.0,
        maxTrough: 2.0,
        infusionTime: 0.5,
        regimenLabel: "Staph Endocarditis (1.5 mg/kg)"
      };
    case 'conv_strep_endo':
      return {
        loadingMgKg: 1.0,
        maintMgKg: 1.0,
        interval: 'auto',
        minPeak: 3.0,
        maxPeak: 4.0,
        maxTrough: 1.0,
        infusionTime: 0.5,
        regimenLabel: "Strep/Enterococci Endocarditis (1 mg/kg)"
      };
    case 'conv_strep_endo_od':
      return {
        loadingMgKg: 0,
        maintMgKg: 3.0,
        interval: '24',
        minPeak: 10.0,
        maxPeak: 12.0,
        maxTrough: 1.0,
        infusionTime: 0.5,
        regimenLabel: "Strep/Enterococci OD (3 mg/kg)"
      };
    case 'synergy_cpen':
      return {
        loadingMgKg: 0,
        maintMgKg: 1.0,
        interval: 'auto',
        minPeak: 3.0,
        maxPeak: 4.0,
        maxTrough: 1.0,
        infusionTime: 0.5,
        regimenLabel: "Synergy with C-Pen (1 mg/kg q8h or 3 mg/kg OD)"
      };
    case 'conv_bacteremia':
      return {
        loadingMgKg: 2.0,
        maintMgKg: 1.5,
        interval: 'auto',
        minPeak: 5.0,
        maxPeak: 8.0,
        maxTrough: 2.0,
        infusionTime: 0.5,
        regimenLabel: "Bacteremia / Sepsis (1.5 mg/kg)"
      };
    case 'conv_uti':
      return {
        loadingMgKg: 0,
        maintMgKg: 1.5,
        interval: 'auto',
        minPeak: 4.0,
        maxPeak: 6.0,
        maxTrough: 2.0,
        infusionTime: 0.5,
        regimenLabel: "Urinary Tract Infection (1.5 mg/kg)"
      };
    default:
      return {
        loadingMgKg: 2.0,
        maintMgKg: 1.5,
        interval: 'auto',
        minPeak: 5.0,
        maxPeak: 10.0,
        maxTrough: 2.0,
        infusionTime: 0.5,
        regimenLabel: "Conventional (1.5 mg/kg)"
      };
  }
}

function getAmiDefaultParams(regimen: 'extended' | 'conventional' | 'hd', isHD: boolean) {
  if (isHD || regimen === 'hd') {
    return {
      loadingMgKg: 10.0,
      maintMgKg: 7.5,
      interval: 'hd',
      minPeak: 20.0,
      maxPeak: 30.0,
      maxTrough: 10.0,
      infusionTime: 0.5,
      regimenLabel: "Hemodialysis (HD)"
    };
  }
  if (regimen === 'extended') {
    return {
      loadingMgKg: 15.0,
      maintMgKg: 15.0,
      interval: 'auto',
      minPeak: 30.0,
      maxPeak: 50.0,
      maxTrough: 2.5,
      infusionTime: 0.5,
      regimenLabel: "High-Dose Once Daily (15 mg/kg)"
    };
  }
  return {
    loadingMgKg: 7.5,
    maintMgKg: 7.5,
    interval: 'auto',
    minPeak: 20.0,
    maxPeak: 30.0,
    maxTrough: 10.0,
    infusionTime: 0.5,
    regimenLabel: "Conventional Divided (7.5 mg/kg)"
  };
}

export function AminoglycosideCalculator({ drug, patient, isHD: initialHD = false }: AminoglycosideCalculatorProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'initial' | 'tdm'>('initial');

  // Gentamicin Strategy & Indication
  const [gentRegimen, setGentRegimen] = useState<'odd' | 'conventional' | 'synergy' | 'hd'>('odd');
  const [gentIndication, setGentIndication] = useState<GentamicinIndication>('odd_mild');

  // Amikacin Strategy
  const [amiRegimen, setAmiRegimen] = useState<'extended' | 'conventional' | 'hd'>('extended');

  // Dialysis toggle
  const [isHD, setIsHD] = useState<boolean>(initialHD);

  // Vd PK Calculation Mode
  const [vdMode, setVdMode] = useState<'cl_ke' | 'fixed_028' | 'expanded_035'>('cl_ke');

  // Interactive Initial Dosing Parameters
  const [loadingMgKg, setLoadingMgKg] = useState<number>(0);
  const [maintMgKg, setMaintMgKg] = useState<number>(5.0);
  const [intervalOverride, setIntervalOverride] = useState<string>('auto'); // 'auto', '8', '12', '24', '36', '48', 'hd'
  const [infusionDuration, setInfusionDuration] = useState<number>(0.5); // hours: 0.5, 1.0, 2.0
  const [selectedDoseOverride, setSelectedDoseOverride] = useState<number | null>(null);
  const [customLoadingInput, setCustomLoadingInput] = useState<string>('');
  const [customMaintInput, setCustomMaintInput] = useState<string>('');

  // Copy state
  const [copied, setCopied] = useState(false);

  // TDM 2-Point Pre & Post Inputs
  const [currentDose, setCurrentDose] = useState<string>(drug === 'gentamicin' ? '320' : '1000');
  const [currentInterval, setCurrentInterval] = useState<string>('24');
  const [tInfusion, setTInfusion] = useState<string>('0.5'); // 30 mins
  const [measuredPre, setMeasuredPre] = useState<string>(''); // trough mg/L
  const [measuredPost, setMeasuredPost] = useState<string>(''); // peak mg/L (1h post-infusion)
  const [tPostInfusion, setTPostInfusion] = useState<string>('1.0'); // 1 hour post infusion

  // Target Settings for TDM
  const defaultTargetPeak = drug === 'gentamicin' 
    ? (gentRegimen === 'odd' ? 16 : 8) 
    : (amiRegimen === 'extended' ? 35 : 25);
  const defaultTargetTrough = drug === 'gentamicin'
    ? (gentRegimen === 'odd' ? 1.0 : 2.0)
    : (amiRegimen === 'extended' ? 2.5 : 10.0);

  const [targetPeakInput, setTargetPeakInput] = useState<string>(defaultTargetPeak.toString());
  const [targetTroughInput, setTargetTroughInput] = useState<string>(defaultTargetTrough.toString());

  // Synchronize defaults whenever indication or drug or HD changes
  const syncDefaults = (
    currentDrug: 'gentamicin' | 'amikacin',
    gInd: GentamicinIndication,
    aReg: 'extended' | 'conventional' | 'hd',
    hd: boolean
  ) => {
    setSelectedDoseOverride(null);
    setCustomLoadingInput('');
    setCustomMaintInput('');
    if (currentDrug === 'gentamicin') {
      const def = getGentDefaultParams(gInd, hd, patient.crcl);
      setLoadingMgKg(def.loadingMgKg);
      setMaintMgKg(def.maintMgKg);
      setIntervalOverride(def.interval);
      setInfusionDuration(def.infusionTime);
    } else {
      const def = getAmiDefaultParams(aReg, hd);
      setLoadingMgKg(def.loadingMgKg);
      setMaintMgKg(def.maintMgKg);
      setIntervalOverride(def.interval);
      setInfusionDuration(def.infusionTime);
    }
  };

  // Initial sync on mount and when drug changes
  useEffect(() => {
    syncDefaults(drug, gentIndication, amiRegimen, isHD);
  }, [drug]);

  // Synchronize initial HD state if prop changes
  useEffect(() => {
    if (initialHD) {
      setIsHD(true);
      if (drug === 'gentamicin') {
        setGentRegimen('hd');
        setGentIndication('hd');
      } else {
        setAmiRegimen('hd');
      }
      syncDefaults(drug, 'hd', 'hd', true);
    }
  }, [initialHD, drug]);

  // Sync regimen when HD toggle changes
  const handleHdToggle = (checked: boolean) => {
    setIsHD(checked);
    if (checked) {
      if (drug === 'gentamicin') {
        setGentRegimen('hd');
        setGentIndication('hd');
        syncDefaults('gentamicin', 'hd', amiRegimen, true);
      } else {
        setAmiRegimen('hd');
        syncDefaults('amikacin', gentIndication, 'hd', true);
      }
    } else {
      if (drug === 'gentamicin') {
        setGentRegimen('odd');
        setGentIndication('odd_mild');
        syncDefaults('gentamicin', 'odd_mild', amiRegimen, false);
      } else {
        setAmiRegimen('extended');
        syncDefaults('amikacin', gentIndication, 'extended', false);
      }
    }
  };

  // 1. Aminoglycoside Kinetic Parameters
  const pkParams = useMemo(() => {
    return calculateAminoglycosidePK(
      patient.crcl,
      patient.ibw,
      patient.weight,
      vdMode
    );
  }, [patient.crcl, patient.ibw, patient.weight, vdMode]);

  // Dosing weight: if actual > 1.2 * IBW, use AdjBW = IBW + 0.4*(ABW - IBW)
  const isObese = patient.weight > 1.2 * patient.ibw;
  const dosingWeight = isObese 
    ? +(patient.ibw + 0.4 * (patient.weight - patient.ibw)).toFixed(1) 
    : +patient.weight.toFixed(1);
  const dosingWeightType = isObese ? "Adjusted Body Weight (AdjBW 0.4)" : "Actual Body Weight (ABW)";

  // Target values based on current clinical indication
  const targetInfo = useMemo(() => {
    return drug === 'gentamicin'
      ? getGentDefaultParams(gentIndication, isHD, patient.crcl)
      : getAmiDefaultParams(amiRegimen, isHD);
  }, [drug, gentIndication, amiRegimen, isHD, patient.crcl]);

  // Auto interval determined by renal clearance & regimen
  let autoInterval = 24;
  let autoIntervalText = "q24h (Once daily)";
  if (isHD || gentRegimen === 'hd' || amiRegimen === 'hd') {
    autoInterval = 0;
    autoIntervalText = "Post-HD (Dialysis days)";
  } else if (drug === 'gentamicin' && (gentRegimen === 'conventional' || gentRegimen === 'synergy') && gentIndication !== 'conv_strep_endo_od') {
    if (patient.crcl < 30) {
      autoInterval = 24;
      autoIntervalText = "q24h (OD - Renal adjusted)";
    } else if (patient.crcl < 60) {
      autoInterval = 12;
      autoIntervalText = "q12h (BD - Renal adjusted)";
    } else {
      autoInterval = 8;
      autoIntervalText = "q8h (TDS)";
    }
  } else if (drug === 'amikacin' && amiRegimen === 'conventional') {
    if (patient.crcl < 30) {
      autoInterval = 24;
      autoIntervalText = "q24h (OD - Renal adjusted)";
    } else {
      autoInterval = 12;
      autoIntervalText = "q12h (BD)";
    }
  } else {
    // Once daily extended interval
    if (patient.crcl >= 60) {
      autoInterval = 24;
      autoIntervalText = "q24h (Once daily)";
    } else if (patient.crcl >= 40) {
      autoInterval = 36;
      autoIntervalText = "q36h (Extended interval)";
    } else if (patient.crcl >= 20) {
      autoInterval = 48;
      autoIntervalText = "q48h (Extended interval)";
    } else {
      autoInterval = 0;
      autoIntervalText = "Level-guided PRN (CrCl < 20)";
    }
  }

  const resolvedInterval = intervalOverride === 'auto' 
    ? autoInterval 
    : (intervalOverride === 'hd' ? 0 : parseInt(intervalOverride));

  const resolvedIntervalText = intervalOverride === 'auto'
    ? autoIntervalText
    : (intervalOverride === 'hd' || resolvedInterval === 0 ? "Post-HD (Dialysis days)" : `q${resolvedInterval}h`);

  // Dose increments (Gentamicin 20mg, Amikacin 50mg)
  const roundIncrement = drug === 'gentamicin' ? 20 : 50;

  // Calculated Loading Dose:
  const rawLoadDose = dosingWeight * loadingMgKg;
  const calculatedLoadDose = loadingMgKg > 0 ? Math.round(rawLoadDose / roundIncrement) * roundIncrement : 0;

  // Calculated Maintenance Dose:
  const rawMaintDose = dosingWeight * maintMgKg;
  const defaultCalculatedMaintDose = Math.round(rawMaintDose / roundIncrement) * roundIncrement;
  const resolvedMaintDose = selectedDoseOverride !== null ? selectedDoseOverride : defaultCalculatedMaintDose;

  // Total daily dose
  const totalDailyDose = resolvedInterval > 0 ? Math.round(resolvedMaintDose * (24 / resolvedInterval)) : resolvedMaintDose;

  // Check if parameters are customized from defaults
  const isCustomized = 
    selectedDoseOverride !== null ||
    loadingMgKg !== targetInfo.loadingMgKg ||
    maintMgKg !== targetInfo.maintMgKg ||
    intervalOverride !== targetInfo.interval ||
    infusionDuration !== targetInfo.infusionTime;

  // Comparative Dosing Regimens for the active interval
  const comparativeOptions: AminoglycosideDosingOption[] = useMemo(() => {
    if (!resolvedInterval || resolvedInterval <= 0) return [];
    return getAminoglycosideDosingOptions(
      drug,
      dosingWeight,
      resolvedInterval,
      pkParams,
      targetInfo.minPeak,
      targetInfo.maxPeak,
      targetInfo.maxTrough,
      infusionDuration
    );
  }, [drug, dosingWeight, resolvedInterval, pkParams, targetInfo, infusionDuration]);

  // 3. TDM Sawchuk-Zaske 2-Point Calculation
  const tdmAdjustment = useMemo(() => {
    const cDose = parseFloat(currentDose);
    const cInterval = parseFloat(currentInterval);
    const tInf = parseFloat(tInfusion);
    const pre = parseFloat(measuredPre);
    const post = parseFloat(measuredPost);
    const tPost = parseFloat(tPostInfusion);
    const tPeak = parseFloat(targetPeakInput) || defaultTargetPeak;
    const tTrough = parseFloat(targetTroughInput) || defaultTargetTrough;

    if (!cDose || !cInterval || !pre || !post || isNaN(pre) || isNaN(post)) return null;

    return adjustAminoglycosideTdm(
      cDose,
      cInterval,
      tInf || 0.5,
      pre,
      post,
      tPost || 1.0,
      patient.weight,
      tPeak,
      tTrough,
      drug
    );
  }, [
    currentDose,
    currentInterval,
    tInfusion,
    measuredPre,
    measuredPost,
    tPostInfusion,
    patient.weight,
    targetPeakInput,
    targetTroughInput,
    defaultTargetPeak,
    defaultTargetTrough,
    drug
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dilution text: single clean row for both loading and maintenance
  const loadingDilution = isHD 
    ? "Dilute in 100 mL NS, infuse over 30–60 minutes during last hour of HD or post-dialysis." 
    : `Dilute in 100 mL NS (or D5W), infuse over ${Math.round(infusionDuration * 60)} minutes.`;

  const maintDilution = isHD
    ? "Dilute in 100 mL NS, infuse over 30–60 minutes post-dialysis on HD days."
    : `Dilute in ${drug === 'gentamicin' ? '100 mL NS' : '100–250 mL NS'}, infuse over ${Math.round(infusionDuration * 60)} minutes.`;

  return (
    <div className="space-y-6">
      {/* Header Info & Navigation Tabs */}
      <Card className="border-blue-200 bg-linear-to-r from-blue-50/60 via-indigo-50/40 to-white shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  {drug === 'gentamicin' ? 'Gentamicin Pharmacokinetic Protocol' : 'Amikacin Pharmacokinetic Protocol'}
                  <Badge className="bg-blue-600 text-white text-[10px] font-black uppercase">
                    mg/L Scale
                  </Badge>
                  {isHD && (
                    <Badge className="bg-purple-600 text-white text-[10px] font-black uppercase">
                      Hemodialysis
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Concentration-dependent bactericidal action (Peak/MIC &ge; 8–10) with Post-Antibiotic Effect (PAE)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold bg-white text-slate-700 border-slate-200">
                CrCl: <span className="text-blue-600 font-black ml-1">{patient.crcl.toFixed(1)} mL/min</span>
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(
                  `Patient: ${patient.age}y, ${patient.weight}kg, CrCl: ${patient.crcl.toFixed(1)} mL/min\n` +
                  `${drug.toUpperCase()} Regimen: ${resolvedMaintDose} mg ${resolvedIntervalText}\n` +
                  `Loading Dose: ${loadingMgKg > 0 ? `${calculatedLoadDose} mg (${loadingMgKg} mg/kg)` : 'None'}\n` +
                  `Dosing Weight: ${dosingWeight} kg (${dosingWeightType})\n` +
                  `Target Peak: ${targetInfo.minPeak}–${targetInfo.maxPeak} mg/L | Target Trough: < ${targetInfo.maxTrough} mg/L\n` +
                  `Infusion: ${Math.round(infusionDuration * 60)} minutes`
                )}
                className="h-8 w-8 text-slate-500 hover:text-blue-600"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Clinical Gram (-) vs Gram (+) Dosing Principle Callout */}
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-950">
            <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-blue-900 uppercase tracking-wide text-[10px] block">
                Primary Clinical Practice Rule
              </span>
              <span>
                Preferably use <strong className="text-blue-900">Once Daily Dosing (ODD)</strong> for Gram (-) infections to maximize Cmax/MIC concentration-dependent bactericidal killing. Use <strong className="text-blue-900">Conventional Dosing</strong> for Gram (+) infections (e.g. synergy in endocarditis/enterococci) or when extended intervals are contraindicated.
              </span>
            </div>
          </div>

          {/* Sub-Tabs: Initial Dosing vs TDM Adjustment */}
          <div className="flex border-b border-slate-200 gap-2 pt-1">
            <button
              onClick={() => setActiveTab('initial')}
              className={`pb-2.5 text-xs font-black transition-colors flex items-center gap-1.5 border-b-2 -mb-[2px] ${
                activeTab === 'initial'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              1. Initial Regimen & Kinetic Parameters
            </button>
            <button
              onClick={() => setActiveTab('tdm')}
              className={`pb-2.5 text-xs font-black transition-colors flex items-center gap-1.5 border-b-2 -mb-[2px] ${
                activeTab === 'tdm'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              2. TDM 2-Point Pre & Post Dose Adjustment
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* TAB 1: INITIAL DOSING & POPULATION PK PARAMETERS */}
      {/* ========================================================================= */}
      {activeTab === 'initial' && (
        <div className="space-y-6">
          {/* Clinical Strategy & Regimen Selection */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Select Clinical Regimen & Indication
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-bold text-slate-600">Hemodialysis (HD)</Label>
                  <Switch checked={isHD} onCheckedChange={handleHdToggle} />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-white">
                  Weight Used: <span className="font-black text-blue-600 ml-1">{dosingWeight} kg</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strategy Selector */}
                {drug === 'gentamicin' ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Clinical Indication & Target Category</Label>
                    <Select 
                      value={isHD ? 'hd' : gentIndication} 
                      onValueChange={(v: GentamicinIndication) => {
                        setGentIndication(v);
                        if (v === 'hd') {
                          setIsHD(true);
                          setGentRegimen('hd');
                          syncDefaults('gentamicin', 'hd', amiRegimen, true);
                        } else if (v.startsWith('odd')) {
                          setIsHD(false);
                          setGentRegimen('odd');
                          syncDefaults('gentamicin', v, amiRegimen, false);
                        } else if (v.startsWith('synergy')) {
                          setIsHD(false);
                          setGentRegimen('synergy');
                          syncDefaults('gentamicin', v, amiRegimen, false);
                        } else {
                          setIsHD(false);
                          setGentRegimen('conventional');
                          syncDefaults('gentamicin', v, amiRegimen, false);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[420px]">
                        <SelectItem value="odd_mild">Once Daily: Mild to Moderate Infection (Peak 12–15, Trough &lt; 1)</SelectItem>
                        <SelectItem value="odd_severe">Once Daily: Severe Critically Ill Infection (Peak 16–20, Trough &lt; 1)</SelectItem>
                        <SelectItem value="conv_pneumonia">Conventional: Pneumonia (Peak 8–12, Trough &lt; 2)</SelectItem>
                        <SelectItem value="conv_staph_endo">Conventional: Endocarditis - Staph aureus (Peak 5–10, Trough &lt; 2)</SelectItem>
                        <SelectItem value="conv_strep_endo">Conventional: Endocarditis - Strep / Enterococci (Peak 3–4, Trough &lt; 1)</SelectItem>
                        <SelectItem value="conv_strep_endo_od">Conventional: Endocarditis - Strep / Enterococci Single Daily (Peak 10–12, Trough &lt; 1)</SelectItem>
                        <SelectItem value="synergy_cpen">Endocarditis with C-Pen (3 mg/kg/24h or 1 mg/kg q8h)</SelectItem>
                        <SelectItem value="conv_bacteremia">Conventional: Bacteremia / Sepsis (Peak 5–8, Trough &lt; 2)</SelectItem>
                        <SelectItem value="conv_uti">Conventional: Urinary Tract Infection (Peak 4–6, Trough &lt; 2)</SelectItem>
                        <SelectItem value="conv_general">Conventional: General Dosing (Trough &lt; 2)</SelectItem>
                        <SelectItem value="hd">Hemodialysis (HD): 3 mg/kg load, then 2 mg/kg post-HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Amikacin Regimen Type</Label>
                    <Select 
                      value={isHD ? 'hd' : amiRegimen} 
                      onValueChange={(v: 'extended' | 'conventional' | 'hd') => {
                        setAmiRegimen(v);
                        const hdActive = v === 'hd';
                        setIsHD(hdActive);
                        syncDefaults('amikacin', gentIndication, v, hdActive);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[420px]">
                        <SelectItem value="extended">High-Dose Once Daily (15 mg/kg) — Peak 30–50, Trough &lt; 2.5 (Gram - Preferred)</SelectItem>
                        <SelectItem value="conventional">Conventional Divided (7.5 mg/kg q12h) — Peak 20–30, Trough &lt; 10</SelectItem>
                        <SelectItem value="hd">Hemodialysis (HD): 10 mg/kg load, then 7.5 mg/kg post-HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dosing Weight Basis Banner */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Dosing Weight Basis</span>
                    <span className="font-bold text-slate-800">{dosingWeightType}</span>
                  </div>
                  {isObese ? (
                    <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold">
                      AdjBW Applied (Actual &gt; 120% IBW)
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-200 text-slate-700 border-none text-[10px] font-bold">
                      Actual Body Weight
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Dosing Strategy & Parameters Adjustment Card */}
          <Card className="border-indigo-100 bg-linear-to-b from-indigo-50/40 via-white to-white shadow-xs">
            <CardHeader className="py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Initial Dosing Parameters & Strategy Customization
                </CardTitle>
              </div>
              {isCustomized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncDefaults(drug, gentIndication, amiRegimen, isHD)}
                  className="h-7 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100/60 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Defaults
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Loading Dose (mg/kg) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Loading Dose</Label>
                    <span className="text-[10px] font-black text-blue-600">
                      {loadingMgKg > 0 ? `${loadingMgKg} mg/kg` : 'None'}
                    </span>
                  </div>
                  {drug === 'gentamicin' ? (
                    <Select 
                      value={loadingMgKg.toString()} 
                      onValueChange={(v) => {
                        const val = parseFloat(v);
                        setLoadingMgKg(val);
                        setCustomLoadingInput('');
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 mg/kg (None / Maint Start)</SelectItem>
                        <SelectItem value="1">1.0 mg/kg (Low-dose load)</SelectItem>
                        <SelectItem value="2">2.0 mg/kg (Conventional Load)</SelectItem>
                        <SelectItem value="3">3.0 mg/kg (HD Protocol Load)</SelectItem>
                        <SelectItem value="5">5.0 mg/kg (ODD Mild Load)</SelectItem>
                        <SelectItem value="7">7.0 mg/kg (ODD Severe Load)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select 
                      value={loadingMgKg.toString()} 
                      onValueChange={(v) => {
                        const val = parseFloat(v);
                        setLoadingMgKg(val);
                        setCustomLoadingInput('');
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 mg/kg (None / Maint Start)</SelectItem>
                        <SelectItem value="7.5">7.5 mg/kg (Conventional Load)</SelectItem>
                        <SelectItem value="10">10.0 mg/kg (HD Protocol Load)</SelectItem>
                        <SelectItem value="15">15.0 mg/kg (High-Dose Load)</SelectItem>
                        <SelectItem value="20">20.0 mg/kg (Aggressive Load)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">
                    Calculates: <span className="font-bold text-slate-700">{calculatedLoadDose > 0 ? `${calculatedLoadDose} mg` : 'No initial load'}</span>
                  </p>
                </div>

                {/* 2. Maintenance Dose (mg/kg) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Maintenance Dose</Label>
                    <span className="text-[10px] font-black text-indigo-600">
                      {maintMgKg} mg/kg
                    </span>
                  </div>
                  {drug === 'gentamicin' ? (
                    <Select 
                      value={maintMgKg.toString()} 
                      onValueChange={(v) => {
                        const val = parseFloat(v);
                        setMaintMgKg(val);
                        setSelectedDoseOverride(null);
                        setCustomMaintInput('');
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1.0 mg/kg (Synergy / Low)</SelectItem>
                        <SelectItem value="1.5">1.5 mg/kg (Conventional Standard)</SelectItem>
                        <SelectItem value="1.7">1.7 mg/kg (Upper Conventional)</SelectItem>
                        <SelectItem value="2">2.0 mg/kg (HD Maintenance)</SelectItem>
                        <SelectItem value="3">3.0 mg/kg (C-Pen OD / Synergy)</SelectItem>
                        <SelectItem value="5">5.0 mg/kg (ODD Mild/Mod)</SelectItem>
                        <SelectItem value="7">7.0 mg/kg (ODD Severe / Sepsis)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select 
                      value={maintMgKg.toString()} 
                      onValueChange={(v) => {
                        const val = parseFloat(v);
                        setMaintMgKg(val);
                        setSelectedDoseOverride(null);
                        setCustomMaintInput('');
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5.0 mg/kg (Renal Adjusted)</SelectItem>
                        <SelectItem value="7.5">7.5 mg/kg (Conventional / HD)</SelectItem>
                        <SelectItem value="10">10.0 mg/kg (Moderate)</SelectItem>
                        <SelectItem value="15">15.0 mg/kg (High-Dose Extended)</SelectItem>
                        <SelectItem value="18">18.0 mg/kg (Critically Ill)</SelectItem>
                        <SelectItem value="20">20.0 mg/kg (Severe Sepsis)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">
                    Calculates: <span className="font-bold text-slate-700">{defaultCalculatedMaintDose} mg</span>
                  </p>
                </div>

                {/* 3. Dosing Interval (Tau) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Dosing Interval (τ)</Label>
                    <span className="text-[10px] font-black text-purple-600">{resolvedIntervalText.split(' ')[0]}</span>
                  </div>
                  <Select 
                    value={intervalOverride} 
                    onValueChange={(v) => {
                      setIntervalOverride(v);
                      setSelectedDoseOverride(null);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto ({autoIntervalText})</SelectItem>
                      <SelectItem value="8">q8h (Every 8 hours - TDS)</SelectItem>
                      <SelectItem value="12">q12h (Every 12 hours - BD)</SelectItem>
                      <SelectItem value="24">q24h (Every 24 hours - OD)</SelectItem>
                      <SelectItem value="36">q36h (Extended 36 hours)</SelectItem>
                      <SelectItem value="48">q48h (Extended 48 hours)</SelectItem>
                      <SelectItem value="hd">Post-HD (Dialysis days)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    Guided by CrCl: <span className="font-bold text-slate-700">{patient.crcl.toFixed(0)} mL/min</span>
                  </p>
                </div>

                {/* 4. Infusion Duration */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Infusion Duration</Label>
                    <span className="text-[10px] font-black text-slate-600">{Math.round(infusionDuration * 60)} min</span>
                  </div>
                  <Select 
                    value={infusionDuration.toString()} 
                    onValueChange={(v) => setInfusionDuration(parseFloat(v))}
                  >
                    <SelectTrigger className="h-8 text-xs font-bold border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">30 minutes (0.5h - Standard)</SelectItem>
                      <SelectItem value="1">60 minutes (1.0h - Extended)</SelectItem>
                      <SelectItem value="2">120 minutes (2.0h)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Sampling peak: <span className="font-bold text-slate-700">1h post-infusion</span>
                  </p>
                </div>
              </div>

              {/* Custom Value Entry Row if desired */}
              <div className="pt-2 border-t border-indigo-50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-bold text-slate-600 shrink-0">Custom Loading (mg/kg):</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 2.5" 
                    className="h-7 text-xs font-bold border-slate-200 bg-white w-24"
                    value={customLoadingInput}
                    onChange={(e) => {
                      setCustomLoadingInput(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed >= 0) setLoadingMgKg(parsed);
                    }}
                  />
                  {customLoadingInput && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      = {calculatedLoadDose} mg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-bold text-slate-600 shrink-0">Custom Maintenance (mg/kg):</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 6.0" 
                    className="h-7 text-xs font-bold border-slate-200 bg-white w-24"
                    value={customMaintInput}
                    onChange={(e) => {
                      setCustomMaintInput(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) {
                        setMaintMgKg(parsed);
                        setSelectedDoseOverride(null);
                      }
                    }}
                  />
                  {customMaintInput && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      = {defaultCalculatedMaintDose} mg
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dosing Recommendations & Target Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loading Dose Box */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Loading Dose</span>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black">
                  {loadingMgKg > 0 ? `${loadingMgKg} mg/kg` : 'None / Not Indicated'}
                </Badge>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-slate-900">
                  {loadingMgKg > 0 ? (
                    <>
                      {calculatedLoadDose} <span className="text-sm font-bold text-slate-500">mg</span>
                    </>
                  ) : (
                    <span className="text-2xl sm:text-3xl text-slate-400 font-bold">None Indicated</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  {loadingMgKg > 0 
                    ? `Administer once as initial loading dose • Based on ${dosingWeight} kg (${dosingWeightType})` 
                    : 'Start maintenance regimen directly as first scheduled dose'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
                <span>{loadingDilution}</span>
              </div>
            </div>

            {/* Maintenance Dose Box */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Maintenance Regimen</span>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black">
                  {resolvedIntervalText}
                </Badge>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-slate-900">
                  {resolvedMaintDose} <span className="text-sm font-bold text-slate-500">mg</span>{' '}
                  <span className="text-xl font-bold text-indigo-600">
                    {resolvedInterval === 0 ? 'Post-HD' : `q${resolvedInterval}h`}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  {resolvedInterval === 0
                    ? `Administer post-HD on dialysis days • ${(resolvedMaintDose / dosingWeight).toFixed(1)} mg/kg`
                    : `Target range: ${(resolvedMaintDose / dosingWeight).toFixed(1)} mg/kg/dose • Total daily: ${totalDailyDose} mg/day`}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center justify-between">
                <span>{maintDilution}</span>
                {selectedDoseOverride !== null && (
                  <button
                    onClick={() => setSelectedDoseOverride(null)}
                    className="text-[10px] font-bold text-blue-600 hover:underline shrink-0 ml-2"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Therapeutic Targets & Sampling Window Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Therapeutic Target & Sampling Protocol</span>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black">
                {drug.toUpperCase()} Target Range
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/60">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Target Peak (1h Post-Infusion)</span>
                  <span className="text-[10px] text-slate-400 font-medium">Bactericidal efficacy (Cmax/MIC)</span>
                </div>
                <span className="text-sm font-black text-indigo-700">
                  {targetInfo.minPeak} – {targetInfo.maxPeak} mg/L
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Target Trough (Pre-Dose)</span>
                  <span className="text-[10px] text-slate-400 font-medium">Toxicity prevention (Nephro/Oto)</span>
                </div>
                <span className="text-sm font-black text-emerald-700">
                  &lt; {targetInfo.maxTrough} mg/L
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong>Sampling Protocol:</strong> Peak drawn exactly 1h after completion of 30–60 min infusion. Trough drawn &le; 30 minutes before next scheduled dose.
              </span>
            </div>
          </div>

          {/* Comparative Dosing Regimens Matrix (for active interval) */}
          {resolvedInterval > 0 && comparativeOptions.length > 0 && (
            <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
              <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Comparative Dosing Regimens ({resolvedIntervalText})
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                    Steady-state peak (1h post-infusion) and trough levels predicted using individual PK parameters (Ke: {pkParams.ke} h⁻¹, Vd: {pkParams.vd} L)
                  </CardDescription>
                </div>
                {selectedDoseOverride !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDoseOverride(null)}
                    className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Override
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                        <th className="p-3">Dose</th>
                        <th className="p-3">mg/kg</th>
                        <th className="p-3">Pred. Peak (Cmax)</th>
                        <th className="p-3">Pred. Trough (Cmin)</th>
                        <th className="p-3">Daily Dose</th>
                        <th className="p-3">Target Assessment</th>
                        <th className="p-3 text-right">Selection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {comparativeOptions.map((opt) => {
                        const isSelected = resolvedMaintDose === opt.dose;
                        return (
                          <tr 
                            key={opt.dose}
                            onClick={() => setSelectedDoseOverride(opt.dose)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-50/70 font-bold text-slate-900 border-l-4 border-l-blue-600' 
                                : 'hover:bg-slate-50/80 text-slate-700'
                            }`}
                          >
                            <td className="p-3 font-black text-slate-900">
                              {opt.dose} mg
                            </td>
                            <td className="p-3 font-bold text-slate-600">
                              {opt.mgKg} mg/kg
                            </td>
                            <td className="p-3">
                              <span className={`font-black ${
                                opt.cmax >= targetInfo.minPeak && opt.cmax <= targetInfo.maxPeak 
                                  ? 'text-emerald-700' 
                                  : opt.cmax > targetInfo.maxPeak 
                                    ? 'text-amber-700' 
                                    : 'text-slate-500'
                              }`}>
                                {opt.cmax.toFixed(1)} mg/L
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`font-black ${
                                opt.cmin <= targetInfo.maxTrough 
                                  ? 'text-emerald-700' 
                                  : 'text-rose-700'
                              }`}>
                                {opt.cmin.toFixed(2)} mg/L
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-medium">
                              {opt.totalDailyDose} mg/day
                            </td>
                            <td className="p-3">
                              <Badge className={`text-[10px] font-bold border-none ${
                                opt.suitability === 'target' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : opt.suitability === 'high_risk'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {opt.clinicalTag}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {isSelected ? (
                                <Badge className="bg-blue-600 text-white text-[10px] font-black">
                                  Selected
                                </Badge>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 hover:text-blue-600">
                                  Select
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kinetic Formulas & Parameters Dashboard */}
          <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
            <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Pharmacokinetic Parameters (CL, Ke, Vd & T½)
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                  Calculated from patient CrCl ({patient.crcl.toFixed(1)} mL/min) and Ideal Body Weight ({patient.ibw.toFixed(1)} kg)
                </CardDescription>
              </div>

              {/* Vd Condition Selector */}
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-bold text-slate-600">Vd Model:</Label>
                <Select value={vdMode} onValueChange={(v: any) => setVdMode(v)}>
                  <SelectTrigger className="h-7 text-[11px] font-bold border-slate-200 bg-white w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cl_ke">CL / Ke (Standard PK Ratio)</SelectItem>
                    <SelectItem value="fixed_028">0.28 L/kg (Fixed Standard)</SelectItem>
                    <SelectItem value="expanded_035">&gt; 0.3 L/kg (Ascites/Cancer/Oedema/SCI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Clearance CL */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">1. Clearance (CL)</span>
                  <p className="text-2xl font-black text-slate-900">{pkParams.cl} <span className="text-xs font-bold text-slate-400">L/h</span></p>
                  <p className="text-[9px] text-slate-500 font-medium">[(0.73 × CrCl/IBW) + 0.06] × IBW × 0.06</p>
                </div>

                {/* 2. Elimination Rate Constant Ke */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">2. Elim. Constant (Ke)</span>
                  <p className="text-2xl font-black text-indigo-900">{pkParams.ke} <span className="text-xs font-bold text-slate-400">h⁻¹</span></p>
                  <p className="text-[9px] text-slate-500 font-medium">0.0024 × CrCl + 0.01</p>
                </div>

                {/* 3. Volume of Distribution Vd */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">3. Volume of Dist. (Vd)</span>
                  <p className="text-2xl font-black text-blue-900">{pkParams.vd} <span className="text-xs font-bold text-slate-400">L</span></p>
                  <p className="text-[9px] text-slate-500 font-medium">{pkParams.vdPerKg} L/kg ({pkParams.methodLabel.split('(')[0]})</p>
                </div>

                {/* 4. Elimination Half-Life T1/2 */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">4. Half-Life (T½)</span>
                  <p className="text-2xl font-black text-purple-900">{pkParams.halfLife} <span className="text-xs font-bold text-slate-400">hours</span></p>
                  <p className="text-[9px] text-slate-500 font-medium">ln(2) / Ke</p>
                </div>
              </div>

              {/* Note on Vd > 0.3 L/kg conditions */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Vd Note:</strong> Extracellular fluid expansion in <span className="font-bold text-indigo-900">ascites, cancer cachexia, generalized oedema, or spinal cord injury</span> frequently increases Vd beyond <span className="font-bold text-indigo-900">0.3 L/kg</span>. Select the expanded model above if these clinical features are present.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TDM 2-POINT PRE & POST DOSE ADJUSTMENT (SAWCHUK-ZASKE) */}
      {/* ========================================================================= */}
      {activeTab === 'tdm' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Parameters Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="py-4 bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                  Sawchuk-Zaske 2-Point Pre & Post Inputs
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Note: Post-dose level drawn exactly 1 hour after 30-min infusion ends to allow tissue distribution.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Current Dose (mg)</Label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={currentDose} 
                      onChange={(e) => setCurrentDose(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Current Interval (tau, h)</Label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={currentInterval} 
                      onChange={(e) => setCurrentInterval(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Pre-Dose Trough (Cpre, mg/L)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      placeholder="e.g. 1.2" 
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={measuredPre} 
                      onChange={(e) => setMeasuredPre(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Post-Dose Peak (Cpost, mg/L)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      placeholder="e.g. 14.5" 
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={measuredPost} 
                      onChange={(e) => setMeasuredPost(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Infusion Time (t_inf, h)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={tInfusion} 
                      onChange={(e) => setTInfusion(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Post Draw Delay (h)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={tPostInfusion} 
                      onChange={(e) => setTPostInfusion(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Target Peak (mg/L)</Label>
                    <Input 
                      type="number" 
                      step="0.5"
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={targetPeakInput} 
                      onChange={(e) => setTargetPeakInput(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Target Trough (mg/L)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      className="h-9 text-xs font-bold border-slate-200" 
                      value={targetTroughInput} 
                      onChange={(e) => setTargetTroughInput(e.target.value)} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Kinetic Calculation Output */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="py-4 bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Individual Patient Pharmacokinetics
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Calculated from patient's true pre and post serum concentrations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {tdmAdjustment ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Patient Ke</span>
                        <p className="text-2xl font-black text-indigo-900">{tdmAdjustment.ke.toFixed(4)} <span className="text-xs font-bold text-slate-400">h⁻¹</span></p>
                        <p className="text-[9px] text-slate-400 font-bold">Elimination Rate</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Patient T½</span>
                        <p className="text-2xl font-black text-indigo-900">{tdmAdjustment.halfLife.toFixed(1)} <span className="text-xs font-bold text-slate-400">hours</span></p>
                        <p className="text-[9px] text-slate-400 font-bold">True Half-Life</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Patient Vd</span>
                        <p className="text-2xl font-black text-blue-900">{tdmAdjustment.vd.toFixed(1)} <span className="text-xs font-bold text-slate-400">L</span></p>
                        <p className="text-[9px] text-slate-400 font-bold">{tdmAdjustment.vdPerKg.toFixed(2)} L/kg</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Patient CL</span>
                        <p className="text-2xl font-black text-blue-900">{tdmAdjustment.cl.toFixed(2)} <span className="text-xs font-bold text-slate-400">L/h</span></p>
                        <p className="text-[9px] text-slate-400 font-bold">Total Clearance</p>
                      </div>
                    </div>

                    {/* True Peak & True Trough Extrapolation */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Extrapolated Steady-State Concentrations
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">True Peak (End of Infusion):</span>
                        <span className="font-black text-indigo-900 text-sm">{tdmAdjustment.truePeak.toFixed(1)} mg/L</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">True Trough (End of Interval):</span>
                        <span className="font-black text-emerald-900 text-sm">{tdmAdjustment.trueTrough.toFixed(1)} mg/L</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400 font-bold text-xs">
                    <Activity className="w-8 h-8 text-slate-300 mb-2" />
                    Enter measured Pre and Post serum levels on the left to calculate patient-specific Ke, Vd, Half-Life, and revised regimens.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revised Regimens Table */}
          {tdmAdjustment && (
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    Suggested Revised Regimens & Interval Simulation
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                    Target Peak: {targetPeakInput} mg/L • Target Trough: &lt; {targetTroughInput} mg/L
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                      <th className="py-2.5 px-3">Interval</th>
                      <th className="py-2.5 px-3">Calculated Dose</th>
                      <th className="py-2.5 px-3">Predicted Peak (Cmax)</th>
                      <th className="py-2.5 px-3">Predicted Trough (Cmin)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tdmAdjustment.regimenOptions.map((opt) => (
                      <tr key={opt.interval} className={opt.isRecommended ? 'bg-purple-50/80 font-bold' : 'hover:bg-slate-50/70'}>
                        <td className="py-2.5 px-3 font-black text-slate-900">
                          {opt.frequencyText}
                          {opt.isRecommended && (
                            <Badge className="bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 ml-2 border-none">
                              Recommended
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-black text-indigo-900">
                          {opt.dose} mg
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {opt.predictedPeak.toFixed(1)} mg/L
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {opt.predictedTrough.toFixed(2)} mg/L
                        </td>
                        <td className="py-2.5 px-3">
                          {opt.predictedTrough <= (parseFloat(targetTroughInput) || defaultTargetTrough) ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                              Safe Trough
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                              Accumulation Risk
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
