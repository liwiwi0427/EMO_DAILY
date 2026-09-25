import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Star,
  Edit3,
  Trash2,
  Filter,
  Plus,
  Heart,
  Search,
  SlidersHorizontal,
  ChevronRight,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react';
import { useDiary } from '../context/DiaryContext';
import { MOODS, WEATHERS } from '../utils/constants';
import { MoodType, DiaryEntry } from '../types/diary';

export const DiaryList: React.FC = () => {
  const {
    entries,
    searchQuery,
    setSearchQuery,
    selectedMoodFilter,
    setSelectedMoodFilter,
    selectedTagFilter,
    setSelectedTagFilter,
    showFavoritesOnly,
    setShowFavoritesOnly,
    openEditor,
    deleteEntry,
    toggleFavorite,
  } = useDiary();

  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Collect all unique tags for filter
  const allTags = Array.from(
    new Set(entries.flatMap(e => e.tags || []))
  ).filter(Boolean);

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = entry.title.toLowerCase().includes(q);
      const matchContent = entry.content.toLowerCase().includes(q);
      const matchTags = entry.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }

    // Mood filter
    if (selectedMoodFilter !== 'all' && entry.mood !== selectedMoodFilter) {
      return false;
    }

    // Tag filter
    if (selectedTagFilter !== 'all' && (!entry.tags || !entry.tags.includes(selectedTagFilter))) {
      return false;
    }

    // Favorites only
    if (showFavoritesOnly && !entry.isFavorite) {
      return false;
    }

    return true;
  });

  const getMoodMeta = (moodType: MoodType) => {
    return MOODS.find(m => m.type === moodType) || MOODS[1];
  };

  const getWeatherMeta = (wType?: string) => {
    return WEATHERS.find(w => w.type === wType);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Editorial Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-surface-container border border-outline-variant/30 shadow-sm">
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
              <span>今日記錄</span>
              <span aria-hidden="true">·</span>
              <span>{new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mb-2.5">
              傾聽內心的聲音，寫下生活的微光
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              每一天的心情都值得被溫柔珍藏。透過端對端密碼保護，守護你專屬的私密天地。
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => openEditor()}
              className="py-3 px-6 rounded-full bg-primary text-on-primary font-semibold text-sm flex items-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>記下今日心緒</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative cover image */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none hidden lg:block overflow-hidden">
          <img
            src="/src/assets/images/diary_peaceful_cover_1790347985100.jpg"
            alt="Diary Cover"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover mix-blend-luminosity"
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3">
        {/* Mood Interactive Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedMoodFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              selectedMoodFilter === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            全部心情 ({entries.length})
          </button>
          {MOODS.map(m => {
            const count = entries.filter(e => e.mood === m.type).length;
            const isSelected = selectedMoodFilter === m.type;
            return (
              <button
                key={m.type}
                onClick={() => setSelectedMoodFilter(isSelected ? 'all' : m.type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label.slice(0, 2)}</span>
                {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters: Favorites & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors ${
                showFavoritesOnly
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
              <span>僅看精選 ({entries.filter(e => e.isFavorite).length})</span>
            </button>

            {allTags.length > 0 && (
              <select
                value={selectedTagFilter}
                onChange={e => setSelectedTagFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant text-xs outline-none"
              >
                <option value="all">所有標籤分類</option>
                {allTags.map(t => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-on-surface-variant">
            共 <span className="font-semibold text-on-surface">{filteredEntries.length}</span> 篇日誌
          </div>
        </div>
      </div>

      {/* Diary Entries Feed */}
      {filteredEntries.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-surface-container/60 border border-dashed border-outline-variant/40 p-8">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-on-surface mb-1">
            {searchQuery || selectedMoodFilter !== 'all' || showFavoritesOnly
              ? '沒有符合條件的日記'
              : '還沒有寫下任何日記'}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto mb-5 leading-relaxed">
            {searchQuery || selectedMoodFilter !== 'all'
              ? '嘗試清除搜尋關鍵字或心情篩選器來查看更多記錄'
              : '生活裡的平凡事物，都是最珍貴的篇章。按下按鈕開始記錄吧！'}
          </p>
          <button
            onClick={() => {
              if (searchQuery || selectedMoodFilter !== 'all' || showFavoritesOnly) {
                setSearchQuery('');
                setSelectedMoodFilter('all');
                setShowFavoritesOnly(false);
                setSelectedTagFilter('all');
              } else {
                openEditor();
              }
            }}
            className="py-2.5 px-5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:opacity-90 transition-all"
          >
            {searchQuery || selectedMoodFilter !== 'all' || showFavoritesOnly
              ? '重設所有篩選'
              : '撰寫第一篇日記'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(entry => {
            const moodMeta = getMoodMeta(entry.mood);
            const weatherMeta = getWeatherMeta(entry.weather);
            const isExpanded = expandedEntryId === entry.id;
            const wordCount = entry.content.replace(/\s+/g, '').length;

            return (
              <article
                key={entry.id}
                className="group rounded-3xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 transition-all p-5 sm:p-6 shadow-xs hover:shadow-md"
              >
                {/* Header row: Mood, Weather, Date & Time, Actions */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" title={moodMeta.label}>
                      {moodMeta.emoji}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{moodMeta.label}</span>
                      {weatherMeta && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span title={weatherMeta.label}>{weatherMeta.emoji}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{entry.date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(entry.id)}
                      title={entry.isFavorite ? '取消精選' : '加入精選'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        entry.isFavorite
                          ? 'text-amber-500'
                          : 'text-on-surface-variant opacity-40 hover:opacity-100 hover:bg-surface-container-highest'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${entry.isFavorite ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => openEditor(entry)}
                      title="編輯日記"
                      className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest flex items-center justify-center transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(entry.id)}
                      title="刪除日記"
                      className="w-8 h-8 rounded-full text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-on-surface mb-2 leading-snug">
                  {entry.title}
                </h3>

                {/* Content snippet or full text */}
                <div className="text-sm text-on-surface/90 leading-relaxed whitespace-pre-line mb-3.5">
                  {isExpanded || entry.content.length <= 200 ? (
                    entry.content
                  ) : (
                    <>
                      {entry.content.slice(0, 200)}...
                      <button
                        onClick={() => setExpandedEntryId(entry.id)}
                        className="ml-2 text-primary font-semibold hover:underline"
                      >
                        閱讀全文
                      </button>
                    </>
                  )}
                  {isExpanded && entry.content.length > 200 && (
                    <button
                      onClick={() => setExpandedEntryId(null)}
                      className="ml-2 text-primary font-semibold hover:underline block mt-1"
                    >
                      收起
                    </button>
                  )}
                </div>

                {/* Photo Attachments Preview */}
                {entry.images && entry.images.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3.5">
                    {entry.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-outline-variant/30"
                      >
                        <img
                          src={img}
                          alt="日記相片"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Metadata: Tags & Word Count (Zero-Pill formatting) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.tags && entry.tags.length > 0 ? (
                      entry.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTagFilter(tag)}
                          className="hover:text-primary transition-colors"
                        >
                          #{tag}
                        </button>
                      ))
                    ) : (
                      <span>未分類</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{wordCount} 字</span>
                    <span aria-hidden="true">·</span>
                    <span>約 {Math.max(1, Math.ceil(wordCount / 300))} 分鐘閱讀</span>
                  </div>
                </div>

                {/* Delete Confirm Popover */}
                {deleteConfirmId === entry.id && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 animate-fade-in">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      確定要刪除這篇日記嗎？刪除後無法復原。
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 rounded-full text-xs font-medium text-on-surface-variant hover:bg-surface-container"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          deleteEntry(entry.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                      >
                        確定刪除
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
