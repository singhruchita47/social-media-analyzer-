import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function EngagementTrendsChart({
  stats,
  selectedPlatform = 'youtube',
  historyItems = [],
  darkMode,
}) {
  const isYT = selectedPlatform === 'youtube';
  const trends = stats?.engagement_trends || [];

  // Build platform-only trend series (never mixing YT and IG)
  const chartData =
    historyItems.length > 0
      ? historyItems
          .slice(0, 6)
          .reverse()
          .map((item, idx, arr) => ({
            shortLabel: item.post_title.slice(0, 10) + '…',
            fullTitle: item.post_title,
            comments: item.total_comments || 0,
            views_or_reach: item.video_views || item.post_reach || (item.total_comments * 250),
            positive_comments: item.sentiment_breakdown?.positive_count || 0,
            negative_comments: item.sentiment_breakdown?.negative_count || 0,
            isHighlighted: idx === arr.length - 1,
          }))
      : trends.map((t, idx) => ({
          shortLabel: t.date || t.label,
          fullTitle: `${isYT ? 'YouTube' : 'Instagram'} (${t.date})`,
          comments: isYT ? t.youtube_comments : t.instagram_comments,
          views_or_reach: isYT ? t.youtube_engagement * 12 : t.instagram_engagement * 8,
          positive_comments: Math.round(
            (isYT ? t.youtube_comments : t.instagram_comments) * 0.62
          ),
          negative_comments: Math.round(
            (isYT ? t.youtube_comments : t.instagram_comments) * 0.23
          ),
          isHighlighted: idx === trends.length - 1,
        }));

  // Light YouTube Red / Instagram Pink bar palette
  const primaryColor = isYT ? '#EF4444' : '#F469A9';
  const secondaryColor = isYT ? '#FCA5A5' : '#F9A8D4';

  return (
    <div
      className={`rounded-2xl p-5 border flex flex-col justify-between transition-all h-full ${
        darkMode
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200/70 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3
            className={`font-bold text-sm ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {isYT ? 'YouTube Views & Comment Trend' : 'Instagram Reach & Comment Trend'}
          </h3>
          <p className="text-[11px] text-slate-400">
            {isYT
              ? 'Analyzed YouTube Videos/Shorts performance'
              : 'Analyzed Instagram Reels/Posts performance'}
          </p>
        </div>

        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            darkMode
              ? 'bg-slate-950 border-slate-800 text-slate-300'
              : 'bg-[#F8F9FC] border-slate-200/80 text-slate-600'
          }`}
        >
          {isYT ? 'YouTube Only' : 'Instagram Only'}
        </span>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={darkMode ? '#1e293b' : '#f1f5f9'}
              vertical={false}
            />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }}
              contentStyle={{
                backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                borderColor: darkMode ? '#1e293b' : '#f1f5f9',
                borderRadius: '14px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
                fontSize: '12px',
              }}
              labelFormatter={(_lbl, payload) =>
                payload?.[0]?.payload?.fullTitle || _lbl
              }
            />
            <Bar
              dataKey="positive_comments"
              name="Positive Comments"
              stackId="a"
              radius={[0, 0, 8, 8]}
              barSize={28}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-bottom-${index}`}
                  fill={
                    entry.isHighlighted
                      ? primaryColor
                      : darkMode
                      ? '#334155'
                      : '#E8ECF4'
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="negative_comments"
              name="Negative Comments"
              stackId="a"
              radius={[8, 8, 0, 0]}
              barSize={28}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-top-${index}`}
                  fill={
                    entry.isHighlighted
                      ? secondaryColor
                      : darkMode
                      ? '#475569'
                      : '#F1F5F9'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Mini Legend */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: primaryColor }}
            />
            Latest Analyzed {isYT ? 'Short/Video' : 'Post'}
          </span>
        </div>
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {(stats?.reach_overview?.total_impressions || 0).toLocaleString()} {isYT ? 'Views' : 'Impressions'}
        </span>
      </div>
    </div>
  );
}
