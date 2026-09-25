import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Star, Edit3, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useDiary } from '../context/DiaryContext';
import { MOODS, WEATHERS } from '../utils/constants';
import { DiaryEntry } from '../types/diary';

export const CalendarView: React.FC = () => {
  const { entries, openEditor, toggleFavorite, deleteEntry } = useDiary();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Days calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Map entries by date
  const entriesByDate = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, DiaryEntry[]>);

  // Selected date entries
  const selectedEntries = entriesByDate[selectedDateStr] || [];

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  // Calendar cells
  const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, d);
    cells.push({
      dateStr: prevDate.toISOString().split('T')[0],
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    // Format YYYY-MM-DD
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill 35 or 42 grid
  const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month + 1, d);
    cells.push({
      dateStr: nextDate.toISOString().split('T')[0],
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Calendar Card */}
      <div className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-7 shadow-xs">
        {/* Month Navigation Bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {year} 年 {month + 1} 月
            </h2>
            <button
              onClick={handleToday}
              className="text-xs px-3 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-primary font-medium transition-colors"
            >
              今天
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
              aria-label="上個月"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-9 h-9 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
              aria-label="下個月"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekdays.map((w, idx) => (
            <div
              key={w}
              className={`text-xs font-semibold py-1.5 ${
                idx === 0 || idx === 6 ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map(({ dateStr, dayNumber, isCurrentMonth }) => {
            const dayEntries = entriesByDate[dateStr] || [];
            const hasEntries = dayEntries.length > 0;
            const isSelected = selectedDateStr === dateStr;
            const isToday = todayStr === dateStr;

            // Pick latest mood emoji if available
            const latestMoodMeta = hasEntries
              ? MOODS.find(m => m.type === dayEntries[0].mood)
              : null;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`min-h-[58px] sm:min-h-[72px] p-1.5 rounded-2xl flex flex-col items-center justify-between transition-all relative ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary ring-offset-2 ring-offset-surface'
                    : isToday
                    ? 'bg-primary-container/60 text-on-primary-container border border-primary/40'
                    : isCurrentMonth
                    ? 'bg-surface hover:bg-surface-container-high text-on-surface'
                    : 'bg-transparent text-on-surface-variant/40'
                }`}
              >
                <span
                  className={`text-xs font-medium tabular-nums ${
                    isSelected ? 'font-bold' : ''
                  }`}
                >
                  {dayNumber}
                </span>

                {/* Mood indicator */}
                {hasEntries ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base sm:text-lg leading-none" title={latestMoodMeta?.label}>
                      {latestMoodMeta?.emoji || '📝'}
                    </span>
                    {dayEntries.length > 1 && (
                      <span
                        className={`text-[9px] font-bold ${
                          isSelected ? 'text-on-primary/90' : 'text-on-surface-variant'
                        }`}
                      >
                        +{dayEntries.length - 1}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Entries Detail Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="text-base sm:text-lg font-bold text-on-surface">
              {selectedDateStr} 的日記記錄
            </h3>
            <span className="text-xs text-on-surface-variant">
              ({selectedEntries.length} 篇)
            </span>
          </div>

          <button
            onClick={() => openEditor(null, selectedDateStr)}
            className="py-2 px-4 rounded-full bg-primary text-on-primary text-xs font-medium flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>新增此日日記</span>
          </button>
        </div>

        {selectedEntries.length === 0 ? (
          <div className="py-10 text-center rounded-3xl bg-surface-container/50 border border-dashed border-outline-variant/30 p-6">
            <p className="text-xs text-on-surface-variant mb-3">
              這一天尚未留下文字或心情紀錄
            </p>
            <button
              onClick={() => openEditor(null, selectedDateStr)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              立刻補寫這天的日記 ➔
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedEntries.map(entry => {
              const moodMeta = MOODS.find(m => m.type === entry.mood) || MOODS[1];
              const weatherMeta = WEATHERS.find(w => w.type === entry.weather);

              return (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-surface-container border border-outline-variant/30 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{moodMeta.emoji}</span>
                      <span className="text-xs font-bold text-on-surface">
                        {moodMeta.label}
                      </span>
                      {weatherMeta && (
                        <span className="text-xs">{weatherMeta.emoji}</span>
                      )}
                      <span className="text-xs text-on-surface-variant">
                        · {entry.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(entry.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          entry.isFavorite ? 'text-amber-500' : 'text-on-surface-variant'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${entry.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => openEditor(entry)}
                        className="w-7 h-7 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="w-7 h-7 rounded-full text-on-surface-variant hover:text-rose-500 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-on-surface mb-1.5">
                    {entry.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {entry.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
