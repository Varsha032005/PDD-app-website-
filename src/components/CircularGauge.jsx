import React from "react";

const CircularGauge = ({ val, max, label, color, icon }) => {
  const pct = (val / max) * 100;
  const radius = 38;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (pct / 100) * circum;

  return (
    <div className="flex flex-col items-center bg-slate-900/40 border border-slate-800 p-4 rounded-lg flex-1">
      <div className="relative h-24 w-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Track circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="6"
          />
          {/* Value circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circum}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="text-xl font-bold font-orbitron"
            style={{ color: color }}
          >
            {val}
            {max === 100 ? "%" : ""}
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {icon}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-semibold tracking-wider mt-3 font-orbitron uppercase text-center">
        {label}
      </span>
    </div>
  );
};

export default CircularGauge;
