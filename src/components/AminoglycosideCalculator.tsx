import React, { useState, useMemo } from 'react';
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
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateGentamicinDose, calculateAmikacinDose, AminoglycosideResult } from '@/src/lib/calculations';

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
}

export function AminoglycosideCalculator({ drug, patient }: AminoglycosideCalculatorProps) {
  const [gentRegimen, setGentRegimen] = useState<'hartford' | 'conventional' | 'synergy'>('hartford');
  const [amiRegimen, setAmiRegimen] = useState<'extended' | 'conventional'>('extended');
  const [copied, setCopied] = useState(false);

  // TDM Evaluation Level inputs
  const [measuredPeak, setMeasuredPeak] = useState('');
  const [measuredTrough, setMeasuredTrough] = useState('');
  const [measuredRandom, setMeasuredRandom] = useState('');
  const [randomHoursPostDose, setRandomHoursPostDose] = useState('8');

  const calculationResult: AminoglycosideResult = useMemo(() => {
    if (drug === 'gentamicin') {
      return calculateGentamicinDose(patient.weight, patient.ibw, patient.crcl, gentRegimen);
    } else {
      return calculateAmikacinDose(patient.weight, patient.ibw, patient.crcl, amiRegimen);
    }
  }, [drug, patient.weight, patient.ibw, patient.crcl, gentRegimen, amiRegimen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isObese = patient.weight > 1.2 * patient.ibw;

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <Card className="border-blue-200 bg-linear-to-r from-blue-50/50 via-indigo-50/30 to-white shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                {drug === 'gentamicin' ? 'Gentamicin / Tobramycin Protocol' : 'Amikacin High-Dose & Conventional Protocol'}
                <Badge className="bg-blue-600 text-white text-[10px] font-black uppercase">
                  mg/L scale
                </Badge>
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Concentration-dependent killing (Cmax/MIC &ge; 8–10) with Post-Antibiotic Effect (PAE)
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
                `${calculationResult.drug.toUpperCase()} Regimen: ${calculationResult.dose} mg ${calculationResult.frequencyText}\n` +
                `Dosing Weight: ${calculationResult.dosingWeightUsed} kg (${calculationResult.dosingWeightType})\n` +
                `Target: Peak ${calculationResult.targetPeak} | Trough ${calculationResult.targetTrough}\n` +
                `Infusion: ${calculationResult.infusionTime}`
              )}
              className="h-8 w-8 text-slate-500 hover:text-blue-600"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regimen Selection Control */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Select Clinical Strategy
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-white">
            Weight Used: <span className="font-black text-blue-600 ml-1">{calculationResult.dosingWeightUsed} kg</span>
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Dosing Approach</Label>
              {drug === 'gentamicin' ? (
                <Select value={gentRegimen} onValueChange={(v: any) => setGentRegimen(v)}>
                  <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hartford">Extended-Interval Hartford (7 mg/kg Once Daily) — Preferred</SelectItem>
                    <SelectItem value="conventional">Conventional Multiple Daily Dosing (1.5–2 mg/kg)</SelectItem>
                    <SelectItem value="synergy">Enterococcal Endocarditis Synergy (1 mg/kg)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={amiRegimen} onValueChange={(v: any) => setAmiRegimen(v)}>
                  <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extended">High-Dose Extended-Interval (15–20 mg/kg Once Daily) — Preferred</SelectItem>
                    <SelectItem value="conventional">Conventional Divided Dosing (7.5 mg/kg q12h)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Dosing Weight Basis</span>
                <span className="font-bold text-slate-800">{calculationResult.dosingWeightType}</span>
              </div>
              {isObese ? (
                <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold">
                  AdjBW Applied (BMI &gt; 25)
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

      {/* Main Calculated Dosing Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommended Dose Box */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Recommended Regimen</span>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black">
              {calculationResult.regimenType.split('(')[0]}
            </Badge>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">
              {calculationResult.dose} <span className="text-sm font-bold text-slate-500">mg</span>{' '}
              <span className="text-xl font-bold text-blue-600">{calculationResult.frequencyText.split('(')[0]}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-bold mt-1">
              {calculationResult.frequencyText}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
            <div><span className="font-bold text-slate-700">Infusion:</span> {calculationResult.infusionTime}</div>
            <div><span className="font-bold text-slate-700">Rational:</span> {calculationResult.note}</div>
          </div>
        </div>

        {/* Therapeutic Targets & Sampling Window */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Therapeutic Target & Sampling</span>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black">
              Standard
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Target Peak (1h Post-Infusion):</span>
              <span className="text-sm font-black text-indigo-700">{calculationResult.targetPeak}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Target Trough (Pre-Dose):</span>
              <span className="text-sm font-black text-emerald-700">{calculationResult.targetTrough}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">Sampling Protocol:</span> {calculationResult.samplingTime}
          </div>
        </div>
      </div>

      {/* Hartford Nomogram & Clinical Rules Reference */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Clinical Guidance & Sampling Window Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-black uppercase text-blue-600">Peak Sampling Timing</p>
              <p className="text-[11px] font-medium text-slate-700">
                Sample must be drawn exactly <span className="font-bold text-slate-900">1 hour after completion</span> of the 30-minute IV infusion to ensure complete tissue distribution.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-black uppercase text-emerald-600">Trough Sampling Timing</p>
              <p className="text-[11px] font-medium text-slate-700">
                Sample drawn <span className="font-bold text-slate-900">within 30 minutes</span> before the next scheduled dose. Undetectable or &lt; 1 mg/L ensures wash-out and renal safety.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-black uppercase text-purple-600">Renal Clearance Rule</p>
              <p className="text-[11px] font-medium text-slate-700">
                CrCl &ge; 60: q24h • CrCl 40–59: q36h • CrCl 20–39: q48h • CrCl &lt; 20: Do not use once-daily (use level-guided PRN).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
