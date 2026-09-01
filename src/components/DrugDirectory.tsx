import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pill, 
  Sparkles, 
  ChevronDown,
  Activity,
  ShieldAlert,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Brain,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export type DrugId = 'vanco' | 'gentamicin' | 'amikacin' | 'bactrim' | 'fluco' | 'lithium' | 'cyclosporine' | 'tacrolimus' | 'digoxin' | 'phenytoin';

export interface DrugItem {
  id: DrugId;
  name: string;
  genericName: string;
  group: 'routine_tdm' | 'special_nontdm' | 'other_tdm';
  status: 'active' | 'pipeline';
  route: string;
  primaryTarget: string;
  description: string;
  unit: string;
}

export const DRUG_CATALOG: DrugItem[] = [
  // 1. ROUTINE / COMMONLY USED ANTIMICROBIAL TDM
  {
    id: 'vanco',
    name: 'Vancomycin',
    genericName: 'Vancomycin HCl',
    group: 'routine_tdm',
    status: 'active',
    route: 'IV Infusion',
    primaryTarget: '10–15 or 15–20 mg/L (AUC 400–600)',
    description: '1-compartment PK with 1h post-infusion peak, steady-state trough, AUC24/MIC, and Bayesian solver.',
    unit: 'mg/L'
  },
  {
    id: 'gentamicin',
    name: 'Gentamicin',
    genericName: 'Gentamicin Sulfate',
    group: 'routine_tdm',
    status: 'active',
    route: 'IV / IM',
    primaryTarget: 'Hartford: < 1.0 mg/L | Conv: Peak 5–10, Trough < 1–2',
    description: 'Once-daily Hartford (7 mg/kg), Synergy (1 mg/kg), and conventional multiple-daily dosing with CrCl adjustments.',
    unit: 'mg/L'
  },
  {
    id: 'amikacin',
    name: 'Amikacin',
    genericName: 'Amikacin Sulfate',
    group: 'routine_tdm',
    status: 'active',
    route: 'IV Infusion',
    primaryTarget: 'Extended: Peak 40–60, Trough < 2.5–5 | Conv: Peak 20–30',
    description: 'High-dose extended interval (15–20 mg/kg) and conventional divided dosing (7.5 mg/kg q12h).',
    unit: 'mg/L'
  },

  // 2. SPECIAL & NON-TDM PROTOCOLS
  {
    id: 'bactrim',
    name: 'Bactrim (Co-trimoxazole)',
    genericName: 'Trimethoprim / Sulfamethoxazole (TMP/SMX)',
    group: 'special_nontdm',
    status: 'active',
    route: 'Oral SS Tabs / IV Ampoules',
    primaryTarget: 'Dosed by TMP (mg/kg/day)',
    description: 'Non-TDM protocol for PJP and standard bacterial infections with SS tablet count, IV dilution, and HD replacement.',
    unit: 'mg TMP'
  },
  {
    id: 'fluco',
    name: 'Fluconazole',
    genericName: 'Fluconazole',
    group: 'special_nontdm',
    status: 'active',
    route: 'Oral / IV',
    primaryTarget: '10–25 mg/L (Indication-guided)',
    description: 'Indication-guided dosing (Candidemia, Meningitis) and linear renal TDM adjustments.',
    unit: 'mg/L'
  },

  // 3. OTHER / SPECIALIZED TDM (Dropdown Menu)
  {
    id: 'cyclosporine',
    name: 'Cyclosporine & Tacrolimus',
    genericName: 'Calcineurin Inhibitors',
    group: 'other_tdm',
    status: 'pipeline',
    route: 'Oral / IV',
    primaryTarget: 'Tacro: 5–15 ng/mL | Cyclo: C0 100–300 ng/mL',
    description: 'Solid organ transplant immunosuppression monitoring.',
    unit: 'ng/mL'
  },
  {
    id: 'digoxin',
    name: 'Digoxin',
    genericName: 'Digoxin',
    group: 'other_tdm',
    status: 'pipeline',
    route: 'Oral / IV',
    primaryTarget: 'HF: 0.5–0.9 ng/mL | AFib: 0.8–2.0 ng/mL',
    description: 'Inotropic cardiac glycoside with renal & P-glycoprotein adjustments.',
    unit: 'ng/mL'
  },
  {
    id: 'lithium',
    name: 'Lithium Carbonate',
    genericName: 'Lithium',
    group: 'other_tdm',
    status: 'pipeline',
    route: 'Oral',
    primaryTarget: 'Maintenance: 0.6–1.0 mmol/L | Acute: 0.8–1.2 mmol/L',
    description: 'Bipolar mood stabilizer 12-hour post-dose serum monitoring.',
    unit: 'mmol/L'
  },
  {
    id: 'phenytoin',
    name: 'Phenytoin',
    genericName: 'Phenytoin Sodium',
    group: 'other_tdm',
    status: 'pipeline',
    route: 'Oral / IV',
    primaryTarget: 'Total: 10–20 mg/L | Free: 1–2 mg/L',
    description: 'Non-linear Michaelis-Menten kinetics with Sheiner-Tozer albumin correction.',
    unit: 'mg/L'
  }
];

