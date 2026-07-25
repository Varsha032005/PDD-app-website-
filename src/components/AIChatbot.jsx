import React, { useState, useEffect, useRef } from "react";
import { dbPush, dbOnValue, isConfigured } from "../firebase";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";

const AIChatbot = ({ activeChemical }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const terminalEndRef = useRef(null);

  // Subscribe to real-time chat logs
  useEffect(() => {
    const unsubscribe = dbOnValue("chat_logs", (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert object of messages to sorted array
        const list = Object.entries(data).map(([id, msg]) => ({
          id,
          ...msg,
        }));
        // Sort by timestamp if available, else key order is fine
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(list);
      } else {
        // Seed default message if empty
        setMessages([
          {
            id: "default",
            sender: "AI",
            text: "Smart Environmental AI core activated. Awaiting telemetry inquiry...",
            timestamp: Date.now(),
          },
        ]);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userText = query;
    const timestamp = Date.now();

    // Reset input immediately
    setQuery("");

    // Push User message to database
    dbPush("chat_logs", {
      sender: "User",
      text: userText,
      timestamp,
    }).then(() => {
      // Trigger AI Response on the sender's client
      setIsTyping(true);
      setTimeout(() => {
        let responseText = "";
        const lowerText = userText.toLowerCase();

        if (
          lowerText.includes("acid") ||
          lowerText.includes("ph") ||
          lowerText.includes("neutraliz")
        ) {
          responseText =
            "Neutralization protocol: Heavy inorganic acids require controlled dosing of Soda Ash (Na2CO3) or Slaked Lime (Ca(OH)2). Standard dosage formulas target a 1.1:1 stoichiometric alkaline ratio to prevent thermal runaways and buffer the final pH between 7.2 and 7.8.";
        } else if (
          lowerText.includes("heavy metal") ||
          lowerText.includes("mercury") ||
          lowerText.includes("lead") ||
          lowerText.includes("arsenic") ||
          lowerText.includes("copper") ||
          lowerText.includes("chromium")
        ) {
          responseText =
            "Heavy metal immobilization protocol: Standard biological degradation is ineffective. Must execute precipitation via sulfide salts (forms insoluble sulfides) or co-precipitation with Ferric Chloride. Run effluent through thiol-functionalized chelating ion exchange resins.";
        } else if (
          lowerText.includes("scrub") ||
          lowerText.includes("absorption") ||
          lowerText.includes("carbon")
        ) {
          responseText =
            "Absorption protocol: Active vapors are pulled via vacuum into counter-current scrubbing towers. Liquid sprays must consist of specialized chemical wash (dilute sodium hydroxide for chlorine, sodium bisulfite for sulfur dioxide) combined with active dry charcoal beds.";
        } else if (
          lowerText.includes("oxidation") ||
          lowerText.includes("peroxide") ||
          lowerText.includes("ozone")
        ) {
          responseText =
            "Advanced Oxidation Process (AOP): Necessary for organic dyes and aromatic solvents (e.g. Benzene). Utilizes Fenton's Reagent (H2O2 + Fe2+) or Ozone/UV to generate reactive hydroxyl radicals (.OH) which aggressively shatter toxic carbon rings to CO2 and H2O.";
        } else if (activeChemical) {
          responseText = `Telemetry analysis for ${activeChemical.name} (${
            activeChemical.formula
          }): This compound is classified as an industrial ${
            activeChemical.category
          }. Spill hazard mitigation requires immediate personal protective equipment (${
            activeChemical.ppe[0]
          }) alongside ${
            activeChemical.recommendations.detoxProcess
          }. Compliance discharge target: ${activeChemical.detox.discharge.compliance}.`;
        } else {
          responseText =
            "Awaiting specific chemical telemetry. Search for a chemical on the main terminal dashboard or speak its name using the Voice Search icon to fetch high-fidelity hazard analysis.";
        }

        // Push AI message to database
        dbPush("chat_logs", {
          sender: "AI",
          text: responseText,
          timestamp: Date.now(),
        }).then(() => {
          setIsTyping(false);
        });
      }, 1200);
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono no-print">
      {/* Collapsed Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full flex items-center justify-center bg-cyan-950 border-2 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] cursor-pointer animate-bounce hover:scale-115 active:scale-95 transition-all duration-300"
          title="Open AI Scientific Core"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Active Terminal Modal */}
      {open && (
        <div className="h-[420px] w-[350px] md:w-[400px] rounded-xl flex flex-col bg-slate-950 border-2 border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.4)] overflow-hidden transition-all duration-350 animate-scale-in">
          {/* Terminal Header */}
          <div className="bg-slate-900 border-b border-cyan-500/30 py-2.5 px-4 flex justify-between items-center text-xs text-cyan-400 font-bold uppercase tracking-wider font-orbitron">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>{" "}
              AI Scientific Core v2.2
            </span>
            <button
              onClick={() => setOpen(false)}
              className="h-6 w-6 flex items-center justify-center border border-cyan-500/40 rounded hover:bg-cyan-900 active:scale-90 text-cyan-400 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Terminal Body Screen */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-950 text-xs text-cyan-300/90 leading-relaxed flex flex-col gap-3 scrollbar">
            {messages.map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded-lg flex flex-col gap-1 ${
                  log.sender === "AI"
                    ? "bg-slate-900/60 border-l-2 border-cyan-500 text-cyan-300 max-w-[85%] self-start"
                    : "bg-slate-900/20 border-l-2 border-indigo-500 text-indigo-300 max-w-[85%] self-end text-right items-end"
                }`}
              >
                <div className="font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 text-slate-500">
                  {log.sender === "AI" ? (
                    <>
                      <Bot className="h-3 w-3 text-cyan-400" />
                      <span>ANALYZER_CORE</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 text-indigo-400" />
                      <span>USER_TELEMETRY</span>
                    </>
                  )}
                </div>
                <div className="whitespace-pre-line text-left">{log.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="text-cyan-500 italic text-[10px] animate-pulse flex items-center gap-1.5 self-start">
                <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
                AI is compiling neural pathways...
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Input */}
          <form
            onSubmit={handleSend}
            className="bg-slate-900 border-t border-cyan-500/30 p-2 flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter structural inquiry..."
              className="flex-1 bg-slate-950 border border-cyan-500/30 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="bg-cyan-950 border border-cyan-500 text-cyan-400 font-bold px-4 py-2 text-xs rounded hover:bg-cyan-900 active:scale-95 cursor-pointer transition-all flex items-center gap-1"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
