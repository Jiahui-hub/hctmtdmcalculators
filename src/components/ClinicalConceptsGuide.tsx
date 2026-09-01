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
  Stethoscope,
  Info,
  AlertTriangle,
  Scale
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function ClinicalConceptsGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<'early_vs_pk' | 'scr_rounding'>('scr_rounding');

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
              Practical guidance on Serum Creatinine &lt; 60 µmol/L rounding, VAN prevention, and TDM sampling modalities.
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
                onClick={() => setSelectedTopic('scr_rounding')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedTopic === 'scr_rounding'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                1. Low SCr (&lt; 60 µmol/L) Rounding & VAN Prevention
              </button>
              <button
                onClick={() => setSelectedTopic('early_vs_pk')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedTopic === 'early_vs_pk'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                2. Early Predictor vs Random PK vs TDM
              </button>
            </div>

            {/* Topic Content 1: Low SCr Rounding vs Actual SCr Clinical Guide */}
            {selectedTopic === 'scr_rounding' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-slate-700 leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Clinical Dilemma: Low Serum Creatinine (&lt; 60 µmol/L) & Vancomycin-Associated Nephrotoxicity (VAN)
                  </div>
                  <p>
                    In patients with very low measured serum creatinine (e.g. 40–55 µmol/L), Cockcroft-Gault formula can produce an artificially inflated CrCl (&gt; 120–150 mL/min). If unadjusted, this can lead to excessive frequency or total daily dose, potentially overshooting target levels and precipitating Vancomycin-Associated Nephrotoxicity (VAN).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* When to Round SCr to 60 */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> When to Round SCr to 60 µmol/L (0.68 mg/dL)
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-black">Safety Floor</Badge>
                    </div>
                    <p className="font-bold text-slate-800">Indications to Round Up (Prevents Overdosing):</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
                      <li><span className="font-bold text-slate-800">Elderly patients (&gt; 65 years):</span> Low SCr is usually artifactual due to age-related sarcopenia / reduced muscle mass.</li>
                      <li><span className="font-bold text-slate-800">Malnourished / Cachectic / Amputee patients:</span> Extremely low creatinine generation rate falsely mimics hyper-filtration.</li>
                      <li><span className="font-bold text-slate-800">High Risk of Nephrotoxicity:</span> Concomitant nephrotoxins (Pip/Tazo, Aminoglycosides, Polymyxins, NSAIDs, IV contrast) or baseline borderline renal reserve.</li>
                      <li><span className="font-bold text-slate-800">Targeting standard infections:</span> SSTI, uncomplicated bacteremia where safety margin is paramount.</li>
                    </ul>
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-800 font-bold text-[11px]">
                      Rounding up to 60 µmol/L tempers estimated CrCl and helps prevent toxic drug accumulation.
                    </div>
                  </div>

                  {/* When to Keep Actual SCr (<60) */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-blue-200 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-blue-950 text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" /> When to Keep Actual Measured SCr (&lt; 60 µmol/L)
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 border-none text-[9px] font-black">True Clearance</Badge>
                    </div>
                    <p className="font-bold text-slate-800">Scenarios where Actual Low SCr Reflects True High Clearance:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
                      <li><span className="font-bold text-slate-800">Augmented Renal Clearance (ARC):</span> Young, athletic, or critically ill hyperdynamic septic/trauma/burn patients (CrCl &gt; 130 mL/min).</li>
                      <li><span className="font-bold text-slate-800">High Muscle Mass & Good Nutrition:</span> Well-nourished young adults with genuinely superior renal clearance.</li>
                      <li><span className="font-bold text-slate-800">Severe Deep-Seated MRSA:</span> CNS meningitis, infective endocarditis, or osteomyelitis where under-dosing is life-threatening.</li>
                      <li><span className="font-bold text-slate-800">Rapid TDM follow-up:</span> When an Early Predictor or 24–48h TDM sample is planned to rapidly adjust levels.</li>
                    </ul>
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-800 font-bold text-[11px]">
                      Use actual SCr, then compare the 750 mg vs 1000 mg options and monitor trough at Dose 3/4.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Content 2: Early vs Random PK vs Steady State */}
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
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
