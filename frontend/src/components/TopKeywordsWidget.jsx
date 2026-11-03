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
  LabelList,
} from 'recharts';
import { Filter } from 'lucide-react';

// Clean, cohesive palette (Indigo, Violet, Blue, Sky, Teal)
const BAR_COLORS = ['#6366F1', '#8B5CF6', '#3B82F6', '#0284C7', '#0D9488'];

export default function TopKeywordsWidget({
  keywords = [],
  darkMode,
  selectedKeyword,
  onSelectKeyword,
}) {
  const topFive = keywords.slice(0, 5).map((kw, idx) => ({
    ...kw,
    displayPct: `${Math.round(kw.percentage)}%`,
    color: BAR_COLORS[idx % BAR_COLORS.length],
  }));

  return (
    <div
      className={`rounded-2xl p-5 border flex flex-col justify-between transition-all h-full ${
        darkMode
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200/70 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3
            className={`font-bold text-sm ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Comment Topic Insights
          </h3>
          <p className="text-[11px] text-slate-400">
            Top recurring keywords in YT & IG comments
          </p>
        </div>

        {selectedKeyword ? (
          <button
            onClick={() => onSelectKeyword('')}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
          >
            <Filter className="w-3 h-3" />
            Clear #{selectedKeyword}
          </button>
        ) : (
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : 'bg-[#F6F7FB] border-slate-200 text-slate-600'
            }`}
          >
            Top 5 Topics
          </span>
        )}
      </div>

      {/* Sociafy Vertical Rounded Multi-Color Bar Chart */}
      {topFive.length === 0 ? (
        <div className="h-44 w-full flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-bold text-slate-400">0 Topics Extracted</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Paste a link in "+ Analyze" to extract top recurring keywords
          </p>
        </div>
      ) : (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topFive}
              margin={{ top: 18, right: 6, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={darkMode ? '#1e293b' : '#f1f5f9'}
                vertical={false}
              />
              <XAxis
                dataKey="word"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }}
                contentStyle={{
                  backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                  borderColor: darkMode ? '#1e293b' : '#f1f5f9',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value, _name, props) => [
                  `${props.payload.count} mentions (${value}%)`,
                  `#${props.payload.word} (${props.payload.dominant_sentiment})`,
                ]}
              />
              <Bar
                dataKey="percentage"
                radius={[10, 10, 10, 10]}
                barSize={34}
                onClick={(entry) =>
                  onSelectKeyword &&
                  onSelectKeyword(
                    selectedKeyword === entry.word ? '' : entry.word
                  )
                }
                className="cursor-pointer"
              >
                {topFive.map((entry, idx) => (
                  <Cell key={`kw-bar-${idx}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="displayPct"
                  position="top"
                  style={{
                    fill: darkMode ? '#cbd5e1' : '#334155',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Clickable Keyword Pills Below */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
        {keywords.slice(0, 7).map((kw, i) => {
          const isSelected =
            selectedKeyword &&
            selectedKeyword.toLowerCase() === kw.word.toLowerCase();
          return (
            <button
              key={kw.word}
              onClick={() =>
                onSelectKeyword(isSelected ? '' : kw.word)
              }
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1 border ${
                isSelected
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-[#F6F7FB] border-slate-200/80 text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
              />
              #{kw.word}
              <span className="text-[10px] opacity-70">({kw.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
