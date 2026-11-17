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
              Practical guidance on TDM sampling modalities: Early Predictor vs Random PK vs Steady-State TDM.
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
            <div className="flex items-center gap-2 pb-1">
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 text-white shadow-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Early Predictor vs Random PK vs Steady-State TDM
              </span>
            </div>

            {/* Topic Content: Early vs Random PK vs Steady State */}
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
                      Back-calculates individual elimination (<span className="font-bold">Ke</span>) from exact sample time to extrapolate true trough (<span className="font-mono font-bold">Cmin</span> at τ), <span className="font-bold">AUC24/MIC</span>, and optimize dose & interval.
                    </p>
                  </div>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
