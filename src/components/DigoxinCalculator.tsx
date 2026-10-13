import React, { useState, useMemo } from 'react';
import { 
  HeartPulse, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Pill, 
  RotateCcw, 
  Info, 
  ShieldAlert, 
  Copy, 
  Check, 
  Zap,
  Sliders,
  Scale,
  AlertOctagon,
  Eye,
  HeartCrack,
  Syringe,
  Sparkles,
  Stethoscope,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  calculateDigoxinInitialDosing, 
  adjustDigoxinDose, 
  calculateDigiFabDose,
  DigoxinIndication, 
  DigoxinDosageForm, 
  DigoxinThyroidStatus, 
  DigoxinInteractingDrug,
  DigoxinInitialResult,
  DigiFabResult,
  DigiFabCalculationParams
} from '../lib/calculations';

interface DigoxinCalculatorProps {
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

export function DigoxinCalculator({ patient, isHD = false }: DigoxinCalculatorProps) {
  // Navigation tabs: Initial vs TDM Adjustment vs Toxicity & DigiFab
  const [activeTab, setActiveTab] = useState<'initial' | 'tdm' | 'toxicity'>('initial');

  // Initial Regimen State
  const [indication, setIndication] = useState<DigoxinIndication>('chf');
  const [dosageForm, setDosageForm] = useState<DigoxinDosageForm>('tablet');
  const [thyroid, setThyroid] = useState<DigoxinThyroidStatus>('euthyroid');
  const [interactingDrug, setInteractingDrug] = useState<DigoxinInteractingDrug>('none');
  const [isCAVH, setIsCAVH] = useState<boolean>(false);
  const [customTargetCss, setCustomTargetCss] = useState<string>('');

  // TDM Adjustment State
  const [currentDoseMg, setCurrentDoseMg] = useState<string>('0.125');
  const [currentIntervalHours, setCurrentIntervalHours] = useState<string>('24');
  const [measuredLevelMcgL, setMeasuredLevelMcgL] = useState<string>('1.4');
  const [tdmTargetCss, setTdmTargetCss] = useState<string>('0.7');
  const [tdmDosageForm, setTdmDosageForm] = useState<DigoxinDosageForm>('tablet');

  // Toxicity & DigiFab Antidote State
  const [digiFabMethod, setDigiFabMethod] = useState<'serum_level' | 'acute_ingestion' | 'empiric'>('serum_level');
  const [toxSerumLevel, setToxSerumLevel] = useState<string>('3.2');
  const [toxIngestedMg, setToxIngestedMg] = useState<string>('10');
  const [toxFormulationF, setToxFormulationF] = useState<string>('0.7'); // 0.7 for tablet
  const [empiricScenario, setEmpiricScenario] = useState<'arrest_acute' | 'chronic_severe'>('arrest_acute');

  const [copied, setCopied] = useState(false);

  // Target concentration determination
  const defaultTargetCss = indication === 'chf' ? 0.7 : 1.2;
  const targetCss = customTargetCss ? parseFloat(customTargetCss) || defaultTargetCss : defaultTargetCss;

  // Initial Dosing Calculation
  const initialResult = useMemo<DigoxinInitialResult>(() => {
    return calculateDigoxinInitialDosing({
      weight: patient.weight,
      crcl: patient.crcl,
      indication,
      dosageForm,
      thyroid,
      interactingDrug,
      targetCss,
      isESRF: isHD || patient.crcl < 10,
      isCAVH_CVVH: isCAVH
    });
  }, [patient.weight, patient.crcl, indication, dosageForm, thyroid, interactingDrug, targetCss, isHD, isCAVH]);

  // TDM Adjustment Calculation
  const tdmResult = useMemo(() => {
    const curDose = parseFloat(currentDoseMg) || 0;
    const curTau = parseFloat(currentIntervalHours) || 24;
    const measLevel = parseFloat(measuredLevelMcgL) || 0;
    const targLevel = parseFloat(tdmTargetCss) || (indication === 'chf' ? 0.7 : 1.2);

    if (curDose <= 0 || measLevel <= 0) return null;

    return adjustDigoxinDose({
      currentDoseMg: curDose,
      currentIntervalHours: curTau,
      measuredLevelMcgL: measLevel,
      targetLevelMcgL: targLevel,
      dosageForm: tdmDosageForm
    });
  }, [currentDoseMg, currentIntervalHours, measuredLevelMcgL, tdmTargetCss, tdmDosageForm, indication]);

  // DigiFab Antidote Calculation
  const digiFabResult = useMemo<DigiFabResult>(() => {
    const serumLevel = parseFloat(toxSerumLevel) || 0;
    const ingestedMg = parseFloat(toxIngestedMg) || 0;
    const formF = parseFloat(toxFormulationF) || 0.7;

    return calculateDigiFabDose({
      method: digiFabMethod,
      serumLevelMcgL: serumLevel,
      weightKg: patient.weight || 70,
      acuteIngestedMg: ingestedMg,
      acuteFormulationF: formF,
      empiricScenario
    });
  }, [digiFabMethod, toxSerumLevel, patient.weight, toxIngestedMg, toxFormulationF, empiricScenario]);

  // Risk categorization for Toxicity
  const toxLevelValue = parseFloat(toxSerumLevel) || 0;
  const toxicityRisk = useMemo(() => {
    if (toxLevelValue <= 0.9) {
      return {
        label: 'In CHF Target Range (0.5 – 0.9 mcg/L)',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badge: 'Therapeutic (CHF)',
        severity: 'low'
      };
    } else if (toxLevelValue <= 2.0) {
      return {
        label: 'In AF Target Range (0.8 – 2.0 mcg/L) / Elevated for CHF',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
        badge: 'Therapeutic (AF) / High for CHF',
        severity: 'moderate'
      };
    } else if (toxLevelValue <= 2.5) {
      return {
        label: 'Elevated / Borderline Toxicity Range (2.0 – 2.5 mcg/L)',
        color: 'bg-amber-50 text-amber-900 border-amber-300',
        badge: 'High Risk / Borderline Toxic',
        severity: 'high'
      };
    } else if (toxLevelValue <= 4.0) {
      return {
        label: 'Definite / Marked Digoxin Toxicity (> 2.5 mcg/L)',
        color: 'bg-orange-50 text-orange-900 border-orange-300',
        badge: 'Definite Toxicity',
        severity: 'very_high'
      };
    } else {
      return {
        label: 'Severe Life-Threatening Digoxin Poisoning (> 4.0 mcg/L)',
        color: 'bg-rose-50 text-rose-900 border-rose-300',
        badge: 'Critical / Life-Threatening',
        severity: 'critical'
      };
    }
  }, [toxLevelValue]);

  const copyPrescription = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 via-orange-50/20 to-white shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  Digoxin Precision Pharmacokinetics & TDM
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-black uppercase">
                    Cardiac Glycoside
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Evidence-based dosing for Heart Failure (0.5–0.9 mcg/L) & Atrial Fibrillation (0.8–2.0 mcg/L) with Vd & CL interactions
                </CardDescription>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex flex-wrap bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 gap-1">
              <button
                onClick={() => setActiveTab('initial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === 'initial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Initial Dosing & PK
              </button>
              <button
                onClick={() => {
                  setActiveTab('tdm');
                  setTdmTargetCss(indication === 'chf' ? '0.7' : '1.2');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === 'tdm'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. TDM Level Adjustment
              </button>
              <button
                onClick={() => setActiveTab('toxicity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'toxicity'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-900 bg-rose-50/60'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>3. Toxicity & DigiFab</span>
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ========================================================================= */}
      {/* TAB 1: INITIAL DOSING */}
      {/* ========================================================================= */}
      {activeTab === 'initial' && (
        <div className="space-y-6">
          {/* Clinical Parameters Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                Clinical Indication & Pharmacokinetic Modifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Indication */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Indication & Target</Label>
                  <Select 
                    value={indication} 
                    onValueChange={(val: DigoxinIndication) => {
                      setIndication(val);
                      setCustomTargetCss('');
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chf">Heart Failure (CHF): 0.5–0.9 mcg/L</SelectItem>
                      <SelectItem value="af">Atrial Fibrillation (AF): 0.8–2.0 mcg/L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dosage Form / Route */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Formulation & Bioavailability (F)</Label>
                  <Select 
                    value={dosageForm} 
                    onValueChange={(val: DigoxinDosageForm) => setDosageForm(val)}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tablet">Oral Tablet (F = 0.70)</SelectItem>
                      <SelectItem value="injection">IV Injection (F = 1.00)</SelectItem>
                      <SelectItem value="elixir">Oral Elixir (F = 0.75)</SelectItem>
                      <SelectItem value="capsule">Soft Gelatin Capsule (F = 1.00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Thyroid Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Thyroid State</Label>
                  <Select 
                    value={thyroid} 
                    onValueChange={(val: DigoxinThyroidStatus) => setThyroid(val)}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="euthyroid">Euthyroid (Normal)</SelectItem>
                      <SelectItem value="hypothyroid">Hypothyroid (Vd ×0.7, CL ×0.7)</SelectItem>
                      <SelectItem value="hyperthyroid">Hyperthyroid (Vd ×1.3, CL ×1.3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Interacting Drugs */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Drug Interactions</Label>
                  <Select 
                    value={interactingDrug} 
                    onValueChange={(val: DigoxinInteractingDrug) => setInteractingDrug(val)}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No major interacting drug</SelectItem>
                      <SelectItem value="amiodarone">Amiodarone (CL ×0.5 / ↓50% dose)</SelectItem>
                      <SelectItem value="quinidine">Quinidine (Vd ×0.7, CL ×0.5)</SelectItem>
                      <SelectItem value="verapamil">Verapamil (CL ×0.75 / ↓25% dose)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Customizations & Dialysis Toggle */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="cavh-mode" 
                      checked={isCAVH} 
                      onCheckedChange={setIsCAVH} 
                    />
                    <Label htmlFor="cavh-mode" className="text-xs font-bold text-slate-700 cursor-pointer">
                      CAVH / CVVHD (Adjust to 25–75% of normal dose or q36h)
                    </Label>
                  </div>

                  {isHD && (
                    <Badge className="bg-red-100 text-red-900 border-red-200 text-[10px] font-black">
                      Intermittent Hemodialysis Active (ESRF protocol applied)
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs font-bold text-slate-600 whitespace-nowrap">Custom Target Css:</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    placeholder={`e.g. ${defaultTargetCss}`}
                    value={customTargetCss}
                    onChange={(e) => setCustomTargetCss(e.target.value)}
                    className="w-24 h-8 text-xs font-bold border-slate-200"
                  />
                  <span className="text-slate-500 font-bold">mcg/L</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PK Parameters Output Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Clearance (CL)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">{(initialResult?.clLhr ?? 0).toFixed(2)}</span>
                <span className="text-[11px] font-bold text-slate-500">L/hr</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">{(initialResult?.clLday ?? 0).toFixed(1)} L/day</span>
            </Card>

            <Card className="border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Volume of Dist. (Vd)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">{(initialResult?.vdL ?? 0).toFixed(1)}</span>
                <span className="text-[11px] font-bold text-slate-500">L</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">{(initialResult?.vdLPerKg ?? 0).toFixed(2)} L/kg</span>
            </Card>

            <Card className="border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Elimination Rate (Ke)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">{(initialResult?.keHr ?? 0).toFixed(4)}</span>
                <span className="text-[11px] font-bold text-slate-500">hr⁻¹</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">T1/2: ~{(initialResult?.halfLifeHours ?? 36).toFixed(1)} hrs</span>
            </Card>

            <Card className="border-slate-200 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Css</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-amber-600">{(initialResult?.targetCss ?? 0.7).toFixed(2)}</span>
                <span className="text-[11px] font-bold text-amber-700">mcg/L</span>
              </div>
              <span className="text-[10px] text-amber-800 font-bold block mt-0.5">{initialResult?.targetCssRange}</span>
            </Card>
          </div>

          {/* Dosing Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loading Dose (TDD) Card */}
            <Card className="border-amber-200 bg-amber-50/40 shadow-xs overflow-hidden">
              <CardHeader className="py-3 px-4 bg-amber-100/60 border-b border-amber-200/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-700" />
                    Total Digitalising / Loading Dose (LD)
                  </CardTitle>
                </div>
                <Badge className="bg-amber-600 text-white text-[10px] font-black border-none">
                  F = {initialResult?.bioavailabilityF}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-amber-950">{initialResult?.loadingDoseMgStandard} mg</span>
                    <span className="text-sm font-bold text-amber-800">
                      ({(initialResult?.loadingDoseMgStandard ?? 0) * 1000} mcg total)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Exact calculated: <strong>{(initialResult?.loadingDoseMgExact ?? 0).toFixed(3)} mg</strong> ({(initialResult?.loadingDoseMcgExact ?? 0).toFixed(0)} mcg)
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800">Standard Administration Schedule:</div>
                  <p className="text-slate-600 leading-relaxed">{initialResult?.loadingSplitGuideline}</p>
                  <p className="text-[11px] text-amber-800 font-bold pt-1 border-t border-amber-100">
                    Standard Reference TDD: {initialResult?.standardTddRange}
                  </p>
                </div>

                <p className="text-[11px] text-slate-600 font-medium">
                  {initialResult?.loadingDoseNote}
                </p>
              </CardContent>
            </Card>

            {/* Daily Maintenance Dose Card */}
            <Card className="border-blue-200 bg-blue-50/40 shadow-xs overflow-hidden">
              <CardHeader className="py-3 px-4 bg-blue-100/60 border-b border-blue-200/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                    Daily Maintenance Dose (MD)
                  </CardTitle>
                </div>
                <Badge className="bg-blue-600 text-white text-[10px] font-black border-none">
                  q{initialResult?.recommendedIntervalHours}h Interval
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-blue-950">{initialResult?.maintenanceDoseMgStandard} mg</span>
                    <span className="text-sm font-bold text-blue-800">
                      q{initialResult?.recommendedIntervalHours}h ({(initialResult?.maintenanceDoseMgStandard ?? 0) * 1000} mcg)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Exact calculated: <strong>{(initialResult?.maintenanceDoseMgExact ?? 0).toFixed(3)} mg/day</strong> ({(initialResult?.maintenanceDoseMcgExact ?? 0).toFixed(0)} mcg/day)
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-blue-200/80 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800">Renal & Interval Strategy:</div>
                  <p className="text-slate-600 leading-relaxed">{initialResult.maintenanceDoseNote}</p>
                  <p className="text-[11px] text-blue-800 font-bold pt-1 border-t border-blue-100">
                    Standard Daily Reference: {initialResult.standardDailyRange}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-bold">
                    Target: {initialResult.targetCss} mcg/L
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyPrescription(`Digoxin ${initialResult.maintenanceDoseMgStandard} mg orally q${initialResult.recommendedIntervalHours}h (Target: ${initialResult.targetCssRange}).`)}
                    className="text-xs font-bold border-blue-300 text-blue-900 hover:bg-blue-100/60"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied' : 'Copy Regimen'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Blood Sampling Protocol & Timing Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Comprehensive Digoxin TDM Sampling Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    When to Measure Digoxin Serum Concentration
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-700 leading-relaxed">
                    <li>
                      <strong>Following a Loading Dose:</strong> {initialResult.samplingWithLD}
                    </li>
                    <li>
                      <strong>Starting Maintenance Without LD:</strong> {initialResult.samplingWithoutLD}
                    </li>
                    <li>
                      <strong>After Maintenance Dose Adjustment:</strong> {initialResult.samplingMaintenance}
                    </li>
                    <li>
                      <strong>Severe Renal Impairment / ESRF:</strong> {initialResult.samplingEsrf}
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Sampling Timing in Relation to Dose
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-700 leading-relaxed">
                    <li>
                      <strong>Oral Dose:</strong> {initialResult.timingOral}
                    </li>
                    <li>
                      <strong>IV Dose:</strong> {initialResult.timingIV}
                    </li>
                    <li>
                      <strong>Why wait 6 hours?</strong> Digoxin has an extensive tissue distribution phase (~6–8 hours). Sampling before tissue equilibrium produces falsely elevated levels that do not reflect myocardial effect.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STEADY-STATE TDM ADJUSTMENT */}
      {/* ========================================================================= */}
      {activeTab === 'tdm' && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                Steady-State Concentration Input & Pharmacokinetic Re-Estimation
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Formula: CL (L/hr) = (Dose × F) / (Digoxin Level × τ). Recalculates individual patient clearance from measured serum level.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Current Dose */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Current Dose (mg)</Label>
                  <Input 
                    type="number" 
                    step="0.0625"
                    value={currentDoseMg} 
                    onChange={(e) => setCurrentDoseMg(e.target.value)}
                    className="h-10 text-xs font-bold border-slate-200" 
                  />
                  <span className="text-[10px] text-slate-500 font-bold">e.g. 0.125 or 0.25 mg</span>
                </div>

                {/* Current Interval */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Dosing Interval τ (hours)</Label>
                  <Select 
                    value={currentIntervalHours} 
                    onValueChange={setCurrentIntervalHours}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">q24h (Once daily)</SelectItem>
                      <SelectItem value="36">q36h (Alternate morning/night)</SelectItem>
                      <SelectItem value="48">q48h (Every 2 days / Alternate day)</SelectItem>
                      <SelectItem value="12">q12h (Twice daily)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Measured Digoxin Level */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Measured Level (mcg/L)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    placeholder="e.g. 1.4"
                    value={measuredLevelMcgL} 
                    onChange={(e) => setMeasuredLevelMcgL(e.target.value)}
                    className="h-10 text-xs font-bold border-slate-200 text-amber-900 bg-amber-50/30" 
                  />
                  <span className="text-[10px] text-slate-500 font-bold">Target: {tdmTargetCss} mcg/L</span>
                </div>

                {/* Target Level */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Css (mcg/L)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={tdmTargetCss} 
                    onChange={(e) => setTdmTargetCss(e.target.value)}
                    className="h-10 text-xs font-bold border-slate-200" 
                  />
                  <span className="text-[10px] text-slate-500 font-bold">CHF: 0.5–0.9 | AF: 0.8–2.0</span>
                </div>

                {/* Route */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Dosage Form</Label>
                  <Select 
                    value={tdmDosageForm} 
                    onValueChange={(val: DigoxinDosageForm) => setTdmDosageForm(val)}
                  >
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tablet">Oral Tablet (F=0.7)</SelectItem>
                      <SelectItem value="injection">IV Injection (F=1.0)</SelectItem>
                      <SelectItem value="elixir">Oral Elixir (F=0.75)</SelectItem>
                      <SelectItem value="capsule">Gel Capsule (F=1.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TDM Result Card */}
              {tdmResult && (
                <div className="p-5 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 rounded-2xl border border-amber-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                        Individualized Recommended New Maintenance Dose
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl sm:text-4xl font-black text-amber-950">
                          {tdmResult.recommendedNewDoseMg} mg
                        </span>
                        <span className="text-sm font-bold text-amber-800">
                          q{tdmResult.recommendedNewIntervalHours}h ({tdmResult.recommendedNewDoseMg * 1000} mcg)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        Exact calculated maintenance: <strong>{(tdmResult.newMaintDoseMgExact ?? 0).toFixed(4)} mg/day</strong> ({(tdmResult.newMaintDoseMcgExact ?? 0).toFixed(1)} mcg/day)
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge className="bg-amber-600 text-white font-black text-xs px-3 py-1 border-none shadow-xs">
                        Target: {tdmTargetCss} mcg/L
                      </Badge>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">
                        Measured: {measuredLevelMcgL} mcg/L
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 font-medium leading-relaxed">
                    <strong>Pharmacokinetic analysis: </strong>{tdmResult.note}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-100">
                    <span className="text-[11px] text-slate-500 font-bold">
                      Formula: MD (mcg) = [CL ({(tdmResult.calculatedClLday ?? 0).toFixed(1)} L/day) × Css target ({tdmTargetCss} mcg/L) × Interval (1 day)] / [S × F]
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyPrescription(`Digoxin ${tdmResult.recommendedNewDoseMg} mg orally once daily (q${tdmResult.recommendedNewIntervalHours}h). Target Css: ${tdmTargetCss} mcg/L. Re-check level in 5–7 days.`)}
                      className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100/60"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? 'Copied' : 'Copy Regimen'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIGOXIN TOXICITY & ANTIDOTE (DIGIFAB) */}
      {/* ========================================================================= */}
      {activeTab === 'toxicity' && (
        <div className="space-y-6">
          {/* Top Alert & Risk Bar */}
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-red-50/40 shadow-xs">
            <CardHeader className="pb-3 border-b border-rose-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                      Digoxin Toxicity Assessment & DigiFab (Antidote) Protocol
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">
                      Risk stratification, hallmark clinical features, electrolyte derangements, and Digoxin Immune Fab dosing
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-rose-700 text-white text-[11px] font-black px-3 py-1 border-none shadow-xs">
                  Narrow Therapeutic Index
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Quick Risk Stratification Scale */}
              <div className="p-4 rounded-xl border space-y-2 bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-600" />
                    Serum Concentration & Risk Stratification
                  </span>
                  <Badge className={`text-xs font-black border ${toxicityRisk.color}`}>
                    {toxicityRisk.badge}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs font-bold pt-2">
                  <div className={`p-2.5 rounded-lg border ${toxLevelValue >= 0.5 && toxLevelValue <= 0.9 ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black ring-2 ring-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Target (CHF)</p>
                    <p className="text-sm font-black">0.5 – 0.9 mcg/L</p>
                    <span className="text-[10px]">Optimal Inotrope</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${toxLevelValue >= 0.8 && toxLevelValue <= 2.0 && toxLevelValue > 0.9 ? 'bg-blue-100 border-blue-400 text-blue-950 font-black ring-2 ring-blue-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Target (AF)</p>
                    <p className="text-sm font-black">0.8 – 2.0 mcg/L</p>
                    <span className="text-[10px]">Rate Control</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${toxLevelValue > 2.0 && toxLevelValue <= 2.5 ? 'bg-amber-100 border-amber-400 text-amber-950 font-black ring-2 ring-amber-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-amber-700">Borderline / High</p>
                    <p className="text-sm font-black">2.0 – 2.5 mcg/L</p>
                    <span className="text-[10px]">Withhold & Monitor</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${toxLevelValue > 2.5 ? 'bg-rose-100 border-rose-400 text-rose-950 font-black ring-2 ring-rose-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-rose-700">Definite Toxicity</p>
                    <p className="text-sm font-black">&gt; 2.5 mcg/L</p>
                    <span className="text-[10px]">High Arrhythmic Risk</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 mt-1">
                  <strong>Current Status:</strong> {toxicityRisk.label}. Note: Arrhythmias can occur at therapeutic levels if accompanied by severe hypokalemia, hypomagnesemia, or acute ischemia.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* DIGIFAB (ANTIDOTE) CALCULATOR */}
          <Card className="border-rose-300 bg-white shadow-xs overflow-hidden">
            <CardHeader className="py-3.5 px-4 bg-gradient-to-r from-rose-700 to-red-600 text-white flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-rose-100" />
                <div>
                  <CardTitle className="text-sm font-black text-white">
                    DigiFab (Digoxin Immune Fab) Antidote Dosing Calculator
                  </CardTitle>
                  <CardDescription className="text-[11px] text-rose-100">
                    Each vial contains 38 mg (or 40 mg) lyophilized Fab and neutralizes approximately 0.5 mg (500 mcg) of digoxin
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-white text-rose-900 font-black text-[10px] border-none">
                Life-Saving Antidote
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Method Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Select Dosing Calculation Method:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDigiFabMethod('serum_level')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      digiFabMethod === 'serum_level'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500 text-rose-950 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">1. Known Serum Level</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Vials = (Level × Weight) / 100
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDigiFabMethod('acute_ingestion')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      digiFabMethod === 'acute_ingestion'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500 text-rose-950 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">2. Known Acute Ingestion</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Vials = (Ingested mg × F) / 0.5
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDigiFabMethod('empiric')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      digiFabMethod === 'empiric'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500 text-rose-950 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">3. Empiric / Unknown Level</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Cardiac arrest or urgent toxicity
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Parameter Inputs based on Method */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                {digiFabMethod === 'serum_level' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Serum Digoxin Concentration (mcg/L or ng/mL)</Label>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="e.g. 3.2"
                        value={toxSerumLevel} 
                        onChange={(e) => setToxSerumLevel(e.target.value)}
                        className="h-10 text-xs font-bold border-slate-200 bg-white" 
                      />
                      <span className="text-[10px] text-slate-500 font-medium">Steady-state concentration sampled &gt;6h post-dose</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Patient Actual Weight (kg)</Label>
                      <Input 
                        type="number" 
                        disabled
                        value={patient.weight} 
                        className="h-10 text-xs font-bold border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed" 
                      />
                      <span className="text-[10px] text-slate-500 font-medium">Pulled from patient demographics ({patient.weight} kg)</span>
                    </div>
                  </div>
                )}

                {digiFabMethod === 'acute_ingestion' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Total Digoxin Ingested (mg)</Label>
                      <Input 
                        type="number" 
                        step="0.5"
                        placeholder="e.g. 10"
                        value={toxIngestedMg} 
                        onChange={(e) => setToxIngestedMg(e.target.value)}
                        className="h-10 text-xs font-bold border-slate-200 bg-white" 
                      />
                      <span className="text-[10px] text-slate-500 font-medium">e.g. 40 tablets of 0.25mg = 10 mg</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Formulation & Bioavailability (F)</Label>
                      <Select value={toxFormulationF} onValueChange={setToxFormulationF}>
                        <SelectTrigger className="h-10 text-xs font-bold border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.7">Tablets (F = 0.70)</SelectItem>
                          <SelectItem value="1.0">IV Injection / Soft Gel Caps (F = 1.00)</SelectItem>
                          <SelectItem value="0.75">Oral Elixir (F = 0.75)</SelectItem>
                          <SelectItem value="0.8">Unknown / Mixed Formulation (F = 0.80)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-slate-500 font-medium">Calculates absorbed digoxin = Ingested × F</span>
                    </div>
                  </div>
                )}

                {digiFabMethod === 'empiric' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Clinical Emergency Scenario</Label>
                    <Select 
                      value={empiricScenario} 
                      onValueChange={(val: 'arrest_acute' | 'chronic_severe') => setEmpiricScenario(val)}
                    >
                      <SelectTrigger className="h-10 text-xs font-bold border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arrest_acute">
                          Acute Cardiac Arrest / Unstable Ventricular Arrhythmias / Ingestion &gt;10 mg (10–20 vials stat)
                        </SelectItem>
                        <SelectItem value="chronic_severe">
                          Severe Chronic Toxicity with Life-Threatening Conduction Block & Unknown Level (3–6 vials)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* DigiFab Dosing Output Display */}
              <div className="p-5 bg-gradient-to-br from-rose-50 via-white to-red-50/60 rounded-2xl border border-rose-300 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">
                      Recommended DigiFab Dose
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-black text-rose-950">
                        {digiFabResult.vialsRounded} Vials
                      </span>
                      <span className="text-sm font-bold text-rose-800">
                        ({digiFabResult.totalMgDigiFab} mg DigiFab)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Exact calculated vials: <strong>{(digiFabResult.vialsExact ?? 0).toFixed(2)} vials</strong> • Neutralizes up to <strong>{digiFabResult.neutralizedDigoxinMg} mg</strong> of active digoxin
                    </p>
                  </div>

                  <div className="text-right">
                    <Button
                      size="sm"
                      onClick={() => copyPrescription(`DigiFab (Digoxin Immune Fab): Administer ${digiFabResult.vialsRounded} vials (${digiFabResult.totalMgDigiFab} mg). Reconstitute each vial with 4mL sterile water, dilute in 100mL 0.9% NaCl, and infuse IV over 30 mins.`)}
                      className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? 'Copied' : 'Copy DigiFab Order'}
                    </Button>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {digiFabResult.formulaUsed}
                    </p>
                  </div>
                </div>

                {/* Administration Instructions */}
                <div className="p-3.5 bg-white rounded-xl border border-rose-200 text-xs text-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Syringe className="w-4 h-4 text-rose-600" />
                    Reconstitution & Administration Instructions
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {digiFabResult.administrationGuide}
                  </p>
                </div>

                {/* CRITICAL POST-DIGIFAB TDM WARNING */}
                <div className="p-3.5 bg-rose-100/70 rounded-xl border border-rose-300 text-xs text-rose-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    CRITICAL WARNING: DO NOT MEASURE TOTAL SERUM DIGOXIN POST-DIGIFAB!
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-900">
                    {digiFabResult.postFabMonitoringWarning}
                  </p>
                </div>
              </div>

              {/* Indications Checklist */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Established Indications for DigiFab (Digibind) Administration:
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {digiFabResult.indicationsMet.map((ind, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-medium">{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CLINICAL MANIFESTATIONS & TOXICITY SYMPTOMS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cardiac Manifestations */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <HeartCrack className="w-4 h-4 text-rose-600" />
                  Cardiac Manifestations (Most Serious)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs text-slate-700">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Premature Ventricular Contractions (PVCs):</strong> Most frequent early arrhythmic manifestation.</li>
                  <li><strong>Bradycardia & AV Block:</strong> Sinus bradycardia, 1st degree, 2nd degree, or complete 3rd degree AV block.</li>
                  <li><strong>Bidirectional VT:</strong> Classic pathognomonic hallmark rhythm of digoxin toxicity.</li>
                  <li><strong>Ventricular Tachycardia & VF:</strong> Fatal if untreated; primary indication for DigiFab.</li>
                  <li><strong>Junctional Tachycardia:</strong> Accelerated junctional escape rhythms with AV dissociation.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Visual & Neurological Manifestations */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-600" />
                  Visual & Neurological Hallmarks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs text-slate-700">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Xanthopsia (Yellow-Green Halos):</strong> Classic visual disturbance; altered color perception.</li>
                  <li><strong>Blurred Vision & Scotomas:</strong> Photophobia, flashes of light, diminished visual acuity.</li>
                  <li><strong>Altered Mental State:</strong> Confusion, delirium, disorientation, lethargy (especially in elderly).</li>
                  <li><strong>Neuropsychiatric:</strong> Vivid hallucinations, depression, psychosis, drowsiness.</li>
                  <li><strong>Systemic Neuropathy:</strong> Generalized profound weakness, severe headache, fatigue.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Gastrointestinal & Systemic */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Gastrointestinal & Triggers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs text-slate-700">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Anorexia & Nausea:</strong> Earliest and most common symptom of chronic overdigitalisation.</li>
                  <li><strong>Vomiting & Abdominal Pain:</strong> Intestinal ischemia from mesenteric vasoconstriction in severe cases.</li>
                  <li><strong>Diarrhea & Malnutrition:</strong> Worsens electrolyte loss and dehydration.</li>
                  <li><strong>Weight Loss:</strong> Unexplained cardiac cachexia progression.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* ELECTROLYTE DERANGEMENTS & POTENTIATING TRIGGERS */}
          <Card className="border-amber-200 bg-amber-50/30 shadow-xs">
            <CardHeader className="py-3 px-4 bg-amber-100/50 border-b border-amber-200/60">
              <CardTitle className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Critical Electrolyte Triggers & Dangerous Interactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                  <div className="font-black text-rose-700">Hypokalemia (K⁺ &lt; 3.5)</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Sensitizes the myocardium to digoxin by increasing drug binding to Na⁺/K⁺ ATPase. Can precipitate fatal arrhythmias <strong>even with normal serum levels</strong>. Maintain K⁺ at 4.0–5.0 mmol/L.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                  <div className="font-black text-amber-800">Hypomagnesemia (Mg²⁺ &lt; 0.7)</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Impairs Na⁺/K⁺ ATPase function and leads to refractory hypokalemia and ventricular arrhythmias. Maintain serum Mg²⁺ &gt; 0.85 mmol/L (&gt; 2.0 mg/dL).
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                  <div className="font-black text-purple-800">Hypercalcemia (Avoid IV Ca²⁺)</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Increases intracellular calcium overload and synergizes with digoxin toxicity. <strong>Contraindication:</strong> Avoid empiric IV calcium salts (risk of "stone heart" ventricular arrest).
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                  <div className="font-black text-red-700">Hyperkalemia (Acute Poisoning)</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    In acute toxicity, K⁺ &gt; 5.0 mmol/L reflects catastrophic poisoning of Na⁺/K⁺ pumps and carries massive mortality. <strong>Absolute indication for urgent DigiFab</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP-BY-STEP CLINICAL ACTION PROTOCOL */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Step-by-Step Clinical Management Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs text-slate-700">
              <div className="space-y-2">
                {digiFabResult.clinicalRecommendations.map((rec, index) => (
                  <div key={index} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-slate-800 font-medium leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
