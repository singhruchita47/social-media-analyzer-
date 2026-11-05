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
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { analyzeSocialPost, fetchAnalysisById } from '../services/api';

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

  // Auto-load top 2 items from history if empty
  useEffect(() => {
    if (comparedItems.length === 0 && historyItems.length >= 2) {
      const loadInitial = async () => {
        try {
          const item1 = await fetchAnalysisById(historyItems[0].id);
          const item2 = await fetchAnalysisById(historyItems[1].id);
          setComparedItems([item1, item2]);
        } catch (e) {
          console.warn('Could not auto-load initial comparison items', e);
        }
      };
      loadInitial();
    }
  }, [historyItems]);

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
        setErrorMsg('This item is already added to the comparison board.');
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

        return {
          ...item,
          cleanTitle,
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

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-2xl text-white shadow-sm ${
                isYT ? 'bg-red-600' : isIG ? 'bg-pink-600' : 'bg-blue-600'
              }`}
            >
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h1
                className={`text-2xl font-extrabold tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {isYT
                  ? 'YouTube Multi-Video AI Comparison'
                  : isIG
                  ? 'Social Media Multi-Post AI Comparison'
                  : 'E-Commerce Multi-Product AI Comparison'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare multiple {isFK ? 'products' : 'videos'} side-by-side. Our AI algorithms evaluate audience comments, real views, likes, and sentiment polarity to pick the #1 Winner.
              </p>
            </div>
          </div>
        </div>

        {comparedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              {comparedItems.length} of 5 items compared
            </span>
            <button
              onClick={handleClearAll}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                darkMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-sm'
              }`}
            >
              Clear All ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. Add Item Search Bar + History Quick-Add */}
      <div
        className={`p-5 rounded-3xl border transition shadow-sm ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'
        }`}
      >
        <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={`Paste any ${isYT ? 'YouTube Video URL' : isIG ? 'Instagram Post URL' : 'Amazon / Flipkart / Myntra Product URL'} to add to compare...`}
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
          <div className="mt-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick-Pick from Past Analyzed History */}
        {historyItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              ⚡ Quick-Add from Analyzed History:
            </span>
            {historyItems.slice(0, 5).map((it) => {
              const isAdded = comparedItems.some((c) => c.id === it.id || c.post_url === it.post_url);
              return (
                <button
                  key={it.id}
                  onClick={() => handleAddFromHistory(it)}
                  disabled={isAdded}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                    isAdded
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
                      : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-blue-400'
                  }`}
                  title={it.post_title}
                >
                  <Plus className="w-3 h-3 text-blue-500" />
                  <span>
                    {it.post_title.substring(0, 24)}
                    {it.post_title.length > 24 ? '...' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. AI Winner / Best Choice Verdict Banner */}
      {winner && (
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-blue-500/15 border border-amber-500/30 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                <Trophy className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-white shadow-sm">
                    🏆 #1 Best Choice Winner
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Highest AI Score: {winner.score}/100
                  </span>
                </div>
                <h3
                  className={`text-lg font-extrabold mt-1 tracking-tight ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {winner.cleanTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Ranked <strong>#1 Best {isFK ? 'Product' : 'Video'}</strong> among all compared items. Dominates with{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{winner.pos}% positive customer appreciation</span>,{' '}
                  highest audience satisfaction ratio, and only{' '}
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{winner.neg}% negative complaints</span>.
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectPostForComments && onSelectPostForComments(winner.id)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-md hover:opacity-90 transition shrink-0 flex items-center gap-2"
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
            const isFirst = idx === 0 && scoredItems.length > 1;
            return (
              <div
                key={item.id}
                className={`relative rounded-3xl p-5 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  isFirst
                    ? 'border-2 border-amber-500 bg-gradient-to-b from-amber-500/5 to-transparent dark:from-amber-500/10 shadow-lg shadow-amber-500/10'
                    : darkMode
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div>
                  {/* Top Rank Badge + Remove Button */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase flex items-center gap-1.5 ${
                        isFirst
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isFirst ? <Trophy className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                      <span>Rank #{idx + 1} {isFirst ? 'Winner' : ''}</span>
                    </span>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove from comparison"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Author */}
                  <h4
                    className={`font-bold text-sm line-clamp-2 ${
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
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI Quality Score
                      </span>
                      <span
                        className={`text-sm font-black ${
                          item.score >= 80
                            ? 'text-emerald-500'
                            : item.score >= 60
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {item.score}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden">
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

                  {/* Key Metrics Grid */}
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                        Positive Comments
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.pos}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        Negative Complaints
                      </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {item.neg}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        Verified Comments
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.totalComments.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-pink-500" />
                        Likes / Engagement
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.likes.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        Views / Reach
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.views.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Top Customer Pain Point Pill */}
                  <div className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 font-semibold block mb-0.5">Primary Feedback Issue:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.topPain}
                    </span>
                  </div>
                </div>

                {/* Inspect Comments Button */}
                <button
                  onClick={() => onSelectPostForComments && onSelectPostForComments(item.id)}
                  className={`w-full mt-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isFirst
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
            Paste video or product links in the input bar above, or click on any past analyzed items to immediately start a side-by-side AI comparison.
          </p>
          <button
            onClick={() => onOpenAnalyzeModal && onOpenAnalyzeModal()}
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
          >
            + Analyze New Link First
          </button>
        </div>
      )}

      {/* 5. Detailed Matrix Table (When 2+ items compared) */}
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
                Exact statistical breakdown comparing sentiment ratio, engagement rates, and complaints.
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
                  darkMode ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <tr>
                  <th className="py-3 px-4 font-bold">Metric / Feature</th>
                  {scoredItems.map((item, idx) => (
                    <th key={item.id} className="py-3 px-4 font-bold">
                      <div className="flex items-center gap-1.5">
                        {idx === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{item.cleanTitle.substring(0, 20)}...</span>
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
                        #{idx + 1} ({item.score}/100)
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    🟢 Positive Sentiment Ratio
                  </td>
                  {scoredItems.map((item, idx) => (
                    <td key={item.id} className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {item.pos}% {idx === 0 ? '★ Best' : ''}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    🔴 Negative Complaint Rate
                  </td>
                  {scoredItems.map((item) => (
                    <td key={item.id} className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400">
                      {item.neg}%
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    💬 Total Verified Comments
                  </td>
                  {scoredItems.map((item) => (
                    <td key={item.id} className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.totalComments.toLocaleString()}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    ❤️ Total Likes & Reactions
                  </td>
                  {scoredItems.map((item) => (
                    <td key={item.id} className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.likes.toLocaleString()}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    👁️ Views / Post Reach
                  </td>
                  {scoredItems.map((item) => (
                    <td key={item.id} className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.views.toLocaleString()}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                    ⚠️ Chief Complaint / Issue
                  </td>
                  {scoredItems.map((item) => (
                    <td key={item.id} className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
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
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✅ Highest Recommended ({isFK ? 'Best to Buy' : 'Top Performer'})
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Runner-Up ({isFK ? 'Alternative Choice' : 'Secondary Video'})
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
