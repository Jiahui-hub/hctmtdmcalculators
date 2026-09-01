import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  User, 
  Activity, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  ChevronRight,
  Stethoscope,
  Pill,
  Scale,
  Copy,
  Check,
  ArrowRightLeft,
  Clock,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Flame,
  CheckCircle2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

import { 
  calculateCrCl, 
  calculateIBW, 
  calculateVancoLoadingDose, 
  calculateVancoMaintenance, 
  adjustVancoDose, 
  calculateBactrimDose,
  getDosingWeight,
  getVancoAdminDetails,
  calculateVancoPopPK,
  predictVancoLevels,
  getVancoDosingOptions,
  VancoDosingOption,
  calculateFluconazoleDose,
  adjustFluconazoleDose,
  calculateVancoKeFromTrough,
  calculateVancoRandomPK,
  predictLevelAfterDoseN,
  calculateVancoKeFromEarlyLevel,
  PatientData,
  VANCO_CONVERSION_FACTOR
} from './lib/calculations';

import { DrugDirectory, DrugId } from './components/DrugDirectory';
import { PkVisualizer } from './components/PkVisualizer';
import { ClinicalConceptsGuide } from './components/ClinicalConceptsGuide';
import { AminoglycosideCalculator } from './components/AminoglycosideCalculator';

