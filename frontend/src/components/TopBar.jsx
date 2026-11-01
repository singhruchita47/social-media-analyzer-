import React from 'react';
import {
  Sun,
  Moon,
  Youtube,
  Instagram,
  Download,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
} from 'lucide-react';

export default function TopBar({
  searchQuery,
  setSearchQuery,
  selectedPlatform,
  setSelectedPlatform,
  darkMode,
  setDarkMode,
  onOpenAnalyzeModal,
  onExportCSV,
  onExportPDF,
  sidebarOpen = true,
  onToggleSidebar,
}) {
  return (
    <header
      className={`h-20 px-6 lg:px-8 border-b flex items-center justify-between gap-4 shrink-0 transition-colors duration-200 ${
        darkMode
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white/95 border-slate-100 backdrop-blur-md'
      }`}
    >
      {/* Left: Sidebar Toggle Button */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Hide Sidebar (साइडबार हटाएं)' : 'Show Sidebar (साइडबार दिखाएं)'}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-bold border shrink-0 transition ${
              !sidebarOpen
                ? selectedPlatform === 'youtube'
                  ? 'bg-red-500 text-white border-red-500 shadow-sm hover:bg-red-600'
                  : 'bg-gradient-to-r from-[#F469A9] to-[#F47A38] text-white border-pink-500 shadow-sm'
                : darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-[#F6F7FB] border-slate-200/80 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            {sidebarOpen ? (
              <>
                <PanelLeftClose
                  className={`w-4 h-4 ${
                    selectedPlatform === 'youtube' ? 'text-red-500' : 'text-pink-500'
                  }`}
                />
                <span className="hidden sm:inline">Hide Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-4 h-4" />
                <span>Show Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right Controls: Strictly Separate YouTube vs Instagram Switcher */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center p-1 rounded-full border ${
            darkMode
              ? 'bg-slate-950 border-slate-800'
              : 'bg-[#F6F7FB] border-slate-200/80'
          }`}
        >
          <button
            onClick={() => setSelectedPlatform('youtube')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
              selectedPlatform === 'youtube'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            YouTube Analytics
          </button>
          <button
            onClick={() => setSelectedPlatform('instagram')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
              selectedPlatform === 'instagram'
                ? 'bg-gradient-to-r from-[#F469A9] to-[#F47A38] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            Instagram Analytics
          </button>
        </div>

        <button
          onClick={onExportPDF}
          title="Download Professional PDF Report with Charts & Creator Info"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600 transition"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Export PDF Report</span>
        </button>

        <button
          onClick={onExportCSV}
          title="Export Analyzed Comments CSV"
          className={`hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition ${
            darkMode
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export CSV
        </button>

        <button
          onClick={onOpenAnalyzeModal}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-md transition transform active:scale-95 ${
            selectedPlatform === 'youtube'
              ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20'
              : 'bg-gradient-to-r from-[#F469A9] to-[#F47A38] shadow-pink-500/20'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>
            + Analyze {selectedPlatform === 'youtube' ? 'YouTube' : 'Instagram'}
          </span>
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
            darkMode
              ? 'bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-800'
              : 'bg-[#F6F7FB] border-slate-200/80 text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
