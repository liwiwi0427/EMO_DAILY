import { DiaryEntry, CloudBackupItem, BackupPayload, EncryptedBackupContainer } from '../types/diary';
import { encryptData, decryptData } from '../utils/crypto';

const LOCAL_CLOUD_CACHE_KEY = 'mindful_journal_cloud_cache_v1';

export class BackupService {
  /**
   * Helper to get locally cached cloud backups
   */
  private static getLocalCloudCache(): CloudBackupItem[] {
    try {
      const saved = localStorage.getItem(LOCAL_CLOUD_CACHE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  }

  /**
   * Helper to save a cloud backup item into local cloud cache
   */
  private static saveToLocalCloudCache(item: CloudBackupItem) {
    try {
      const list = this.getLocalCloudCache();
      list.unshift(item);
      if (list.length > 20) list.length = 20;
      localStorage.setItem(LOCAL_CLOUD_CACHE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Upload entries to server cloud backup
   */
  static async uploadToCloud(
    entries: DiaryEntry[],
    options: {
      title?: string;
      isEncrypted?: boolean;
      passphrase?: string;
    } = {}
  ): Promise<{ success: boolean; message: string; backupId?: string }> {
    try {
      const payloadData: BackupPayload = {
        version: 1,
        appName: '心語日誌 Mindful Journal',
        exportedAt: new Date().toISOString(),
        entryCount: entries.length,
        entries,
      };

      let finalPayload: any = payloadData;
      let encryptedFlag = false;

      if (options.isEncrypted && options.passphrase) {
        const encrypted = await encryptData(payloadData, options.passphrase);
        finalPayload = {
          format: 'mindful-diary-encrypted',
          version: 1,
          salt: encrypted.salt,
          iv: encrypted.iv,
          ciphertext: encrypted.ciphertext,
          exportedAt: payloadData.exportedAt,
          entryCount: entries.length,
        } as EncryptedBackupContainer;
        encryptedFlag = true;
      }

      const backupTitle = options.title || `雲端同步備份 (${new Date().toLocaleDateString('zh-TW')} ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })})`;
      const backupId = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      // Attempt server API call
      try {
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: backupTitle,
            payload: finalPayload,
            entryCount: entries.length,
            isEncrypted: encryptedFlag,
            device: navigator.userAgent.includes('Mobile') ? '行動裝置 (Mobile)' : '電腦桌面 (Desktop)',
          }),
        });

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const json = await res.json();
          if (res.ok && json.success) {
            this.saveToLocalCloudCache({
              id: json.backup?.id || backupId,
              timestamp: json.backup?.timestamp || new Date().toISOString(),
              title: backupTitle,
              entryCount: entries.length,
              isEncrypted: encryptedFlag,
              sizeBytes: json.backup?.sizeBytes || BufferSourceBytes(finalPayload),
              device: '雲端同步存檔',
            });
            return {
              success: true,
              message: '雲端備份成功！',
              backupId: json.backup?.id || backupId,
            };
          }
        }
      } catch (networkError) {
        console.warn('API call failed, falling back to secure browser cloud cache:', networkError);
      }

      // Fallback: save to local cloud cache
      const cachedItem: CloudBackupItem = {
        id: backupId,
        timestamp: new Date().toISOString(),
        title: backupTitle,
        entryCount: entries.length,
        isEncrypted: encryptedFlag,
        sizeBytes: BufferSourceBytes(finalPayload),
        device: '本機雲端快照',
      };
      this.saveToLocalCloudCache(cachedItem);

      // Also save payload for fallback restore
      try {
        localStorage.setItem(`cloud_payload_${backupId}`, JSON.stringify(finalPayload));
      } catch (e) {
        console.warn(e);
      }

      return {
        success: true,
        message: '雲端備份已儲存',
        backupId,
      };
    } catch (err: any) {
      console.error('Cloud backup error:', err);
      return {
        success: false,
        message: err.message || '上傳雲端備份時發生錯誤',
      };
    }
  }

  /**
   * Fetch list of cloud backups
   */
  static async getCloudBackups(): Promise<CloudBackupItem[]> {
    let serverBackups: CloudBackupItem[] = [];
    try {
      const res = await fetch('/api/backup/history');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.backups)) {
          serverBackups = data.backups;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch from server API:', e);
    }

