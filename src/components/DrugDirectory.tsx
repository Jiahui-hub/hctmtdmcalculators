import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pill, 
  Search, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  FlaskConical, 
  HeartPulse, 
  Brain, 
  ShieldAlert,
  ChevronRight,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export type DrugId = 'vanco' | 'bactrim' | 'fluco' | 'amikacin' | 'gentamicin' | 'lithium' | 'cyclosporine' | 'tacrolimus' | 'digoxin' | 'phenytoin';

export interface DrugItem {
  id: DrugId;
  name: string;
  genericName: string;
  category: 'antibacterial' | 'antifungal' | 'immunosuppressant' | 'neuropsych' | 'cardiac';
  status: 'active' | 'pipeline';
  route: string;
  primaryTarget: string;
  description: string;
  unit: string;
}

export const DRUG_CATALOG: DrugItem[] = [
  // Active Calculators
  {
    id: 'vanco',
    name: 'Vancomycin',
    genericName: 'Vancomycin HCl',
    category: 'antibacterial',
    status: 'active',
    route: 'IV Infusion',
    primaryTarget: '10–15 or 15–20 mg/L (AUC 400–600)',
    description: 'Glycopeptide antibacterial with full loading, maintenance, Bayesian PK & early level solver.',
    unit: 'mg/L'
  },
  {
    id: 'bactrim',
    name: 'Bactrim / Cotrimoxazole',
    genericName: 'Trimethoprim / Sulfamethoxazole',
    category: 'antibacterial',
    status: 'active',
    route: 'Oral / IV Infusion',
    primaryTarget: 'Dosed by TMP (mg/kg/day)',
    description: 'Antifolate combo for standard & severe PJP infections with CrCl and Hemodialysis adjustments.',
    unit: 'mg TMP'
  },
  {
    id: 'fluco',
    name: 'Fluconazole',
    genericName: 'Fluconazole',
    category: 'antifungal',
    status: 'active',
    route: 'Oral / IV',
    primaryTarget: '10–25 mg/L (Indication-guided)',
    description: 'Triazole antifungal with indication-specific targets (Candidemia, Meningitis) and renal TDM.',
    unit: 'mg/L'
  },

  // Future Modules (Pipeline)
  {
    id: 'gentamicin',
    name: 'Gentamicin / Amikacin',
    genericName: 'Aminoglycosides',
    category: 'antibacterial',
    status: 'pipeline',
    route: 'IV / IM',
    primaryTarget: 'Peak: 5–10 (Gent) / 20–30 (Ami) mg/L',
    description: 'Extended-interval (Hartford) & conventional Peak/Trough kinetic calculators.',
    unit: 'mg/L'
  },
  {
    id: 'cyclosporine',
    name: 'Cyclosporine & Tacrolimus',
    genericName: 'Calcineurin Inhibitors',
    category: 'immunosuppressant',
    status: 'pipeline',
    route: 'Oral / IV',
    primaryTarget: 'C0 (100–300 ng/mL) / C2 (800–1200 ng/mL)',
    description: 'Solid organ transplant immunosuppressive therapeutic drug monitoring.',
    unit: 'ng/mL / ug/L'
  },
  {
    id: 'lithium',
    name: 'Lithium Carbonate',
    genericName: 'Lithium',
    category: 'neuropsych',
    status: 'pipeline',
    route: 'Oral',
    primaryTarget: '0.6–1.0 mmol/L (Acute: 0.8–1.2)',
    description: 'Mood stabilizer TDM drawn exactly 12 hours post-evening dose.',
    unit: 'mmol/L'
  },
  {
    id: 'digoxin',
    name: 'Digoxin',
    genericName: 'Digoxin',
    category: 'cardiac',
    status: 'pipeline',
    route: 'Oral / IV',
    primaryTarget: '0.5–0.9 ng/mL (HF) / 0.8–2.0 (AFib)',
    description: 'Cardiac glycoside inotropic agent with renal & P-gp drug interaction adjustments.',
    unit: 'ng/mL'
  },
  {
    id: 'phenytoin',
    name: 'Phenytoin',
    genericName: 'Phenytoin Sodium',
    category: 'neuropsych',
    status: 'pipeline',
    route: 'Oral / IV',
    primaryTarget: 'Total: 10–20 mg/L (Free: 1–2 mg/L)',
    description: 'Non-linear Michaelis-Menten kinetics with Sheiner-Tozer albumin correction.',
    unit: 'mg/L'
  }
];

interface DrugDirectoryProps {
  activeDrug: DrugId;
  onSelectDrug: (id: DrugId) => void;
}

export function DrugDirectory({ activeDrug, onSelectDrug }: DrugDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pipelineModalDrug, setPipelineModalDrug] = useState<DrugItem | null>(null);

  const categories = [
    { id: 'all', label: 'All Drugs' },
    { id: 'antibacterial', label: 'Antibacterials' },
    { id: 'antifungal', label: 'Antifungals' },
    { id: 'immunosuppressant', label: 'Immunosuppressants' },
    { id: 'neuropsych', label: 'Neuro & Psych' },
    { id: 'cardiac', label: 'Cardiology' },
  ];

  const filteredDrugs = DRUG_CATALOG.filter(drug => {
    const matchesSearch = drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          drug.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          drug.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || drug.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Category selector pills & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search drug or class..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs font-bold border-slate-200 bg-white"
          />
        </div>
      </div>

      {/* Drug Switcher Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {filteredDrugs.map(drug => {
          const isActive = activeDrug === drug.id;
          const isOperational = drug.status === 'active';

          return (
            <div
              key={drug.id}
              onClick={() => {
                if (isOperational) {
                  onSelectDrug(drug.id);
                } else {
                  setPipelineModalDrug(drug);
                }
              }}
              className={`relative text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-2'
                  : isOperational
                  ? 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  : 'bg-slate-50/70 text-slate-500 border-slate-200/60 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : isOperational ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Pill className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className={`text-sm font-black tracking-tight leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {drug.name}
                    </h3>
                    <p className={`text-[10px] font-bold ${isActive ? 'text-blue-100' : 'text-slate-400'} mt-0.5`}>
                      {drug.genericName}
                    </p>
                  </div>
                </div>

                {isOperational ? (
                  <Badge className={`text-[9px] font-black uppercase px-1.5 py-0.5 border-none ${isActive ? 'bg-white text-blue-600' : 'bg-green-100 text-green-700'}`}>
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 border-slate-200">
                    Roadmap
                  </Badge>
                )}
              </div>

              <p className={`text-[11px] font-medium line-clamp-1 mt-2 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                {drug.description}
              </p>

              <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-bold ${
                isActive ? 'border-white/20 text-blue-100' : 'border-slate-100 text-slate-400'
              }`}>
                <span>Target: {drug.primaryTarget.split('(')[0]}</span>
                <span className="uppercase text-[9px] tracking-wider">{drug.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roadmap / Coming Soon Modal */}
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
                {pipelineModalDrug.description} This module is slated for the next HCTM clinical calculator update batch.
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