interface DrugDirectoryProps {
  activeDrug: DrugId;
  onSelectDrug: (id: DrugId) => void;
}

export function DrugDirectory({ activeDrug, onSelectDrug }: DrugDirectoryProps) {
  const [pipelineModalDrug, setPipelineModalDrug] = useState<DrugItem | null>(null);
  const [showOtherMenu, setShowOtherMenu] = useState(false);

  const routineDrugs = DRUG_CATALOG.filter(d => d.group === 'routine_tdm');
  const specialDrugs = DRUG_CATALOG.filter(d => d.group === 'special_nontdm');
  const otherDrugs = DRUG_CATALOG.filter(d => d.group === 'other_tdm');

  const activeDrugObj = DRUG_CATALOG.find(d => d.id === activeDrug);

  return (
    <div className="space-y-4">
      {/* Navigation Header with Clear Grouping */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Section 1: Routine / Common Antimicrobial TDM */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Common Antimicrobial TDM
            </span>
            <span className="text-[10px] font-bold text-slate-400">High-frequency clinical use</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {routineDrugs.map(drug => {
              const isActive = activeDrug === drug.id;
              return (
                <button
                  key={drug.id}
                  onClick={() => onSelectDrug(drug.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative select-none ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-1'
                      : 'bg-slate-50/80 hover:bg-slate-100/80 text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {drug.name}
                    </span>
                    <Badge className={`text-[9px] font-black uppercase px-1.5 py-0 border-none ${
                      isActive ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
                    }`}>
                      TDM
                    </Badge>
                  </div>
                  <p className={`text-[10px] mt-0.5 truncate font-medium ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {drug.primaryTarget}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-purple-600" />
              Special & Non-TDM Protocols
            </span>
            
            {/* Dropdown Toggle for Infrequent / Other TDM */}
            <div className="relative">
              <button
                onClick={() => setShowOtherMenu(!showOtherMenu)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Other TDM Modules ({otherDrugs.length})
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOtherMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Other TDM Dropdown Menu */}
              <AnimatePresence>
                {showOtherMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 space-y-1"
                  >
                    <div className="px-2 py-1 border-b border-slate-100 mb-1">
                      <p className="text-[10px] font-black uppercase text-slate-400">Specialized & Transplant TDM</p>
                      <p className="text-[11px] text-slate-500">Less commonly requested drugs</p>
                    </div>
                    {otherDrugs.map(drug => (
                      <button
                        key={drug.id}
                        onClick={() => {
                          setPipelineModalDrug(drug);
                          setShowOtherMenu(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">{drug.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{drug.primaryTarget}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">
                          Pipeline
                        </Badge>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {specialDrugs.map(drug => {
              const isActive = activeDrug === drug.id;
              const isNonTdm = drug.id === 'bactrim';

              return (
                <button
                  key={drug.id}
                  onClick={() => onSelectDrug(drug.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative select-none ${
                    isActive
                      ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-500/20 ring-2 ring-purple-600 ring-offset-1'
                      : 'bg-purple-50/40 hover:bg-purple-50/80 text-slate-800 border-purple-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {drug.name}
                    </span>
                    <Badge className={`text-[9px] font-black uppercase px-1.5 py-0 border-none ${
                      isActive 
                        ? 'bg-white text-purple-800' 
                        : isNonTdm 
                        ? 'bg-purple-200 text-purple-900' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isNonTdm ? 'Special Non-TDM' : 'Antifungal Protocol'}
                    </Badge>
                  </div>
                  <p className={`text-[10px] mt-0.5 truncate font-medium ${isActive ? 'text-purple-100' : 'text-slate-600'}`}>
                    {drug.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roadmap / Coming Soon Reference Modal */}
      <AnimatePresence>
        {pipelineModalDrug && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{pipelineModalDrug.name}</h3>
                    <p className="text-xs text-slate-500 font-bold">{pipelineModalDrug.genericName}</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black uppercase">
                  Upcoming Module
                </Badge>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Standard Target:</span>
                  <span className="text-slate-900 font-black">{pipelineModalDrug.primaryTarget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Administration:</span>
                  <span className="text-slate-900 font-black">{pipelineModalDrug.route}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Monitoring Unit:</span>
                  <span className="text-blue-600 font-black">{pipelineModalDrug.unit}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {pipelineModalDrug.description} This module is slated for subsequent clinical guideline integration.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setPipelineModalDrug(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors"
                >
                  Close Reference
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
