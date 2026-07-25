import React from "react";

const SmartDetoxificationSystem = ({
  activeChemical,
  isPurifying,
  progress,
  activeStep,
  logs,
}) => {
  const steps = [
    {
      id: 1,
      name: "Neutralization",
      desc: activeChemical?.detox?.neutralization?.recomm || "Acid/Base balancing",
      icon: "⚖️",
      detail: activeChemical?.detox?.neutralization?.reaction || "Stoichiometric buffering",
      eff: activeChemical?.detox?.neutralization?.efficiency || 90,
    },
    {
      id: 2,
      name: "Absorption",
      desc: activeChemical?.detox?.absorption?.method?.split(".")[0] || "Carbon binding",
      icon: "🧽",
      detail: activeChemical?.detox?.absorption?.technique || "Physical VOC filtration",
      eff: activeChemical?.detox?.absorption?.efficiency || 95,
    },
    {
      id: 3,
      name: "Oxidation",
      desc: activeChemical?.detox?.oxidation?.method?.split(".")[0] || "Advanced destruction",
      icon: "⚡",
      detail: activeChemical?.detox?.oxidation?.agents || "Hydroxyl radical generation",
      eff: activeChemical?.detox?.oxidation?.efficiency || 90,
    },
    {
      id: 4,
      name: "Discharge",
      desc: activeChemical?.detox?.discharge?.compliance?.split(",")[0] || "Clean release check",
      icon: "💧",
      detail: activeChemical?.detox?.discharge?.recomm || "Final compliance verification",
      eff: Math.round(activeChemical?.detox?.discharge?.efficiency || 98),
    },
  ];

  return (
    <div className="w-full relative mt-4 py-6 px-6 rounded-2xl glass-card border border-slate-700/40 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs font-semibold tracking-wider text-cyan-400 font-orbitron border-b border-slate-800 pb-4 uppercase">
        <span className="flex items-center gap-2">
          ⚙️ Smart Detoxification Treatment Monitor
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPurifying ? "bg-emerald-500 animate-ping" : "bg-cyan-500"
              }`}
            ></span>{" "}
            System State: {isPurifying ? "PURIFYING_ACTIVE" : "STANDBY"}
          </span>
          {isPurifying && (
            <span className="font-mono text-emerald-400 font-bold">
              Purification: {progress}%
            </span>
          )}
        </div>
      </div>

      {/* SVG Flowing Path Connector */}
      <div className="absolute top-[138px] left-[12%] right-[12%] h-2 -translate-y-1/2 pointer-events-none hidden md:block z-0">
        <svg className="w-full h-8 overflow-visible">
          <line
            x1="0"
            y1="4"
            x2="100%"
            y2="4"
            stroke="rgba(51, 65, 85, 0.4)"
            strokeWidth="3"
          />
          <line
            x1="0"
            y1="4"
            x2="100%"
            y2="4"
            stroke={isPurifying ? "#10b981" : "#06b6d4"}
            strokeWidth="3"
            className={`${isPurifying ? "flowing-dash" : ""}`}
          />
        </svg>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        {steps.map((step) => {
          const isPast = progress >= step.id * 25;
          const isActive = isPurifying && activeStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center p-4 rounded-xl backdrop-blur-md transition-all duration-500 border ${
                isActive
                  ? "bg-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                  : isPast
                  ? "bg-slate-900/60 border-emerald-500/40"
                  : "bg-slate-900/40 border-slate-800"
              }`}
            >
              {/* Icon badge */}
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center text-lg border transition-all duration-350 mb-3 ${
                  isActive
                    ? "bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-110"
                    : isPast
                    ? "bg-emerald-950/50 border-emerald-500 text-emerald-400"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                {step.icon}
              </div>

              {/* Step Title */}
              <div
                className={`text-[10px] font-bold uppercase tracking-widest mb-1 font-orbitron ${
                  isActive
                    ? "text-cyan-400"
                    : isPast
                    ? "text-emerald-400"
                    : "text-slate-500"
                }`}
              >
                Step {step.id}: {step.name}
              </div>

              {/* Description */}
              <div className="text-[11px] text-slate-300 leading-snug font-sans px-1 font-medium mb-2 min-h-[34px] flex items-center justify-center">
                {step.desc}
              </div>

              {/* Detail */}
              <div className="text-[9px] text-slate-500 font-mono italic leading-tight border-t border-slate-800/80 pt-2 w-full min-h-[30px] flex items-center justify-center">
                {step.detail}
              </div>

              {/* Efficiency Tag */}
              <div className="mt-3.5 bg-slate-950/60 border border-slate-800 py-1 px-2.5 rounded-full text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                <span>Efficiency:</span>
                <span className="font-bold text-emerald-400">{step.eff}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar (Visible during simulation) */}
      {isPurifying && (
        <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-2 animate-fade-in">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-cyan-400 uppercase tracking-widest font-bold">
              Purification Cycle Progression
            </span>
            <span className="text-emerald-400 font-bold">
              {progress}% Completed
            </span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-indigo-500 h-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Simulation Tactical Logs Ticker */}
      <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 font-mono text-[10px] text-cyan-400 h-28 overflow-y-auto flex flex-col gap-1 scrollbar">
        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-900 pb-1 mb-1.5 flex justify-between items-center">
          <span>📋 System Decontamination Tactical Log</span>
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        </span>
        {logs &&
          [...logs].reverse().map((log, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-slate-600 shrink-0">[{log.time}]</span>
              <span
                className={
                  log.type === "warn"
                    ? "text-amber-400 font-bold"
                    : log.type === "success"
                    ? "text-emerald-400 font-bold animate-pulse"
                    : "text-slate-300"
                }
              >
                {log.message}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default SmartDetoxificationSystem;
