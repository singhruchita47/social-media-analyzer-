import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { MoreHorizontal } from 'lucide-react';

export default function SentimentDonutChart({ stats, darkMode, onSelectSentiment }) {
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

  const numpyStats = stats?.numpy_global_stats || {
    confidence_average: 0.0,
    rating_variance: 0.0,
  };

  const hasData = totalComments > 0;

  // Clean, modern SaaS Donut Palette (Emerald Positive, Indigo Questions, Slate Neutral, Rose Negative)
  const chartData = hasData
    ? [
        {
          name: 'Positive',
          label: 'Positive Comments',
          value: bd.positive_count || 0,
          pct: Math.round(bd.primary_positive_pct ?? 0),
          color: '#10B981',
        },
        ...(bd.question_count > 0
          ? [
              {
                name: 'Question',
                label: 'Customer Inquiries',
                value: bd.question_count,
                pct: Math.round(bd.primary_question_pct ?? 0),
                color: '#6366F1',
              },
            ]
          : []),
        {
          name: 'Neutral',
          label: 'Neutral / Mixed',
          value: (bd.neutral_count || 0) + (bd.mixed_count || 0),
          pct: Math.round(bd.primary_neutral_pct ?? 0),
          color: '#94A3B8',
        },
        {
          name: 'Negative',
          label: 'Negative Comments',
          value: bd.negative_count || 0,
          pct: Math.round(bd.primary_negative_pct ?? 0),
          color: '#F43F5E',
        },
      ]
    : [
        {
          name: 'Empty',
          label: 'No Comments Yet',
          value: 1,
          pct: 0,
          color: darkMode ? '#1e293b' : '#E2E8F0',
        },
      ];

  const legendItems = [
    {
      name: 'Positive',
      label: 'Positive Comments',
      pct: hasData ? Math.round(bd.primary_positive_pct ?? 0) : 0,
      color: '#F48245',
      textColor: 'text-[#9A3412]',
    },
    ...(hasData && (bd.question_count || 0) > 0
      ? [
          {
            name: 'Question',
            label: 'Questions / Inquiries',
            pct: Math.round(bd.primary_question_pct ?? 0),
            color: '#3B82F6',
            textColor: 'text-[#1D4ED8]',
          },
        ]
      : []),
    {
      name: 'Neutral',
      label: 'Neutral / Mixed',
      pct: hasData ? Math.round(bd.primary_neutral_pct ?? 0) : 0,
      color: '#5CE080',
      textColor: 'text-[#065F46]',
    },
    {
      name: 'Negative',
      label: 'Negative Comments',
      pct: hasData ? Math.round(bd.primary_negative_pct ?? 0) : 0,
      color: '#2CC5F6',
      textColor: 'text-[#075985]',
    },
  ];

  return (
    <div
      className={`rounded-2xl p-5 border flex flex-col justify-between transition-all h-full ${
        darkMode
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200/70 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3
            className={`font-bold text-sm ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Audience Comment Sentiment
          </h3>
          <p className="text-[11px] text-slate-400">
            {hasData
              ? 'Click any segment to filter comments'
              : 'Waiting for link analysis (0 comments)'}
          </p>
        </div>
        <span
          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
            darkMode
              ? 'border-slate-800 text-slate-400'
              : 'border-slate-200 text-slate-400'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </span>
      </div>

      {/* Side-by-Side Donut + Legend */}
      <div className="grid grid-cols-12 items-center gap-2 my-auto py-2">
        <div className="col-span-7 relative h-48 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={hasData ? 4 : 0}
                cornerRadius={hasData ? 8 : 0}
                stroke="none"
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.color}
                    className={hasData ? 'cursor-pointer hover:opacity-85' : ''}
                    onClick={() =>
                      hasData &&
                      onSelectSentiment &&
                      onSelectSentiment(entry.name)
                    }
                  />
                ))}
              </Pie>
              {hasData && (
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#1e293b' : '#f1f5f9',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    `${value.toLocaleString()} comments`,
                    name,
                  ]}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={`text-2xl font-black ${
                darkMode ? 'text-white' : 'text-slate-950'
              }`}
            >
              {hasData ? '100%' : '0%'}
            </span>
            <span className="text-xs text-slate-600 font-bold">
              {totalComments.toLocaleString()} Total
            </span>
          </div>
        </div>

        {/* Right Legend */}
        <div className="col-span-5 space-y-3">
          {legendItems.map((item) => (
            <button
              key={item.name}
              onClick={() =>
                hasData && onSelectSentiment && onSelectSentiment(item.name)
              }
              className="w-full text-left group block"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-semibold text-slate-700 truncate">
                  {item.label}
                </span>
              </div>
              <p
                className={`text-lg font-black pl-4 mt-0.5 ${
                  darkMode ? 'text-white' : item.textColor || 'text-slate-950'
                }`}
              >
                {item.pct}%
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom NumPy Confidence & Variance Pill */}
      <div
        className={`px-3 py-2 rounded-xl border flex items-center justify-between text-[11px] ${
          darkMode
            ? 'bg-slate-950 border-slate-800 text-slate-400'
            : 'bg-[#F6F7FB] border-slate-200/70 text-slate-500'
        }`}
      >
        <span>
          AI Confidence:{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            {hasData
              ? `${Math.round((numpyStats.confidence_average || 0) * 100)}%`
              : '0%'}
          </strong>
        </span>
        <span>
          NumPy Var:{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            σ² = {hasData ? numpyStats.rating_variance : 0}
          </strong>
        </span>
      </div>
    </div>
  );
}
