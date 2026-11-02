import React from 'react';
import {
  TrendingUp,
  Youtube,
  Instagram,
  ShoppingBag,
  Database,
  CheckCircle2,
  MessageSquareHeart,
} from 'lucide-react';

const HEATMAP_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEATMAP_HOURS = ['9am', '12pm', '3pm', '6pm', '9pm'];

const HEATMAP_MATRIX = [
  [1, 2, 2, 3, 2],
  [2, 3, 2, 4, 3],
  [2, 4, 3, 4, 3],
  [1, 2, 3, 3, 2],
  [2, 3, 4, 4, 4],
  [3, 4, 3, 4, 3],
  [2, 3, 4, 3, 2],
];

const YT_HEAT_CLASSES = {
  1: 'bg-red-100 dark:bg-red-950/50',
  2: 'bg-red-200 dark:bg-red-800/60',
  3: 'bg-red-300 dark:bg-red-600/80',
  4: 'bg-red-500 dark:bg-red-500',
};

const IG_HEAT_CLASSES = {
  1: 'bg-pink-100 dark:bg-pink-950/50',
  2: 'bg-pink-200 dark:bg-pink-800/60',
  3: 'bg-pink-300 dark:bg-pink-600/80',
  4: 'bg-pink-500 dark:bg-pink-500',
};

const FK_HEAT_CLASSES = {
  1: 'bg-blue-100 dark:bg-blue-950/50',
  2: 'bg-blue-200 dark:bg-blue-800/60',
  3: 'bg-blue-300 dark:bg-blue-600/80',
  4: 'bg-blue-600 dark:bg-blue-500',
};

