import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Clock, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Droplet, 
  Flame,
  Stethoscope
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function ClinicalConceptsGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<'early_vs_pk' | 'anuric_vs_hd' | 'targets_mgl'>('early_vs_pk');

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 via-indigo-50/20 to-white shadow-sm overflow-hidden">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none hover:bg-blue-50/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                HCTM Clinical TDM Decision & Concepts Guide
              </h3>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-black uppercase">
                Clinical Reference
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Clear distinctions: Early Predictor vs Random PK, Anuric vs Hemodialysis, and 10–15 vs 15–20 mg/L targets.
            </p>
          </div>
        </div>

        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-blue-100/80 px-4 sm:px-6 pb-6 pt-4 space-y-4"
          >
            {/* Topic Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedTopic('early_vs_pk')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedTopic === 'early_vs_pk'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                1. Early Predictor vs Random PK vs TDM
              </button>
              <button
                onClick={() => setSelectedTopic('anuric_vs_hd')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedTopic === 'anuric_vs_hd'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                2. Anuric / AKI vs Hemodialysis (HD)
              </button>
              <button
                onClick={() => setSelectedTopic('targets_mgl')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedTopic === 'targets_mgl'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                3. Vancomycin Targets: 10–15 vs 15–20 mg/L
              </button>
            </div>

            {/* Topic Content 1: Early vs Random PK vs Steady State */}
            {selectedTopic === 'early_vs_pk' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Early Predictor */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-indigo-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-indigo-900 text-sm flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-600" /> Early Predictor
                      </span>
                      <Badge className="bg-indigo-100 text-indigo-700 border-none text-[9px] font-black">Pre-Steady State</Badge>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">When is it used?</p>
                    <p className="text-slate-600 leading-relaxed">
                      Drawn <span className="font-bold text-indigo-700">early (after Dose 1 or Dose 2)</span>, before steady state is reached (no need to wait 36–48h for Dose 4).
                    </p>
                    <p className="font-bold text-slate-800 text-[11px]">How does it work?</p>
                    <p className="text-slate-600 leading-relaxed">
                      Uses multi-dose pharmacokinetic accumulation math to back-calculate the patient's individual elimination rate (<span className="font-bold">Ke</span>) and project future steady-state trough immediately.
                    </p>
                  </div>

                  {/* Random PK */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-blue-900 text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" /> Random Level / PK
                      </span>
                      <Badge className="bg-blue-100 text-blue-700 border-none text-[9px] font-black">Arbitrary Time</Badge>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">When is it used?</p>
                    <p className="text-slate-600 leading-relaxed">
                      When blood is drawn at a <span className="font-bold text-blue-700">random or undocumented time</span> (e.g. 5.5h post-dose or in suspected drug accumulation / toxicity).
                    </p>
                    <p className="font-bold text-slate-800 text-[11px]">How does it work?</p>
                    <p className="text-slate-600 leading-relaxed">
                      Calculates single-compartment logarithmic decay from the post-infusion peak to the random draw point to estimate elimination rate and clearance.
                    </p>
                  </div>

                  {/* Steady-State TDM Adjustment */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600" /> Steady-State TDM
                      </span>
                      <Badge className="bg-green-100 text-green-700 border-none text-[9px] font-black">Pre-Dose 4/5</Badge>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">When is it used?</p>
                    <p className="text-slate-600 leading-relaxed">
                      Standard protocol: Drawn <span className="font-bold text-green-700">30 minutes prior to the 4th or 5th maintenance dose</span> when drug concentration is at true steady state.
                    </p>
                    <p className="font-bold text-slate-800 text-[11px]">How does it work?</p>
                    <p className="text-slate-600 leading-relaxed">
                      Applies linear proportional adjustment (<span className="font-mono font-bold">New Dose = Old Dose × Target / Measured</span>) to reach therapeutic window.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Content 2: Anuric vs Hemodialysis */}
            {selectedTopic === 'anuric_vs_hd' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Anuric */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-red-200 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-red-950 text-sm flex items-center gap-1.5">
                        <Droplet className="w-4 h-4 text-red-600" /> Anuric / AKI (No Urine Output)
                      </span>
                      <Badge className="bg-red-100 text-red-800 border-none text-[9px] font-black">No Clearance</Badge>
                    </div>
                    <div className="space-y-1.5 text-slate-600 leading-relaxed">
                      <p>
                        • <span className="font-bold text-slate-900">Physiology:</span> Renal clearance is 0 mL/min. Vancomycin elimination relies solely on negligible non-renal clearance (<span className="font-bold">T½ &gt; 100–150 hours</span>).
                      </p>
                      <p>
                        • <span className="font-bold text-slate-900">Dosing Strategy:</span> Give a full <span className="font-bold text-red-700">Loading Dose (25–30 mg/kg)</span>.
                      </p>
                      <p>
                        • <span className="font-bold text-slate-900">Maintenance:</span> <span className="font-black text-red-800">NO FIXED SCHEDULE</span>. Do NOT give daily doses. Measure serum level every 24–48h; re-dose PRN (e.g. 500–1000 mg) only when level falls below target (&lt;10–15 mg/L).
                      </p>
                    </div>
                  </div>

                  {/* Hemodialysis */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-blue-200 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-blue-950 text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" /> Intermittent Hemodialysis (HD)
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 border-none text-[9px] font-black">Active HD Clearance</Badge>
                    </div>
                    <div className="space-y-1.5 text-slate-600 leading-relaxed">
                      <p>
                        • <span className="font-bold text-slate-900">Physiology:</span> High-flux dialyzer membranes remove <span className="font-bold text-blue-700">30% to 50%</span> of circulating vancomycin during a 4-hour session.
                      </p>
                      <p>
                        • <span className="font-bold text-slate-900">Loading Weight:</span> If obese, use <span className="font-bold text-blue-700">Dosing Weight (AdjBW)</span> for 25–30 mg/kg calculation.
                      </p>
                      <p>
                        • <span className="font-bold text-slate-900">Administration Protocol:</span>
                        <br />- If dose &lt; 1g: Dilute in 100 mL NS, infuse during the <span className="font-bold">last hour of HD</span>.
                        <br />- If dose ≥ 1g: Dilute in 200 mL NS, start during last hour of HD and continue 1 hour post-HD.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Content 3: Target Ranges (10-15 vs 15-20 mg/L) */}
            {selectedTopic === 'targets_mgl' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Lower Target */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lower Target: 10 – 15 mg/L
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-black">Midpoint: 12.5 mg/L</Badge>
                    </div>
                    <p className="font-bold text-slate-800">Primary Clinical Indications:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li>Uncomplicated Skin & Soft Tissue Infections (SSTI) / Cellulitis</li>
                      <li>Urinary Tract Infections (UTI) due to Enterococcus / MRSA</li>
                      <li>Mild to moderate intra-abdominal infections</li>
                      <li>Catheter-related bloodstream infections (uncomplicated)</li>
                    </ul>
                    <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg">
                      Sufficient tissue penetration while minimizing nephrotoxicity risk in lower-acuity infections.
                    </p>
                  </div>

                  {/* High Target */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-amber-200 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-600" /> Higher Target: 15 – 20 mg/L
                      </span>
                      <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] font-black">Midpoint: 17.5 mg/L</Badge>
                    </div>
                    <p className="font-bold text-slate-800">Primary Clinical Indications:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li>MRSA Bacteremia / Septic Shock</li>
                      <li>Infective Endocarditis (Native or Prosthetic Valve)</li>
                      <li>Osteomyelitis / Septic Arthritis</li>
                      <li>Hospital-Acquired / Ventilator-Associated Pneumonia (HAP/VAP)</li>
                      <li>Bacterial Meningitis / CNS Infections</li>
                    </ul>
                    <p className="text-[11px] text-amber-800 font-bold bg-amber-50 p-2 rounded-lg">
                      Ensures high AUC/MIC (400–600) for deep-seated or life-threatening MRSA infections.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
