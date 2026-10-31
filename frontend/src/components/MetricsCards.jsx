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
  ArrowUpRight,
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
      title: isYT ? 'YouTube Subscribers' : 'Instagram Followers',
      value: formatMetricNumber(reach.total_followers),
      valueColor: 'text-[#2E2787]',
      topBorder: 'border-t-4 border-t-[#4F46E5]',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? 'Live Channel'
        : `+${reach.followers_growth_pct}%`,
      subtitle: !hasData
        ? `Paste a ${isYT ? 'YouTube' : 'Instagram'} link to fetch subscribers`
        : isYT
        ? 'Real YouTube channel subscribers'
        : 'Instagram business followers',
      icon: Users,
      iconCircle: 'bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/30',
    },
    {
      title: isYT ? 'YouTube Engagement' : 'Instagram Engagement',
      value: formatMetricNumber(reach.total_engagement),
      valueColor: 'text-[#065F46]',
      topBorder: 'border-t-4 border-t-[#10B981]',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? 'Real Likes + Comments'
        : `+${reach.engagement_growth_pct}%`,
      subtitle: !hasData
        ? '0 likes • 0 comments'
        : `${(stats?.total_engagement_likes || 0).toLocaleString()} likes • ${totalComments.toLocaleString()} comments`,
      icon: Heart,
      iconCircle: 'bg-[#10B981] text-white shadow-md shadow-[#10B981]/30',
    },
    {
      title: isYT ? 'YouTube Unique Reach' : 'Instagram Reach',
      value: formatMetricNumber(reach.total_reach),
      valueColor: 'text-[#991B1B]',
      topBorder: 'border-t-4 border-t-[#EF4444]',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? 'Real Reach'
        : `+${reach.reach_growth_pct}%`,
      subtitle: !hasData
        ? 'No post analyzed yet'
        : `Unique audience reached on ${isYT ? 'YouTube' : 'Instagram'}`,
      icon: Eye,
      iconCircle: 'bg-[#EF4444] text-white shadow-md shadow-[#EF4444]/30',
    },
    {
      title: isYT ? 'YouTube Total Views' : 'Instagram Impressions',
      value: formatMetricNumber(reach.total_impressions),
      valueColor: 'text-[#92400E]',
      topBorder: 'border-t-4 border-t-[#F59E0B]',
      growth: !hasData
        ? '0%'
        : isLiveSinglePost
        ? 'Real Views'
        : `+${reach.impressions_growth_pct}%`,
      subtitle: !hasData
        ? 'No views fetched yet'
        : `Exact ${isYT ? 'YouTube viewCount' : 'Instagram impressions'}`,
      icon: BarChart2,
      iconCircle: 'bg-[#F59E0B] text-white shadow-md shadow-[#F59E0B]/30',
    },
  ];

  // Learner Hub + Folder-Header Highlighted Cards with Deep Dark Numbers
  const sentimentCards = [
    {
      id: 'all',
      headerTitle: `${isYT ? 'YouTube' : 'Instagram'} Comments Analyzed`,
      value: totalComments.toLocaleString(),
      valueColor: 'text-[#2E2787]',
      badge: totalComments > 0 ? '100% Cleaned' : '0 comments',
      badgeGood: true,
      subtitle: 'Cleaned via Pandas & scored by Gemini',
      headerBg: 'bg-[#4F46E5]',
      icon: MessageSquareText,
    },
    {
      id: 'Positive',
      headerTitle: 'Positive Comments',
      value: `${Math.round(bd.primary_positive_pct ?? 0)}%`,
      valueColor: 'text-[#065F46]',
      badge: `${(bd.positive_count ?? 0).toLocaleString()} happy`,
      badgeGood: true,
      subtitle: 'Positive audience appreciation & praise',
      headerBg: 'bg-[#10B981]',
      icon: SmilePlus,
    },
    {
      id: 'Negative',
      headerTitle: 'Negative / Problem Comments',
      value: `${Math.round(bd.primary_negative_pct ?? 0)}%`,
      valueColor: 'text-[#991B1B]',
      badge: `${(bd.negative_count ?? 0).toLocaleString()} issues`,
      badgeGood: false,
      subtitle: 'Price, delivery & quality complaints',
      headerBg: 'bg-[#EF4444]',
      icon: Frown,
    },
    {
      id: 'Neutral',
      headerTitle: 'Neutral & Mixed Feedback',
      value: `${Math.round(bd.primary_neutral_pct ?? 0)}%`,
      valueColor: 'text-[#92400E]',
      badge: `${((bd.neutral_count ?? 0) + (bd.mixed_count ?? 0)).toLocaleString()} threads`,
      badgeGood: false,
      subtitle: 'Contrastive ("Yes, But…") & questions',
      headerBg: 'bg-[#F59E0B]',
      headerTextDark: false,
      icon: Meh,
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
                className={`rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-1 ${card.topBorder} ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200/80 ring-1 ring-white shadow-[0_12px_30px_-4px_rgba(15,23,42,0.14)] hover:shadow-[0_18px_38px_-4px_rgba(15,23,42,0.2)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wide ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {card.title}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconCircle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2.5">
                  <h3
                    className={`text-3xl font-black tracking-tight ${
                      darkMode ? 'text-white' : card.valueColor
                    }`}
                  >
                    {card.value}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      hasData
                        ? 'bg-emerald-500/20 text-[#065F46] dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {card.growth}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600 mt-2">
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
                className={`rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200/80 ring-1 ring-white shadow-[0_12px_30px_-4px_rgba(15,23,42,0.14)] hover:shadow-[0_18px_38px_-4px_rgba(15,23,42,0.2)]'
                }`}
              >
                <div
                  className={`px-4 py-3 flex items-center justify-between ${card.headerBg} ${
                    card.headerTextDark ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  <span className="text-xs font-extrabold tracking-tight">
                    {card.headerTitle}
                  </span>
                  <Icon className="w-4 h-4 opacity-95" />
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-3xl font-black tracking-tight ${
                        darkMode ? 'text-white' : card.valueColor
                      }`}
                    >
                      {card.value}
                    </span>
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        card.badgeGood
                          ? 'bg-emerald-500/20 text-[#065F46]'
                          : 'bg-rose-500/20 text-[#991B1B]'
                      }`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5">
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
