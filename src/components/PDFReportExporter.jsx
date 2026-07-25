import React from "react";
import { Download } from "lucide-react";

const PDFReportExporter = ({ activeChemical }) => {
  const triggerPrint = () => {
    window.print();
  };

  return (
    <button
      onClick={triggerPrint}
      className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all text-xs font-orbitron uppercase tracking-wider cursor-pointer"
    >
      <Download className="h-4 w-4" />
      Export Safety Report (SDS)
    </button>
  );
};

export default PDFReportExporter;
