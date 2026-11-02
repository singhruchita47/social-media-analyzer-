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
  { id: 'platforms', label: 'Post Reach Breakdown', fkLabel: 'Product Comparison', icon: LayoutGrid },
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
          : 'bg-white border-slate-100 text-slate-700 shadow-[4px_0_24px_-12px_rgba(15,23,42,0.06)]'
      }`}
    >
      {/* Top Brand Logo (Sociafy Style) + Hide Sidebar Button */}
      <div>
        <div className="h-20 px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                isYT
                  ? 'bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/20'
                  : isIG
                  ? 'bg-gradient-to-tr from-[#F47A38] via-[#F469A9] to-[#8B80F9] shadow-pink-500/20'
                  : 'bg-gradient-to-tr from-[#2874F0] to-[#1258ca] shadow-blue-500/20'
              }`}
            >
              {isYT ? (
                <Youtube className="w-5 h-5" />
              ) : isIG ? (
                <Instagram className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-amber-300" />
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
                    ? 'bg-red-500/15 text-red-600'
                    : isIG
                    ? 'bg-pink-500/15 text-pink-600'
                    : 'bg-blue-500/15 text-[#2874F0]'
                }`}
              >
                {isYT ? 'YT' : isIG ? 'IG' : 'FK'}
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

        {/* Dedicated Separate Platform Switcher inside Sidebar */}
        <div className="px-3 mb-3">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Platform Workspace
          </p>
          <div
            className={`grid grid-cols-3 p-1 rounded-2xl border ${
              darkMode
                ? 'bg-slate-950 border-slate-800'
                : 'bg-[#F6F7FB] border-slate-200/80'
            }`}
          >
            <button
              onClick={() => setSelectedPlatform('youtube')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${
                isYT
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Youtube className="w-3 h-3" />
              YT
            </button>
            <button
              onClick={() => setSelectedPlatform('instagram')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${
                isIG
                  ? 'bg-gradient-to-r from-[#F469A9] to-[#F47A38] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Instagram className="w-3 h-3" />
              IG
            </button>
            <button
              onClick={() => setSelectedPlatform('flipkart')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${
                isFK
                  ? 'bg-[#2874F0] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-3 h-3 text-amber-300" />
              FK
            </button>
          </div>
        </div>

        {/* MAIN MENU */}
        <div className="px-4 mt-2 space-y-1">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isYT ? 'YouTube Menu' : isIG ? 'Instagram Menu' : 'Flipkart Menu'}
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
                      ? isYT
                        ? 'bg-red-500/15 text-red-300 font-semibold'
                        : isIG
                        ? 'bg-pink-500/15 text-pink-300 font-semibold'
                        : 'bg-blue-500/15 text-blue-300 font-semibold'
                      : isYT
                      ? 'bg-gradient-to-r from-red-50 via-rose-50/70 to-pink-50/40 text-slate-900 font-semibold shadow-sm'
                      : isIG
                      ? 'bg-gradient-to-r from-orange-50 via-pink-50/70 to-purple-50/50 text-slate-900 font-semibold shadow-sm'
                      : 'bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50/40 text-slate-900 font-semibold shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <span
                    className={`w-1 h-6 rounded-r-full absolute left-0 top-1/2 -translate-y-1/2 ${
                      isYT ? 'bg-red-500' : isIG ? 'bg-pink-500' : 'bg-[#2874F0]'
                    }`}
                  />
                )}
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? isYT
                          ? 'text-red-500'
                          : isIG
                          ? 'text-pink-500'
                          : 'text-[#2874F0]'
                        : 'text-slate-400'
                    }`}
                  />
                  {label}
                </span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isYT
                        ? 'bg-red-500/15 text-red-600'
                        : isIG
                        ? 'bg-pink-500/15 text-pink-600'
                        : 'bg-blue-500/15 text-[#2874F0]'
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
                        : 'bg-slate-100 text-slate-600'
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
        <div className="px-4 mt-5 space-y-1">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pipeline & Tools
          </p>
          <button
            onClick={() => setActiveTab('insights')}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              darkMode
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-emerald-500" />
              RoBERTa + DeepMoji + AI
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
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            Clear All Data (Reset to 0)
          </button>
        </div>
      </div>

      {/* Bottom Action Card */}
      <div className="p-4">
        <div
          className={`rounded-2xl p-4 text-center relative overflow-hidden border ${
            darkMode
              ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-slate-800'
              : 'bg-gradient-to-br from-orange-50/90 via-pink-50/70 to-purple-50/90 border-orange-100/80'
          }`}
        >
          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center mx-auto mb-2.5 shadow-md ${
            isYT
              ? 'bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/20'
              : isIG
              ? 'bg-gradient-to-tr from-pink-500 to-orange-400 shadow-pink-500/20'
              : 'bg-gradient-to-tr from-[#2874F0] to-[#1258ca] shadow-blue-500/20'
          }`}>
            {isFK ? <ShoppingBag className="w-5 h-5 text-amber-300" /> : <Trophy className="w-5 h-5" />}
          </div>
          <h4
            className={`text-xs font-bold ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {isYT ? 'Analyze YouTube Video/Short' : isIG ? 'Analyze Instagram Post/Reel' : 'Analyze Flipkart Product!'}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            {isYT
              ? 'Fetch real YouTube views, subscribers & AI sentiment'
              : isIG
              ? 'Fetch real Instagram reach & AI comment sentiment'
              : 'Fetch Flipkart verified customer reviews & star ratings'}
          </p>
          <button
            onClick={onOpenAnalyzeModal}
            className={`mt-3 w-full py-2 px-3 rounded-full text-xs font-semibold text-white shadow-md transition transform active:scale-95 ${
              isYT
                ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25'
                : isIG
                ? 'bg-gradient-to-r from-[#F469A9] to-[#F47A38] shadow-pink-500/25'
                : 'bg-gradient-to-r from-[#2874F0] to-[#1258ca] shadow-blue-500/25'
            }`}
          >
            + Analyze {isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart'}
          </button>
        </div>
      </div>
    </aside>
  );
}
