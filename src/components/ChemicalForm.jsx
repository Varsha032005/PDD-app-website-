import React, { useState } from "react";
import { dbSet } from "../firebase";
import { PlusCircle, X, ShieldAlert, Award } from "lucide-react";

const ChemicalForm = ({ onSelectChemical, onClose }) => {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [category, setCategory] = useState("Acids");
  const [toxicity, setToxicity] = useState(50);
  const [corrosive, setCorrosive] = useState(5);
  const [flammability, setFlammability] = useState(0);
  const [nfpaHealth, setNfpaHealth] = useState(2);
  const [nfpaFlammability, setNfpaFlammability] = useState(0);
  const [nfpaInstability, setNfpaInstability] = useState(0);
  const [nfpaSpecial, setNfpaSpecial] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const categories = [
    "Acids",
    "Bases",
    "Bleaching Chemicals",
    "Solvents",
    "Heavy Metals",
    "Harmful Gases",
    "Dyeing Industry Auxiliaries",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!key.trim() || !name.trim() || !formula.trim()) {
      setError("Please fill in Key, Name, and Formula.");
      return;
    }

    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!cleanKey) {
      setError("Invalid key format.");
      return;
    }

    const isDanger = toxicity >= 80;
    const isAlert = toxicity >= 40 && toxicity < 80;
    const safetyStatus = isDanger ? "Danger" : isAlert ? "Alert" : "Safe";

    const maxTreatmentEfficiency = isDanger ? (94 + (toxicity % 5)) : 99.2;

    // Build standard high-fidelity data profile automatically
    const newChemical = {
      name: name.trim(),
      formula: formula.trim(),
      category: category,
      toxicity: parseInt(toxicity),
      corrosive: parseInt(corrosive),
      flammability: parseInt(flammability),
      nfpa: {
        health: parseInt(nfpaHealth),
        flammability: parseInt(nfpaFlammability),
        instability: parseInt(nfpaInstability),
        special: nfpaSpecial.trim().toUpperCase(),
      },
      hazardCategory: `${category} Threat Compound`,
      waterPollution: `Modifies aquatic pH/salinity, presents significant biological oxygen demand. Highly persistent under low dilution streams.`,
      airPollution: `${category} vapor and particulate dispersion hazard. Dangerous to inhale under thermal agitation.`,
      humanHealthRisk: `Causes localized eye and skin chemical burns. Vapor inhalation damages deep respiratory pathways.`,
      environmentalRisk: `Low bioaccumulation, but causes initial acute ecotoxicity to freshwater micro-fauna and riparian systems.`,
      ppe: [
        "Safety Glasses with Side Shields",
        "Nitrile Chemical Safety Work Gloves",
        "Industrial protective lab apron",
        "Fume extraction hood ventilation"
      ],
      safeHandling: `Store in cool, dry, well-ventilated chemical safety cabinets. Seal caps tightly to prevent hydration. Keep away from active ignition sources.`,
      detox: {
        neutralization: {
          method: "Standard buffering or stoichiometric adjustment.",
          reaction: category === "Acids" ? "Acid + Na₂CO₃ → Salt + H₂O + CO₂" : category === "Bases" ? "Base + CH₃COOH → Salt + H₂O" : "Physical buffering active",
          monitoring: "pH sensors.",
          recomm: category === "Acids" ? "Sodium Carbonate" : category === "Bases" ? "Acetic Acid" : "Sodium Bicarbonate buffer",
          efficiency: 92
        },
        absorption: {
          method: "Granular active carbon adsorption.",
          technique: "Static filters.",
          efficiency: 95
        },
        oxidation: {
          method: "UV-enhanced oxidation.",
          agents: "Hydrogen Peroxide (H₂O₂).",
          monitoring: "COD/TOC online meters.",
          efficiency: 90
        },
        discharge: {
          compliance: "Compliance cleared. TDS < 1000 mg/L, pH 6.5 - 8.5.",
          quality: "Safe effluent water.",
          recomm: "Final sand filter bed polishing.",
          efficiency: maxTreatmentEfficiency
        }
      },
      recommendations: {
        detoxProcess: `Controlled Batch ${category === 'Acids' ? 'Neutralization' : category === 'Bases' ? 'Buffering' : 'Oxidation'} & Adsorption`,
        filtration: "Dual-Media Sand & Carbon Filtration",
        purification: "Standard membrane filtration Polish",
        wasteMgmt: "Standard municipal industrial wastewater discharge",
        safetyStatus: safetyStatus
      }
    };

    dbSet(`chemical_database/${cleanKey}`, newChemical)
      .then(() => {
        setSuccess(true);
        setError("");
        onSelectChemical(cleanKey);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      })
      .catch((err) => {
        setError(`Failed to save chemical: ${err.message}`);
      });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono no-print">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col scrollbar animate-scale-in">
        
        {/* Header */}
        <div className="bg-slate-950 border-b border-cyan-500/20 py-4 px-6 flex justify-between items-center text-sm text-cyan-400 font-bold uppercase tracking-wider font-orbitron">
          <span className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 animate-pulse" />
            Integrate New Chemical Threat Profile
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-cyan-400 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 flex-1">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-emerald-400 gap-3">
              <Award className="h-16 w-16 animate-bounce" />
              <h3 className="text-lg font-bold font-orbitron">CHEMICAL PROFILE REGISTERED</h3>
              <p className="text-xs text-slate-400">
                The chemical telemetry has been written to the database. Broadening sensor arrays...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="text-xs text-rose-400 font-bold bg-rose-950/30 p-3 rounded border border-rose-500/30 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider font-orbitron">Database Entry ID Key</label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="e.g. lead_nitrate"
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                    required
                  />
                  <span className="text-[9px] text-slate-500">Lowercase, no spaces, letters and underscores only.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider font-orbitron">Compound Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lead Nitrate"
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider font-orbitron">Chemical Formula</label>
                  <input
                    type="text"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="e.g. Pb(NO₃)₂"
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider font-orbitron">Compound Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slider Metrics */}
              <div className="flex flex-col gap-4 border-y border-slate-800 py-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase font-orbitron">
                    <span className="text-rose-400">Toxicity Index Rating</span>
                    <span className="text-rose-400">{toxicity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={toxicity}
                    onChange={(e) => setToxicity(e.target.value)}
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase font-orbitron">
                      <span className="text-cyan-400">Corrosion Level</span>
                      <span className="text-cyan-400">{corrosive}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={corrosive}
                      onChange={(e) => setCorrosive(e.target.value)}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase font-orbitron">
                      <span className="text-amber-400">Flammability Rating</span>
                      <span className="text-amber-400">{flammability}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={flammability}
                      onChange={(e) => setFlammability(e.target.value)}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* NFPA 704 Section */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-orbitron border-b border-slate-800 pb-1">
                  NFPA 704 Hazard System Coordinates
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-blue-400 uppercase">Health (0-4)</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={nfpaHealth}
                      onChange={(e) => setNfpaHealth(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-red-400 uppercase">Fire (0-4)</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={nfpaFlammability}
                      onChange={(e) => setNfpaFlammability(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-amber-500 uppercase">Instability (0-4)</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={nfpaInstability}
                      onChange={(e) => setNfpaInstability(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-300 uppercase">Special Code</label>
                    <input
                      type="text"
                      placeholder="OX, W, etc."
                      value={nfpaSpecial}
                      onChange={(e) => setNfpaSpecial(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 mt-4 border-t border-slate-800 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-2.5 px-4 rounded-lg text-xs hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all cursor-pointer font-orbitron uppercase tracking-wider"
                >
                  Save to Real-Time Database
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 py-2.5 px-4 rounded-lg text-xs transition-all cursor-pointer font-orbitron uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChemicalForm;