function formatCompact(n) {
  if (!n || n === 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function PlatformAnalyticsView({
  stats,
  selectedPlatform = 'youtube',
  historyItems = [],
  onSelectPostForComments,
  darkMode,
  compact = false,
}) {
  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';
  const isFK = selectedPlatform === 'flipkart';
  const cleaning = stats?.pandas_cleaning_totals || {
    raw_fetched_count: 0,
    cleaned_valid_count: 0,
    duplicates_removed: 0,
    emoji_spam_removed: 0,
    bot_repetitive_removed: 0,
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Platform-Specific Analyzed Videos/Posts Reach Table (7 cols) + Optimal Posting Heatmap (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Analyzed Posts Real Reach & Views Breakdown */}
        <div
          className={`xl:col-span-7 rounded-2xl p-5 border ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200/80 ring-1 ring-white shadow-[0_12px_30px_-4px_rgba(15,23,42,0.14)]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  isYT
                    ? 'bg-red-500'
                    : isIG
                    ? 'bg-gradient-to-tr from-orange-500 to-pink-500'
                    : 'bg-[#2874F0]'
                }`}
              >
                {isYT ? (
                  <Youtube className="w-4 h-4" />
                ) : isIG ? (
                  <Instagram className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                )}
              </span>
              <div>
                <h3
                  className={`font-bold text-sm ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {isYT
                    ? 'YouTube Videos & Shorts — Real Reach & Views Overview'
                    : isIG
                    ? 'Instagram Posts & Reels — Reach & Impressions Overview'
                    : 'Flipkart Products — Customer Reviews & Star Ratings Overview'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Showing only {isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart'} items — click any row to open its Analysis
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isYT
                  ? 'bg-red-500/10 text-red-600'
                  : isIG
                  ? 'bg-pink-500/10 text-pink-600'
                  : 'bg-blue-500/10 text-[#2874F0]'
              }`}
            >
              {historyItems.length} {isYT ? 'YouTube Videos' : isIG ? 'Instagram Posts' : 'Flipkart Products'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`text-[11px] font-semibold border-b ${
                    darkMode
                      ? 'text-slate-400 border-slate-800'
                      : 'text-slate-400 border-slate-100'
                  }`}
                >
                  <th className="pb-3 pr-3">
                    {isYT ? 'YouTube Video / Short' : isIG ? 'Instagram Reel / Post' : 'Flipkart Product'}
                  </th>
                  <th className="pb-3 px-3">
                    {isYT ? 'Subscribers' : isIG ? 'Followers' : 'Customer Rating'}
                  </th>
                  <th className="pb-3 px-3">{isFK ? 'Ratings Count' : 'Real Reach'}</th>
                  <th className="pb-3 px-3">
                    {isYT ? 'Real Views' : isIG ? 'Impressions' : 'Reviews Scraped'}
                  </th>
                  <th className="pb-3 px-3">{isFK ? '5★ Likes' : 'Likes'}</th>
                  <th className="pb-3 px-3">Sentiment</th>
                  <th className="pb-3 pl-3 text-right">{isFK ? 'Reviews' : 'Comments'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {historyItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-slate-400 text-xs"
                    >
                      0 {isYT ? 'YouTube videos/shorts' : isIG ? 'Instagram posts' : 'Flipkart products'} analyzed yet. Click "+ Analyze {isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart'}" to paste a link!
                    </td>
                  </tr>
                ) : (
                  historyItems.map((item) => {
                    const posPct = Math.round(
                      item.sentiment_breakdown?.primary_positive_pct ??
                        item.sentiment_breakdown?.positive_pct ??
                        0
                    );
                    const viewsVal = item.video_views || 0;
                    const reachVal = item.post_reach || 0;
                    const subsVal = item.author_followers || 0;
                    const isLiveAPI = (item.source_mode || '').includes('Live');

                    return (
                      <tr
                        key={item.id}
                        onClick={() =>
                          onSelectPostForComments &&
                          onSelectPostForComments(item.id)
                        }
                        className={`cursor-pointer transition ${
                          darkMode
                            ? 'hover:bg-slate-800/40'
                            : 'hover:bg-orange-50/40'
                        }`}
                      >
                        <td className="py-3 pr-3 max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            {isLiveAPI && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500 text-white shrink-0">
                                LIVE
                              </span>
                            )}
                            <p
                              className={`font-bold truncate ${
                                darkMode ? 'text-white' : 'text-slate-900'
                              }`}
                              title={item.post_title}
                            >
                              {item.post_title}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {item.author_handle}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                          {isFK ? '4.4★' : formatCompact(subsVal)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                          {formatCompact(reachVal)}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-800 dark:text-white">
                          {formatCompact(viewsVal)}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {formatCompact(item.engagement_likes)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              posPct >= 65
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : posPct >= 40
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {posPct}% Pos
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              isYT
                                ? 'bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white'
                                : isIG
                                ? 'bg-pink-500/10 text-pink-600 hover:bg-pink-500 hover:text-white'
                                : 'bg-blue-500/10 text-[#2874F0] hover:bg-[#2874F0] hover:text-white'
                            }`}
                          >
                            <MessageSquareHeart className="w-3 h-3" />
                            {item.total_comments} →
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Optimal Posting & Activity Heatmap */}
        <div
          className={`xl:col-span-5 rounded-2xl p-5 border flex flex-col justify-between ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200/80 ring-1 ring-white shadow-[0_12px_30px_-4px_rgba(15,23,42,0.14)]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3
                className={`font-bold text-sm ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {isYT
                  ? 'YouTube Optimal Upload & Comment Time'
                  : isIG
                  ? 'Instagram Optimal Reel Posting Time'
                  : 'Flipkart Customer Review Activity & Order Peak Time'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Peak {isYT ? 'YouTube viewer' : isIG ? 'Instagram follower' : 'Flipkart buyer'} activity & review velocity hours
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : 'bg-[#F6F7FB] border-slate-200 text-slate-600'
              }`}
            >
              Weekly Heatmap
            </span>
          </div>

          <div className="space-y-1.5">
            {HEATMAP_DAYS.map((day, dIdx) => (
              <div key={day} className="grid grid-cols-6 items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">
                  {day}
                </span>
                {HEATMAP_MATRIX[dIdx].map((level, hIdx) => (
                  <div
                    key={`${day}-${hIdx}`}
                    title={`${day} ${HEATMAP_HOURS[hIdx]} — Engagement Level ${level}/4`}
                    className={`h-6 rounded-md transition transform hover:scale-105 ${
                      isYT ? YT_HEAT_CLASSES[level] : isIG ? IG_HEAT_CLASSES[level] : FK_HEAT_CLASSES[level]
                    }`}
                  />
                ))}
              </div>
            ))}
            <div className="grid grid-cols-6 items-center gap-1.5 pt-1">
              <span />
              {HEATMAP_HOURS.map((hr) => (
                <span
                  key={hr}
                  className="text-[10px] text-center text-slate-400 font-medium"
                >
                  {hr}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Pandas Data Cleaning Funnel */}
      {!compact && (
        <div
          className={`rounded-2xl p-5 border ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-500" />
              <h3
                className={`font-bold text-sm ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Pandas {isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart'} Data Cleaning & Spam Removal
              </h3>
            </div>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Automated Normalization
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                label: 'Raw Fetched',
                val: cleaning.raw_fetched_count,
                color: 'text-slate-800 dark:text-white',
              },
              {
                label: 'Duplicates Removed',
                val: `-${cleaning.duplicates_removed}`,
                color: 'text-amber-600',
              },
              {
                label: 'Emoji Spam Stripped',
                val: `-${cleaning.emoji_spam_removed}`,
                color: 'text-rose-600',
              },
              {
                label: 'Bot Promo Blocked',
                val: `-${cleaning.bot_repetitive_removed}`,
                color: 'text-purple-600',
              },
              {
                label: 'Valid Analyzed',
                val: cleaning.cleaned_valid_count,
                color: 'text-emerald-600',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-3.5 rounded-xl border ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-[#F6F7FB] border-slate-200/70'
                }`}
              >
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className={`text-lg font-extrabold mt-1 ${item.color}`}>
                  {typeof item.val === 'number'
                    ? item.val.toLocaleString()
                    : item.val}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
