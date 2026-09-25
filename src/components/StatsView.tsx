import React from 'react';
import { Flame, BookOpen, PenTool, Sparkles, TrendingUp, Heart } from 'lucide-react';
import { useDiary } from '../context/DiaryContext';
import { MOODS } from '../utils/constants';
import { MoodType } from '../types/diary';

export const StatsView: React.FC = () => {
  const { entries } = useDiary();

  // Total words
  const totalWords = entries.reduce(
    (acc, e) => acc + e.content.replace(/\s+/g, '').length,
    0
  );

  // Total days with entries
  const uniqueDays = new Set(entries.map(e => e.date)).size;

  // Streak calculation
  const calculateStreak = () => {
    if (entries.length === 0) return 0;
    const sortedDates = Array.from(new Set(entries.map(e => e.date))).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if wrote today or yesterday
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    let curr = new Date(sortedDates[0]);

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        streak++;
        curr = prev;
      } else if (diffDays === 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  const streakDays = calculateStreak();

  // Mood breakdown
  const moodCounts = MOODS.map(m => {
    const count = entries.filter(e => e.mood === m.type).length;
    const percentage = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
    return {
      ...m,
      count,
      percentage,
    };
  }).sort((a, b) => b.count - a.count);

  // Tag statistics
  const tagCounts: Record<string, number> = {};
  entries.forEach(e => {
    e.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Recent 7 days timeline trend
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('zh-TW', { weekday: 'narrow' });
    const dayEntries = entries.filter(e => e.date === dateStr);
    const primaryMood = dayEntries.length > 0 ? dayEntries[0].mood : null;
    const moodMeta = primaryMood ? MOODS.find(m => m.type === primaryMood) : null;

    return {
      dateStr,
      dayLabel,
      hasEntry: dayEntries.length > 0,
      count: dayEntries.length,
      moodMeta,
    };
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Editorial Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface mb-1">
          心情洞察與寫作軌跡
        </h2>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          回顧你的心靈起伏，看見堅持書寫帶來的平靜力量
        </p>
      </div>

      {/* Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface tabular-nums">
              {streakDays} <span className="text-xs font-normal text-on-surface-variant">天</span>
            </div>
            <div className="text-xs text-on-surface-variant">連續書寫紀錄</div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface tabular-nums">
              {entries.length} <span className="text-xs font-normal text-on-surface-variant">篇</span>
            </div>
            <div className="text-xs text-on-surface-variant">累積日記篇數 · {uniqueDays} 天</div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface tabular-nums">
              {totalWords.toLocaleString()} <span className="text-xs font-normal text-on-surface-variant">字</span>
            </div>
            <div className="text-xs text-on-surface-variant">記錄下的一字一句</div>
          </div>
        </div>
      </div>

      {/* Recent 7 Days Mood Trend */}
      <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">最近 7 天心情脈絡</h3>
          </div>
          <span className="text-xs text-on-surface-variant">一週情緒曲線</span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {last7Days.map((d, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                d.hasEntry
                  ? 'bg-surface border-outline-variant/40 shadow-xs'
                  : 'bg-surface-container-low border-dashed border-outline-variant/30'
              }`}
            >
              <span className="text-xs text-on-surface-variant font-medium">{d.dayLabel}</span>
              <div className="h-8 flex items-center justify-center">
                {d.moodMeta ? (
                  <span className="text-2xl" title={d.moodMeta.label}>
                    {d.moodMeta.emoji}
                  </span>
                ) : (
                  <span className="text-xs text-on-surface-variant/40">─</span>
                )}
              </div>
              <span className="text-[10px] text-on-surface-variant truncate w-full">
                {d.moodMeta ? d.moodMeta.label.slice(0, 2) : '無紀錄'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mood Distribution Breakdown */}
      <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">整體心情分布比例</h3>
          </div>
          <span className="text-xs text-on-surface-variant">總計 {entries.length} 次紀錄</span>
        </div>

        <div className="space-y-3">
          {moodCounts.map(m => (
            <div key={m.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.emoji}</span>
                  <span className="font-medium text-on-surface">{m.label}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums text-on-surface-variant">
                  <span>{m.count} 篇</span>
                  <span>·</span>
                  <span className="font-semibold text-on-surface">{m.percentage}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${m.percentage}%`,
                    backgroundColor: m.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Life Tags */}
      {topTags.length > 0 && (
        <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6">
          <h3 className="text-sm font-bold text-on-surface mb-3">最常關注的生活主題</h3>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <div
                key={tag}
                className="px-3 py-1.5 rounded-full bg-surface border border-outline-variant/30 text-xs text-on-surface flex items-center gap-1.5"
              >
                <span className="font-medium">#{tag}</span>
                <span className="text-on-surface-variant text-[11px] tabular-nums">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
