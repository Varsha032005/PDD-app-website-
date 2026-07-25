import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  dbSet,
  dbUpdate,
  dbGet,
  dbOnValue,
  isConfigured,
} from "./firebase";
import { buildDefaultChemicalDatabase } from "./defaultChemicals";

// Component imports
import MolecularCanvas from "./components/MolecularCanvas";
import CircularGauge from "./components/CircularGauge";
import DynamicChart from "./components/DynamicChart";
import SmartDetoxificationSystem from "./components/SmartDetoxificationSystem";
import AIChatbot from "./components/AIChatbot";
import PDFReportExporter from "./components/PDFReportExporter";
import FirebaseConfigPanel from "./components/FirebaseConfigPanel";
import ChemicalForm from "./components/ChemicalForm";

// Icon imports
import {
  Search,
  Mic,
  MicOff,
  Database,
  AlertTriangle,
  PlusCircle,
  ArrowLeft,
  HelpCircle,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";

const App = () => {
  const [selectedKey, setSelectedKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Decontamination Simulator State
  const [isPurifying, setIsPurifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [simulatedToxicity, setSimulatedToxicity] = useState(0);
  const [simulatedSafetyVal, setSimulatedSafetyVal] = useState(0);
  const [simLogs, setSimLogs] = useState([]);
  
  // Chemical Database State
  const [chemicalDatabase, setChemicalDatabase] = useState({});

  const localIntervalRef = useRef(null);

  // 1. Load/sync chemical database from Firebase Realtime Database
  useEffect(() => {
    const defaultDb = buildDefaultChemicalDatabase();

    const unsubscribe = dbOnValue("chemical_database", (snapshot) => {
      if (snapshot.exists()) {
        setChemicalDatabase(snapshot.val());
      } else {
        // If empty, seed Firebase with default database
        console.log("Chemical database empty in Firebase. Seeding default catalog...");
        dbSet("chemical_database", defaultDb);
        setChemicalDatabase(defaultDb);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // 2. Sync active state and logs from Firebase
  useEffect(() => {
    const unsubscribeState = dbOnValue("active_state", (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setSelectedKey(val.selectedKey || "");
        setIsPurifying(val.isPurifying || false);
        setProgress(val.progress || 0);
        setActiveStep(val.activeStep || 1);
        setSimulatedToxicity(val.simulatedToxicity || 0);
        setSimulatedSafetyVal(val.simulatedSafetyVal || 0);
      }
    });

    const unsubscribeLogs = dbOnValue("sim_logs", (snapshot) => {
      if (snapshot.exists()) {
        setSimLogs(snapshot.val() || []);
      } else {
        setSimLogs([]);
      }
    });

    return () => {
      if (typeof unsubscribeState === "function") unsubscribeState();
      if (typeof unsubscribeLogs === "function") unsubscribeLogs();
    };
  }, []);

  // Map active chemical key
  const activeChemical = useMemo(() => {
    return chemicalDatabase[selectedKey] || null;
  }, [selectedKey, chemicalDatabase]);

  const getTimestamp = () => {
    const now = new Date();
    return now.toTimeString().split(" ")[0];
  };

  // Sync simulated toxicity when chemical selection changes
  const selectChemical = (key) => {
    const chem = chemicalDatabase[key];
    if (chem) {
      // Clear any running intervals
      if (localIntervalRef.current) {
        clearInterval(localIntervalRef.current);
        localIntervalRef.current = null;
      }

      const initialTox = chem.toxicity;
      const initialSafety = 95 - Math.round(chem.toxicity * 0.4);

      dbSet("active_state", {
        selectedKey: key,
        isPurifying: false,
        progress: 0,
        activeStep: 1,
        simulatedToxicity: initialTox,
        simulatedSafetyVal: initialSafety,
      });

      dbSet("sim_logs", [
        {
          time: getTimestamp(),
          message: `Telemetry locked on ${chem.name}. System in standby.`,
          type: "neutral",
        },
      ]);
    } else {
      // Back to control core
      dbSet("active_state", {
        selectedKey: "",
        isPurifying: false,
        progress: 0,
        activeStep: 1,
        simulatedToxicity: 0,
        simulatedSafetyVal: 0,
      });
      dbSet("sim_logs", []);
    }
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // AUTO-SUGGESTIONS FILTER
  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    return Object.entries(chemicalDatabase).filter(
      ([key, chem]) =>
        chem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chem.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chem.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, chemicalDatabase]);

  // VOICE SEARCH TRIGGER
  const handleVoiceSearch = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert(
        "Speech Recognition not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const phrase = event.results[0][0].transcript.toLowerCase();
      setSearchQuery(phrase);

      const matchedEntry = Object.entries(chemicalDatabase).find(
        ([key, chem]) =>
          phrase.includes(chem.name.toLowerCase()) ||
          chem.name.toLowerCase().includes(phrase) ||
          phrase.includes(chem.formula.toLowerCase().replace(/[^a-zA-Z0-9]/g, ""))
      );

      if (matchedEntry) {
        selectChemical(matchedEntry[0]);
      } else {
        alert(
          `Vocal phrase recognized: "${phrase}". No direct scientific match found in the database. Please select from suggestions.`
        );
      }
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  // Run Decontamination Cycle
  const startDecontaminationCycle = () => {
    if (!activeChemical || isPurifying) return;

    // Reset progress and log initiation
    const startLogs = [
      {
        time: getTimestamp(),
        message: `🔄 INITIATING DECONTAMINATION PROTOCOL FOR ${activeChemical.name.toUpperCase()}...`,
        type: "warn",
      },
    ];

    dbSet("sim_logs", startLogs);
    dbUpdate("active_state", {
      isPurifying: true,
      progress: 0,
      activeStep: 1,
    });

    const totalDuration = 8000; // 8 seconds
    const stepsCount = 100;
    const intervalTime = totalDuration / stepsCount;

    const efficiencyPct = activeChemical.detox.discharge.efficiency / 100;
    const targetToxicity = Math.round(activeChemical.toxicity * (1 - efficiencyPct));
    const targetSafety = Math.round(
      95 - activeChemical.toxicity * 0.2 + efficiencyPct * 20
    );

    let localProgress = 0;
    let localActiveStep = 1;
    let currentLogs = [...startLogs];

    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
    }

    localIntervalRef.current = setInterval(() => {
      localProgress += 1;

      let logMessage = null;
      let logType = "neutral";

      if (localProgress === 1) {
        localActiveStep = 1;
        logMessage = `[STAGE 1] Neutralization active. Dosing balancing agent: ${activeChemical.detox.neutralization.recomm}.`;
      } else if (localProgress === 26) {
        localActiveStep = 2;
        logMessage = `[STAGE 2] Absorption active. Granular active carbon beds loaded.`;
      } else if (localProgress === 51) {
        localActiveStep = 3;
        logMessage = `[STAGE 3] Advanced Oxidation Process triggered. Initiating radical generation.`;
      } else if (localProgress === 76) {
        localActiveStep = 4;
        logMessage = `[STAGE 4] Discharge checks loading. Calibrating water-quality sensors.`;
      }

      if (logMessage) {
        currentLogs = [
          ...currentLogs,
          { time: getTimestamp(), message: logMessage, type: logType },
        ];
        dbSet("sim_logs", currentLogs);
      }

      // Animate dynamic indices downward/upward on-the-fly to realistic post-treatment residuals
      const tFraction = localProgress / 100;
      const calculatedTox = Math.round(
        activeChemical.toxicity -
          tFraction * (activeChemical.toxicity - targetToxicity)
      );
      const calculatedSafety = Math.round(
        95 -
          Math.round(activeChemical.toxicity * 0.4) +
          tFraction * (targetSafety - (95 - Math.round(activeChemical.toxicity * 0.4)))
      );

      dbUpdate("active_state", {
        progress: localProgress,
        activeStep: localActiveStep,
        simulatedToxicity: calculatedTox,
        simulatedSafetyVal: calculatedSafety,
      });

      if (localProgress >= 100) {
        clearInterval(localIntervalRef.current);
        localIntervalRef.current = null;

        const finalLogs = [
          ...currentLogs,
          {
            time: getTimestamp(),
            message: `✅ DETOXIFICATION SUCCESSFUL: ${activeChemical.name} effluent fully processed. Settle-residual toxicity locked at ${targetToxicity}% (Standard compliance met).`,
            type: "success",
          },
        ];

        dbSet("sim_logs", finalLogs);
        dbUpdate("active_state", {
          isPurifying: false,
        });
      }
    }, intervalTime);
  };

  // Clean interval on unmount
  useEffect(() => {
    return () => {
      if (localIntervalRef.current) {
        clearInterval(localIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full relative min-h-screen flex flex-col items-center py-6 px-4 md:px-8 z-10 selection:bg-cyan-500 selection:text-slate-900">
      <MolecularCanvas />
      <FirebaseConfigPanel />

      <div className="ripple-bg"></div>

      {/* TOP EMERGENCY FLASHER */}
      {activeChemical?.recommendations?.safetyStatus === "Danger" &&
        simulatedToxicity > 15 && (
          <div className="w-full max-w-7xl mb-4 py-2.5 px-4 bg-rose-950/80 border-y-2 border-rose-500 rounded-lg flex items-center justify-between text-xs text-rose-300 font-bold uppercase tracking-widest pulse-glow-red animate-pulse no-print">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 animate-bounce" />
              CRITICAL ENVIRONMENTAL DANGER ALERT
            </span>
            <span>
              {activeChemical.name.toUpperCase()} (ACTIVE TOXICITY {simulatedToxicity}%)
              IS UNTREATED
            </span>
            <span className="hidden md:inline">
              EVACUATE SPILLS / WEAR PRESSURE APPARATUS
            </span>
          </div>
        )}

      {/* TITLE BLOCK */}
      <div className="w-full max-w-7xl flex flex-col items-center text-center mt-6 mb-8 no-print">
        <h1 className="text-2xl md:text-5xl font-extrabold font-orbitron tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)] neon-text-cyan">
          SMART CHEMICAL DETOXIFICATION ANALYZER
        </h1>
        <p className="text-xs md:text-sm font-semibold tracking-widest text-slate-400 uppercase mt-2 font-orbitron">
          AI-Powered Industrial Chemical Safety & Environmental Monitoring Platform
        </p>
      </div>

      {/* SEARCH SYSTEM BAR */}
      <div className="w-full max-w-2xl relative mb-8 no-print flex gap-2">
        <div
          className={`flex-1 flex items-center bg-slate-900/80 border-2 rounded-xl py-3 px-5 shadow-2xl backdrop-blur-xl group transition-all duration-350 ${
            isListening
              ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              : "border-cyan-500/50 hover:border-cyan-400 focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.35)]"
          }`}
        >
          <Search className="text-cyan-400 mr-3 h-4 w-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={
              isListening
                ? "Listening with AI Neural Engine..."
                : "Search Chemical Name (e.g. Sulfuric, Lead, Chloroform)..."
            }
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {/* Voice Button */}
          <button
            onClick={handleVoiceSearch}
            className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isListening
                ? "bg-emerald-600 text-white animate-ping"
                : "bg-slate-800 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300"
            }`}
            title="Speech Synthesis Search"
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-cyan-950/80 border-2 border-cyan-500/50 hover:border-cyan-400 text-cyan-400 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95 transition-all text-xs font-orbitron uppercase tracking-wider cursor-pointer"
          title="Add New Chemical to Real-time Database"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span className="hidden md:inline">Add Chemical</span>
        </button>

        {/* AUTO-SUGGESTION SYSTEM */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-[108%] left-0 right-0 max-h-60 overflow-y-auto glass-card rounded-xl shadow-2xl border border-cyan-500/40 z-50 p-2 flex flex-col gap-1 scrollbar">
            {suggestions.map(([key, chem]) => (
              <button
                key={key}
                onClick={() => selectChemical(key)}
                className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex justify-between items-center bg-slate-950/40 hover:bg-cyan-950 hover:text-cyan-400 hover:border-l-4 hover:border-cyan-400 transition-all cursor-pointer"
              >
                <span className="font-orbitron">{chem.name}</span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {chem.formula} - {chem.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FEATURED CHEMICAL SELECTORS ON LOAD */}
      {!activeChemical && (
        <div className="w-full max-w-6xl flex flex-col items-center mt-4 no-print animate-fade-in">
          <span className="text-xs font-bold font-orbitron tracking-wider text-cyan-500 uppercase mb-4 flex items-center gap-1.5">
            <Database className="h-4 w-4" /> Quick Diagnostic Telemetry Targets (
            {Object.keys(chemicalDatabase).length} Chemicals in Database)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full">
            {Object.entries(chemicalDatabase)
              .slice(0, 10)
              .map(([key, chem]) => (
                <button
                  key={key}
                  onClick={() => selectChemical(key)}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-cyan-950/30 hover:border-cyan-500/40 text-center backdrop-blur-md cursor-pointer transition-all duration-300 group hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col justify-center h-28"
                >
                  <span className="text-xs font-bold text-slate-300 font-orbitron group-hover:text-cyan-400 transition-colors uppercase leading-tight">
                    {chem.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1.5">
                    {chem.formula}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest mt-2.5 ${
                      chem.recommendations?.safetyStatus === "Danger"
                        ? "text-rose-500"
                        : chem.recommendations?.safetyStatus === "Alert"
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {chem.recommendations?.safetyStatus}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* INDUSTRIAL DIAGNOSTIC DASHBOARD CONTROL STATION */}
      {activeChemical && (
        <div className="w-full max-w-7xl flex flex-col gap-6 animate-fade-in relative">
          {/* ACTION CONTROL ROW */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => selectChemical("")}
                className="bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 font-bold px-4 py-2.5 text-xs rounded-lg uppercase font-orbitron transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Control Core
              </button>
              <button
                onClick={startDecontaminationCycle}
                disabled={isPurifying}
                className={`font-bold px-5 py-2.5 text-xs rounded-lg uppercase font-orbitron transition-all cursor-pointer shadow-lg flex items-center gap-1.5 ${
                  isPurifying
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/20 active:scale-95"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Run Decontamination Cycle
              </button>
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isPurifying ? "bg-emerald-500 animate-ping" : "bg-cyan-400"
                }`}
              ></div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                System Active - Telemetry Locked
              </span>
            </div>
            <PDFReportExporter activeChemical={activeChemical} />
          </div>

          {/* MAIN GRID CONTROL BLOCKS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CARD 1: CHEMICAL IDENTITY CARD */}
            <div className="glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 font-orbitron border-b border-slate-800 pb-2">
                01 / Chemical Profile
              </h3>

              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div>
                  <span className="text-xs text-slate-500 font-semibold tracking-wider font-orbitron uppercase">
                    Compound Name
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-300 font-orbitron leading-tight">
                    {activeChemical.name}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold tracking-wider font-orbitron uppercase">
                      Formula
                    </span>
                    <div className="text-lg font-mono text-cyan-400 font-bold">
                      {activeChemical.formula}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold tracking-wider font-orbitron uppercase">
                      Classification
                    </span>
                    <div className="text-sm font-bold text-slate-300 uppercase tracking-wide font-orbitron mt-0.5">
                      {activeChemical.category}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-xs text-slate-500 font-semibold tracking-wider font-orbitron uppercase">
                    Category Threat Matrix
                  </span>
                  <div className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 mt-1">
                    {activeChemical.hazardCategory}
                  </div>
                </div>
              </div>

              {/* NFPA 704 DIAMOND SVG */}
              <div className="mt-6 flex flex-col items-center border-t border-slate-800 pt-4">
                <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase font-orbitron mb-3">
                  NFPA 704 Hazard Identification
                </span>
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  >
                    {/* Flammability (Red - Top) */}
                    <polygon
                      points="50,10 78,38 50,66 22,38"
                      fill="rgba(239, 68, 68, 0.25)"
                      stroke="#ef4444"
                      strokeWidth="1"
                      transform="translate(0, -18)"
                    />
                    <text
                      x="50"
                      y="32"
                      fill="#ef4444"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="Orbitron"
                    >
                      {activeChemical.nfpa?.flammability}
                    </text>

                    {/* Health (Blue - Left) */}
                    <polygon
                      points="50,10 78,38 50,66 22,38"
                      fill="rgba(59, 130, 246, 0.25)"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      transform="translate(-18, 0)"
                    />
                    <text
                      x="32"
                      y="50"
                      fill="#3b82f6"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="Orbitron"
                    >
                      {activeChemical.nfpa?.health}
                    </text>

                    {/* Instability (Yellow - Right) */}
                    <polygon
                      points="50,10 78,38 50,66 22,38"
                      fill="rgba(245, 158, 11, 0.25)"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      transform="translate(18, 0)"
                    />
                    <text
                      x="68"
                      y="50"
                      fill="#f59e0b"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="Orbitron"
                    >
                      {activeChemical.nfpa?.instability}
                    </text>

                    {/* Special (White - Bottom) */}
                    <polygon
                      points="50,10 78,38 50,66 22,38"
                      fill="rgba(255, 255, 255, 0.1)"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      transform="translate(0, 18)"
                    />
                    <text
                      x="50"
                      y="68"
                      fill="#cbd5e1"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Orbitron"
                    >
                      {activeChemical.nfpa?.special || "N/A"}
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* CARD 2: DYNAMIC GAUGES AND METRICS */}
            <div className="glass-card rounded-2xl p-6 flex flex-col group hover:border-cyan-500/30 transition-all duration-300">
              <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 font-orbitron border-b border-slate-800 pb-2">
                02 / Dynamic Gauges
              </h3>

              <div className="flex flex-col gap-6 flex-1 justify-center">
                <div className="flex justify-between gap-4">
                  <CircularGauge
                    val={simulatedToxicity}
                    max={100}
                    label="Toxicity Index"
                    color={
                      simulatedToxicity >= 80
                        ? "#f43f5e"
                        : simulatedToxicity >= 40
                        ? "#f59e0b"
                        : "#10b981"
                    }
                    icon="💀"
                  />
                  <CircularGauge
                    val={Math.max(0, 100 - simulatedToxicity)}
                    max={100}
                    label="Water Quality"
                    color="#06b6d4"
                    icon="💧"
                  />
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-orbitron">
                      Net Safety Yield
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {simulatedSafetyVal}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                      style={{ width: `${simulatedSafetyVal}%` }}
                    ></div>
                  </div>
                </div>

                {/* POLLUTION METRIC BARS */}
                <div className="flex flex-col gap-3 mt-2">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1 uppercase font-orbitron">
                      <span>Corrosion Rate</span>
                      <span className="font-mono text-cyan-400">
                        {activeChemical.corrosive}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/70 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full"
                        style={{ width: `${activeChemical.corrosive * 10}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1 uppercase font-orbitron">
                      <span>Flammability index</span>
                      <span className="font-mono text-amber-500">
                        {activeChemical.flammability}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/70 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${activeChemical.flammability * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: POLLUTION IMPACT ANALYSIS */}
            <div className="glass-card rounded-2xl p-6 flex flex-col group hover:border-cyan-500/30 transition-all duration-300">
              <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 font-orbitron border-b border-slate-800 pb-2">
                03 / Environmental Footprint
              </h3>

              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">🐟</span>
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-orbitron">
                      Water Pollution footprint
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeChemical.waterPollution}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">💨</span>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-orbitron">
                      Air Pollution footprint
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeChemical.airPollution}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">🧬</span>
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-orbitron">
                      Human Health Risk matrix
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeChemical.humanHealthRisk}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PIPELINE & ANALYTICS DOUBLE ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PIPELINE VISUAL CONTAINER */}
            <div className="lg:col-span-2 flex flex-col">
              <SmartDetoxificationSystem
                activeChemical={activeChemical}
                isPurifying={isPurifying}
                progress={progress}
                activeStep={activeStep}
                logs={simLogs}
              />
            </div>

            {/* CHART VISUAL CONTAINER */}
            <div className="glass-card rounded-2xl p-6 flex flex-col group hover:border-cyan-500/30 transition-all duration-300 justify-center">
              <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase font-orbitron">
                  04 / Toxicity Reduction
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                  AOP Active Feed
                </span>
              </div>
              <DynamicChart
                activeChemical={activeChemical}
                currentTox={simulatedToxicity}
              />
            </div>
          </div>

          {/* CARD 5: PPE & EMERGENCY SPILL HANDLING DETAILS */}
          <div className="glass-card rounded-2xl p-6 border-slate-700/50 hover:border-rose-500/30 transition-all duration-300 mb-8">
            <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 font-orbitron border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>05 / Chemical Safety & Incident Mitigation</span>
              <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded text-cyan-400 font-mono tracking-widest uppercase">
                OSHA Standard Sheet
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PPE list */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-orbitron mb-2 flex items-center gap-1.5">
                  🥽 Required safety gear
                </span>
                {activeChemical.ppe?.map((item, index) => (
                  <div
                    key={index}
                    className="text-xs text-slate-300 leading-relaxed font-sans flex items-start gap-2"
                  >
                    <span className="text-cyan-500/70 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Safe Handling */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 md:col-span-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-orbitron mb-2 flex items-center gap-1.5">
                  🛡️ Safe Handling Procedures
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
                  {activeChemical.safeHandling}
                </p>
                
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-orbitron mb-2 flex items-center gap-1.5">
                  🧪 Tactical Purifying Process Recommendation
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                  <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block font-orbitron">Detox Treatment:</span>
                    {activeChemical.recommendations?.detoxProcess}
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block font-orbitron">Primary Filtration:</span>
                    {activeChemical.recommendations?.filtration}
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block font-orbitron">Purification Polish:</span>
                    {activeChemical.recommendations?.purification}
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block font-orbitron">Waste Management:</span>
                    {activeChemical.recommendations?.wasteMgmt}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AIChatbot Chat Screen */}
      <AIChatbot activeChemical={activeChemical} />

      {/* Add New Chemical modal form */}
      {showAddForm && (
        <ChemicalForm
          onSelectChemical={(key) => selectChemical(key)}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

export default App;
