import React from 'react';
import { Lock, Sun, Moon, Search, Plus, CloudCheck, CloudUpload, ShieldAlert } from 'lucide-react';
import { useDiary } from '../context/DiaryContext';

interface TopAppBarProps {
  onOpenPasscodeModal: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ onOpenPasscodeModal }) => {
  const {
    isDarkMode,
    toggleDarkMode,
    lockApp,
    securitySettings,
    searchQuery,
    setSearchQuery,
    openEditor,
    currentView,
    triggerCloudBackup,
    isBackingUp,
    lastCloudSyncTime,
  } = useDiary();

  return (
    <header className="sticky top-0 z-30 w-full bg-surface/90 dark:bg-surface-dim/90 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark (Clean single-element with brand icon) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-outline-variant/40 shrink-0">
            <img
              src="/src/assets/images/app_icon_mindful_1790371108480.jpg"
              alt="心語日誌 App Icon"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-on-surface whitespace-nowrap">
            心語日誌
          </span>
        </div>

        {/* Zone 2: Search or Context Info */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋心情、日記內容或標籤..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-surface-container text-xs text-on-surface placeholder:text-on-surface-variant/70 border border-outline-variant/30 outline-none focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cloud Sync trigger */}
          <button
            onClick={() => triggerCloudBackup()}
            disabled={isBackingUp}
            title={lastCloudSyncTime ? `上次同步：${new Date(lastCloudSyncTime).toLocaleTimeString('zh-TW')}` : '備份到雲端'}
            className="h-9 px-2.5 sm:px-3 rounded-full text-xs font-medium text-on-surface-variant hover:bg-surface-container flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isBackingUp ? (
              <CloudUpload className="w-4 h-4 animate-bounce text-primary" />
            ) : (
              <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden md:inline">{isBackingUp ? '備份中...' : '雲端備份'}</span>
          </button>

          {/* Quick Lock / Privacy Indicator */}
          {securitySettings.isPasscodeEnabled ? (
            <button
              onClick={lockApp}
              title="立即上鎖保護隱私"
              className="h-9 w-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
              aria-label="立即上鎖"
            >
              <Lock className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenPasscodeModal}
              title="尚未設定密碼，點擊設定"
              className="h-9 px-2.5 rounded-full text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">設定密碼</span>
            </button>
          )}

          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? '切換為淺色模式' : '切換為深色模式 (減少眼睛負擔)'}
            className="h-9 w-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
            aria-label="切換深淺模式"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Write Diary CTA */}
          <button
            onClick={() => openEditor()}
            className="h-9 px-3.5 sm:px-4 rounded-full bg-primary text-on-primary font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>寫日記</span>
          </button>
        </div>
      </div>
    </header>
  );
};
