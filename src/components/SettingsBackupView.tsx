import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Shield,
  KeyRound,
  Download,
  Upload,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Lock,
  Moon,
  Sun,
  AlertTriangle,
  FileJson,
  HardDrive
} from 'lucide-react';
import { useDiary } from '../context/DiaryContext';
import { BackupService } from '../services/backupService';
import { CloudBackupItem, DiaryEntry } from '../types/diary';
import { INITIAL_SAMPLE_ENTRIES } from '../utils/constants';

interface SettingsBackupViewProps {
  onOpenPasscodeModal: () => void;
}

export const SettingsBackupView: React.FC<SettingsBackupViewProps> = ({ onOpenPasscodeModal }) => {
  const {
    entries,
    restoreEntries,
    isDarkMode,
    toggleDarkMode,
    securitySettings,
    autoCloudSync,
    setAutoCloudSync,
    lastCloudSyncTime,
    triggerCloudBackup,
    isBackingUp,
    showToast,
  } = useDiary();

  const [cloudBackups, setCloudBackups] = useState<CloudBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [restoreModalBackup, setRestoreModalBackup] = useState<CloudBackupItem | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreMergeMode, setRestoreMergeMode] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  // Encrypted backup toggle
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [e2eePassword, setE2eePassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cloud backup list on mount
  const refreshCloudList = async () => {
    setIsLoadingBackups(true);
    const list = await BackupService.getCloudBackups();
    setCloudBackups(list);
    setIsLoadingBackups(false);
  };

  useEffect(() => {
    refreshCloudList();
  }, [lastCloudSyncTime]);

  // Handle Cloud Backup Now
  const handleManualBackup = async () => {
    const success = await triggerCloudBackup();
    if (success) {
      await refreshCloudList();
    }
  };

  // Handle Restore Execution
  const handleExecuteRestore = async () => {
    if (!restoreModalBackup) return;

    setIsRestoring(true);
    setRestoreError('');

    try {
      const result = await BackupService.restoreFromCloud(
        restoreModalBackup.id,
        restoreModalBackup.isEncrypted ? restorePassphrase : undefined
      );

      if (result.success && result.entries) {
        restoreEntries(result.entries, restoreMergeMode);
        setRestoreModalBackup(null);
        setRestorePassphrase('');
      } else {
        setRestoreError(result.message || '還原失敗');
      }
    } catch (e: any) {
      setRestoreError(e.message || '還原發生錯誤');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Delete a Cloud Backup Snapshot
  const handleDeleteBackup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要從雲端刪除此份備份快照嗎？')) {
      const success = await BackupService.deleteCloudBackup(id);
      if (success) {
        showToast('已刪除雲端備份快照', 'info');
        await refreshCloudList();
      } else {
        showToast('刪除失敗', 'error');
      }
    }
  };

  // Handle File Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async evt => {
      const content = evt.target?.result as string;
      if (!content) return;

      const result = await BackupService.parseBackupFile(content);
      if (result.isEncrypted) {
        const pass = prompt('此檔案已使用密碼加密，請輸入密碼以解密還原：');
        if (!pass) return;
        const decryptResult = await BackupService.parseBackupFile(content, pass);
        if (decryptResult.success && decryptResult.entries) {
          restoreEntries(decryptResult.entries, true);
        } else {
          showToast(decryptResult.message, 'error');
        }
      } else if (result.success && result.entries) {
        const merge = confirm(`成功讀取 ${result.entries.length} 篇日記。\n\n按「確定」將日記合併至現有內容；\n按「取消」將完全取代現有日記。`);
        restoreEntries(result.entries, merge);
      } else {
        showToast(result.message || '檔案格式無效', 'error');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportFile = () => {
    BackupService.exportToFile(entries, {
      isEncrypted: false,
    });
    showToast('備份檔案已成功匯出', 'success');
  };

  const handleResetSampleData = () => {
    if (confirm('確定要重新載入初始範例日記嗎？這將加入示範的心情日記與標籤。')) {
      restoreEntries(INITIAL_SAMPLE_ENTRIES, false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface mb-1">
          系統設定與雲端備份
        </h2>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          管理隱私密碼、雲端同步、深色主題與資料備份還原
        </p>
      </div>

      {/* Section 1: Cloud Backup & Sync */}
      <section className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">雲端資料備份</h3>
              <p className="text-xs text-on-surface-variant">
                {lastCloudSyncTime
                  ? `上次雲端備份時間：${new Date(lastCloudSyncTime).toLocaleString('zh-TW')}`
                  : '尚未進行雲端備份'}
              </p>
            </div>
          </div>

          <button
            onClick={handleManualBackup}
            disabled={isBackingUp}
            className="py-2.5 px-4 rounded-full bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isBackingUp ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            <span>{isBackingUp ? '備份中...' : '立即備份到雲端'}</span>
          </button>
        </div>

        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-high border border-outline-variant/20">
          <div>
            <div className="text-xs font-semibold text-on-surface">自動雲端備份</div>
            <div className="text-[11px] text-on-surface-variant">
              每次儲存或編輯日記時，自動在背景同步備份至雲端
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoCloudSync}
            onChange={e => setAutoCloudSync(e.target.checked)}
            className="w-4 h-4 text-primary rounded accent-primary cursor-pointer"
          />
        </div>

        {/* Cloud Snapshots History */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span>雲端歷史備份存檔</span>
              <span className="text-[11px] font-normal text-on-surface-variant">
                ({cloudBackups.length} 份)
              </span>
            </div>
            <button
              onClick={refreshCloudList}
              disabled={isLoadingBackups}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
              <span>重新整理</span>
            </button>
          </div>

          {cloudBackups.length === 0 ? (
            <div className="p-4 rounded-2xl bg-surface-container-low text-center text-xs text-on-surface-variant">
              目前雲端尚未有任何備份，點擊上方「立即備份到雲端」建立第一份備份！
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {cloudBackups.map(bk => (
                <div
                  key={bk.id}
                  className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 flex items-center justify-between gap-2 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface truncate">
                        {bk.title}
                      </span>
                      {bk.isEncrypted && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          已加密
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                      <span>{new Date(bk.timestamp).toLocaleString('zh-TW')}</span>
                      <span>·</span>
                      <span>{bk.entryCount} 篇日記</span>
                      <span>·</span>
                      <span>{(bk.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setRestoreModalBackup(bk)}
                      className="py-1 px-3 rounded-full text-xs font-medium text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                    >
                      還原
                    </button>
                    <button
                      onClick={e => handleDeleteBackup(bk.id, e)}
                      className="w-7 h-7 rounded-full text-on-surface-variant hover:text-rose-500 flex items-center justify-center transition-colors"
                      title="刪除備份"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local File Export & Import */}
        <div className="pt-3 border-t border-outline-variant/30">
          <div className="text-xs font-bold text-on-surface mb-2.5 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            <span>匯出檔案至 Google Drive / 本地硬碟</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleExportFile}
              className="py-2.5 px-4 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-xs font-medium text-on-surface flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>下載 JSON 備份檔 (可存至雲端硬碟)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-4 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-xs font-medium text-on-surface flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>由本機 / 雲端硬碟匯入備份檔</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.diary"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Privacy & Passcode Lock */}
      <section className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                securitySettings.isPasscodeEnabled
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">隱私與密碼鎖定</h3>
              <p className="text-xs text-on-surface-variant">
                {securitySettings.isPasscodeEnabled
                  ? '已啟用 PIN 密碼防護，每次開啟自動鎖定'
                  : '尚未設定密碼，任何開啟此裝置的人皆可閱讀'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPasscodeModal}
            className="py-2 px-4 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            {securitySettings.isPasscodeEnabled ? '管理密碼' : '立即設定密碼'}
          </button>
        </div>
      </section>

      {/* Section 3: Appearance & Eye Comfort (Dark Mode) */}
      <section className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-surface-container-high text-on-surface flex items-center justify-center">
              {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">外觀顯示與護眼模式</h3>
              <p className="text-xs text-on-surface-variant">
                深色模式能大幅減少低光源下的眩光與眼睛負擔
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-surface-container-high rounded-full border border-outline-variant/30">
            <button
              onClick={() => {
                if (isDarkMode) toggleDarkMode();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                !isDarkMode
                  ? 'bg-surface text-on-surface shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>淺色</span>
            </button>
            <button
              onClick={() => {
                if (!isDarkMode) toggleDarkMode();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                isDarkMode
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>深色 (護眼)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 4: Data Management & Reset */}
      <section className="rounded-3xl bg-surface-container border border-outline-variant/30 p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-bold text-on-surface">進階資料選項</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetSampleData}
            className="py-2 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs text-on-surface font-medium transition-colors"
          >
            重置並載入範例日記
          </button>
          <button
            onClick={() => {
              if (confirm('警告：確定要清空所有本機日記嗎？請確認您已有雲端備份！')) {
                restoreEntries([]);
              }
            }}
            className="py-2 px-4 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition-colors"
          >
            清除本機所有日記
          </button>
        </div>
      </section>

      {/* Restore Confirmation Dialog Modal */}
      {restoreModalBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-surface-container-high border border-outline-variant/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
                <CloudDownload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">從雲端還原日記</h3>
                <p className="text-xs text-on-surface-variant">{restoreModalBackup.title}</p>
              </div>
            </div>

            <div className="text-xs text-on-surface-variant space-y-1">
              <div>備份時間：{new Date(restoreModalBackup.timestamp).toLocaleString('zh-TW')}</div>
              <div>日記數量：{restoreModalBackup.entryCount} 篇</div>
            </div>

            {restoreModalBackup.isEncrypted && (
              <div>
                <label className="text-xs font-semibold text-on-surface mb-1.5 block">
                  請輸入備份解密密碼：
                </label>
                <input
                  type="password"
                  value={restorePassphrase}
                  onChange={e => setRestorePassphrase(e.target.value)}
                  placeholder="輸入密碼"
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-on-surface mb-1.5 block">
                還原方式：
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRestoreMergeMode(true)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    restoreMergeMode
                      ? 'border-primary bg-primary-container/40 text-on-surface font-semibold'
                      : 'border-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  合併至現有日記
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreMergeMode(false)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    !restoreMergeMode
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                      : 'border-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  覆蓋取代現有內容
                </button>
              </div>
            </div>

            {restoreError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-xs text-rose-500 font-medium">
                {restoreError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalBackup(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:text-on-surface"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || (restoreModalBackup.isEncrypted && !restorePassphrase)}
                className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
                <span>{isRestoring ? '還原中...' : '確認還原'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