export default function App() {
  // Active Drug Selector
  const [activeDrug, setActiveDrug] = useState<DrugId>('vanco');

  // Patient State
  const [age, setAge] = useState<string>('65');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState<string>('70');
  const [height, setHeight] = useState<string>('170');
  const [scr, setScr] = useState<string>('100');
  const [roundLowScr, setRoundLowScr] = useState<boolean>(false);

  // Vanco Adjustment State
  const [currentVancoDose, setCurrentVancoDose] = useState<string>('1000');
  const [currentVancoInterval, setCurrentVancoInterval] = useState<string>('12');
  const [measuredVancoLevel, setMeasuredVancoLevel] = useState<string>('');

  // Vanco Overrides & Sub-tabs
  const [vancoSubTab, setVancoSubTab] = useState<'initial' | 'tdm'>('initial');
  const [vancoLoadingMgKg, setVancoLoadingMgKg] = useState<string>('25');
  const [vancoMaintenanceMgKg, setVancoMaintenanceMgKg] = useState<string>('15');
  const [selectedVancoDoseOverride, setSelectedVancoDoseOverride] = useState<number | null>(null);
  const [vancoInfusionTime, setVancoInfusionTime] = useState<string>('1');
  const [vancoVdCoeff, setVancoVdCoeff] = useState<string>('0.7');
  const [vancoTargetTroughRange, setVancoTargetTroughRange] = useState<'standard' | 'high'>('standard');
  const [isAnuric, setIsAnuric] = useState(false);
  const [isVancoHD, setIsVancoHD] = useState(false);
  const [vancoManualInterval, setVancoManualInterval] = useState<string>('auto');

  // Bactrim State
  const [bactrimIndication, setBactrimIndication] = useState<string>('severe_pjp');
  const [isBactrimDialysis, setIsBactrimDialysis] = useState(false);

  // Vancomycin Advanced PK State
  const [showAdvancedPK, setShowAdvancedPK] = useState(false);
  const [randomDose, setRandomDose] = useState("1000");
  const [randomLevel, setRandomLevel] = useState("");
  const [timeSinceDose, setTimeSinceDose] = useState("12");
  const [randomVd, setRandomVd] = useState("0.7");

  // Early Level Predictor State
  const [earlyDoseNumber, setEarlyDoseNumber] = useState("1");
  const [earlyTimeSinceDose, setEarlyTimeSinceDose] = useState("12");
  const [earlyMeasuredLevel, setEarlyMeasuredLevel] = useState("");

  // Fluconazole State
  const [flucoBaseDose, setFlucoBaseDose] = useState<string>('400');
  const [flucoMeasuredLevel, setFlucoMeasuredLevel] = useState<string>('');
  const [flucoTargetLevel, setFlucoTargetLevel] = useState<string>('15');
  const [flucoIndication, setFlucoIndication] = useState<string>('candidemia');

  // Vanco PK Override State
  const [manualVd, setManualVd] = useState<string>('');
  const [manualKe, setManualKe] = useState<string>('');
  const [vancoMic, setVancoMic] = useState<string>('1');

  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Derived Patient Data
  const rawScr = parseFloat(scr) || 0;
  const isLowScr = rawScr > 0 && rawScr < 60;
  const effectiveScr = (roundLowScr && isLowScr) ? 60 : rawScr;

  const patientData = useMemo<PatientData>(() => ({
    age: parseFloat(age) || 0,
    sex,
    weight: parseFloat(weight) || 0,
    height: parseFloat(height) || 0,
    scr: effectiveScr,
  }), [age, sex, weight, height, effectiveScr]);

  const ibw = useMemo(() => calculateIBW(patientData.sex, patientData.height), [patientData]);
  const dosingWeightInfo = useMemo(() => getDosingWeight(patientData.weight, ibw, patientData.height), [patientData.weight, ibw, patientData.height]);
  const crcl = useMemo(() => calculateCrCl(patientData), [patientData]);

  // Is the patient clinically obese? (TBW > 1.2 * IBW or BMI > 30)
  const isObesePatient = useMemo(() => {
    const bmi = patientData.height > 0 ? patientData.weight / Math.pow(patientData.height / 100, 2) : 0;
    return patientData.weight > (1.2 * ibw) || bmi > 30;
  }, [patientData.weight, patientData.height, ibw]);

  // Vancomycin Results
  const vancoLoading = useMemo(() => {
    return calculateVancoLoadingDose(
      patientData.weight,
      dosingWeightInfo.weight,
      isObesePatient,
      isVancoHD,
      parseFloat(vancoLoadingMgKg) || 25
    );
  }, [patientData.weight, dosingWeightInfo.weight, isObesePatient, isVancoHD, vancoLoadingMgKg]);

  const vancoMaintenanceAuto = useMemo(() => {
    return calculateVancoMaintenance(
      crcl,
      patientData.weight,
      parseFloat(vancoMaintenanceMgKg) || 15,
      isAnuric || isVancoHD
    );
  }, [crcl, patientData.weight, vancoMaintenanceMgKg, isAnuric, isVancoHD]);
  
  const vancoMaintenance = useMemo(() => {
    const res = { ...vancoMaintenanceAuto };
    if (vancoManualInterval !== 'auto') {
      res.interval = parseInt(vancoManualInterval);
    }
    if (selectedVancoDoseOverride !== null) {
      res.dose = selectedVancoDoseOverride;
    }
    return res;
  }, [vancoMaintenanceAuto, vancoManualInterval, selectedVancoDoseOverride]);
  
  const vancoAdmin = useMemo(() => getVancoAdminDetails(vancoMaintenance.dose, isVancoHD), [vancoMaintenance.dose, isVancoHD]);
  const vancoLoadingAdmin = useMemo(() => getVancoAdminDetails(vancoLoading.dose, isVancoHD), [vancoLoading.dose, isVancoHD]);

  // PK Calculations
  const popPK = useMemo(() => calculateVancoPopPK(patientData.weight, crcl, parseFloat(vancoVdCoeff) || 0.7, isAnuric || isVancoHD), [patientData.weight, crcl, vancoVdCoeff, isAnuric, isVancoHD]);

  // Vancomycin Multi-Regimen Comparative Matrix
  const vancoDosingOptions = useMemo(() => {
    return getVancoDosingOptions(
      patientData.weight,
      vancoMaintenance.interval || 12,
      popPK,
      parseFloat(vancoInfusionTime) || 1,
      parseFloat(vancoMic) || 1
    );
  }, [patientData.weight, vancoMaintenance.interval, popPK, vancoInfusionTime, vancoMic]);
  
  const currentPK = useMemo(() => {
    const pk = {
      vd: parseFloat(manualVd) || popPK.vd,
      cl: popPK.cl,
      ke: parseFloat(manualKe) || popPK.ke,
      halfLife: manualKe ? (0.693 / parseFloat(manualKe)) : popPK.halfLife
    };
    if (manualVd && manualKe) {
      pk.cl = pk.vd * pk.ke;
    }
    return pk;
  }, [popPK, manualVd, manualKe]);

  // Initial Dosing Predictions
  const initialPredictions = useMemo(() => {
    if (!vancoMaintenance.interval || vancoMaintenance.interval <= 0) return null;
    return predictVancoLevels(
      vancoMaintenance.dose,
      vancoMaintenance.interval,
      popPK,
      parseFloat(vancoInfusionTime) || 1,
      parseFloat(vancoMic) || 1
    );
  }, [vancoMaintenance, popPK, vancoInfusionTime, vancoMic]);

  // Target midpoint: 12.5 mg/L for 10-15; 17.5 mg/L for 15-20
  const vancoTargetMidpoint = vancoTargetTroughRange === 'high' ? 17.5 : 12.5;

  const vancoAdjustment = useMemo(() => {
    const level = parseFloat(measuredVancoLevel);
    if (!level || isNaN(level)) return null;
    return adjustVancoDose(
      parseFloat(currentVancoDose) || 0,
      parseFloat(currentVancoInterval) || 0,
      level,
      vancoTargetMidpoint
    );
  }, [measuredVancoLevel, currentVancoDose, currentVancoInterval, vancoTargetMidpoint]);

  const vancoAdjustedAdmin = useMemo(() => vancoAdjustment ? getVancoAdminDetails(vancoAdjustment.dose, isVancoHD) : null, [vancoAdjustment, isVancoHD]);

  // Bactrim Results
  const bactrimResult = useMemo(() => calculateBactrimDose(patientData.weight, crcl, bactrimIndication, isBactrimDialysis), [patientData.weight, crcl, bactrimIndication, isBactrimDialysis]);

  // Vancomycin TDM PK & Predictions (mg/L based)
  const vancoTdmPK = useMemo(() => {
    const level = parseFloat(measuredVancoLevel);
    if (!level || isNaN(level) || !currentVancoDose || !currentVancoInterval) return null;
    
    const vd = parseFloat(manualVd) || popPK.vd;
    
    const ke = calculateVancoKeFromTrough(
      parseFloat(currentVancoDose),
      parseFloat(currentVancoInterval),
      vd,
      level
    );
    
    const cl = ke * vd;
    const halfLife = 0.693 / ke;
    return { vd, cl, ke, halfLife };
  }, [measuredVancoLevel, currentVancoDose, currentVancoInterval, popPK.vd, manualVd]);

  const vancoTdmPredictions = useMemo(() => {
    if (!vancoTdmPK || !vancoAdjustment) return null;
    return predictVancoLevels(
      vancoAdjustment.dose,
      vancoAdjustment.interval,
      vancoTdmPK,
      parseFloat(vancoInfusionTime) || 1,
      parseFloat(vancoMic) || 1
    );
  }, [vancoTdmPK, vancoAdjustment, vancoInfusionTime, vancoMic]);

  // Random PK Result (mg/L based)
  const randomPKResult = useMemo(() => {
    if (!randomLevel || !randomDose || !timeSinceDose) return null;
    const vd = parseFloat(randomVd) * patientData.weight;
    return calculateVancoRandomPK(
      parseFloat(randomDose),
      vd,
      parseFloat(randomLevel),
      parseFloat(timeSinceDose)
    );
  }, [randomLevel, randomDose, timeSinceDose, randomVd, patientData.weight]);

  // Early Level Predictor (mg/L based)
  const earlyPKResult = useMemo(() => {
    const level = parseFloat(earlyMeasuredLevel);
    if (!level || isNaN(level)) return null;
    
    const dose = vancoAdjustment ? vancoAdjustment.dose : vancoMaintenance.dose;
    const interval = vancoAdjustment ? vancoAdjustment.interval : vancoMaintenance.interval;
    const doseNum = parseInt(earlyDoseNumber) || 1;
    const timeSince = parseFloat(earlyTimeSinceDose) || 12;
    const tinf = parseFloat(vancoInfusionTime) || 1;
    
    const vd = popPK.vd;
    
    const ke = calculateVancoKeFromEarlyLevel(
      dose,
      interval,
      doseNum,
      level,
      timeSince,
      vd,
      tinf
    );
    
    const cl = ke * vd;
    const halfLife = 0.693 / ke;
    
    return { vd, cl, ke, halfLife };
  }, [earlyMeasuredLevel, vancoAdjustment, vancoMaintenance, earlyDoseNumber, earlyTimeSinceDose, vancoInfusionTime, popPK.vd]);

  const earlySSPredictions = useMemo(() => {
    if (!earlyPKResult) return null;
    const dose = vancoAdjustment ? vancoAdjustment.dose : vancoMaintenance.dose;
    const interval = vancoAdjustment ? vancoAdjustment.interval : vancoMaintenance.interval;
    return predictVancoLevels(
      dose,
      interval,
      earlyPKResult,
      parseFloat(vancoInfusionTime) || 1,
      parseFloat(vancoMic) || 1
    );
  }, [earlyPKResult, vancoAdjustment, vancoMaintenance, vancoInfusionTime, vancoMic]);

  const earlyLevelResult = useMemo(() => {
    const pk = earlyPKResult || vancoTdmPK || popPK;
    const dose = vancoAdjustment ? vancoAdjustment.dose : vancoMaintenance.dose;
    const interval = vancoAdjustment ? vancoAdjustment.interval : vancoMaintenance.interval;
    
    return predictLevelAfterDoseN(
      dose,
      interval,
      parseInt(earlyDoseNumber) || 1,
      parseFloat(earlyTimeSinceDose) || 12,
      pk,
      parseFloat(vancoInfusionTime) || 1
    );
  }, [earlyPKResult, vancoTdmPK, popPK, vancoAdjustment, vancoMaintenance, earlyDoseNumber, earlyTimeSinceDose, vancoInfusionTime]);

  // Sync Fluconazole indication to dosage base and targets
  useEffect(() => {
    switch (flucoIndication) {
      case 'candidemia':
        setFlucoBaseDose('400');
        setFlucoTargetLevel('15');
        break;
      case 'meningitis':
        setFlucoBaseDose('800');
        setFlucoTargetLevel('25');
        break;
      case 'esophageal':
        setFlucoBaseDose('200');
        setFlucoTargetLevel('12');
        break;
      case 'vaginal':
        setFlucoBaseDose('150');
        setFlucoTargetLevel('10');
        break;
      case 'prophylaxis':
        setFlucoBaseDose('400');
        setFlucoTargetLevel('12');
        break;
    }
  }, [flucoIndication]);

  // Fluconazole Results
  const flucoDose = useMemo(() => calculateFluconazoleDose(crcl, parseFloat(flucoBaseDose) || 0), [crcl, flucoBaseDose]);
  const flucoAdjustment = useMemo(() => {
    const level = parseFloat(flucoMeasuredLevel);
    if (!level || isNaN(level)) return null;
    return adjustFluconazoleDose(
      parseFloat(flucoBaseDose) || 0,
      level,
      parseFloat(flucoTargetLevel) || 15
    );
  }, [flucoMeasuredLevel, flucoBaseDose, flucoTargetLevel]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Top Clinical Header with HCTM Branding */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-xs">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                <span className="text-slate-900">HCTM</span>{' '}
                <span className="text-blue-600">TDM Calculators</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                Hospital Canselor Tuanku Muhriz UKM • Clinical Pharmacokinetics & Precision Dosing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-black bg-slate-50 text-slate-700 border-slate-200 px-3 py-1">
              Unit: <span className="text-blue-600 ml-1">mg/L</span>
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs font-black px-3 py-1">
              Vite SPA • Vercel Ready
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Clinical Concepts & Decision Guide Section */}
        <ClinicalConceptsGuide />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Patient Parameters Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="py-4 bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-base font-black text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Patient Demographics
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200">
                    Baseline
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Age (years)</Label>
                    <Input 
                      type="number" 
                      value={age} 
                      onChange={(e) => setAge(e.target.value)} 
                      className="h-9 text-sm font-bold border-slate-200" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Biological Sex</Label>
                    <Select value={sex} onValueChange={(v: 'male' | 'female') => setSex(v)}>
                      <SelectTrigger className="h-9 text-sm font-bold border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Actual Weight (kg)</Label>
                    <Input 
                      type="number" 
                      value={weight} 
                      onChange={(e) => setWeight(e.target.value)} 
                      className="h-9 text-sm font-bold border-slate-200" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Height (cm)</Label>
                    <Input 
                      type="number" 
                      value={height} 
                      onChange={(e) => setHeight(e.target.value)} 
                      className="h-9 text-sm font-bold border-slate-200" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-600">Serum Creatinine (µmol/L)</Label>
                    {isLowScr && (
                      <Badge className="bg-amber-100 text-amber-900 border-none text-[9px] font-black">
                        Low SCr (&lt; 60)
                      </Badge>
                    )}
                  </div>
                  <Input 
                    type="number" 
                    value={scr} 
                    onChange={(e) => setScr(e.target.value)} 
                    className="h-9 text-sm font-bold border-slate-200" 
                  />

                  {/* Low SCr Rounding Reminder & Control */}
                  {isLowScr && (
                    <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 space-y-2 mt-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Round SCr to 60 µmol/L (VAN Prevention)
                          </span>
                          <p className="text-[10px] text-amber-800 leading-tight">
                            Cockcroft-Gault may overestimate CrCl in sarcopenic / elderly patients.
                          </p>
                        </div>
                        <Switch 
                          checked={roundLowScr} 
                          onCheckedChange={(c) => setRoundLowScr(c)} 
                        />
                      </div>

                      <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-600 font-medium">
                          {roundLowScr ? (
                            <span className="text-emerald-700 font-bold">
                              ✓ Rounded to 60 µmol/L (CrCl: {crcl.toFixed(1)} mL/min)
                            </span>
                          ) : (
                            <span className="text-amber-800 font-bold">
                              Using actual SCr {rawScr} µmol/L (CrCl: {crcl.toFixed(1)} mL/min)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Special Renal States */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Renal & Dialysis Status</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-slate-800">Anuric / AKI (No Urine)</Label>
                      <p className="text-[10px] text-slate-500">Zero renal output; PRN re-dose only</p>
                    </div>
                    <Switch 
                      checked={isAnuric} 
                      onCheckedChange={(c) => {
                        setIsAnuric(c);
                        if (c) setIsVancoHD(false);
                      }} 
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-slate-800">Intermittent HD (Hemodialysis)</Label>
                      <p className="text-[10px] text-slate-500">High-flux HD; gives post-HD dose</p>
                    </div>
                    <Switch 
                      checked={isVancoHD} 
                      onCheckedChange={(c) => {
                        setIsVancoHD(c);
                        if (c) setIsAnuric(false);
                      }} 
                    />
                  </div>
                </div>

                {/* Derived Clinical Indices */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Ideal Body Weight (IBW):</span>
                    <span className="font-black text-slate-900">{ibw.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Dosing Weight (AdjBW):</span>
                    <span className="font-black text-blue-600">{dosingWeightInfo.weight.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">CrCl (Cockcroft-Gault):</span>
                    <span className={`font-black ${crcl < 30 ? 'text-red-600' : crcl < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isAnuric ? '0 (Anuric)' : `${crcl.toFixed(1)} mL/min`}
                    </span>
                  </div>
                  {isObesePatient && (
                    <Badge className="w-full justify-center bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black">
                      Obese Patient Detected ({((patientData.weight / ibw - 1) * 100).toFixed(0)}% over IBW)
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Drug Summary Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Active Drug Context
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {activeDrug === 'vanco' && (
                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Drug:</span>
                      <span className="font-black text-slate-900">Vancomycin IV</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Target Range:</span>
                      <span className="font-black text-blue-600">
                        {vancoTargetTroughRange === 'high' ? '15 – 20 mg/L (High)' : '10 – 15 mg/L (Std)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">AUC24/MIC Target:</span>
                      <span className="font-black text-emerald-600">400 – 600 mg·h/L</span>
                    </div>
                  </div>
                )}
                {activeDrug === 'gentamicin' && (
                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Drug:</span>
                      <span className="font-black text-slate-900">Gentamicin IV</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Protocol:</span>
                      <span className="font-black text-blue-600">Hartford / Synergy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Peak Sampling:</span>
                      <span className="font-black text-emerald-600">1h Post-Infusion</span>
                    </div>
                  </div>
                )}
                {activeDrug === 'amikacin' && (
                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Drug:</span>
                      <span className="font-black text-slate-900">Amikacin IV</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Protocol:</span>
                      <span className="font-black text-blue-600">High-Dose Extended</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Peak Target:</span>
                      <span className="font-black text-emerald-600">40 – 60 mg/L</span>
                    </div>
                  </div>
                )}
                {activeDrug === 'bactrim' && (
                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Drug:</span>
                      <span className="font-black text-slate-900">Bactrim (TMP/SMX)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Dosing Basis:</span>
                      <span className="font-black text-purple-600">Trimethoprim (TMP)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Type:</span>
                      <span className="font-black text-purple-700">Special Non-TDM</span>
                    </div>
                  </div>
                )}
                {activeDrug === 'fluco' && (
                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Drug:</span>
                      <span className="font-black text-slate-900">Fluconazole</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Indication:</span>
                      <span className="font-black text-blue-600 capitalize">{flucoIndication}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Target Level:</span>
                      <span className="font-black text-slate-900">{flucoTargetLevel} mg/L</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calculators Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Extensible Drug Selector Catalog */}
            <DrugDirectory 
              activeDrug={activeDrug} 
              onSelectDrug={(id) => {
                if (id === 'vanco' || id === 'gentamicin' || id === 'amikacin' || id === 'bactrim' || id === 'fluco') {
                  setActiveDrug(id);
                }
              }} 
            />

            {/* ========================================================================= */}
            {/* 1. VANCOMYCIN CALCULATOR */}
            {/* ========================================================================= */}
            {activeDrug === 'vanco' && (
              <div className="space-y-6">
                {/* Sub-tab Navigation (Initial Dosing vs TDM Adjustment) */}
                <div className="flex bg-slate-200/80 p-1 rounded-xl">
                  <button
                    onClick={() => setVancoSubTab('initial')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      vancoSubTab === 'initial'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1. Initial Dosing & PK Curve
                  </button>
                  <button
                    onClick={() => setVancoSubTab('tdm')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      vancoSubTab === 'tdm'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    2. TDM Adjustment & Early Predictor
                  </button>
                </div>

                {/* Sub-Tab 1: Initial Dosing & Dynamic PK Visualizer */}
                {vancoSubTab === 'initial' && (
                  <div className="space-y-6">
                    {/* Dosing Controls */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                      <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-blue-600" />
                          Initial Dosing Parameters
                        </CardTitle>
                        <Badge variant="outline" className="text-[11px] font-bold text-slate-600 bg-white">
                          Calculated Vd: <span className="text-blue-600 font-black ml-1">{(parseFloat(vancoVdCoeff) * patientData.weight).toFixed(1)} L</span>
                        </Badge>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                        {/* 1. Loading Dose */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Loading Dose</Label>
                          <Select value={vancoLoadingMgKg} onValueChange={setVancoLoadingMgKg}>
                            <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[320px]">
                              <SelectItem value="20">20 mg/kg (Mild / Renal concern)</SelectItem>
                              <SelectItem value="25">25 mg/kg (Standard default)</SelectItem>
                              <SelectItem value="30">30 mg/kg (Severe / Critically ill)</SelectItem>
                              <SelectItem value="35">35 mg/kg (Max loading intensity)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. Maintenance Dose Target */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Maintenance Intensity</Label>
                          <Select value={vancoMaintenanceMgKg} onValueChange={setVancoMaintenanceMgKg}>
                            <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[320px]">
                              <SelectItem value="10">10 mg/kg / dose</SelectItem>
                              <SelectItem value="15">15 mg/kg / dose (Standard default)</SelectItem>
                              <SelectItem value="20">20 mg/kg / dose (High clearance / severe)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Dosing Frequency (Auto vs Manual) */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Dosing Frequency (Interval)</Label>
                          <Select value={vancoManualInterval} onValueChange={setVancoManualInterval}>
                            <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[360px]">
                              <SelectItem value="auto">Auto-determine by CrCl ({isAnuric ? 'Anuric PRN' : `q${vancoMaintenanceAuto.interval}h`})</SelectItem>
                              <SelectItem value="6">q6h (QID - High clearance / Pediatrics / Severe)</SelectItem>
                              <SelectItem value="8">q8h (TDS - CrCl &gt; 90 mL/min)</SelectItem>
                              <SelectItem value="12">q12h (BD - CrCl 50–89 mL/min)</SelectItem>
                              <SelectItem value="24">q24h (OD - CrCl 20–49 mL/min)</SelectItem>
                              <SelectItem value="36">q36h (Extended - CrCl 15–19 mL/min)</SelectItem>
                              <SelectItem value="48">q48h (CrCl &lt; 15 / Dialysis)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 4. Volume of Distribution (Vd) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-700">Volume of Distribution (Vd)</Label>
                            <span className="text-[10px] text-blue-600 font-bold">{(parseFloat(vancoVdCoeff) * patientData.weight).toFixed(1)} L</span>
                          </div>
                          <Select value={vancoVdCoeff} onValueChange={setVancoVdCoeff}>
                            <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[360px]">
                              <SelectItem value="0.5">0.5 L/kg (Dehydrated / Frail / Elderly)</SelectItem>
                              <SelectItem value="0.7">0.7 L/kg (Standard Population Vd)</SelectItem>
                              <SelectItem value="0.9">0.9 L/kg (Septic / Critically Ill / Fluid Overload)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 5. Target Range */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Target Trough Range</Label>
                          <Select value={vancoTargetTroughRange} onValueChange={(v: 'standard' | 'high') => setVancoTargetTroughRange(v)}>
                            <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[360px]">
                              <SelectItem value="standard">10 – 15 mg/L (Standard: SSTI, UTI, mild-mod)</SelectItem>
                              <SelectItem value="high">15 – 20 mg/L (Severe: MRSA, Bacteremia, HAP/VAP)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 6. Infusion Duration (Including 4h/6h Extended Infusions) */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Infusion Duration</Label>
                          <Select value={vancoInfusionTime} onValueChange={setVancoInfusionTime}>
                            <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[360px]">
                              <SelectItem value="1">1 hour (Standard for ≤ 1000 mg)</SelectItem>
                              <SelectItem value="1.5">1.5 hours</SelectItem>
                              <SelectItem value="2">2 hours (Standard for 1500–2000 mg)</SelectItem>
                              <SelectItem value="3">3 hours</SelectItem>
                              <SelectItem value="4">4 hours (Extended Infusion)</SelectItem>
                              <SelectItem value="6">6 hours (Extended Infusion)</SelectItem>
                              <SelectItem value="24">24 hours (Continuous Infusion)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Dosing Recommendations Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Loading Dose Box */}
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Loading Dose</span>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black">
                            {vancoLoadingMgKg} mg/kg
                          </Badge>
                        </div>
                        <div>
                          <p className="text-3xl sm:text-4xl font-black text-slate-900">
                            {vancoLoading.dose} <span className="text-sm font-bold text-slate-500">mg</span>
                          </p>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                            Given once as first dose • Max cap 3000mg
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
                          Dilute in <span className="font-black text-slate-900">{vancoLoadingAdmin.diluent}</span>, infuse over <span className="font-black text-slate-900">{vancoLoadingAdmin.time}</span>.
                        </div>
                      </div>

                      {/* Maintenance Dose Box */}
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Maintenance Regimen</span>
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black">
                            {isAnuric ? 'Anuric (PRN)' : `q${vancoMaintenance.interval}h`}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-3xl sm:text-4xl font-black text-slate-900">
                            {vancoMaintenance.dose} <span className="text-sm font-bold text-slate-500">mg</span>{' '}
                            <span className="text-xl font-bold text-indigo-600">
                              {isAnuric ? 'PRN only' : `q${vancoMaintenance.interval}h`}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                            {isAnuric 
                              ? 'Do not repeat daily. Re-dose when level < 10-15 mg/L' 
                              : `Target range: ${(patientData.weight * 15).toFixed(0)}–${(patientData.weight * 20).toFixed(0)} mg/dose (15–20 mg/kg) • Total: ${(vancoMaintenance.dose * (24 / (vancoMaintenance.interval || 24))).toFixed(0)} mg/day`}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center justify-between">
                          <span>Dilute in <span className="font-black text-slate-900">{vancoAdmin.diluent}</span>, infuse over <span className="font-black text-slate-900">{vancoAdmin.time}</span>.</span>
                          {selectedVancoDoseOverride !== null && (
                            <button
                              onClick={() => setSelectedVancoDoseOverride(null)}
                              className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                              Reset to Auto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Regimen Comparison & Dosing Options Matrix */}
                    {!isAnuric && !isVancoHD && vancoDosingOptions.length > 0 && (
                      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Scale className="w-4 h-4 text-blue-600" />
                              Comparative Dosing Regimens (q{vancoMaintenance.interval}h Options)
                            </CardTitle>
                            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Weight-based guide: <span className="font-bold text-slate-800">{(patientData.weight * 15).toFixed(0)} – {(patientData.weight * 20).toFixed(0)} mg/dose</span> (15–20 mg/kg). Compare expected peaks, troughs & AUCs to select the best clinical fit.
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-600">
                            CrCl: {crcl.toFixed(1)} mL/min
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/60 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500">
                                <th className="py-2.5 px-3">Regimen</th>
                                <th className="py-2.5 px-3">mg/kg</th>
                                <th className="py-2.5 px-3">Daily Dose</th>
                                <th className="py-2.5 px-3">1h Peak (Cpeak)</th>
                                <th className="py-2.5 px-3">Trough (Cmin)</th>
                                <th className="py-2.5 px-3">AUC24 / MIC</th>
                                <th className="py-2.5 px-3">Clinical Match</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {vancoDosingOptions.map((opt) => {
                                const isSelected = vancoMaintenance.dose === opt.dose;
                                const is10To15 = opt.cmin >= 10 && opt.cmin <= 15;
                                const is15To20 = opt.cmin > 15 && opt.cmin <= 20;

                                return (
                                  <tr 
                                    key={opt.dose}
                                    className={`transition-colors ${
                                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50/70'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 font-black text-slate-900 flex items-center gap-1.5">
                                      {opt.dose >= 1000 ? `${opt.dose / 1000}g` : `${opt.dose}mg`} q{opt.interval}h
                                      {isSelected && (
                                        <Badge className="bg-blue-600 text-white text-[8px] font-black px-1 py-0 border-none">
                                          Active
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                                      {opt.mgKg.toFixed(1)} mg/kg
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                                      {opt.totalDailyDose} mg/day
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-sky-700">
                                      {opt.cmax.toFixed(1)} mg/L
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className={`font-black ${
                                        is10To15 ? 'text-emerald-600' : is15To20 ? 'text-blue-600' : opt.cmin < 10 ? 'text-amber-600' : 'text-red-600'
                                      }`}>
                                        {opt.cmin.toFixed(1)} mg/L
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-slate-800">
                                      <span className={opt.aucMic >= 400 && opt.aucMic <= 600 ? 'text-emerald-700 font-black' : 'text-slate-600'}>
                                        {opt.aucMic.toFixed(0)}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <Badge variant="outline" className={`text-[9px] font-bold border-none ${
                                        is10To15 
                                          ? 'bg-emerald-100 text-emerald-800' 
                                          : is15To20 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : opt.cmin < 10 
                                          ? 'bg-amber-100 text-amber-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {opt.clinicalTag}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <Button
                                        size="sm"
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => setSelectedVancoDoseOverride(opt.dose)}
                                        className={`h-7 px-2.5 text-[10px] font-black rounded-lg ${
                                          isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        {isSelected ? 'Selected' : 'Apply Dose'}
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Interactive PK Concentration Curve Visualizer */}
                    <PkVisualizer 
                      dose={vancoMaintenance.dose}
                      interval={vancoMaintenance.interval || 12}
                      pk={popPK}
                      infusionTime={parseFloat(vancoInfusionTime) || 1}
                      mic={parseFloat(vancoMic) || 1}
                      targetRange={vancoTargetTroughRange}
                    />
                  </div>
                )}

                {/* Sub-Tab 2: TDM Adjustment, Bayesian PK & Early Predictor */}
                {vancoSubTab === 'tdm' && (
                  <div className="space-y-6">
                    {/* TDM Adjustment Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="py-4 flex flex-row items-center justify-between border-b border-slate-100">
                          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                            Steady-State TDM Adjustment
                          </CardTitle>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => copyToClipboard(`Patient: ${age}y, ${weight}kg, CrCl: ${crcl.toFixed(1)}mL/min\nAdjusted Vanco Dose: ${vancoAdjustment?.dose}mg q${vancoAdjustment?.interval}h\nMeasured Trough: ${measuredVancoLevel} mg/L\nTarget: ${vancoTargetTroughRange === 'high' ? '15-20' : '10-15'} mg/L`)}
                            className="h-8 w-8 text-slate-400 hover:text-purple-600"
                          >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-600">Current Dose (mg)</Label>
                              <Input 
                                type="number" 
                                className="h-9 text-xs font-bold border-slate-200" 
                                value={currentVancoDose} 
                                onChange={(e) => setCurrentVancoDose(e.target.value)} 
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-600">Current Interval (h)</Label>
                              <Input 
                                type="number" 
                                className="h-9 text-xs font-bold border-slate-200" 
                                value={currentVancoInterval} 
                                onChange={(e) => setCurrentVancoInterval(e.target.value)} 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-600">Measured Trough (mg/L)</Label>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="e.g. 12.5" 
                                className={`h-9 text-xs font-bold border-slate-200 ${parseFloat(measuredVancoLevel) > 20 ? 'border-red-400 bg-red-50 text-red-900' : ''}`}
                                value={measuredVancoLevel} 
                                onChange={(e) => setMeasuredVancoLevel(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-600">Target Range</Label>
                              <Select value={vancoTargetTroughRange} onValueChange={(v: 'standard' | 'high') => setVancoTargetTroughRange(v)}>
                                <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">10 – 15 mg/L (Std)</SelectItem>
                                  <SelectItem value="high">15 – 20 mg/L (High)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Adjustment Result Banner */}
                          <AnimatePresence>
                            {vancoAdjustment && vancoAdjustedAdmin && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-[10px] text-purple-700 font-black uppercase tracking-wider">New Recommended Dose</p>
                                    <p className="text-3xl font-black text-purple-950">
                                      {vancoAdjustment.dose} <span className="text-sm font-bold">mg</span>{' '}
                                      <span className="text-xl font-bold opacity-75">q{vancoAdjustment.interval}h</span>
                                    </p>
                                  </div>
                                  <Badge className="bg-purple-600 text-white text-[10px] font-black border-none">
                                    Target Midpoint: {vancoTargetMidpoint} mg/L
                                  </Badge>
                                </div>
                                <div className="pt-2 border-t border-purple-200 text-xs text-purple-900 font-bold">
                                  Dilute in {vancoAdjustedAdmin.diluent}, infuse over {vancoAdjustedAdmin.time}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>

                      {/* Patient-Specific Pharmacokinetic Output */}
                      <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="py-4 bg-slate-50/80 border-b border-slate-100">
                          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-600" />
                            Patient-Specific Kinetic Parameters
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                          {vancoTdmPK ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Elim. Rate (Ke)</p>
                                <p className="text-2xl font-black text-indigo-900">{vancoTdmPK.ke.toFixed(4)}</p>
                                <p className="text-[9px] text-slate-400 font-bold">h⁻¹</p>
                              </div>
                              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Half-Life (T½)</p>
                                <p className="text-2xl font-black text-indigo-900">{vancoTdmPK.halfLife.toFixed(1)}</p>
                                <p className="text-[9px] text-slate-400 font-bold">hours</p>
                              </div>
                              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Clearance (Cl)</p>
                                <p className="text-2xl font-black text-indigo-900">{vancoTdmPK.cl.toFixed(2)}</p>
                                <p className="text-[9px] text-slate-400 font-bold">L/h</p>
                              </div>
                              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Vol. Dist. (Vd)</p>
                                <p className="text-2xl font-black text-indigo-900">{vancoTdmPK.vd.toFixed(1)}</p>
                                <p className="text-[9px] text-slate-400 font-bold">L</p>
                              </div>
                            </div>
                          ) : (
                            <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400 font-bold text-xs">
                              <Activity className="w-8 h-8 text-slate-300 mb-2" />
                              Enter measured trough (mg/L) above to back-calculate patient-specific elimination and half-life.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Early Level Predictor (Pre-Steady State / Dose 1 or 2) */}
                    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white shadow-sm">
                      <CardHeader className="py-4 border-b border-indigo-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            <div>
                              <CardTitle className="text-base font-black text-slate-900">
                                Early Level Predictor (Pre-Steady State)
                              </CardTitle>
                              <CardDescription className="text-xs font-medium text-slate-500">
                                Verify efficacy and avoid waiting 4 doses (36–48h) for steady state. Sample after Dose 1 or 2.
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className="bg-indigo-600 text-white text-[10px] font-black uppercase self-start sm:self-auto">
                            Dose 1 / 2 Solver
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Dose Number Sampled</Label>
                            <Select value={earlyDoseNumber} onValueChange={setEarlyDoseNumber}>
                              <SelectTrigger className="h-9 text-xs font-bold border-indigo-200 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">After 1st Dose</SelectItem>
                                <SelectItem value="2">After 2nd Dose</SelectItem>
                                <SelectItem value="3">After 3rd Dose</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Hours Since Infusion Start</Label>
                            <Input 
                              type="number" 
                              value={earlyTimeSinceDose} 
                              onChange={(e) => setEarlyTimeSinceDose(e.target.value)}
                              className="h-9 text-xs font-bold border-indigo-200 bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">Measured Level (mg/L)</Label>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="e.g. 14.5"
                              value={earlyMeasuredLevel} 
                              onChange={(e) => setEarlyMeasuredLevel(e.target.value)}
                              className="h-9 text-xs font-bold border-indigo-200 bg-white"
                            />
                          </div>
                        </div>

                        {/* Early Predictor Output Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                          <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-1">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Predicted Level at {earlyTimeSinceDose}h</p>
                            <p className="text-2xl font-black text-indigo-900">{earlyLevelResult.toFixed(1)} <span className="text-xs font-bold text-slate-400">mg/L</span></p>
                            <p className="text-[10px] text-slate-500">
                              {earlyLevelResult < 10 ? 'Sub-therapeutic' : earlyLevelResult > 20 ? 'High / Accumulating' : 'On Track'}
                            </p>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-1">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Projected SS Trough (Cmin)</p>
                            <p className="text-2xl font-black text-slate-900">
                              {earlySSPredictions ? `${earlySSPredictions.cmin.toFixed(1)} mg/L` : '—'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Target: {vancoTargetTroughRange === 'high' ? '15–20 mg/L' : '10–15 mg/L'}
                            </p>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-1">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Projected AUC24 / MIC</p>
                            <p className="text-2xl font-black text-blue-600">
                              {earlySSPredictions ? earlySSPredictions.aucMic.toFixed(0) : '—'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Efficacy Target: 400 – 600
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. AMINOGLYCOSIDE (GENTAMICIN / AMIKACIN) CALCULATORS */}
            {/* ========================================================================= */}
            {(activeDrug === 'gentamicin' || activeDrug === 'amikacin') && (
              <AminoglycosideCalculator
                drug={activeDrug}
                patient={{
                  age: patientData.age,
                  weight: patientData.weight,
                  height: patientData.height,
                  sex: patientData.sex,
                  scr: patientData.scr,
                  crcl,
                  ibw,
                  bmi: patientData.height > 0 ? patientData.weight / Math.pow(patientData.height / 100, 2) : 0
                }}
              />
            )}

            {/* ========================================================================= */}
            {/* 3. BACTRIM / COTRIMOXAZOLE CALCULATOR (SPECIAL NON-TDM) */}
            {/* ========================================================================= */}
            {activeDrug === 'bactrim' && (
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-4 bg-purple-50/60 border-b border-purple-100 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-700 text-white text-[9px] font-black uppercase tracking-wider border-none">
                        Special Non-TDM Protocol
                      </Badge>
                      <span className="text-[10px] text-purple-700 font-bold">Trimethoprim-based dosing</span>
                    </div>
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Pill className="w-5 h-5 text-purple-700" />
                      Bactrim (Co-trimoxazole • TMP/SMX) Dosing
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">
                      Calculated on Trimethoprim (TMP) component (1:5 ratio with Sulfamethoxazole SMX) • Single Strength (SS) tablets
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(`Patient: ${age}y, ${weight}kg, CrCl: ${crcl.toFixed(1)}mL/min\nBactrim Regimen: ${bactrimResult.totalSmxTmp}mg Total Co-trimoxazole (${bactrimResult.doseMg}mg TMP + ${bactrimResult.smxMg}mg SMX) ${bactrimResult.frequencyText}\nFormulation: ${bactrimResult.vials} ampoules (5mL each) OR ${bactrimResult.ssTabs} SS tabs\nDilution: ${bactrimResult.standardDilution}\nIndication: ${bactrimIndication}`)}
                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Indication & Renal Selection */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Clinical Indication & Protocol</Label>
                      <Select value={bactrimIndication} onValueChange={setBactrimIndication}>
                        <SelectTrigger className="h-10 text-xs font-bold border-slate-200 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width,24rem)] min-w-[340px] sm:min-w-[560px] max-w-[95vw]">
                          <div className="p-1 space-y-1">
                            <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-wider text-blue-600">Severe & Life-Threatening (15–20 mg/kg/day TMP)</p>
                            <SelectItem value="severe_pjp" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Pneumocystis jirovecii Pneumonia (PJP / PCP) Treatment</span>
                                <span className="text-[11px] text-slate-500 block">15–20 mg/kg/day TMP IV divided in 3–4 doses (q6h–q8h) for 21 days</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="severe_steno" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Severe Stenotrophomonas maltophilia / Burkholderia cepacia</span>
                                <span className="text-[11px] text-slate-500 block">15 mg/kg/day TMP IV divided q8h (TDS)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="severe_nocardia" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Nocardiosis (Disseminated / Severe Pulmonary / CNS)</span>
                                <span className="text-[11px] text-slate-500 block">15 mg/kg/day TMP IV divided in 3–4 doses (q6h–q8h)</span>
                              </div>
                            </SelectItem>

                            <p className="px-2 pt-2 border-t border-slate-100 text-[10px] font-black uppercase tracking-wider text-indigo-600">Moderate / Standard Systemic (8–10 mg/kg/day TMP)</p>
                            <SelectItem value="standard_systemic" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Moderate Systemic Infections (SSTI, MRSA, Osteomyelitis)</span>
                                <span className="text-[11px] text-slate-500 block">8–10 mg/kg/day TMP divided q12h (BD) or q8h (TDS)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="standard_uti" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Complicated UTI / Acute Pyelonephritis</span>
                                <span className="text-[11px] text-slate-500 block">8–10 mg/kg/day TMP divided q12h (BD)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="standard_steno_mild" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Mild-to-Moderate Stenotrophomonas / Melioidosis Eradication</span>
                                <span className="text-[11px] text-slate-500 block">8–10 mg/kg/day TMP divided q12h (BD)</span>
                              </div>
                            </SelectItem>

                            <p className="px-2 pt-2 border-t border-slate-100 text-[10px] font-black uppercase tracking-wider text-emerald-600">Prophylaxis Regimens (Oral)</p>
                            <SelectItem value="prophylaxis_pjp_daily" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">PJP Prophylaxis: Daily Regimen</span>
                                <span className="text-[11px] text-slate-500 block">2 Single Strength (SS) tablets (160mg TMP / 800mg SMX) PO once daily (or 1 SS tab daily)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="prophylaxis_pjp_tiw" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">PJP Prophylaxis: Intermittent (3× Weekly)</span>
                                <span className="text-[11px] text-slate-500 block">2 Single Strength (SS) tablets (160mg TMP / 800mg SMX) PO 3 times weekly (Mon/Wed/Fri)</span>
                              </div>
                            </SelectItem>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="lg:col-span-4 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Dialysis Status</Label>
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 h-10 px-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 block leading-none">Hemodialysis (HD)</span>
                          <span className="text-[10px] text-slate-500">Post-dialysis dosing</span>
                        </div>
                        <Switch checked={isBactrimDialysis} onCheckedChange={setIsBactrimDialysis} />
                      </div>
                    </div>
                  </div>

                  {/* 1. Primary Dosing Banner - Total Dose Prominent */}
                  <div className="p-5 bg-gradient-to-br from-blue-50 via-white to-blue-50/40 rounded-2xl border border-blue-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">Total Co-trimoxazole Dose (TMP + SMX)</p>
                        <p className="text-3xl sm:text-4xl font-black text-blue-950">
                          {bactrimResult.totalSmxTmp} <span className="text-xl sm:text-2xl font-bold text-blue-700">mg Total</span>
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1">
                          Component Breakdown: <span className="font-black text-blue-900">{bactrimResult.doseMg} mg TMP + {bactrimResult.smxMg} mg SMX</span> • <span className="font-black text-blue-950">{bactrimResult.frequencyText}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <Badge className="bg-blue-600 text-white font-black text-xs px-3 py-1 border-none shadow-xs">
                          {bactrimResult.mgKgDay.toFixed(1)} mg/kg/day TMP
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-500">
                          Total Daily: {bactrimResult.dailyTmpDose} mg TMP/day
                        </span>
                      </div>
                    </div>

                    {/* Formulations & Product Conversion Grid - Single Strength Only */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-100 text-xs">
                      <div className="p-3.5 bg-white rounded-xl border border-blue-100 shadow-xs space-y-1">
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">IV Ampoules Required</p>
                        <p className="font-black text-blue-950 text-base">{bactrimResult.vials} × 5 mL ampoules</p>
                        <p className="text-[10px] text-slate-500 font-medium">80mg TMP + 400mg SMX per 5 mL ampoule ({bactrimResult.vials * 5} mL total concentrate)</p>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-blue-100 shadow-xs space-y-1">
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Oral Tablets (Single Strength Only)</p>
                        <p className="font-black text-blue-950 text-base">{bactrimResult.ssTabs} × SS Tablets</p>
                        <p className="text-[10px] text-slate-500 font-medium">Each Single Strength (SS) tablet = 80mg TMP + 400mg SMX</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Intravenous Dilution & Administration Protocols */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        IV Dilution & Administration Guidelines
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Standard Dilution */}
                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-900 text-xs">Standard Dilution</span>
                          <Badge variant="outline" className="text-[9px] font-bold text-slate-600">60–90 Mins Infusion</Badge>
                        </div>
                        <p className="font-bold text-blue-900 text-sm">{bactrimResult.standardDilution}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Rule: 1 ampoule (5 mL) in 125 mL D5W; 2 ampoules (10 mL) in 250 mL D5W; 3 or more ampoules in 500 mL D5W. To be infused over 60–90 minutes.
                        </p>
                      </div>

                      {/* Fluid-Restricted Dilution */}
                      <div className="p-4 bg-white rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-amber-950 text-xs">Fluid-Restricted Dilution</span>
                          <Badge className="bg-amber-100 text-amber-900 text-[9px] font-black border-amber-200">Max 60 Mins Infusion</Badge>
                        </div>
                        <p className="font-bold text-amber-950 text-sm">{bactrimResult.fluidRestrictedDilution}</p>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
                          Rule: 1 ampoule (5 mL) in 75 mL D5W. <span className="font-bold text-red-700">Must be infused over maximum 60 minutes</span> to prevent precipitation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Renal Dose Adjustment & Dialysis Protocol */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      Renal Clearance & Dialysis Guidance (Current CrCl: {crcl.toFixed(1)} mL/min)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className={`p-3 rounded-xl border ${crcl > 30 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <p className="font-black text-xs">CrCl &gt; 30 mL/min</p>
                        <p className="text-[11px] mt-1 font-medium">100% full standard dose (No reduction).</p>
                      </div>

                      <div className={`p-3 rounded-xl border ${crcl <= 30 && crcl >= 15 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <p className="font-black text-xs">CrCl 15 – 30 mL/min</p>
                        <p className="text-[11px] mt-1 font-medium">Reduce dose by 50% OR extend interval (e.g. q12h to q24h / q8h to q12h).</p>
                      </div>

                      <div className={`p-3 rounded-xl border ${crcl < 15 || isBactrimDialysis ? 'bg-purple-50 border-purple-200 text-purple-950' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <p className="font-black text-xs">CrCl &lt; 15 mL/min / Hemodialysis</p>
                        <p className="text-[11px] mt-1 font-medium"><strong>CrCl &lt; 15 (Non-HD): </strong>IV use not recommended.<br /><strong>For HD: </strong>Give 25% – 50% of normal dose as additional dose after HD.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                      <p className="font-bold text-slate-900">Current Patient Assessment: {bactrimResult.renalNote}</p>
                      <p className="text-[11px] text-slate-700 font-medium">
                        <strong>HD Guidance: </strong>{bactrimResult.hdDose}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        <strong>CRRT Guidance: </strong>{bactrimResult.crrtDose}
                      </p>
                    </div>
                  </div>

                  {/* 4. Clinical Safety & Laboratory Monitoring Warnings */}
                  <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3">
                    <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Key Safety Alerts & Monitoring Checklist
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-1">
                        <p className="font-black text-amber-950 text-xs">1. Hyperkalemia (Amiloride-like Effect)</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          Trimethoprim blocks epithelial sodium channels (ENaC) in distal renal tubules, causing potassium retention. Monitor serum K+ daily, especially with renal impairment or concomitant ACEi/ARBs/spironolactone.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-1">
                        <p className="font-black text-amber-950 text-xs">2. Pseudo-Creatinine Elevation</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          TMP competitively inhibits tubular creatinine secretion, causing serum creatinine to rise by 20–35 µmol/L without causing a true drop in glomerular filtration rate (GFR).
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-1">
                        <p className="font-black text-amber-950 text-xs">3. Bone Marrow Suppression & Folinic Acid</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          Prolonged high-dose PJP therapy can cause leukopenia, thrombocytopenia, or megaloblastic anemia. Folinic acid (Leucovorin 5–10 mg/day) rescue can be given if needed (does not reduce antimicrobial efficacy).
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-1">
                        <p className="font-black text-amber-950 text-xs">4. Hydration & Crystalluria Prevention</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          Maintain generous fluid intake and ensure adequate urinary output (&gt; 1200–1500 mL/day) to prevent sulfonamide crystal precipitation in the renal tubules.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ========================================================================= */}
            {/* 3. FLUCONAZOLE CALCULATOR */}
            {/* ========================================================================= */}
            {activeDrug === 'fluco' && (
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-4 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Pill className="w-5 h-5 text-cyan-600" />
                      Fluconazole Dosing & TDM
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">
                      Indication-based standard dosing with CrCl adjustment & TDM solver
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(`Patient: ${age}y, ${weight}kg, CrCl: ${crcl.toFixed(1)}mL/min\nFluconazole Dose: ${flucoDose.dose}mg daily (${crcl <= 50 ? '50% renal reduction' : '100% normal dose'})\nIndication: ${flucoIndication}`)}
                    className="h-8 w-8 text-slate-400 hover:text-cyan-600"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Clinical Indication & Protocol</Label>
                      <Select value={flucoIndication} onValueChange={setFlucoIndication}>
                        <SelectTrigger className="h-10 text-xs font-bold border-slate-200 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width,24rem)] min-w-[340px] sm:min-w-[560px] max-w-[95vw]">
                          <div className="p-1 space-y-1">
                            <SelectItem value="candidemia" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Invasive Candidemia / Systemic Candidiasis</span>
                                <span className="text-[11px] text-slate-500 block">800 mg loading dose on Day 1, then 400 mg (6–12 mg/kg) daily maintenance</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="meningitis" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Cryptococcal Meningitis (Consolidation / Maintenance)</span>
                                <span className="text-[11px] text-slate-500 block">800 mg (12 mg/kg) loading dose, then 400–800 mg daily</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="esophageal" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Esophageal Candidiasis</span>
                                <span className="text-[11px] text-slate-500 block">200–400 mg loading dose, then 100–200 mg once daily</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="prophylaxis" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Neutropenic / Stem Cell Transplant Prophylaxis</span>
                                <span className="text-[11px] text-slate-500 block">400 mg once daily</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="vaginal" className="py-2.5">
                              <div>
                                <span className="font-bold text-slate-900 block">Vulvovaginal Candidiasis (Uncomplicated)</span>
                                <span className="text-[11px] text-slate-500 block">150 mg single oral dose</span>
                              </div>
                            </SelectItem>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="lg:col-span-4 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Base Normal Dose (mg)</Label>
                      <Input 
                        type="number" 
                        value={flucoBaseDose} 
                        onChange={(e) => setFlucoBaseDose(e.target.value)}
                        className="h-10 text-xs font-bold border-slate-200" 
                      />
                    </div>
                  </div>

                  {/* Fluconazole Dosing Card */}
                  <div className="p-5 bg-gradient-to-br from-cyan-50 via-white to-cyan-50/40 rounded-2xl border border-cyan-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <p className="text-[10px] text-cyan-800 font-black uppercase tracking-wider">Adjusted Daily Maintenance</p>
                        <p className="text-3xl sm:text-4xl font-black text-cyan-950">
                          {flucoDose.dose} <span className="text-sm font-bold text-cyan-800">mg daily</span>
                        </p>
                        <p className="text-xs font-bold text-cyan-900/80 mt-0.5">
                          Loading Dose (Day 1): <span className="font-black text-cyan-950">{flucoDose.loadingDose} mg</span>
                        </p>
                      </div>
                      <Badge className="bg-cyan-600 text-white font-black text-xs px-3 py-1 border-none shadow-xs">
                        {crcl <= 50 ? '50% Dose (CrCl ≤ 50)' : '100% Full Dose'}
                      </Badge>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-cyan-100 text-xs text-cyan-950 font-medium">
                      <strong>Renal protocol: </strong>{flucoDose.note}
                    </div>
                  </div>

                  {/* Fluconazole TDM Adjustment */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-600" />
                      Fluconazole TDM Concentration Adjustment (Linear Kinetics)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">Target Trough / AUC Level (mg/L)</Label>
                        <Input 
                          type="number" 
                          value={flucoTargetLevel} 
                          onChange={(e) => setFlucoTargetLevel(e.target.value)}
                          className="h-9 text-xs font-bold border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">Measured Blood Level (mg/L)</Label>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="e.g. 11.2"
                          value={flucoMeasuredLevel} 
                          onChange={(e) => setFlucoMeasuredLevel(e.target.value)}
                          className="h-9 text-xs font-bold border-slate-200"
                        />
                      </div>
                    </div>

                    {flucoAdjustment && (
                      <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-200 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-indigo-700 font-black uppercase tracking-wider">New Recommended Fluconazole Dose</p>
                          <p className="text-2xl font-black text-indigo-950">{flucoAdjustment} mg daily</p>
                          <p className="text-[10px] text-indigo-700 font-bold">Rounded to standard capsule/vial sizes (nearest 50mg)</p>
                        </div>
                        <Badge className="bg-indigo-600 text-white text-[10px] font-black border-none">
                          Target: {flucoTargetLevel} mg/L
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-slate-400 space-y-2 border-t border-slate-200 mt-12">
          <div className="flex flex-col items-center gap-1.5">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-900">HCTM</span> <span className="text-blue-600">TDM Calculators</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-bold">
              Hospital Canselor Tuanku Muhriz UKM • Department of Pharmacy
            </p>
          </div>
          <p className="text-[10px] text-slate-400 max-w-2xl mx-auto px-4">
            Clinical decision support for healthcare professionals. All calculations use validated population pharmacokinetic models and standard Cockcroft-Gault estimates.
          </p>
        </footer>
      </div>
    </div>
  );
}
