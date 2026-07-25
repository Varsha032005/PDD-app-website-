import React from "react";
import Chart from "react-apexcharts";

const DynamicChart = ({ activeChemical, currentTox }) => {
  const baseTox = activeChemical ? activeChemical.toxicity : 75;
  const scale = baseTox > 0 ? currentTox / baseTox : 0;
  const untreated = Math.round(baseTox);
  const neutralized = Math.max(10, Math.round(baseTox * 0.72 * scale));
  const absorbed = Math.max(8, Math.round(baseTox * 0.35 * scale));
  const oxidized = Math.max(2, Math.round(baseTox * 0.12 * scale));
  const discharged = Math.max(0.1, Math.round(currentTox * 10) / 10);

  const series = [
    {
      name: "Contaminant Load (%)",
      data: [untreated, neutralized, absorbed, oxidized, discharged],
    },
  ];

  const options = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
      foreColor: "#94a3b8",
      fontFamily: "Inter, sans-serif",
      dropShadow: {
        enabled: true,
        top: 3,
        left: 2,
        blur: 4,
        opacity: 0.25,
        color: "#06b6d4",
      },
    },
    colors: [
      activeChemical?.recommendations?.safetyStatus === "Danger"
        ? "#f43f5e"
        : "#06b6d4",
    ],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 5,
      colors: ["#0f172a"],
      strokeColors: [
        activeChemical?.recommendations?.safetyStatus === "Danger"
          ? "#f43f5e"
          : "#06b6d4",
      ],
      strokeWidth: 2,
      hover: { size: 7 },
    },
    grid: {
      borderColor: "#1e293b",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: [
        "Raw Effluent",
        "Neutralized",
        "Absorbed",
        "Oxidized",
        "Discharged",
      ],
      labels: { style: { fontSize: "10px", fontWeight: "bold" } },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { formatter: (val) => val + "%" },
    },
    tooltip: {
      theme: "dark",
      style: { fontSize: "12px" },
    },
  };

  return (
    <div className="w-full h-[220px]">
      <Chart options={options} series={series} type="area" height="100%" />
    </div>
  );
};

export default DynamicChart;
