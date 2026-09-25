import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Image, Star, Calendar, Clock, Tag, Trash2, Check, Smile } from 'lucide-react';
import { DiaryEntry, MoodType, WeatherType } from '../types/diary';
import { MOODS, WEATHERS, DEFAULT_TAGS, REFLECTION_PROMPTS } from '../utils/constants';
import { useDiary } from '../context/DiaryContext';

export const DiaryEditorModal: React.FC = () => {
  const { isEditorOpen, editingEntry, closeEditor, addEntry, updateEntry } = useDiary();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [mood, setMood] = useState<MoodType>('happy');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      setTitle(editingEntry.title || '');
      setContent(editingEntry.content || '');
      setDate(editingEntry.date || new Date().toISOString().split('T')[0]);
      setTime(
        editingEntry.time ||
          new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setMood(editingEntry.mood || 'happy');
      setWeather(editingEntry.weather || 'sunny');
      setTags(editingEntry.tags || []);
      setImages(editingEntry.images || []);
      setIsFavorite(!!editingEntry.isFavorite);
    }
  }, [editingEntry]);

  if (!isEditorOpen) return null;

  const isEditingExisting = !!(editingEntry && editingEntry.id);

  const handleSave = () => {
    if (!content.trim() && !title.trim()) {
      alert('請至少輸入標題或日記內容');
      return;
    }

    const payload = {
      title: title.trim() || '無題隨想',
      content: content.trim(),
      date,
      time,
      mood,
      weather,
      tags,
      images,
      isFavorite,
    };

    if (isEditingExisting) {
      updateEntry(editingEntry.id, payload);
    } else {
      addEntry(payload);
    }

    closeEditor();
  };

  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert('照片檔案大小請小於 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          setImages(prev => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const wordCount = content.replace(/\s+/g, '').length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 300));

  const currentMoodMeta = MOODS.find(m => m.type === mood) || MOODS[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl my-auto rounded-3xl bg-surface-container-high border border-outline-variant/40 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentMoodMeta.emoji}</span>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {isEditingExisting ? '編輯心情日記' : '撰寫今日心情日誌'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span>{wordCount} 字</span>
                <span>·</span>
                <span>約 {readTimeMinutes} 分鐘閱讀</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              title={isFavorite ? '取消精選' : '加入精選'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isFavorite
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
            </button>
            <button
              onClick={closeEditor}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1">
          {/* Mood Selector - Material 3 segmented pill selector */}
          <div>
            <label className="text-xs font-semibold text-on-surface mb-2 block flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-primary" />
              <span>今日心情狀態</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {MOODS.map(m => {
                const isSelected = mood === m.type;
                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setMood(m.type)}
                    className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all text-center ${
                      isSelected
                        ? 'border-primary bg-primary-container text-on-primary-container shadow-sm scale-102 font-bold'
                        : 'border-outline-variant/30 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">{m.emoji}</span>
                    <span className="text-[11px] whitespace-nowrap">{m.label.slice(0, 2)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date, Time and Weather Meta Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent text-xs text-on-surface outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-transparent text-xs text-on-surface outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/30">
              <span className="text-xs text-on-surface-variant shrink-0">天氣：</span>
              <div className="flex items-center gap-1 overflow-x-auto w-full">
                {WEATHERS.map(w => (
                  <button
                    key={w.type}
                    type="button"
                    onClick={() => setWeather(w.type)}
                    title={w.label}
                    className={`px-1.5 py-0.5 rounded-lg text-sm transition-transform ${
                      weather === w.type
                        ? 'bg-secondary-container scale-110 shadow-xs'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {w.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inspiration Prompts Dropdown Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowPromptPicker(!showPromptPicker)}
              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline py-0.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showPromptPicker ? '收起靈感提示' : '不知道寫什麼？看看今日反思引導'}</span>
            </button>

            {showPromptPicker && (
              <div className="mt-2 p-3 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-1.5 animate-fade-in">
                <div className="text-[11px] font-semibold text-on-surface-variant mb-1">
                  點擊套用寫作靈感：
                </div>
                {REFLECTION_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setContent(prev => (prev ? prev + '\n\n' + prompt + '\n' : prompt + '\n'));
                      setShowPromptPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs text-on-surface hover:bg-surface-container-highest transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      套用 ↵
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="日記標題（例如：安靜美好的午後時光）"
              className="w-full py-2.5 px-3.5 rounded-2xl bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Main Content Textarea */}
          <div>
            <textarea
              rows={8}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="今天過得如何？記錄下讓你有感觸的事情、當下的心情與對明天的期許..."
              className="w-full p-4 rounded-2xl bg-surface-container border border-outline-variant/30 text-sm text-on-surface placeholder:text-on-surface-variant/60 leading-relaxed outline-none focus:border-primary transition-all resize-y min-h-[160px]"
            />
          </div>

          {/* Photos Attachment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-primary" />
                <span>相片紀錄 ({images.length})</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-primary hover:underline"
              >
                + 新增相片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border border-outline-variant/30">
                    <img
                      src={img}
                      alt="日記相片"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-on-surface mb-2 block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>分類標籤</span>
            </label>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-medium"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick tag suggestions & custom tag input */}
            <div className="flex flex-wrap items-center gap-1.5">
              {DEFAULT_TAGS.filter(t => !tags.includes(t)).slice(0, 6).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAddTag(t)}
                  className="px-2.5 py-1 rounded-full text-xs text-on-surface-variant bg-surface-container hover:bg-surface-container-highest transition-colors"
                >
                  + {t}
                </button>
              ))}

              <div className="inline-flex items-center">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(newTagInput);
                    }
                  }}
                  placeholder="自訂標籤..."
                  className="w-24 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-outline-variant/30 bg-surface-container/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={closeEditor}
            className="px-5 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-primary text-on-primary text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isEditingExisting ? '儲存更新' : '儲存日記'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
