import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Activity, Info, ShieldCheck, AlertTriangle, ArrowUpRight, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VancoPK, predictLevelAfterDoseN, predictVancoLevels } from '../lib/calculations';

interface PkVisualizerProps {
  dose: number;
  interval: number;
  pk: VancoPK;
  infusionTime?: number;
  mic?: number;
  targetRange?: 'standard' | 'high'; // standard: 10-15, high: 15-20
  measuredTrough?: number;
}

export function PkVisualizer({
  dose,
  interval,
  pk,
  infusionTime = 1,
  mic = 1,
  targetRange = 'standard',
  measuredTrough
}: PkVisualizerProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [numDosesToShow, setNumDosesToShow] = useState<number>(4);

  const targetMin = targetRange === 'high' ? 15 : 10;
  const targetMax = targetRange === 'high' ? 20 : 15;

  const safeInterval = interval && interval > 0 ? interval : 12;
  const safeDose = dose && dose > 0 ? dose : 1000;
  const totalHours = Math.max(24, safeInterval * numDosesToShow);

  // Generate concentration time series points
  const curvePoints = useMemo(() => {
    if (!safeDose || !safeInterval || safeInterval <= 0 || !pk || !pk.ke || pk.ke <= 0 || !pk.vd || pk.vd <= 0) {
      return [];
    }

    const step = 0.5; // Every 30 mins
    const points: { time: number; conc: number; doseNum: number }[] = [];

    for (let t = 0; t <= totalHours; t += step) {
      const currentDoseIndex = Math.min(Math.floor(t / safeInterval) + 1, numDosesToShow);
      const timeInCurrentDose = t - (currentDoseIndex - 1) * safeInterval;
      
      const rawConc = predictLevelAfterDoseN(
        safeDose,
        safeInterval,
        currentDoseIndex,
        timeInCurrentDose,
        pk,
        infusionTime
      );
      const conc = isFinite(rawConc) && !isNaN(rawConc) ? Math.max(0, rawConc) : 0;

      points.push({
        time: t,
        conc,
        doseNum: currentDoseIndex
      });
    }

    return points;
  }, [safeDose, safeInterval, pk, infusionTime, totalHours, numDosesToShow]);

  const ssStats = useMemo(() => {
    if (!safeDose || !safeInterval || safeInterval <= 0 || !pk || !pk.ke || pk.ke <= 0 || !pk.vd || pk.vd <= 0) {
      return null;
    }
    return predictVancoLevels(safeDose, safeInterval, pk, infusionTime, mic);
  }, [safeDose, safeInterval, pk, infusionTime, mic]);

  const maxConcOnGraph = useMemo(() => {
    const validConcs = curvePoints
      .map(p => p.conc)
      .filter(c => typeof c === 'number' && !isNaN(c) && isFinite(c));
    const highestInCurve = validConcs.length > 0 ? Math.max(...validConcs, 40) : 40;
    const safeHighest = isFinite(highestInCurve) && !isNaN(highestInCurve) ? highestInCurve : 40;
    return Math.max(40, Math.ceil((safeHighest + 5) / 10) * 10);
  }, [curvePoints]);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const plotWidth = Math.max(10, svgWidth - padding.left - padding.right);
  const plotHeight = Math.max(10, svgHeight - padding.top - padding.bottom);

  const getX = (hour: number) => {
    const safeHour = isFinite(hour) && !isNaN(hour) ? Math.max(0, hour) : 0;
    const safeTotal = isFinite(totalHours) && totalHours > 0 ? totalHours : 24;
    return padding.left + (safeHour / safeTotal) * plotWidth;
  };

  const getY = (conc: number) => {
    const safeConc = isFinite(conc) && !isNaN(conc) ? Math.max(0, conc) : 0;
    const safeMax = isFinite(maxConcOnGraph) && maxConcOnGraph > 0 ? maxConcOnGraph : 50;
    return padding.top + plotHeight - (safeConc / safeMax) * plotHeight;
  };

  // Build SVG Path
  const pathD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    return curvePoints.reduce((acc, p, i) => {
      const x = getX(p.time);
      const y = getY(p.conc);
      if (isNaN(x) || isNaN(y)) return acc;
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [curvePoints, maxConcOnGraph, totalHours]);

  const hoveredData = useMemo(() => {
    if (hoveredHour === null || curvePoints.length === 0) return null;
    const closest = curvePoints.reduce((prev, curr) => {
      return Math.abs(curr.time - hoveredHour) < Math.abs(prev.time - hoveredHour) ? curr : prev;
    }, curvePoints[0]);
    return closest;
  }, [hoveredHour, curvePoints]);

  if (!ssStats || curvePoints.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm">
        Enter patient parameters to generate real-time pharmacokinetic concentration curve.
      </div>
    );
  }

  const isTroughInTarget = (ssStats.cmin || 0) >= targetMin && (ssStats.cmin || 0) <= targetMax;
  const isAucInTarget = (ssStats.aucMic || 0) >= 400 && (ssStats.aucMic || 0) <= 600;

  return (
    <div className="space-y-6">
      {/* Graph Container */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Pharmacokinetic (PK) Curve Visualizer
                <Badge className="bg-blue-600 text-white text-[10px] font-black uppercase">
                  mg/L scale
                </Badge>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Simulated 1-compartment IV infusion & elimination to Steady State
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold">Show:</span>
            {[3, 4, 5].map(d => (
              <button
                key={d}
                onClick={() => setNumDosesToShow(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  numDosesToShow === d ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {d} Doses ({d * interval}h)
              </button>
            ))}
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div className="relative w-full overflow-x-auto select-none">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-auto min-w-[500px]"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              if (svgX >= padding.left && svgX <= svgWidth - padding.right) {
                const hour = ((svgX - padding.left) / plotWidth) * totalHours;
                setHoveredHour(Math.max(0, Math.min(totalHours, hour)));
              }
            }}
            onMouseLeave={() => setHoveredHour(null)}
          >
            {/* Shaded Target Therapeutic Range */}
            <rect
              x={padding.left}
              y={getY(targetMax)}
              width={plotWidth}
              height={Math.max(0, getY(targetMin) - getY(targetMax))}
              fill="rgba(34, 197, 94, 0.15)"
              stroke="rgba(34, 197, 94, 0.3)"
              strokeDasharray="4 4"
            />
            <text
              x={svgWidth - padding.right - 5}
              y={getY((targetMin + targetMax) / 2) + 4}
              textAnchor="end"
              fill="#4ade80"
              fontSize="10"
              fontWeight="bold"
            >
              Target Window ({targetMin}–{targetMax} mg/L)
            </text>

            {/* Toxicity Warning Zone > 20 mg/L */}
            {maxConcOnGraph > 20 && (
              <line
                x1={padding.left}
                y1={getY(20)}
                x2={svgWidth - padding.right}
                y2={getY(20)}
                stroke="#f87171"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            )}

            {/* Grid Lines & Y-Axis Labels (mg/L) */}
            {[0, 10, 20, 30, 40, 50].filter(v => v <= maxConcOnGraph).map(v => (
              <g key={v}>
                <line
                  x1={padding.left}
                  y1={getY(v)}
                  x2={svgWidth - padding.right}
                  y2={getY(v)}
                  stroke="#334155"
                  strokeWidth="0.7"
                />
                <text
                  x={padding.left - 8}
                  y={getY(v) + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Dose Administration Markers on X-Axis */}
            {Array.from({ length: numDosesToShow }).map((_, i) => {
              const doseHour = i * interval;
              return (
                <g key={i}>
                  <line
                    x1={getX(doseHour)}
                    y1={padding.top}
                    x2={getX(doseHour)}
                    y2={svgHeight - padding.bottom}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <text
                    x={getX(doseHour)}
                    y={svgHeight - padding.bottom + 16}
                    textAnchor="middle"
                    fill="#60a5fa"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Dose {i + 1}
                  </text>
                  <text
                    x={getX(doseHour)}
                    y={svgHeight - padding.bottom + 28}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                  >
                    {doseHour}h
                  </text>
                </g>
              );
            })}

            {/* Main PK Concentration Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Steady State Peak (1h Post-Infusion) & Trough (Cmin) points on last dose */}
            {(() => {
              const safeInfTime = infusionTime || 1;
              const lastDosePeakTime = (numDosesToShow - 1) * safeInterval + safeInfTime + 1.0;
              const lastDoseTroughTime = numDosesToShow * safeInterval;
              const peakY = getY(ssStats.cmax);
              const troughY = getY(ssStats.cmin);

              return (
                <g>
                  {/* Peak Marker (1h Post Infusion) */}
                  <circle cx={getX(lastDosePeakTime)} cy={peakY} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                  <text x={getX(lastDosePeakTime)} y={peakY - 8} textAnchor="middle" fill="#7dd3fc" fontSize="9" fontWeight="bold">
                    Peak (1h post) {(ssStats.cmax || 0).toFixed(1)} mg/L
                  </text>

                  {/* Trough Marker */}
                  <circle cx={getX(lastDoseTroughTime)} cy={troughY} r="5" fill={isTroughInTarget ? "#4ade80" : "#fbbf24"} stroke="#ffffff" strokeWidth="1.5" />
                  <text x={getX(lastDoseTroughTime)} y={troughY + 16} textAnchor="end" fill={isTroughInTarget ? "#4ade80" : "#fbbf24"} fontSize="10" fontWeight="black">
                    Cmin {(ssStats.cmin || 0).toFixed(1)} mg/L
                  </text>
                </g>
              );
            })()}

            {/* Hover Tooltip cursor */}
            {hoveredData && (
              <g>
                <line
                  x1={getX(hoveredData.time)}
                  y1={padding.top}
                  x2={getX(hoveredData.time)}
                  y2={svgHeight - padding.bottom}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={getX(hoveredData.time)}
                  cy={getY(hoveredData.conc)}
                  r="4"
                  fill="#ffffff"
                />
              </g>
            )}

            {/* Axis Titles */}
            <text
              x={padding.left}
              y={padding.top - 6}
              textAnchor="start"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="bold"
            >
              Concentration (mg/L)
            </text>
            <text
              x={svgWidth - padding.right}
              y={svgHeight - 10}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="bold"
            >
              Time (Hours)
            </text>
          </svg>
        </div>

        {/* Hovered Time & Concentration readout */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Cursor Time:</span>
            <span className="font-black text-white">{hoveredData ? `${hoveredData.time.toFixed(1)} hours` : 'Hover graph'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Predicted Serum Level:</span>
            <span className="font-black text-cyan-400 text-sm">
              {hoveredData ? `${hoveredData.conc.toFixed(2)} mg/L` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Educational Clinical Interpretation Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Peak Cmax Card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Peak Level (Cpeak)</p>
            <Badge className="bg-sky-100 text-sky-800 border-none text-[9px] font-bold">1h Post-Infusion</Badge>
          </div>
          <p className="text-2xl font-black text-slate-900">{ssStats.cmax.toFixed(1)} <span className="text-xs font-bold text-slate-400">mg/L</span></p>
          <p className="text-[11px] text-slate-500 leading-snug">
            Sampled exactly 1 hour after IV infusion completes (allowing tissue distribution). End-of-infusion level: {ssStats.cEndOfInfusion ? ssStats.cEndOfInfusion.toFixed(1) : ssStats.cmax.toFixed(1)} mg/L.
          </p>
        </div>

        {/* Trough Cmin Card */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 ${
          isTroughInTarget ? 'bg-green-50/60 border-green-200' : 'bg-amber-50/60 border-amber-200'
        }`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Trough Level (Cmin)</p>
            <Badge className={`text-[9px] font-bold border-none ${isTroughInTarget ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>
              {isTroughInTarget ? 'Within Target' : ssStats.cmin < targetMin ? 'Sub-therapeutic' : 'Above Target'}
            </Badge>
          </div>
          <p className="text-2xl font-black text-slate-900">{ssStats.cmin.toFixed(1)} <span className="text-xs font-bold text-slate-400">mg/L</span></p>
          <p className="text-[11px] text-slate-600 leading-snug">
            Sampled 30 mins before the next dose. Target is <span className="font-bold">{targetMin}–{targetMax} mg/L</span> for this indication.
          </p>
        </div>

        {/* AUC24 / MIC Card */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1.5 ${
          isAucInTarget ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">AUC24 / MIC Ratio</p>
            <Badge className={`text-[9px] font-bold border-none ${isAucInTarget ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {isAucInTarget ? 'Target Met (400–600)' : ssStats.aucMic < 400 ? 'Low Kill (<400)' : 'AKI Risk (>600)'}
            </Badge>
          </div>
          <p className="text-2xl font-black text-blue-900">{ssStats.aucMic.toFixed(0)} <span className="text-xs font-bold text-slate-400">mg·h/L</span></p>
          <p className="text-[11px] text-slate-600 leading-snug">
            Total 24h exposure (AUC = {ssStats.auc24.toFixed(0)}). 400–600 provides maximal MRSA kill while minimizing nephrotoxicity risk.
          </p>
        </div>
      </div>
    </div>
  );
}
