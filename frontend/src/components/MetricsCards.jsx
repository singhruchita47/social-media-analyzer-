import React from 'react';
import {
  Users,
  Heart,
  Eye,
  BarChart2,
  MessageSquareText,
  SmilePlus,
  Frown,
  Meh,
  TrendingUp,
} from 'lucide-react';

function formatMetricNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  return num.toLocaleString();
}

export default function MetricsCards({
  stats,
  selectedPlatform = 'youtube',
  isLiveSinglePost = false,
  darkMode,
  onSelectSentiment,
  showReachRow = true,
  showSentimentRow = false,
}) {
  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';
  const isFK = selectedPlatform === 'flipkart';
  const reach = stats?.reach_overview || {
    total_followers: 0,
    followers_growth_pct: 0.0,
    total_engagement: 0,
    engagement_growth_pct: 0.0,
    total_reach: 0,
    reach_growth_pct: 0.0,
    total_impressions: 0,
    impressions_growth_pct: 0.0,
  };

  const totalComments = stats?.total_comments_analyzed ?? 0;
  const bd = stats?.sentiment_breakdown || {
    positive_count: 0,
    negative_count: 0,
    neutral_count: 0,
    mixed_count: 0,
    primary_positive_pct: 0.0,
    primary_negative_pct: 0.0,
    primary_neutral_pct: 0.0,
  };

  const hasData =
    totalComments > 0 ||
    (reach.total_impressions || 0) > 0 ||
    (reach.total_followers || 0) > 0;

  const reachCards = [
    {
      title: isYT ? 'YouTube Subscribers' : isIG ? 'Instagram Followers' : 'Flipkart Product Rating',
      value: isFK ? (hasData ? '4.4★' : '0★') : formatMetricNumber(reach.total_followers),
      topBorder: 'border-t-2 border-t-indigo-500/70',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? (isFK ? 'Verified Product' : 'Live Channel')
        : `+${reach.followers_growth_pct}%`,
      subtitle: !hasData
        ? `Paste a ${isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart'} link to fetch data`
        : isYT
        ? 'Real YouTube channel subscribers'
        : isIG
        ? 'Instagram business followers'
        : 'Flipkart certified customer ratings',
      icon: Users,
      iconCircle: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30',
    },
    {
      title: isYT ? 'YouTube Engagement' : isIG ? 'Instagram Engagement' : 'Flipkart Customer Ratings',
      value: formatMetricNumber(reach.total_engagement),
      topBorder: 'border-t-2 border-t-emerald-500/70',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? (isFK ? '5-Star Ratings' : 'Real Likes + Comments')
        : `+${reach.engagement_growth_pct}%`,
      subtitle: !hasData
        ? '0 likes • 0 comments'
        : isFK
        ? `${(stats?.total_engagement_likes || 0).toLocaleString()} 5-star likes • ${totalComments.toLocaleString()} reviews`
        : `${(stats?.total_engagement_likes || 0).toLocaleString()} likes • ${totalComments.toLocaleString()} comments`,
      icon: Heart,
      iconCircle: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
    },
    {
      title: isYT ? 'YouTube Unique Reach' : isIG ? 'Instagram Reach' : 'Product Impressions / Reach',
      value: formatMetricNumber(reach.total_reach),
      topBorder: 'border-t-2 border-t-rose-500/70',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? 'Real Reach'
        : `+${reach.reach_growth_pct}%`,
      subtitle: !hasData
        ? 'No post analyzed yet'
        : `Unique audience reached on ${isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart Store'}`,
      icon: Eye,
      iconCircle: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
    },
    {
      title: isYT ? 'YouTube Total Views' : isIG ? 'Instagram Impressions' : 'Flipkart Total Reviews Scraped',
      value: formatMetricNumber(reach.total_impressions),
      topBorder: 'border-t-2 border-t-amber-500/70',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? (isFK ? 'Total Reviews' : 'Real Views')
        : `+${reach.impressions_growth_pct}%`,
      subtitle: !hasData
        ? 'No views fetched yet'
        : isFK
        ? 'Verified buyer reviews analyzed'
        : `Exact ${isYT ? 'YouTube viewCount' : 'Instagram impressions'}`,
      icon: BarChart2,
      iconCircle: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
    },
  ];

  // Refined Minimalist Sentiment Cards
  const sentimentCards = [
    {
      id: 'all',
      headerTitle: `${isYT ? 'YouTube' : isIG ? 'Instagram' : 'Flipkart'} ${isFK ? 'Reviews' : 'Comments'} Analyzed`,
      value: totalComments.toLocaleString(),
      badge: totalComments > 0 ? '100% Cleaned' : '0 comments',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      subtitle: 'Cleaned via Pandas & scored by AI',
      headerBg: 'bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200',
      icon: MessageSquareText,
      iconColor: 'text-slate-500',
    },
    {
      id: 'Positive',
      headerTitle: 'Positive Comments',
      value: `${Math.round(bd.primary_positive_pct ?? 0)}%`,
      badge: `${(bd.positive_count ?? 0).toLocaleString()} happy`,
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50',
      subtitle: 'Positive audience appreciation & praise',
      headerBg: 'bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100/70 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300',
      icon: SmilePlus,
      iconColor: 'text-emerald-600',
    },
    {
      id: 'Negative',
      headerTitle: 'Negative / Problem Comments',
      value: `${Math.round(bd.primary_negative_pct ?? 0)}%`,
      badge: `${(bd.negative_count ?? 0).toLocaleString()} issues`,
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/50',
      subtitle: 'Price, delivery & quality complaints',
      headerBg: 'bg-rose-50/60 dark:bg-rose-950/30 border-b border-rose-100/70 dark:border-rose-900/30 text-rose-800 dark:text-rose-300',
      icon: Frown,
      iconColor: 'text-rose-600',
    },
    {
      id: 'Neutral',
      headerTitle: 'Neutral & Mixed Feedback',
      value: `${Math.round(bd.primary_neutral_pct ?? 0)}%`,
      badge: `${((bd.neutral_count ?? 0) + (bd.mixed_count ?? 0)).toLocaleString()} threads`,
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50',
      subtitle: 'Contrastive ("Yes, But…") & neutral statements',
      headerBg: 'bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-100/70 dark:border-amber-900/30 text-amber-800 dark:text-amber-300',
      icon: Meh,
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-4">
      {showReachRow && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {reachCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5 ${card.topBorder} ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/70 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {card.title}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconCircle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2.5">
                  <h3
                    className={`text-3xl font-extrabold tracking-tight ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {card.value}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      hasData
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {card.growth}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  {card.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {showSentimentRow && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {sentimentCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.headerTitle}
                onClick={() =>
                  onSelectSentiment && onSelectSentiment(card.id)
                }
                className={`rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/70 shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold ${card.headerBg}`}
                >
                  <span className="tracking-tight">
                    {card.headerTitle}
                  </span>
                  <Icon className={`w-4 h-4 ${card.iconColor || ''}`} />
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-3xl font-extrabold tracking-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {card.value}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${card.badgeClass}`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
