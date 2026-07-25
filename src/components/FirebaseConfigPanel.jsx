import React, { useState } from "react";
import { isConfigured, saveConfigToLocal, clearConfigFromLocal } from "../firebase";
import { Database, ShieldCheck, ShieldAlert, Key, Settings, Trash2, CheckCircle2 } from "lucide-react";

const FirebaseConfigPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const configured = isConfigured();

  const handleSave = (e) => {
    e.preventDefault();
    try {
      // Try to parse the input as JSON
      let parsed = null;
      try {
        parsed = JSON.parse(jsonInput);
      } catch (err) {
        // Try evaluating as a JS object if JSON parsing failed (in case it is copied directly as a JS object)
        // Sanitizing a bit
        const sanitized = jsonInput
          .replace(/const\s+\w+\s*=\s*/, "")
          .replace(/let\s+\w+\s*=\s*/, "")
          .replace(/var\s+\w+\s*=\s*/, "")
          .replace(/;\s*$/, "");
        
        // Use a safe Function construct to evaluate the object
        const evaluator = new Function(`return ${sanitized};`);
        parsed = evaluator();
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid object format. Must be a key-value configuration.");
      }

      const requiredKeys = ["databaseURL"];
      const hasDatabaseUrl = parsed.databaseURL || parsed.databaseurl;
      if (!hasDatabaseUrl) {
        throw new Error("Missing 'databaseURL' in configuration. Realtime Database requires a databaseURL.");
      }

      // Standardize casing
      const finalConfig = {
        apiKey: parsed.apiKey || parsed.apikey || "",
        authDomain: parsed.authDomain || parsed.authdomain || "",
        databaseURL: parsed.databaseURL || parsed.databaseurl || "",
        projectId: parsed.projectId || parsed.projectid || "",
        storageBucket: parsed.storageBucket || parsed.storagebucket || "",
        messagingSenderId: parsed.messagingSenderId || parsed.messagingsenderid || "",
        appId: parsed.appId || parsed.appid || "",
      };

      saveConfigToLocal(finalConfig);
      setError("");
      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Failed to parse configuration. Check formatting.");
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 font-mono no-print">
      {/* Configuration Status Indicator Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border-2 text-xs font-bold font-orbitron uppercase tracking-wider cursor-pointer shadow-lg transition-all duration-300 ${
          configured
            ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            : "bg-amber-950/80 border-amber-500 text-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
        }`}
      >
        {configured ? (
          <>
            <ShieldCheck className="h-4.5 w-4.5 animate-pulse" />
            <span>Firebase Connected</span>
          </>
        ) : (
          <>
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>Setup Real-Time Database</span>
          </>
        )}
      </button>

      {/* Floating settings panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-[340px] md:w-[400px] rounded-xl flex flex-col bg-slate-950 border-2 border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.4)] overflow-hidden transition-all duration-300">
          <div className="bg-slate-900 border-b border-cyan-500/30 py-3 px-4 flex justify-between items-center text-xs text-cyan-400 font-bold uppercase tracking-wider font-orbitron">
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4 animate-spin-slow" />
              Database Config Center
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-cyan-400 hover:text-cyan-300 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              {configured ? (
                <div className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    STATUS: ACTIVE REAL-TIME CONNECTION
                  </div>
                  <p>
                    All dashboard actions are synced live to the Firebase Realtime Database. Open this app in another window or device to see instant sync!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Database className="h-4 w-4" />
                    STATUS: LOCAL STANDBY MODE
                  </div>
                  <p>
                    Running on browser in-memory simulation. To activate multi-client live syncing, paste your Firebase config below.
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                <Key className="h-3.5 w-3.5" /> Paste Firebase Config Object:
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`{\n  apiKey: "...",\n  authDomain: "...",\n  databaseURL: "https://your-app-default-rtdb.firebaseio.com",\n  projectId: "...",\n  // ...\n}`}
                rows={7}
                className="w-full bg-slate-900/90 border border-cyan-500/30 rounded p-2.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono resize-none leading-relaxed"
                required
              />

              {error && (
                <div className="text-[10px] text-rose-400 font-bold bg-rose-950/40 p-2 rounded border border-rose-500/30">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-2.5 mt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded text-xs hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer font-orbitron"
                >
                  SAVE & INITIALIZE
                </button>

                {configured && (
                  <button
                    type="button"
                    onClick={clearConfigFromLocal}
                    className="bg-slate-900 border border-rose-500/50 hover:bg-rose-950/40 text-rose-400 p-2 rounded hover:text-rose-300 transition-all cursor-pointer"
                    title="Disconnect and reset to Local Fallback"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseConfigPanel;
