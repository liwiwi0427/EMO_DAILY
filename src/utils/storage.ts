import { DiaryEntry } from '../types/diary';
import { INITIAL_SAMPLE_ENTRIES } from './constants';

const STORAGE_KEYS = {
  ENTRIES: 'mindful_journal_entries_v1',
  INITIALIZED: 'mindful_journal_initialized_v1',
  DRAFT: 'mindful_journal_editor_draft_v1',
};

const DB_NAME = 'MindfulJournalDB';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save all entries to IndexedDB for large, permanent storage
 */
export async function saveEntriesToIndexedDB(entries: DiaryEntry[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear existing and rewrite
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const entry of entries) {
      store.put(entry);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, relying on localStorage and API:', err);
  }
}

/**
 * Load entries from IndexedDB
 */
export async function loadEntriesFromIndexedDB(): Promise<DiaryEntry[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();
    return await new Promise<DiaryEntry[]>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as DiaryEntry[];
        if (Array.isArray(results) && results.length > 0) {
          // Sort by date & time desc
          results.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
          resolve(results);
        } else {
          resolve([]);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

/**
 * Save to LocalStorage with quota protection & fallback
 */
export function saveEntriesToLocalStorage(entries: DiaryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  } catch (err: any) {
    console.warn('LocalStorage quota exceeded or error, stripping heavy images for fallback:', err);
    try {
      // If quota exceeded, strip large image attachments so text is 100% saved
      const lightweight = entries.map(e => ({
        ...e,
        images: e.images ? e.images.map(img => (img.length > 1000 ? '[img_cached]' : img)) : [],
      }));
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(lightweight));
    } catch (e) {
      console.error('Failed to save to localStorage even with stripped images:', e);
    }
  }
}

/**
 * Load from LocalStorage
 */
export function loadEntriesFromLocalStorage(): { entries: DiaryEntry[]; isInitialized: boolean } {
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
    const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return { entries: parsed, isInitialized: true };
      }
    }

    if (!isInitialized) {
      // First time user ever opens the app: use sample data and mark initialized immediately!
      saveEntriesToLocalStorage(INITIAL_SAMPLE_ENTRIES);
      return { entries: INITIAL_SAMPLE_ENTRIES, isInitialized: false };
    }

    return { entries: [], isInitialized: true };
  } catch (e) {
    console.error('Error reading localStorage:', e);
    return { entries: INITIAL_SAMPLE_ENTRIES, isInitialized: false };
  }
}

/**
 * Auto-save draft for the editor so editing is never lost during typing/page reload
 */
export interface EditorDraft {
  entryId?: string;
  title: string;
  content: string;
  date: string;
  time: string;
  mood: string;
  weather: string;
  tags: string[];
  images: string[];
  isFavorite: boolean;
  updatedAt: string;
}

export function saveDraft(draft: Omit<EditorDraft, 'updatedAt'>): void {
  try {
    const payload: EditorDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save editor draft:', e);
  }
}

export function loadDraft(): EditorDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read draft:', e);
  }
  return null;
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Image compressor: Resizes and compresses image before base64 conversion
 * Prevents QuotaExceededError and keeps the app fast!
 */
export async function compressImage(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(event.target?.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Convert to jpeg or webp
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
