import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DiaryEntry, MoodType, SecuritySettings } from '../types/diary';
import { INITIAL_SAMPLE_ENTRIES } from '../utils/constants';
import { hashPasscode, generateSalt, verifyPasscode } from '../utils/crypto';
import { BackupService } from '../services/backupService';

interface ToastState {
  show: boolean;
  message: string;
  type?: 'success' | 'info' | 'error';
}

export type ViewTab = 'timeline' | 'calendar' | 'stats' | 'settings';

interface DiaryContextValue {
  entries: DiaryEntry[];
  currentView: ViewTab;
  setCurrentView: (view: ViewTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedMoodFilter: MoodType | 'all';
  setSelectedMoodFilter: (mood: MoodType | 'all') => void;
  selectedTagFilter: string | 'all';
  setSelectedTagFilter: (tag: string | 'all') => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (val: boolean) => void;

  // CRUD
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
  restoreEntries: (newEntries: DiaryEntry[], merge?: boolean) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Security & Privacy
  isLocked: boolean;
  securitySettings: SecuritySettings;
  unlockApp: (passcode: string) => Promise<boolean>;
  lockApp: () => void;
  setupPasscode: (passcode: string, hint?: string) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  removePasscode: () => void;

  // Cloud sync
  autoCloudSync: boolean;
  setAutoCloudSync: (val: boolean) => void;
  lastCloudSyncTime: string | null;
  triggerCloudBackup: (customTitle?: string) => Promise<boolean>;
  isBackingUp: boolean;

  // Toast
  toast: ToastState;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  hideToast: () => void;

  // Editor Modal control
  isEditorOpen: boolean;
  editingEntry: DiaryEntry | null;
  openEditor: (entry?: DiaryEntry | null, prefillDate?: string) => void;
  closeEditor: () => void;
}

const STORAGE_KEYS = {
  ENTRIES: 'mindful_journal_entries_v1',
  SECURITY: 'mindful_journal_security_v1',
  THEME: 'mindful_journal_theme_v1',
  AUTO_SYNC: 'mindful_journal_auto_sync_v1',
  LAST_SYNC: 'mindful_journal_last_sync_v1',
};

const DiaryContext = createContext<DiaryContextValue | undefined>(undefined);

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved !== null) return saved === 'dark';
    return true; // Default to dark mode for calm aesthetic and eye comfort
  });

  // Sync dark class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SECURITY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      isPasscodeEnabled: false,
      autoLockMinutes: 5,
      blurWhenInactive: true,
    };
  });

  // Locked state
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    // If passcode is enabled, initially locked
    return securitySettings.isPasscodeEnabled;
  });

  // Entries State
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SAMPLE_ENTRIES;
  });

  // Persist entries
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  // Persist security
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(securitySettings));
  }, [securitySettings]);

  // Cloud Sync states
  const [autoCloudSync, setAutoCloudSyncState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';
  });

  const setAutoCloudSync = (val: boolean) => {
    setAutoCloudSyncState(val);
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(val));
  };

  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  });

  const [isBackingUp, setIsBackingUp] = useState(false);

  // View & Filter states
  const [currentView, setCurrentView] = useState<ViewTab>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<MoodType | 'all'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ show: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  const openEditor = useCallback((entry: DiaryEntry | null = null, prefillDate?: string) => {
    if (entry) {
      setEditingEntry(entry);
    } else {
      setEditingEntry({
        id: '',
        title: '',
        content: '',
        date: prefillDate || new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
        mood: 'happy',
        weather: 'sunny',
        tags: [],
        isFavorite: false,
        createdAt: '',
        updatedAt: '',
      });
    }
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingEntry(null);
  }, []);

  // Trigger Cloud Backup
  const triggerCloudBackup = useCallback(async (customTitle?: string): Promise<boolean> => {
    setIsBackingUp(true);
    try {
      const res = await BackupService.uploadToCloud(entries, {
        title: customTitle,
      });

      if (res.success) {
        const now = new Date().toISOString();
        setLastCloudSyncTime(now);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
        showToast('雲端備份完成', 'success');
        return true;
      } else {
        showToast(res.message, 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err.message || '雲端備份失敗', 'error');
      return false;
    } finally {
      setIsBackingUp(false);
    }
  }, [entries, showToast]);

  // CRUD actions
  const addEntry = useCallback((entryData: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: DiaryEntry = {
      ...entryData,
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => [newEntry, ...prev]);
    showToast('日記已成功保存', 'success');

    if (autoCloudSync) {
      setTimeout(() => {
        BackupService.uploadToCloud([newEntry, ...entries], {
          title: `自動同步 (${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })})`,
        }).then(res => {
          if (res.success) {
            const now = new Date().toISOString();
            setLastCloudSyncTime(now);
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
          }
        });
      }, 800);
    }
  }, [entries, autoCloudSync, showToast]);

  const updateEntry = useCallback((id: string, updates: Partial<DiaryEntry>) => {
    setEntries(prev => {
      const updated = prev.map(item =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      );
      if (autoCloudSync) {
        setTimeout(() => {
          BackupService.uploadToCloud(updated);
        }, 1000);
      }
      return updated;
    });
    showToast('日記已更新', 'success');
  }, [autoCloudSync, showToast]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const filtered = prev.filter(item => item.id !== id);
      if (autoCloudSync) {
        setTimeout(() => {
          BackupService.uploadToCloud(filtered);
        }, 1000);
      }
      return filtered;
    });
    showToast('日記已刪除', 'info');
  }, [autoCloudSync, showToast]);

  const toggleFavorite = useCallback((id: string) => {
    setEntries(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  }, []);

  const restoreEntries = useCallback((newEntries: DiaryEntry[], merge = false) => {
    if (merge) {
      setEntries(prev => {
        const map = new Map<string, DiaryEntry>();
        prev.forEach(e => map.set(e.id, e));
        newEntries.forEach(e => map.set(e.id, e));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
        );
      });
      showToast(`已合併 ${newEntries.length} 篇日記`, 'success');
    } else {
      setEntries(newEntries);
      showToast(`已成功還原 ${newEntries.length} 篇日記`, 'success');
    }
  }, [showToast]);

  // Security methods
  const lockApp = useCallback(() => {
    if (securitySettings.isPasscodeEnabled) {
      setIsLocked(true);
    }
  }, [securitySettings.isPasscodeEnabled]);

  const unlockApp = useCallback(async (passcode: string): Promise<boolean> => {
    if (!securitySettings.isPasscodeEnabled || !securitySettings.passcodeHash || !securitySettings.passcodeSalt) {
      setIsLocked(false);
      return true;
    }

    const isValid = await verifyPasscode(passcode, securitySettings.passcodeHash, securitySettings.passcodeSalt);
    if (isValid) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [securitySettings]);

  const setupPasscode = useCallback(async (passcode: string, hint?: string) => {
    const salt = generateSalt();
    const hash = await hashPasscode(passcode, salt);

    setSecuritySettings(prev => ({
      ...prev,
      isPasscodeEnabled: true,
      passcodeHash: hash,
      passcodeSalt: salt,
      securityHint: hint || '',
    }));
    showToast('密碼保護已啟用', 'success');
  }, [showToast]);

  const updateSecuritySettings = useCallback((updates: Partial<SecuritySettings>) => {
    setSecuritySettings(prev => ({ ...prev, ...updates }));
    showToast('安全設定已更新', 'success');
  }, [showToast]);

  const removePasscode = useCallback(() => {
    setSecuritySettings(prev => ({
      ...prev,
      isPasscodeEnabled: false,
      passcodeHash: undefined,
      passcodeSalt: undefined,
      securityHint: undefined,
    }));
    setIsLocked(false);
    showToast('已取消密碼鎖定', 'info');
  }, [showToast]);

  // Auto-lock listeners (Visibility & Timeout)
  useEffect(() => {
    if (!securitySettings.isPasscodeEnabled) return;

    let timeoutId: any = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (securitySettings.autoLockMinutes === 0) {
          setIsLocked(true);
        } else if (securitySettings.autoLockMinutes > 0) {
          timeoutId = setTimeout(() => {
            setIsLocked(true);
          }, securitySettings.autoLockMinutes * 60 * 1000);
        }
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [securitySettings.isPasscodeEnabled, securitySettings.autoLockMinutes]);

  const value = useMemo<DiaryContextValue>(() => ({
    entries,
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    selectedMoodFilter,
    setSelectedMoodFilter,
    selectedTagFilter,
    setSelectedTagFilter,
    showFavoritesOnly,
    setShowFavoritesOnly,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleFavorite,
    restoreEntries,
    isDarkMode,
    toggleDarkMode,
    isLocked,
    securitySettings,
    unlockApp,
    lockApp,
    setupPasscode,
    updateSecuritySettings,
    removePasscode,
    autoCloudSync,
    setAutoCloudSync,
    lastCloudSyncTime,
    triggerCloudBackup,
    isBackingUp,
    toast,
    showToast,
    hideToast,
    isEditorOpen,
    editingEntry,
    openEditor,
    closeEditor,
  }), [
    entries,
    currentView,
    searchQuery,
    selectedMoodFilter,
    selectedTagFilter,
    showFavoritesOnly,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleFavorite,
    restoreEntries,
    isDarkMode,
    isLocked,
    securitySettings,
    unlockApp,
    lockApp,
    setupPasscode,
    updateSecuritySettings,
    removePasscode,
    autoCloudSync,
    lastCloudSyncTime,
    triggerCloudBackup,
    isBackingUp,
    toast,
    showToast,
    hideToast,
    isEditorOpen,
    editingEntry,
    openEditor,
    closeEditor,
  ]);

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
};

export const useDiary = () => {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiary must be used within a DiaryProvider');
  }
  return context;
};