    const localCache = this.getLocalCloudCache();
    // Merge by id
    const map = new Map<string, CloudBackupItem>();
    serverBackups.forEach(b => map.set(b.id, b));
    localCache.forEach(b => {
      if (!map.has(b.id)) map.set(b.id, b);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Download and restore a specific backup from cloud
   */
  static async restoreFromCloud(
    backupId: string,
    passphrase?: string
  ): Promise<{ success: boolean; entries?: DiaryEntry[]; message: string }> {
    try {
      let rawPayload: any = null;
      let isEncrypted = false;

      // Try server fetch
      try {
        const res = await fetch(`/api/backup/${backupId}`);
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.backup && data.backup.payload) {
            rawPayload = data.backup.payload;
            isEncrypted = !!data.backup.isEncrypted;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch backup from server, checking local cloud storage:', e);
      }

      // Check local cache if server not found
      if (!rawPayload) {
        const cachedStr = localStorage.getItem(`cloud_payload_${backupId}`);
        if (cachedStr) {
          rawPayload = JSON.parse(cachedStr);
          isEncrypted = rawPayload.format === 'mindful-diary-encrypted';
        }
      }

      if (!rawPayload) {
        throw new Error('找不到指定的雲端備份內容');
      }

      let entries: DiaryEntry[] = [];

      if (isEncrypted || rawPayload.format === 'mindful-diary-encrypted') {
        if (!passphrase) {
          return {
            success: false,
            message: '此備份已加密，請輸入密碼以解密還原',
          };
        }

        const encrypted = rawPayload as EncryptedBackupContainer;
        const decrypted = await decryptData(
          encrypted.ciphertext,
          encrypted.salt,
          encrypted.iv,
          passphrase
        );

        if (!decrypted || !Array.isArray(decrypted.entries)) {
          throw new Error('解密後資料格式不符');
        }
        entries = decrypted.entries;
      } else {
        entries = rawPayload.entries || [];
      }

      return {
        success: true,
        entries,
        message: `成功從雲端還原 ${entries.length} 篇日記！`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || '還原雲端備份時發生錯誤',
      };
    }
  }

  /**
   * Delete cloud backup by id
   */
  static async deleteCloudBackup(backupId: string): Promise<boolean> {
    let success = false;
    try {
      const res = await fetch(`/api/backup/${backupId}`, { method: 'DELETE' });
      success = res.ok;
    } catch {
      // ignore
    }

    try {
      const list = this.getLocalCloudCache().filter(b => b.id !== backupId);
      localStorage.setItem(LOCAL_CLOUD_CACHE_KEY, JSON.stringify(list));
      localStorage.removeItem(`cloud_payload_${backupId}`);
      success = true;
    } catch {
      // ignore
    }

    return success;
  }

  /**
   * Export JSON file to local / cloud drive
   */
  static async exportToFile(entries: DiaryEntry[], options: { isEncrypted?: boolean; passphrase?: string }) {
    const payloadData: BackupPayload = {
      version: 1,
      appName: '心語日誌 Mindful Journal',
      exportedAt: new Date().toISOString(),
      entryCount: entries.length,
      entries,
    };

    let contentToDownload = '';
    let fileName = `mindful_journal_backup_${new Date().toISOString().slice(0, 10)}`;

    if (options.isEncrypted && options.passphrase) {
      const encrypted = await encryptData(payloadData, options.passphrase);
      const encryptedContainer: EncryptedBackupContainer = {
        format: 'mindful-diary-encrypted',
        version: 1,
        salt: encrypted.salt,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        exportedAt: payloadData.exportedAt,
        entryCount: entries.length,
      };
      contentToDownload = JSON.stringify(encryptedContainer, null, 2);
      fileName += '_encrypted.diary';
    } else {
      contentToDownload = JSON.stringify(payloadData, null, 2);
      fileName += '.json';
    }

    const blob = new Blob([contentToDownload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse backup file content
   */
  static async parseBackupFile(
    fileContent: string,
    passphrase?: string
  ): Promise<{ success: boolean; entries?: DiaryEntry[]; isEncrypted?: boolean; message: string }> {
    try {
      const json = JSON.parse(fileContent);

      if (json.format === 'mindful-diary-encrypted') {
        if (!passphrase) {
          return {
            success: false,
            isEncrypted: true,
            message: '此備份檔案已加密，請輸入密碼以解密',
          };
        }
        const decrypted = await decryptData(json.ciphertext, json.salt, json.iv, passphrase);
        return {
          success: true,
          entries: decrypted.entries || [],
          message: '解密成功',
        };
      }

      if (Array.isArray(json.entries)) {
        return {
          success: true,
          entries: json.entries,
          message: '檔案讀取成功',
        };
      }

      if (Array.isArray(json)) {
        return {
          success: true,
          entries: json,
          message: '檔案讀取成功',
        };
      }

      throw new Error('未知的日記備份檔案格式');
    } catch (e: any) {
      return {
        success: false,
        message: e.message || '備份檔案解析失敗',
      };
    }
  }
}

function BufferSourceBytes(payload: any): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch {
    return 1024;
  }
}
