import React from 'react';
import {
  Sun,
  Moon,
  Youtube,
  Instagram,
  ShoppingBag,
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
  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';
  const isFK = selectedPlatform === 'flipkart';

  return (
    <header
      className={`h-20 px-6 lg:px-8 border-b flex items-center justify-between gap-4 shrink-0 transition-colors duration-200 ${
        darkMode
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white/95 border-slate-200/70 backdrop-blur-md'
      }`}
    >
      {/* Left: Sidebar Toggle Button (Compact) */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Hide Sidebar (साइडबार हटाएं)' : 'Show Sidebar (साइडबार दिखाएं)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 transition ${
              !sidebarOpen
                ? isYT
                  ? 'bg-red-600 text-white border-red-600 shadow-sm hover:bg-red-700'
                  : isIG
                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm hover:bg-pink-700'
                  : 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                : darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {sidebarOpen ? (
              <>
                <PanelLeftClose
                  className={`w-3.5 h-3.5 ${
                    isYT ? 'text-red-500' : isIG ? 'text-pink-500' : 'text-blue-500'
                  }`}
                />
                <span className="hidden sm:inline">Hide Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span>Show Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right Controls: YouTube vs Social Media Platform vs E-Commerce Platform */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center p-1 rounded-full border ${
            darkMode
              ? 'bg-slate-950 border-slate-800'
              : 'bg-slate-100/80 border-slate-200/80'
          }`}
        >
          <button
            onClick={() => setSelectedPlatform('youtube')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              isYT
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">YouTube</span>
            <span className="lg:hidden">YT</span>
          </button>
          <button
            onClick={() => setSelectedPlatform('instagram')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              isIG
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Social Media Platform</span>
            <span className="lg:hidden">Social Media</span>
          </button>
          <button
            onClick={() => setSelectedPlatform('flipkart')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              isFK
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">E-Commerce Platform</span>
            <span className="lg:hidden">E-Commerce</span>
          </button>
        </div>

        <button
          onClick={onExportPDF}
          title="Download Professional PDF Report with Charts & Product/Creator Info"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
        >
          <FileText className="w-3.5 h-3.5 text-orange-500" />
          <span className="hidden sm:inline">Export PDF</span>
          <span className="sm:hidden">PDF</span>
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
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm transition transform active:scale-95 ${
            isYT
              ? 'bg-red-600 hover:bg-red-700'
              : isIG
              ? 'bg-pink-600 hover:bg-pink-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>
            + Analyze {isYT ? 'YouTube' : isIG ? 'Social Media' : 'E-Commerce'}
          </span>
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
            darkMode
              ? 'bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
