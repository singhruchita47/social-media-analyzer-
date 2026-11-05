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
  Layers,
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

// Compute multi-criteria AI Score (0 - 100) and rank items STRICTLY within a platform
const computePlatformScoredItems = (items) => {
  return items
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

      // Platform-specific bonus calculation
      const engBonus =
        likes > 0 ? Math.min(20, Math.log10(Math.max(10, likes)) * 4.5) : 5;

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
};

export default function MultiComparisonView({
  selectedPlatform = 'flipkart',
  darkMode = false,
  historyItems = [],
  onSelectPostForComments,
  onOpenAnalyzeModal,
}) {
  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';

  // Active view tab: 'ecom' | 'youtube' | 'social' | 'all'
  const [activePlatformTab, setActivePlatformTab] = useState(
    isYT ? 'youtube' : isIG ? 'social' : 'ecom'
  );

  const [comparedItems, setComparedItems] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Full history across all platforms
  const [allHistory, setAllHistory] = useState(historyItems);

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

  // Keep active tab aligned if user switches main workspace platform
  useEffect(() => {
    setActivePlatformTab(isYT ? 'youtube' : isIG ? 'social' : 'ecom');
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

  // Auto-load top 2 items for each platform initially so each platform has a ready comparison
  useEffect(() => {
    if (comparedItems.length === 0 && allHistory.length > 0) {
      const loadInitial = async () => {
        const toLoad = [];
        // Auto-load top 2 E-Commerce items if available
        if (ecomHistory.length >= 2) {
          toLoad.push(ecomHistory[0].id, ecomHistory[1].id);
        } else if (ecomHistory.length === 1) {
          toLoad.push(ecomHistory[0].id);
        }
        // Auto-load top 2 YouTube items if available
        if (youtubeHistory.length >= 2) {
          toLoad.push(youtubeHistory[0].id, youtubeHistory[1].id);
        } else if (youtubeHistory.length === 1) {
          toLoad.push(youtubeHistory[0].id);
        }

        try {
          const results = await Promise.all(
            toLoad.map((id) => fetchAnalysisById(id).catch(() => null))
          );
          setComparedItems(results.filter(Boolean));
        } catch (e) {
          console.warn('Could not auto-load initial comparison items', e);
        }
      };
      loadInitial();
    }
  }, [allHistory, ecomHistory, youtubeHistory]);

  // Handle Add via URL
  const handleAddUrl = async (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;

    // Detect target platform from URL or active tab
    const urlLower = urlInput.trim().toLowerCase();
    const targetPlatform =
      urlLower.includes('youtube.com') || urlLower.includes('youtu.be')
        ? 'youtube'
        : urlLower.includes('instagram.com')
        ? 'instagram'
        : 'flipkart';

    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await analyzeSocialPost({
        platform: targetPlatform,
        post_url: urlInput.trim(),
        max_comments: 500,
      });

      // Avoid duplicates
      if (comparedItems.some((it) => it.id === result.id || it.post_url === result.post_url)) {
        setErrorMsg('This item is already on the comparison board.');
      } else {
        setComparedItems((prev) => [...prev, result]);
        setUrlInput('');
        // Automatically switch to the added item's platform tab for instant visibility
        if (targetPlatform === 'youtube') setActivePlatformTab('youtube');
        else if (targetPlatform === 'instagram') setActivePlatformTab('social');
        else setActivePlatformTab('ecom');
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

  const handleClearPlatformItems = (platformKey) => {
    if (platformKey === 'ecom') {
      setComparedItems((prev) =>
        prev.filter((it) => it.platform !== 'flipkart' && it.platform !== 'ecommerce' && it.platform !== 'myntra')
      );
    } else if (platformKey === 'youtube') {
      setComparedItems((prev) => prev.filter((it) => it.platform !== 'youtube'));
    } else if (platformKey === 'social') {
      setComparedItems((prev) => prev.filter((it) => it.platform !== 'instagram' && it.platform !== 'social_media'));
    } else {
      setComparedItems([]);
    }
  };

  // 1. Separate Compared Items by Platform
  const ecomCompared = useMemo(() => {
    return comparedItems.filter(
      (it) => it.platform === 'flipkart' || it.platform === 'ecommerce' || it.platform === 'myntra'
    );
  }, [comparedItems]);

  const youtubeCompared = useMemo(() => {
    return comparedItems.filter((it) => it.platform === 'youtube');
  }, [comparedItems]);

  const socialCompared = useMemo(() => {
    return comparedItems.filter(
      (it) => it.platform === 'instagram' || it.platform === 'social_media'
    );
  }, [comparedItems]);

  // 2. Compute Separate Rankings & Winners for EACH Platform! (Strictly isolated!)
  const ecomScored = useMemo(() => computePlatformScoredItems(ecomCompared), [ecomCompared]);
  const youtubeScored = useMemo(() => computePlatformScoredItems(youtubeCompared), [youtubeCompared]);
  const socialScored = useMemo(() => computePlatformScoredItems(socialCompared), [socialCompared]);

  const ecomWinner = ecomScored.length > 1 ? ecomScored[0] : null;
  const youtubeWinner = youtubeScored.length > 1 ? youtubeScored[0] : null;
  const socialWinner = socialScored.length > 1 ? socialScored[0] : null;

  // Active items for the selected Quick-Add history tab
  const activeHistoryList =
    activePlatformTab === 'youtube'
      ? youtubeHistory
      : activePlatformTab === 'social'
      ? socialHistory
      : ecomHistory;

  // Render a dedicated Platform Dashboard (Winner Banner, Ranked Cards, Matrix Table)
  const renderPlatformSection = ({
    platformKey,
    title,
    subtitle,
    icon: Icon,
    colorClass,
    badgeBg,
    scoredList,
    winnerItem,
    singularNoun,
    viewsLabel,
  }) => {
    return (
      <div
        key={platformKey}
        className={`p-6 rounded-3xl border space-y-6 transition shadow-sm ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        {/* Section Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {title}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeBg}`}>
                  {scoredList.length} Compared
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          {scoredList.length > 0 && (
            <button
              onClick={() => handleClearPlatformItems(platformKey)}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 self-start sm:self-auto"
            >
              Clear {title} ✕
            </button>
          )}
        </div>

        {/* 🏆 Platform-Specific #1 Winner Banner */}
        {winnerItem && (
          <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10 border-2 border-amber-500/35 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                  <Trophy className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                      🏆 #1 Best {singularNoun} Winner
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Score: {winnerItem.score} / 100
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${winnerItem.brandInfo.badgeBg}`}>
                      {winnerItem.brandInfo.icon} {winnerItem.brandInfo.brand}
                    </span>
                  </div>

                  <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {winnerItem.cleanTitle}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                    Ranked <strong>#1 Overall {singularNoun}</strong> among all compared {title.toLowerCase()}. Leads with{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{winnerItem.pos}% positive satisfaction</span>,{' '}
                    highest verified audience volume ({winnerItem.totalComments.toLocaleString()} comments), and lowest complaint ratio ({winnerItem.neg}%).
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectPostForComments && onSelectPostForComments(winnerItem.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm hover:opacity-95 transition shrink-0 flex items-center gap-1.5 self-start lg:self-auto"
              >
                <span>Inspect Winner Comments</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison Cards with INDEPENDENT RANKING */}
        {scoredList.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(scoredList.length, 4)} gap-4`}>
            {scoredList.map((item, idx) => {
              const isWinner = idx === 0 && scoredList.length > 1;
              const rankText =
                idx === 0
                  ? `🥇 #1 Best ${singularNoun}`
                  : idx === 1
                  ? `🥈 #2 Runner-Up ${singularNoun}`
                  : idx === 2
                  ? `🥉 #3 Alternative`
                  : `Rank #${idx + 1}`;

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl p-4 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                    isWinner
                      ? 'border-2 border-amber-500 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent shadow-lg shadow-amber-500/10'
                      : darkMode
                      ? 'bg-slate-950/70 border-slate-800'
                      : 'bg-slate-50/80 border-slate-200/90 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Card Header: Rank Badge + Brand Tag + Remove */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                          isWinner
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {rankText}
                      </span>

                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${item.brandInfo.badgeBg}`}>
                          {item.brandInfo.icon} {item.brandInfo.brand}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove from comparison"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Author */}
                    <h4
                      className={`font-extrabold text-xs line-clamp-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}
                      title={item.cleanTitle}
                    >
                      {item.cleanTitle}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {item.author_handle || '@Creator'}
                    </p>

                    {/* AI Score */}
                    <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          AI Score
                        </span>
                        <span
                          className={`text-sm font-black ${
                            item.score >= 80 ? 'text-emerald-500' : item.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                          }`}
                        >
                          {item.score} <span className="text-[9px] text-slate-400">/ 100</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 overflow-hidden flex">
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

                    {/* 3-Color Visual Sentiment Bar */}
                    <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-emerald-600 dark:text-emerald-400">{item.pos}% Pos</span>
                        <span className="text-amber-500 dark:text-amber-400">{item.neu}% Neu</span>
                        <span className="text-rose-600 dark:text-rose-400">{item.neg}% Neg</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                        <div style={{ width: `${item.pos}%` }} className="bg-emerald-500 h-full" />
                        <div style={{ width: `${item.neu}%` }} className="bg-amber-400 h-full" />
                        <div style={{ width: `${item.neg}%` }} className="bg-rose-500 h-full" />
                      </div>
                    </div>

                    {/* Key Metrics 4-Box Grid */}
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 font-medium block">Comments</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px]">
                          {item.totalComments.toLocaleString()}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 font-medium block">Likes</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px]">
                          {item.likes.toLocaleString()}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 font-medium block">{viewsLabel}</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px]">
                          {item.views.toLocaleString()}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 font-medium block">Complaints</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400 text-[11px]">
                          {item.neg}%
                        </span>
                      </div>
                    </div>

                    {/* Chief Reported Complaint Pill */}
                    <div className="mt-2.5 p-2 rounded-lg bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-[10px]">
                      <span className="text-rose-500 dark:text-rose-400 font-bold block">⚠️ Chief Feedback:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                        {item.topPain}
                      </span>
                    </div>
                  </div>

                  {/* Inspect Comments Button */}
                  <button
                    onClick={() => onSelectPostForComments && onSelectPostForComments(item.id)}
                    className={`w-full mt-3 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      isWinner
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    <span>View All Comments</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center">
            <Icon className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No {title} Added to Compare Yet
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste a link in the search bar above or click from the Quick-Add history to start comparing {title.toLowerCase()}!
            </p>
          </div>
        )}

        {/* Head-to-Head Comparison Matrix Table for this Platform */}
        {scoredList.length > 1 && (
          <div className="rounded-2xl border overflow-hidden shadow-sm border-slate-200 dark:border-slate-800 mt-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                📊 {title} Head-to-Head Comparison Table
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Independent Platform Rank
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Metric</th>
                    {scoredList.map((item, idx) => (
                      <th key={item.id} className="py-2.5 px-3 font-bold truncate max-w-[150px]">
                        {idx === 0 && '🏆 '}
                        {item.brandInfo.icon} {item.cleanTitle.substring(0, 18)}...
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      🏆 Independent Rank & Score
                    </td>
                    {scoredList.map((item, idx) => (
                      <td key={item.id} className="py-2.5 px-3 font-black">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
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
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      🟢 Positive Feedback Ratio
                    </td>
                    {scoredList.map((item, idx) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {item.pos}% {idx === 0 ? '★ Best' : ''}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      🔴 Negative Complaints
                    </td>
                    {scoredList.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                        {item.neg}%
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      💬 Verified Comments / Reviews
                    </td>
                    {scoredList.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {item.totalComments.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      ❤️ Likes & Approval
                    </td>
                    {scoredList.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {item.likes.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      👁️ {viewsLabel}
                    </td>
                    {scoredList.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {item.views.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      ⚠️ Chief Reported Issue
                    </td>
                    {scoredList.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {item.topPain}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                      🎯 Final Recommendation
                    </td>
                    {scoredList.map((item, idx) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold">
                        {idx === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ✅ Highest Recommended Winner
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
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Platform Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md ${
              activePlatformTab === 'youtube'
                ? 'bg-red-600'
                : activePlatformTab === 'social'
                ? 'bg-pink-600'
                : 'bg-blue-600'
            }`}
          >
            <Scale className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {activePlatformTab === 'youtube'
                  ? 'YouTube Multi-Video AI Comparison'
                  : activePlatformTab === 'social'
                  ? 'Social Media Multi-Post AI Comparison'
                  : activePlatformTab === 'all'
                  ? 'Multi-Platform Head-to-Head AI Comparison'
                  : 'E-Commerce Product AI Comparison'}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                Independent Rankings
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Each platform (E-Commerce, YouTube, Social Media) has its own independent comparison dashboard, metrics, and #1 winner ranking.
            </p>
          </div>
        </div>

        {/* Global Clear Board Button */}
        {comparedItems.length > 0 && (
          <button
            onClick={() => handleClearPlatformItems('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition self-start sm:self-auto ${
              darkMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-sm'
            }`}
          >
            Clear All Boards ({comparedItems.length}) ✕
          </button>
        )}
      </div>

      {/* 2. Platform Mode Tabs Bar */}
      <div
        className={`p-2 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActivePlatformTab('ecom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activePlatformTab === 'ecom'
                ? 'bg-blue-600 text-white shadow-sm'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>🛍️ E-Commerce Dashboard</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activePlatformTab === 'ecom' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {ecomCompared.length}
            </span>
          </button>

          <button
            onClick={() => setActivePlatformTab('youtube')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activePlatformTab === 'youtube'
                ? 'bg-red-600 text-white shadow-sm'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Youtube className="w-4 h-4" />
            <span>📺 YouTube Dashboard</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activePlatformTab === 'youtube' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {youtubeCompared.length}
            </span>
          </button>

          <button
            onClick={() => setActivePlatformTab('social')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activePlatformTab === 'social'
                ? 'bg-pink-600 text-white shadow-sm'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Instagram className="w-4 h-4" />
            <span>📸 Social Media Dashboard</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activePlatformTab === 'social' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {socialCompared.length}
            </span>
          </button>

          <button
            onClick={() => setActivePlatformTab('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activePlatformTab === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Show All Dashboards</span>
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-400 px-3 py-1">
          {activePlatformTab === 'all'
            ? 'Displaying all platform dashboards separated'
            : `Showing dedicated ${activePlatformTab.toUpperCase()} comparison`}
        </span>
      </div>

      {/* 3. Add URL Input Box + Quick-Add from History */}
      <div
        className={`p-5 rounded-3xl border transition shadow-sm ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-500" />
            Add URL to Compare ({activePlatformTab === 'youtube' ? 'YouTube' : activePlatformTab === 'social' ? 'Instagram' : 'E-Commerce'})
          </span>
          <span className="text-[11px] text-slate-400">Ranks automatically within its own platform</span>
        </div>

        <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={
                activePlatformTab === 'youtube'
                  ? 'Paste YouTube Video or Shorts URL (e.g. https://www.youtube.com/watch?v=...)'
                  : activePlatformTab === 'social'
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
                : activePlatformTab === 'youtube'
                ? 'bg-red-600 hover:bg-red-700'
                : activePlatformTab === 'social'
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

        {/* Quick-Add from Analyzed History Section */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              ⚡ Quick-Add from Analyzed History
            </span>

            {/* Platform Filter Tabs for History */}
            <div
              className={`flex items-center p-1 rounded-2xl border text-xs font-bold ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setActivePlatformTab('ecom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activePlatformTab === 'ecom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>E-Commerce ({ecomHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatformTab('youtube')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activePlatformTab === 'youtube'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube ({youtubeHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatformTab('social')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                  activePlatformTab === 'social'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Social Media ({socialHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Quick-Add Chips Grid for Active Platform */}
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
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${brand.badgeBg}`}>
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
                        className={`text-xs font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
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
                No past analyzed items found for this platform yet. Paste a link above to analyze and add to this comparison board!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PLATFORM DASHBOARDS BELOW — COMPLETELY SEPARATED WITH SEPARATE RANKS! */}
      {/* ========================================================================= */}
      <div className="space-y-8">
        {/* DASHBOARD 1: E-COMMERCE PRODUCT COMPARISON */}
        {(activePlatformTab === 'ecom' || activePlatformTab === 'all') &&
          renderPlatformSection({
            platformKey: 'ecom',
            title: 'E-Commerce Product Comparison Dashboard',
            subtitle: 'Amazon, Myntra, Flipkart & Meesho products ranked against each other based on customer reviews.',
            icon: ShoppingBag,
            colorClass: 'bg-blue-600',
            badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            scoredList: ecomScored,
            winnerItem: ecomWinner,
            singularNoun: 'Product',
            viewsLabel: 'Ratings & Reviews',
          })}

        {/* DASHBOARD 2: YOUTUBE VIDEO COMPARISON */}
        {(activePlatformTab === 'youtube' || activePlatformTab === 'all') &&
          renderPlatformSection({
            platformKey: 'youtube',
            title: 'YouTube Video & Shorts Comparison Dashboard',
            subtitle: 'YouTube videos & Shorts ranked against each other based on audience comments, real views, and likes.',
            icon: Youtube,
            colorClass: 'bg-red-600',
            badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
            scoredList: youtubeScored,
            winnerItem: youtubeWinner,
            singularNoun: 'Video',
            viewsLabel: 'Video Views',
          })}

        {/* DASHBOARD 3: SOCIAL MEDIA POST COMPARISON */}
        {(activePlatformTab === 'social' || activePlatformTab === 'all') &&
          renderPlatformSection({
            platformKey: 'social',
            title: 'Social Media Post Comparison Dashboard',
            subtitle: 'Instagram Reels & posts ranked against each other based on engagement, reach, and sentiment.',
            icon: Instagram,
            colorClass: 'bg-pink-600',
            badgeBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
            scoredList: socialScored,
            winnerItem: socialWinner,
            singularNoun: 'Post',
            viewsLabel: 'Post Impressions',
          })}
      </div>
    </div>
  );
}
