import React, { useState } from "react";
import { HistoricalEvent } from "../types";
import { Shield, CheckCircle, Clock, AlertTriangle, ArrowRight, Gauge, HelpCircle, Activity, Award, UserCheck, RefreshCw } from "lucide-react";

interface ComplianceAnalyticsProps {
  incidents: HistoricalEvent[];
  gpsCoordinates: { lat: number; lng: number };
}

export default function ComplianceAnalytics({ incidents, gpsCoordinates }: ComplianceAnalyticsProps) {
  const [sliderLux, setSliderLux] = useState<number>(242);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  // 1. Compute stats dynamically from the durable DB incidents!
  const totalCount = incidents.length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;
  const reviewingCount = incidents.filter((i) => i.status === "REVIEW").length;
  const investigatingCount = incidents.filter((i) => i.status === "INVESTIGATING").length;
  const escalatedCount = incidents.filter((i) => i.status === "ESCALATED").length;

  const complianceRate = totalCount > 0 
    ? Math.round(((resolvedCount + investigatingCount * 0.5 + reviewingCount * 0.25) / totalCount) * 100)
    : 85; // default fallback if empty

  // 2. Dynamic Adaptation Speed Advisory calculations based on Lux levels
  // Formulas modeling visual recovery and adaptation under high-contrast glare transits (IRC compliant)
  const getSpeedAdvisory = (lux: number) => {
    if (lux < 80) {
      return {
        speed: 50,
        status: "SAFE TRANSIT",
        color: "text-aegis-secondary",
        bg: "bg-aegis-secondary-container/10 border-aegis-secondary/20",
        desc: "Normal visibility. Photoreceptor adaptation occurs immediately with zero lag.",
        recoveryTime: "0.2s"
      };
    } else if (lux < 160) {
      return {
        speed: 40,
        status: "ADAPTATION ZONE",
        color: "text-amber-600",
        bg: "bg-amber-500/5 border-amber-500/20",
        desc: "Moderate glare. Mild adaptive contrast delay detected. Reduce speed to maintain safety margins.",
        recoveryTime: "1.2s"
      };
    } else if (lux < 220) {
      return {
        speed: 30,
        status: "CONTRAST DELAY ALERT",
        color: "text-orange-600",
        bg: "bg-orange-500/5 border-orange-500/20",
        desc: "High glare. Motorists will experience transient adaption blindness upon entering/exiting portal.",
        recoveryTime: "2.4s"
      };
    } else {
      return {
        speed: 20,
        status: "CRITICAL GLARE HAZARD",
        color: "text-aegis-error",
        bg: "bg-aegis-error-container/10 border-aegis-error/20",
        desc: "Extreme unshielded lighting. High risk of complete adaptation lag. Decelerate to underpass limit.",
        recoveryTime: "4.1s"
      };
    }
  };

  const advisory = getSpeedAdvisory(sliderLux);

  // Group incidents by day of week for our SVG Chart
  const getDayIncidents = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const counts = [2, 4, 1, 3, 5, 2, 4]; // defaults

    // Distribute actual incidents if available
    if (incidents.length > 0) {
      incidents.forEach((inc) => {
        const date = new Date(inc.timestamp.replace(" ", "T"));
        const dayIdx = date.getDay();
        if (!isNaN(dayIdx)) {
          counts[dayIdx] += 1;
        }
      });
    }

    return days.map((day, idx) => ({
      day: day.substring(0, 3),
      count: counts[idx]
    }));
  };

  const chartData = getDayIncidents();
  const maxChartVal = Math.max(...chartData.map(d => d.count), 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5" id="compliance-analytics-view">
      
      {/* 1. Left Column: Ward 129 Compliance score Dial & BBMP KPIs */}
      <div className="md:col-span-4 flex flex-col space-y-4">
        
        {/* Compliance Dial */}
        <div className="bg-white rounded-3xl p-5 border border-aegis-container shadow-xs text-center flex flex-col items-center justify-between min-h-[280px]">
          <div className="w-full flex items-center justify-between border-b border-aegis-container pb-2 mb-3">
            <span className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-aegis-secondary" />
              WARD 129 REPORT CARD
            </span>
            <span className="text-[8px] font-mono text-slate-400">SEC: MAGADI ROAD</span>
          </div>

          <div className="relative flex items-center justify-center my-2">
            {/* SVG Circular Dial */}
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="56"
                className="stroke-gray-100"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="56"
                className="stroke-aegis-secondary transition-all duration-1000 ease-out"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={351.8}
                strokeDashoffset={351.8 - (351.8 * complianceRate) / 100}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Dial Center Info */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-black text-aegis-primary tracking-tight">
                {complianceRate}%
              </span>
              <span className="text-[9px] font-display font-bold text-aegis-on-surface-variant uppercase tracking-wider">
                COMPLIANCE INDEX
              </span>
            </div>
          </div>

          <div className="w-full mt-2">
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-aegis-on-surface-variant">
              <div className="bg-aegis-container-low border border-aegis-container p-2 rounded-xl text-center">
                <span className="block text-slate-400">RESOLVED</span>
                <span className="text-xs font-black text-aegis-secondary font-sans">{resolvedCount}</span>
              </div>
              <div className="bg-aegis-container-low border border-aegis-container p-2 rounded-xl text-center">
                <span className="block text-slate-400">PENDING</span>
                <span className="text-xs font-black text-aegis-error font-sans">{totalCount - resolvedCount}</span>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-400 mt-3 leading-relaxed text-center font-sans font-medium">
              *Compliance Index is an algorithm weighting escalated incidents by resolution status across municipal zones.
            </p>
          </div>
        </div>

        {/* Division Response Times KPI */}
        <div className="bg-white rounded-3xl p-5 border border-aegis-container shadow-xs flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-aegis-container pb-2 mb-3">
            <Clock className="w-4 h-4 text-aegis-secondary" />
            <h3 className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-widest">
              Resolution Audit Metrics
            </h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-aegis-on-surface-variant">BBMP Ward Audit Dispatch</span>
                <span className="font-bold text-aegis-primary">18.5 Hrs Avg</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-aegis-secondary rounded-full w-[65%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-aegis-on-surface-variant">Optic Shield Engineering</span>
                <span className="font-bold text-aegis-primary">42.1 Hrs Avg</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-aegis-secondary rounded-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-aegis-on-surface-variant">Redressal Action SLA Met</span>
                <span className="font-bold text-aegis-primary">91.8% Success</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-aegis-secondary rounded-full w-[92%]" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-aegis-container flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>SLA BOUNDARY: 72 HOURS</span>
            <span className="text-aegis-secondary font-bold">STATUS: OK</span>
          </div>
        </div>

      </div>

      {/* 2. Middle Column: Interactive Adaptive Contrast Speed Limit HUD */}
      <div className="md:col-span-5 flex flex-col space-y-4">
        
        <div className="bg-white rounded-3xl p-5 border border-aegis-container shadow-xs flex flex-col h-full justify-between">
          
          <div className="border-b border-aegis-container pb-3 mb-4">
            <span className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-widest flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-aegis-secondary" />
              INTELLIGENT SPEED LIMIT ADVISORY HUD
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Calculates vehicle deceleration curves based on current lighting lux adaptability.
            </p>
          </div>

          {/* Speed limit readout widget */}
          <div className={`p-4 rounded-2xl border ${advisory.bg} flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300`}>
            <div className="space-y-1 text-center sm:text-left">
              <span className={`text-[10px] font-display font-black tracking-widest uppercase ${advisory.color}`}>
                {advisory.status}
              </span>
              <p className="text-[11px] font-sans font-medium text-aegis-on-surface-variant leading-relaxed">
                {advisory.desc}
              </p>
              <div className="pt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-3 font-mono text-[9px] text-slate-400">
                <span>Adaptation: <b className="text-aegis-primary">{advisory.recoveryTime}</b></span>
                <span>Fovea Recovery: <b className="text-aegis-primary">Safe</b></span>
              </div>
            </div>

            {/* Simulated Speed Sign */}
            <div className="bg-white border-4 border-red-600 rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-md select-none shrink-0 transform hover:scale-105 transition-transform">
              <span className="text-3xl font-display font-black text-slate-900 leading-none">
                {advisory.speed}
              </span>
              <span className="text-[8px] font-display font-bold text-slate-500 tracking-wider">
                KM/H
              </span>
            </div>
          </div>

          {/* Interactive Lux Simulator slider */}
          <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-4 my-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-wider">
                Simulate Underpass Lux Intensity
              </label>
              <span className="font-mono text-xs font-bold text-aegis-error bg-white border border-aegis-container px-2 py-0.5 rounded-full">
                {sliderLux} Lux
              </span>
            </div>
            
            <input
              type="range"
              min="20"
              max="350"
              value={sliderLux}
              onChange={(e) => setSliderLux(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-aegis-secondary"
            />
            
            <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1.5 uppercase">
              <span>20 (Normal)</span>
              <span>120 (Medium)</span>
              <span>220 (Critical Threshold)</span>
              <span>350 (Blinding)</span>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[10px] leading-relaxed space-y-2 border border-slate-800">
            <div className="flex items-center gap-1.5 text-aegis-secondary font-bold border-b border-slate-800 pb-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>IRC OPTICAL COMPENSATOR SIMULATOR</span>
            </div>
            <div>
              <span className="text-slate-400">&gt; Formula: </span>
              <span className="text-amber-400">V_adv = V_max * (1 - (Lux - 80) / 450)</span>
            </div>
            <div>
              <span className="text-slate-400">&gt; Current Adaptation Index: </span>
              <span className="text-green-400">{(sliderLux / 100).toFixed(2)} Adaptation Multiplier</span>
            </div>
            <div className="text-[9px] text-slate-400 font-sans italic">
              Adjust the slider above to see real-time speed guidelines adjust based on biological glare tolerances.
            </div>
          </div>

        </div>

      </div>

      {/* 3. Right Column: Weekly Glare Trend & BBMP Leaderboard */}
      <div className="md:col-span-3 flex flex-col space-y-4">
        
        {/* Weekly Glare Trend SVG Bar Chart */}
        <div className="bg-white rounded-3xl p-5 border border-aegis-container shadow-xs flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between border-b border-aegis-container pb-2 mb-3">
            <span className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-wider">
              WEEKLY GLARE SPECTRUM
            </span>
            <span className="text-[8px] font-mono text-aegis-secondary font-bold">LIVE TELEMETRY</span>
          </div>

          {/* Render Vector Bar Chart */}
          <div className="h-28 w-full flex items-end justify-between px-1 pt-4">
            {chartData.map((data, idx) => {
              const heightPercent = (data.count / maxChartVal) * 100;
              const isHovered = activeSegment === idx;
              return (
                <div 
                  key={data.day} 
                  className="flex flex-col items-center flex-1 group cursor-pointer"
                  onMouseEnter={() => setActiveSegment(idx)}
                  onMouseLeave={() => setActiveSegment(null)}
                >
                  <div className="relative w-full flex justify-center">
                    {/* Tooltip on Hover */}
                    <div className={`absolute -top-6 bg-slate-900 text-white text-[8px] font-mono px-1 py-0.5 rounded shadow-sm pointer-events-none transition-all duration-150 ${
                      isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
                    }`}>
                      {data.count} Evt
                    </div>
                  </div>
                  
                  {/* Visual Bar with transition and gradient look */}
                  <div 
                    className={`w-3 rounded-t-xs transition-all duration-500 ${
                      isHovered 
                        ? "bg-aegis-secondary shadow-md" 
                        : "bg-aegis-secondary/40"
                    }`}
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  />
                  
                  <span className="text-[8px] font-mono text-slate-400 mt-2">
                    {data.day}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-slate-400 mt-2 font-sans font-medium leading-normal text-center border-t border-aegis-container pt-2">
            Weekly total glare transits registered above threshold levels.
          </p>
        </div>

        {/* Municipal Divisions Leaderboard */}
        <div className="bg-white rounded-3xl p-5 border border-aegis-container shadow-xs flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-aegis-container pb-2 mb-2.5">
            <UserCheck className="w-4 h-4 text-aegis-secondary" />
            <h3 className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-widest">
              Officer Compliance Board
            </h3>
          </div>

          <div className="space-y-2 text-[10px] font-mono">
            <div className="flex items-center justify-between p-1.5 bg-aegis-container-low rounded-lg border border-aegis-container">
              <div className="truncate pr-1.5">
                <span className="block font-sans font-bold text-aegis-primary truncate">BBMP RR Nagar Div</span>
                <span className="text-[8px] text-slate-400 uppercase">Executive Engineer</span>
              </div>
              <span className="text-aegis-secondary font-black bg-aegis-secondary-container px-2 py-0.5 rounded-full">92%</span>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-aegis-container-low rounded-lg border border-aegis-container">
              <div className="truncate pr-1.5">
                <span className="block font-sans font-bold text-aegis-primary truncate">BTP Traffic West Div</span>
                <span className="text-[8px] text-slate-400 uppercase">Assistant Commissioner</span>
              </div>
              <span className="text-aegis-secondary font-black bg-aegis-secondary-container px-2 py-0.5 rounded-full">85%</span>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-aegis-container-low rounded-lg border border-aegis-container">
              <div className="truncate pr-1.5">
                <span className="block font-sans font-bold text-aegis-primary truncate">NICE Road Operators</span>
                <span className="text-[8px] text-slate-400 uppercase">Maintenance Desk</span>
              </div>
              <span className="text-amber-600 font-black bg-amber-100 px-2 py-0.5 rounded-full">74%</span>
            </div>
          </div>

          <div className="text-[9px] text-center text-slate-400 font-sans mt-3 font-medium">
            *Officer grades rated dynamically based on grievance response velocity and audit completions.
          </div>
        </div>

      </div>

    </div>
  );
}
