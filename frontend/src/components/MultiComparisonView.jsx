import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  Trophy,
  Award,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Eye,
  Heart,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  ShoppingBag,
  Youtube,
  Instagram,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { analyzeSocialPost, fetchAnalysisById, fetchHistory } from '../services/api';

// Helper to identify brand/marketplace details and styling
const getItemBrandInfo = (item) => {
  if (!item) return { brand: 'Web', color: 'bg-blue-600', badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: '🛍️' };
  const platform = (item.platform || '').toLowerCase();
  const url = (item.post_url || '').toLowerCase();
  const author = (item.author_handle || '').toLowerCase();
  const title = (item.post_title || '').toLowerCase();
  const combined = `${url} ${author} ${title}`;

  if (platform === 'youtube' || combined.includes('youtube') || combined.includes('youtu.be')) {
    return { brand: 'YouTube', color: 'bg-red-600', badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800', icon: '📺' };
  }
  if (platform === 'instagram' || combined.includes('instagram')) {
    return { brand: 'Instagram', color: 'bg-pink-600', badgeBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800', icon: '📸' };
  }
  if (combined.includes('myntra')) {
    return { brand: 'Myntra', color: 'bg-pink-500', badgeBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800', icon: '🛍️' };
  }
  if (combined.includes('amazon')) {
    return { brand: 'Amazon', color: 'bg-amber-600', badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: '📦' };
  }
  if (combined.includes('flipkart')) {
    return { brand: 'Flipkart', color: 'bg-blue-600', badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: '🛒' };
  }
  if (combined.includes('meesho')) {
    return { brand: 'Meesho', color: 'bg-fuchsia-600', badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800', icon: '🛍️' };
  }
  if (combined.includes('nykaa')) {
    return { brand: 'Nykaa', color: 'bg-rose-500', badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: '💄' };
  }
  if (combined.includes('ajio')) {
    return { brand: 'Ajio', color: 'bg-slate-700', badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: '👗' };
  }
  return { brand: 'E-Commerce', color: 'bg-blue-600', badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: '🛍️' };
};

export default function MultiComparisonView({
  selectedPlatform = 'youtube',
  darkMode = false,
  historyItems = [],
  onSelectPostForComments,
  onOpenAnalyzeModal,
}) {
  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';
  const isFK = selectedPlatform === 'flipkart';

  const [comparedItems, setComparedItems] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Full history across all platforms (so users can pick YouTube, Instagram, or E-Commerce separately)
  const [allHistory, setAllHistory] = useState(historyItems);

  // Quick-Add History Tab: 'ecom' | 'youtube' | 'social'
  const [historyTab, setHistoryTab] = useState(
    isYT ? 'youtube' : isIG ? 'social' : 'ecom'
  );

  // Fetch full history across all platforms on mount
  useEffect(() => {
    fetchHistory()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllHistory(data);
        }
      })
      .catch((err) => console.warn('Could not fetch all history', err));
  }, []);

  // Sync when prop updates
  useEffect(() => {
    if (historyItems && historyItems.length > 0) {
      setAllHistory((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const newOnes = historyItems.filter((h) => !ids.has(h.id));
        return [...newOnes, ...prev];
      });
    }
  }, [historyItems]);

  // Keep historyTab aligned if user switches main platform
  useEffect(() => {
    setHistoryTab(isYT ? 'youtube' : isIG ? 'social' : 'ecom');
  }, [selectedPlatform, isYT, isIG]);

  // Categorize history items into 3 strictly separate lists
  const ecomHistory = useMemo(() => {
    return allHistory.filter(
      (it) => it.platform === 'flipkart' || it.platform === 'ecommerce' || it.platform === 'myntra'
    );
  }, [allHistory]);

  const youtubeHistory = useMemo(() => {
    return allHistory.filter((it) => it.platform === 'youtube');
  }, [allHistory]);

  const socialHistory = useMemo(() => {
    return allHistory.filter(
      (it) => it.platform === 'instagram' || it.platform === 'social_media'
    );
  }, [allHistory]);

  // Auto-load top 2 items from the active platform's history if board is empty
  useEffect(() => {
    if (comparedItems.length === 0) {
      const activePlatformPool =
        historyTab === 'youtube'
          ? youtubeHistory
          : historyTab === 'social'
          ? socialHistory
          : ecomHistory;

      if (activePlatformPool.length >= 2) {
        const loadInitial = async () => {
          try {
            const item1 = await fetchAnalysisById(activePlatformPool[0].id);
            const item2 = await fetchAnalysisById(activePlatformPool[1].id);
            setComparedItems([item1, item2]);
          } catch (e) {
            console.warn('Could not auto-load initial comparison items', e);
          }
        };
        loadInitial();
      }
    }
  }, [historyTab, youtubeHistory, socialHistory, ecomHistory]);

  // Handle Add via URL
  const handleAddUrl = async (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;

    if (comparedItems.length >= 5) {
      setErrorMsg('You can compare a maximum of 5 items simultaneously.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await analyzeSocialPost({
        platform: selectedPlatform,
        post_url: urlInput.trim(),
        max_comments: 500,
      });

      // Avoid duplicates
      if (comparedItems.some((it) => it.id === result.id || it.post_url === result.post_url)) {
        setErrorMsg('This item is already on the comparison board.');
      } else {
        setComparedItems((prev) => [...prev, result]);
        setUrlInput('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze URL for comparison.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Add from History item chip
  const handleAddFromHistory = async (histItem) => {
    if (comparedItems.some((it) => it.id === histItem.id || it.post_url === histItem.post_url)) {
      return;
    }
    if (comparedItems.length >= 5) {
      setErrorMsg('Maximum 5 items can be compared at once.');
      return;
    }

    try {
      const full = await fetchAnalysisById(histItem.id);
      setComparedItems((prev) => [...prev, full]);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg('Could not fetch details for this item.');
    }
  };

  const handleRemoveItem = (id) => {
    setComparedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    setComparedItems([]);
  };

  // Compute multi-criteria AI Score (0 - 100) and rank items
  const scoredItems = useMemo(() => {
    return comparedItems
      .map((item) => {
        const bd = item.sentiment_breakdown || {};
        const pos =
          bd.primary_positive_pct !== undefined
            ? bd.primary_positive_pct
            : bd.positive_pct !== undefined
            ? bd.positive_pct
            : 0;
        const neg =
          bd.primary_negative_pct !== undefined
            ? bd.primary_negative_pct
            : bd.negative_pct !== undefined
            ? bd.negative_pct
            : 0;
        const neu =
          bd.primary_neutral_pct !== undefined
            ? bd.primary_neutral_pct
            : bd.neutral_pct !== undefined
            ? bd.neutral_pct
            : 0;

        const likes = item.engagement_likes || 0;
        const views = item.video_views || 1;
        const totalComments = item.total_comments || 0;

        // Engagement bonus: logarithmic like factor up to 20 pts
        const engBonus = likes > 0 ? Math.min(20, Math.log10(Math.max(10, likes)) * 4.5) : 5;

        // Weighted AI Score formula
        let score = pos * 0.5 + engBonus + (100 - neg) * 0.3;
        score = Math.max(15, Math.min(99.5, Math.round(score * 10) / 10));

        const cleanTitle = (item.post_title || 'Item')
          .replace(/<[^>]*>/g, '')
          .replace(/(?:1-\d+ of (?:over )?[\d,]+ results|Sort by:.*$)/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        const topPain = item.pain_points?.[0]?.category || 'Minimal Complaints';
        const brandInfo = getItemBrandInfo(item);

        return {
          ...item,
          cleanTitle,
          brandInfo,
          pos: Math.round(pos * 10) / 10,
          neg: Math.round(neg * 10) / 10,
          neu: Math.round(neu * 10) / 10,
          score,
          likes,
          views,
          totalComments,
          topPain,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [comparedItems]);

  const winner = scoredItems.length > 1 ? scoredItems[0] : null;

  // Active items for the selected Quick-Add history tab
  const activeHistoryList =
    historyTab === 'youtube'
      ? youtubeHistory
      : historyTab === 'social'
      ? socialHistory
      : ecomHistory;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md ${
              isYT ? 'bg-red-600' : isIG ? 'bg-pink-600' : 'bg-blue-600'
            }`}
          >
            <Scale className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`text-2xl font-extrabold tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {isYT
                  ? 'YouTube Multi-Video AI Comparison'
                  : isIG
                  ? 'Social Media Multi-Post AI Comparison'
                  : 'E-Commerce Product AI Comparison'}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                AI Winner Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isYT
                ? 'Compare multiple YouTube videos or Shorts side-by-side to find the top video based on audience comments, real views, and engagement.'
                : isIG
                ? 'Compare multiple Instagram or social media posts based on engagement, audience sentiments, and reach.'
                : 'Compare multiple products (Amazon, Myntra, Flipkart, Meesho) side-by-side to find the best product based on customer reviews, star ratings, and complaint ratios.'}
            </p>
          </div>
        </div>

        {comparedItems.length > 0 && (
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-bold text-slate-400 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              {comparedItems.length} of 5 items compared
            </span>
            <button
              onClick={handleClearAll}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                darkMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-sm'
              }`}
            >
              Clear Board ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. Search & Add URL Input Box */}
      <div
        className={`p-5 rounded-3xl border transition shadow-sm ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-500" />
            Add Video or Product URL to Compare
          </span>
          <span className="text-[11px] text-slate-400">Supports YouTube, Amazon, Myntra, Flipkart & Instagram</span>
        </div>

        <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={
                isYT
                  ? 'Paste YouTube Video or Shorts URL (e.g. https://www.youtube.com/watch?v=...)'
                  : isIG
                  ? 'Paste Instagram Post or Reel URL (e.g. https://www.instagram.com/p/...)'
                  : 'Paste Amazon, Myntra, or Flipkart Product URL (e.g. https://www.myntra.com/...)'
              }
              className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-medium border outline-none transition ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !urlInput.trim()}
            className={`px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-sm transition flex items-center justify-center gap-2 shrink-0 ${
              isAnalyzing || !urlInput.trim()
                ? 'opacity-50 cursor-not-allowed bg-slate-500'
                : isYT
                ? 'bg-red-600 hover:bg-red-700'
                : isIG
                ? 'bg-pink-600 hover:bg-pink-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing AI Comments...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ Add to Compare</span>
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-3 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUICK-ADD FROM ANALYZED HISTORY (SEPARATED BY PLATFORM TABS!)             */}
        {/* ========================================================================= */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                ⚡ Quick-Add from Analyzed History
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                (Click to add instantly)
              </span>
            </div>

            {/* Platform Filter Tabs (YouTube vs Social Media vs E-Commerce) */}
            <div
              className={`flex items-center p-1 rounded-2xl border text-xs font-bold ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setHistoryTab('ecom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  historyTab === 'ecom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>E-Commerce ({ecomHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryTab('youtube')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  historyTab === 'youtube'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube ({youtubeHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryTab('social')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  historyTab === 'social'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Social Media ({socialHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Quick-Add Chips Grid for Active Tab */}
          {activeHistoryList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeHistoryList.slice(0, 6).map((it) => {
                const isAdded = comparedItems.some(
                  (c) => c.id === it.id || c.post_url === it.post_url
                );
                const brand = getItemBrandInfo(it);
                const posPct = Math.round(
                  it.sentiment_breakdown?.primary_positive_pct ??
                    it.sentiment_breakdown?.positive_pct ??
                    80
                );

                return (
                  <div
                    key={it.id}
                    onClick={() => !isAdded && handleAddFromHistory(it)}
                    className={`group p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                      isAdded
                        ? 'opacity-50 cursor-default bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                        : darkMode
                        ? 'bg-slate-950/70 border-slate-800 hover:border-blue-500 hover:bg-slate-900 cursor-pointer shadow-sm'
                        : 'bg-slate-50/80 border-slate-200/80 hover:border-blue-400 hover:bg-white cursor-pointer shadow-sm'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${brand.badgeBg}`}
                        >
                          {brand.icon} {brand.brand}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {posPct}% Pos
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {it.total_comments || 0} reviews
                        </span>
                      </div>
                      <h5
                        className={`text-xs font-bold truncate ${
                          darkMode ? 'text-slate-200' : 'text-slate-800'
                        }`}
                        title={it.post_title}
                      >
                        {it.post_title}
                      </h5>
                    </div>

                    <button
                      type="button"
                      disabled={isAdded}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition flex items-center gap-1 ${
                        isAdded
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-600 text-white group-hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Compare</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                No past analyzed{' '}
                {historyTab === 'youtube'
                  ? 'YouTube videos'
                  : historyTab === 'social'
                  ? 'Social media posts'
                  : 'E-commerce products'}{' '}
                found yet. Paste a link above to analyze and add to this comparison board!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. AI Winner / Best Choice Verdict Banner */}
      {winner && (
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-blue-500/15 border-2 border-amber-500/40 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                <Trophy className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    🏆 #1 Best Choice Winner
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    AI Quality Score: {winner.score} / 100
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${winner.brandInfo.badgeBg}`}
                  >
                    {winner.brandInfo.icon} {winner.brandInfo.brand}
                  </span>
                </div>

                <h3
                  className={`text-lg font-black tracking-tight ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {winner.cleanTitle}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Automatically ranked <strong>#1 Best Choice</strong> among all compared items.
                  Leads with{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {winner.pos}% positive customer appreciation
                  </span>
                  , highest satisfaction volume ({winner.totalComments.toLocaleString()} verified reviews),
                  and the lowest complaint ratio ({winner.neg}%).
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectPostForComments && onSelectPostForComments(winner.id)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-md hover:opacity-95 transition shrink-0 flex items-center gap-2"
            >
              <span>Inspect Winner Comments</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Comparison Cards Grid */}
      {scoredItems.length > 0 ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(scoredItems.length, 4)} gap-5`}>
          {scoredItems.map((item, idx) => {
            const isWinner = idx === 0 && scoredItems.length > 1;
            const rankLabel =
              idx === 0
                ? '🥇 #1 Best Choice'
                : idx === 1
                ? '🥈 #2 Runner-Up'
                : idx === 2
                ? '🥉 #3 Alternative'
                : `Rank #${idx + 1}`;

            return (
              <div
                key={item.id}
                className={`relative rounded-3xl p-5 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  isWinner
                    ? 'border-2 border-amber-500 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent dark:from-amber-500/15 shadow-xl shadow-amber-500/10'
                    : darkMode
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div>
                  {/* Card Header: Rank Badge + Brand Pill + Remove Button */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1.5 ${
                        isWinner
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {rankLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${item.brandInfo.badgeBg}`}
                      >
                        {item.brandInfo.icon} {item.brandInfo.brand}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove from comparison"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Product / Video Title */}
                  <h4
                    className={`font-extrabold text-sm line-clamp-2 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                    title={item.cleanTitle}
                  >
                    {item.cleanTitle}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span>{item.author_handle || '@Creator'}</span>
                    <span>•</span>
                    <span className="capitalize">{item.platform}</span>
                  </p>

                  {/* AI Quality Score Gauge */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI Quality Score
                      </span>
                      <span
                        className={`text-base font-black ${
                          item.score >= 80
                            ? 'text-emerald-500'
                            : item.score >= 60
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {item.score} <span className="text-[10px] text-slate-400">/ 100</span>
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.score >= 80
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : item.score >= 60
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-rose-500 to-red-400'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>

                  {/* 3-Color Visual Sentiment Bar (Positive / Neutral / Negative) */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {item.pos}% Positive
                      </span>
                      <span className="text-amber-500 dark:text-amber-400">
                        {item.neu}% Neutral
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {item.neg}% Complaints
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                      <div
                        style={{ width: `${item.pos}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Positive: ${item.pos}%`}
                      />
                      <div
                        style={{ width: `${item.neu}%` }}
                        className="bg-amber-400 h-full"
                        title={`Neutral: ${item.neu}%`}
                      />
                      <div
                        style={{ width: `${item.neg}%` }}
                        className="bg-rose-500 h-full"
                        title={`Negative: ${item.neg}%`}
                      />
                    </div>
                  </div>

                  {/* Key Metrics 4-Box Grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Verified Reviews
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">
                        {item.totalComments.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Likes / Approval
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">
                        {item.likes.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Views / Reach
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">
                        {item.views.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Complaints %
                      </span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        {item.neg}%
                      </span>
                    </div>
                  </div>

                  {/* Top Customer Pain Point Pill */}
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-[11px]">
                    <span className="text-rose-500 dark:text-rose-400 font-bold block mb-0.5">
                      ⚠️ Chief Reported Issue:
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.topPain}
                    </span>
                  </div>
                </div>

                {/* Inspect Comments Button */}
                <button
                  onClick={() => onSelectPostForComments && onSelectPostForComments(item.id)}
                  className={`w-full mt-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isWinner
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      : darkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>View All Comments</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={`p-12 rounded-3xl border text-center flex flex-col items-center justify-center ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <Scale className="w-8 h-8" />
          </div>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            No Items Added to Compare Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-6">
            Paste links in the input box above or click on any past analyzed items to immediately start a side-by-side AI comparison.
          </p>
          <button
            onClick={() => onOpenAnalyzeModal && onOpenAnalyzeModal()}
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
          >
            + Analyze New Link First
          </button>
        </div>
      )}

      {/* 5. Detailed Head-to-Head Comparison Matrix (When 2+ items compared) */}
      {scoredItems.length > 1 && (
        <div
          className={`rounded-3xl border overflow-hidden shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Detailed Head-to-Head Comparison Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side metric breakdown. The #1 winning values are highlighted in green.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              AI Scored & Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b ${
                  darkMode
                    ? 'bg-slate-950/70 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <tr>
                  <th className="py-3.5 px-4 font-bold">Metric / Feature</th>
                  {scoredItems.map((item, idx) => (
                    <th key={item.id} className="py-3.5 px-4 font-bold">
                      <div className="flex items-center gap-1.5">
                        {idx === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border ${item.brandInfo.badgeBg}`}
                        >
                          {item.brandInfo.brand}
                        </span>
                        <span className="truncate max-w-[140px]">{item.cleanTitle}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    🏆 AI Overall Rank & Score
                  </td>
                  {scoredItems.map((item, idx) => (
                    <td key={item.id} className="py-3.5 px-4">
                      <span
                        className={`font-black px-2.5 py-1 rounded-full ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Rank #{idx + 1} ({item.score}/100)
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    🟢 Positive Sentiment Ratio
                  </td>
                  {scoredItems.map((item, idx) => (
                    <td
                      key={item.id}
                      className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      {item.pos}% {idx === 0 ? '★ Best' : ''}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    🔴 Negative Complaint Rate
                  </td>
                  {scoredItems.map((item) => (
                    <td
                      key={item.id}
                      className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400"
                    >
                      {item.neg}%
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    💬 Total Verified Comments
                  </td>
                  {scoredItems.map((item) => (
                    <td
                      key={item.id}
                      className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {item.totalComments.toLocaleString()}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    ❤️ Total Likes & Reactions
                  </td>
                  {scoredItems.map((item) => (
                    <td
                      key={item.id}
                      className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {item.likes.toLocaleString()}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    👁️ Views / Post Reach
                  </td>
                  {scoredItems.map((item) => (
                    <td
                      key={item.id}
                      className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {item.views.toLocaleString()}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    ⚠️ Chief Complaint / Issue
                  </td>
                  {scoredItems.map((item) => (
                    <td
                      key={item.id}
                      className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {item.topPain}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    🎯 Final AI Recommendation
                  </td>
                  {scoredItems.map((item, idx) => (
                    <td key={item.id} className="py-3.5 px-4 font-bold">
                      {idx === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Highest Recommended Winner
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Runner-Up Alternative
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
