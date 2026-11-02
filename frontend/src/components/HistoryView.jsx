import React from 'react';
import {
  Youtube,
  Instagram,
  ShoppingBag,
  Clock,
  ThumbsUp,
  MessageSquare,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function HistoryView({
  historyItems = [],
  darkMode,
  onDeleteAnalysis,
  onOpenAnalyzeModal,
}) {
  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div
        className={`rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]'
        }`}
      >
        <div>
          <h2
            className={`text-base font-bold ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Analyzed Posts History (SQLite Storage)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Persistent record of all analyzed YouTube videos, Instagram posts, and Flipkart products, reach/engagement metrics, and sentiment breakdowns
          </p>
        </div>

        <button
          onClick={onOpenAnalyzeModal}
          className="px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition self-start"
        >
          + Analyze New Post
        </button>
      </div>

      {/* History Cards Grid */}
      {historyItems.length === 0 ? (
        <div
          className={`rounded-2xl p-12 border text-center ${
            darkMode
              ? 'bg-slate-900 border-slate-800 text-slate-400'
              : 'bg-white border-slate-100 text-slate-500'
          }`}
        >
          No analyzed posts found for the selected filter. Click "+ Analyze New Post" to run a live analysis.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {historyItems.map((item) => {
            const bd = item.sentiment_breakdown || {};
            const posPct = Math.round(bd.primary_positive_pct ?? bd.positive_pct ?? 62);
            const negPct = Math.round(bd.primary_negative_pct ?? bd.negative_pct ?? 23);
            const neuPct = Math.max(0, 100 - (posPct + negPct));

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-5 border flex flex-col justify-between transition ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar: Platform Badge & Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.platform === 'youtube'
                            ? 'bg-red-500/10 text-red-600'
                            : item.platform === 'flipkart'
                            ? 'bg-blue-500/10 text-[#2874F0]'
                            : 'bg-pink-500/10 text-pink-600'
                        }`}
                      >
                        {item.platform === 'youtube' ? (
                          <Youtube className="w-3.5 h-3.5" />
                        ) : item.platform === 'flipkart' ? (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        ) : (
                          <Instagram className="w-3.5 h-3.5" />
                        )}
                        {item.platform.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-orange-600">
                        {item.author_handle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(item.analyzed_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {onDeleteAnalysis && (
                        <button
                          onClick={() => onDeleteAnalysis(item.id)}
                          title="Delete analysis from SQLite"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & URL */}
                  <h3
                    className={`font-bold text-sm leading-snug ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {item.post_title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {item.post_url}
                  </p>

                  {/* Executive Summary */}
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    {item.executive_summary}
                  </p>

                  {/* Sentiment Stacked Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-emerald-600 font-bold">
                        Positive {posPct}%
                      </span>
                      <span className="text-rose-600 font-bold">
                        Negative {negPct}%
                      </span>
                      <span className="text-indigo-600 font-bold">
                        Neutral {neuPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${posPct}%` }}
                      />
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${negPct}%` }}
                      />
                      <div
                        className="h-full bg-cyan-400"
                        style={{ width: `${neuPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Metrics Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                      {item.total_comments.toLocaleString()} comments
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5 text-indigo-500" />
                      {item.engagement_likes.toLocaleString()} likes
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <Sparkles className="w-3 h-3" />
                    {item.ai_engine_used}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
