import { DiaryEntry, CloudBackupItem, BackupPayload, EncryptedBackupContainer } from '../types/diary';
import { encryptData, decryptData } from '../utils/crypto';

export class BackupService {
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

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: options.title,
          payload: finalPayload,
          entryCount: entries.length,
          isEncrypted: encryptedFlag,
          device: navigator.userAgent.includes('Mobile') ? '行動裝置 (Mobile)' : '電腦桌面 (Desktop)',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || '備份失敗');
      }

      return {
        success: true,
        message: '雲端備份成功！',
        backupId: json.backup?.id,
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
    try {
      const res = await fetch('/api/backup/history');
      if (!res.ok) throw new Error('無法取得雲端備份列表');
      const data = await res.json();
      return data.backups || [];
    } catch (e) {
      console.error('Failed to get cloud backups:', e);
      return [];
    }
  }

  /**
   * Download and restore a specific backup from cloud
   */
  static async restoreFromCloud(
    backupId: string,
    passphrase?: string
  ): Promise<{ success: boolean; entries?: DiaryEntry[]; message: string }> {
    try {
      const res = await fetch(`/api/backup/${backupId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '找不到指定的雲端備份');
      }

      const data = await res.json();
      const backup = data.backup;
      if (!backup || !backup.payload) {
        throw new Error('備份內容無效');
      }

      let entries: DiaryEntry[] = [];

      if (backup.isEncrypted) {
        if (!passphrase) {
          return {
            success: false,
            message: '此備份已加密，請輸入密碼以解密還原',
          };
        }

        const encrypted = backup.payload as EncryptedBackupContainer;
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
        entries = backup.payload.entries || [];
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
    try {
      const res = await fetch(`/api/backup/${backupId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
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
