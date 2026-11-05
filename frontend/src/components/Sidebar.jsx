import React from 'react';
import {
  LayoutGrid,
  Sparkles,
  BarChart3,
  MessageSquareHeart,
  History,
  Trophy,
  RotateCcw,
  Radio,
  Youtube,
  Instagram,
  ShoppingBag,
  PanelLeftClose,
} from 'lucide-react';

const MAIN_MENU = [
  { id: 'dashboard', label: 'Reach & Dashboard', fkLabel: 'Reviews & Rating', icon: BarChart3 },
  { id: 'insights', label: 'Comments Analysis', fkLabel: 'Review Analysis', icon: MessageSquareHeart, badge: 'AI' },
  { id: 'sentiment', label: 'Sentiment Overview', fkLabel: 'Customer Sentiment', icon: Sparkles },
  { id: 'history', label: 'Analyzed History', fkLabel: 'Analyzed Products', icon: History },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  selectedPlatform,
  setSelectedPlatform,
  darkMode,
  backendHealthy,
  totalPosts,
  onResetDemo,
  onOpenAnalyzeModal,
  isOpen = true,
  onToggleSidebar,
}) {
  if (!isOpen) return null;

  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';
  const isFK = selectedPlatform === 'flipkart';

  return (
    <aside
      className={`w-64 shrink-0 border-r flex flex-col justify-between transition-all duration-200 select-none ${
        darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-white border-slate-200/70 text-slate-700 shadow-sm'
      }`}
    >
      {/* Top Brand Logo + Hide Sidebar Button */}
      <div>
        <div className="h-20 px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${
                isYT
                  ? 'bg-red-600'
                  : isIG
                  ? 'bg-pink-600'
                  : 'bg-blue-600'
              }`}
            >
              {isYT ? (
                <Youtube className="w-5 h-5" />
              ) : isIG ? (
                <Instagram className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <span
                className={`font-extrabold tracking-tight text-xl ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Sociafy
              </span>
              <span
                className={`ml-1.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                  isYT
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : isIG
                    ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                }`}
              >
                {isYT ? 'YouTube' : isIG ? 'Social' : 'E-Comm'}
              </span>
            </div>
          </div>

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title="Hide Sidebar (साइडबार हटाएं)"
              className={`p-2 rounded-xl border transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Platform Switcher */}
        <div className="px-3 mb-3">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Workspace
          </p>
          <div
            className={`grid grid-cols-3 p-1 rounded-2xl border ${
              darkMode
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-100/80 border-slate-200/80'
            }`}
          >
            <button
              onClick={() => setSelectedPlatform('youtube')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${
                isYT
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Youtube className="w-3 h-3" />
              YouTube
            </button>
            <button
              onClick={() => setSelectedPlatform('instagram')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${
                isIG
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Instagram className="w-3 h-3" />
              Social
            </button>
            <button
              onClick={() => setSelectedPlatform('flipkart')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${
                isFK
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              E-Comm
            </button>
          </div>
        </div>

        {/* MAIN MENU */}
        <div className="px-3 mt-2 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isYT ? 'YouTube Menu' : isIG ? 'Social Media Menu' : 'E-Commerce Menu'}
          </p>
          {MAIN_MENU.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const label = isFK ? (item.fkLabel || item.label) : item.label;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? darkMode
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'bg-slate-100 text-slate-900 font-semibold shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <span
                    className={`w-1 h-5 rounded-r-full absolute left-0 top-1/2 -translate-y-1/2 ${
                      isYT ? 'bg-red-600' : isIG ? 'bg-pink-600' : 'bg-blue-600'
                    }`}
                  />
                )}
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? isYT
                          ? 'text-red-600'
                          : isIG
                          ? 'text-pink-600'
                          : 'text-blue-600'
                        : 'text-slate-400'
                    }`}
                  />
                  {label}
                </span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isYT
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                        : isIG
                        ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.id === 'history' && totalPosts > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {totalPosts}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* PIPELINE TOOLS */}
        <div className="px-3 mt-4 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pipeline & Status
          </p>
          <button
            onClick={() => setActiveTab('insights')}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              darkMode
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-emerald-500" />
              RoBERTa + AI Pipeline
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealthy ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
          </button>

          <button
            onClick={onResetDemo}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              darkMode
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            Clear Data (Reset to 0)
          </button>
        </div>
      </div>

      {/* Bottom Action Card */}
      <div className="p-3">
        <div
          className={`rounded-2xl p-4 text-center relative overflow-hidden border ${
            darkMode
              ? 'bg-slate-950 border-slate-800'
              : 'bg-slate-50/80 border-slate-200/80'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center mx-auto mb-2 shadow-sm ${
            isYT
              ? 'bg-red-600'
              : isIG
              ? 'bg-pink-600'
              : 'bg-blue-600'
          }`}>
            {isFK ? <ShoppingBag className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
          </div>
          <h4
            className={`text-xs font-bold ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {isYT ? 'Analyze YouTube Video' : isIG ? 'Analyze Social Media Post' : 'Analyze E-Commerce Product'}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            {isYT
              ? 'Fetch real YouTube views & AI sentiment'
              : isIG
              ? 'Automated headless scraping (No API Key)'
              : 'Automated review & ratings scraping'}
          </p>
          <button
            onClick={onOpenAnalyzeModal}
            className={`mt-3 w-full py-2 px-3 rounded-full text-xs font-semibold text-white shadow-sm transition transform active:scale-95 ${
              isYT
                ? 'bg-red-600 hover:bg-red-700'
                : isIG
                ? 'bg-pink-600 hover:bg-pink-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            + Analyze {isYT ? 'YouTube' : isIG ? 'Social Media' : 'E-Commerce'}
          </button>
        </div>
      </div>
    </aside>
  );
}
