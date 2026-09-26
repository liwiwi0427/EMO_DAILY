import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DiaryEntry, MoodType, SecuritySettings } from '../types/diary';
import { INITIAL_SAMPLE_ENTRIES } from '../utils/constants';
import { hashPasscode, generateSalt, verifyPasscode } from '../utils/crypto';
import { BackupService } from '../services/backupService';
import {
  saveEntriesToLocalStorage,
  loadEntriesFromLocalStorage,
  saveEntriesToIndexedDB,
  loadEntriesFromIndexedDB,
  clearDraft,
} from '../utils/storage';

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
    return securitySettings.isPasscodeEnabled;
  });

  // Entries State: Synchronous immediate initialization from LocalStorage
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    const { entries: initialEntries } = loadEntriesFromLocalStorage();
    return initialEntries;
  });

  // Secondary hydration from IndexedDB and server-side /api/entries
  useEffect(() => {
    let isMounted = true;

    // 1. Check IndexedDB for complete offline persistent database
    loadEntriesFromIndexedDB().then(idbEntries => {
      if (isMounted && idbEntries && idbEntries.length > 0) {
        setEntries(prev => {
          // If indexedDB has data, prioritize it
          return idbEntries;
        });
        saveEntriesToLocalStorage(idbEntries);
      }
    });

    // 2. Fetch server-side saved entries if available
    fetch('/api/entries')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.entries) && data.entries.length > 0) {
          setEntries(data.entries);
          saveEntriesToLocalStorage(data.entries);
          saveEntriesToIndexedDB(data.entries);
        }
      })
      .catch(() => {
        // Server might be static or offline, client storage remains fully authoritative
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-tier persistence helper: immediately saves to LocalStorage, IndexedDB, and server
  const persistEntries = useCallback((newEntries: DiaryEntry[]) => {
    // 1. Synchronously save to LocalStorage (0ms latency, survives page refresh immediately)
    saveEntriesToLocalStorage(newEntries);

    // 2. Asynchronously save to IndexedDB (virtually unlimited quota for photos/long entries)
    saveEntriesToIndexedDB(newEntries);

    // 3. Asynchronously sync to Server API
    fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: newEntries }),
    }).catch(() => {
      // Offline or static fallback
    });
  }, []);

  // Safety watcher for entries
  useEffect(() => {
    saveEntriesToLocalStorage(entries);
    saveEntriesToIndexedDB(entries);
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

  // CRUD actions with immediate synchronous persistence
  const addEntry = useCallback((entryData: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: DiaryEntry = {
      ...entryData,
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => {
      const updated = [newEntry, ...prev];
      persistEntries(updated);
      return updated;
    });

    clearDraft();
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
  }, [entries, autoCloudSync, persistEntries, showToast]);

  const updateEntry = useCallback((id: string, updates: Partial<DiaryEntry>) => {
    setEntries(prev => {
      const updated = prev.map(item =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      );
      // Synchronously and permanently save!
      persistEntries(updated);
      return updated;
    });

    clearDraft();
    showToast('日記已更新並儲存', 'success');

    if (autoCloudSync) {
      setTimeout(() => {
        setEntries(current => {
          BackupService.uploadToCloud(current);
          return current;
        });
      }, 1000);
    }
  }, [autoCloudSync, persistEntries, showToast]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const filtered = prev.filter(item => item.id !== id);
      persistEntries(filtered);
      return filtered;
    });
    showToast('日記已刪除', 'info');

    if (autoCloudSync) {
      setTimeout(() => {
        setEntries(current => {
          BackupService.uploadToCloud(current);
          return current;
        });
      }, 1000);
    }
  }, [autoCloudSync, persistEntries, showToast]);

  const toggleFavorite = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      persistEntries(updated);
      return updated;
    });
  }, [persistEntries]);

  const restoreEntries = useCallback((newEntries: DiaryEntry[], merge = false) => {
    if (merge) {
      setEntries(prev => {
        const map = new Map<string, DiaryEntry>();
        prev.forEach(e => map.set(e.id, e));
        newEntries.forEach(e => map.set(e.id, e));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
        );
        persistEntries(merged);
        return merged;
      });
      showToast(`已合併 ${newEntries.length} 篇日記`, 'success');
    } else {
      setEntries(newEntries);
      persistEntries(newEntries);
      showToast(`已成功還原 ${newEntries.length} 篇日記`, 'success');
    }
  }, [persistEntries, showToast]);

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
