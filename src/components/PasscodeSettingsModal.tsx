import React, { useState } from 'react';
import { X, Lock, KeyRound, Shield, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useDiary } from '../context/DiaryContext';
import { verifyPasscode } from '../utils/crypto';

interface PasscodeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasscodeSettingsModal: React.FC<PasscodeSettingsModalProps> = ({ isOpen, onClose }) => {
  const { securitySettings, setupPasscode, removePasscode, updateSecuritySettings, showToast } = useDiary();

  const [step, setStep] = useState<'overview' | 'enterOld' | 'enterNew' | 'confirmNew'>('overview');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hint, setHint] = useState(securitySettings.securityHint || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [showNumbers, setShowNumbers] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setStep('overview');
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMsg('');
  };

  const handleStartSetup = () => {
    if (securitySettings.isPasscodeEnabled) {
      setStep('enterOld');
    } else {
      setStep('enterNew');
    }
    setErrorMsg('');
  };

  const handleVerifyOld = async () => {
    if (!securitySettings.passcodeHash || !securitySettings.passcodeSalt) {
      setStep('enterNew');
      return;
    }
    const isValid = await verifyPasscode(oldPin, securitySettings.passcodeHash, securitySettings.passcodeSalt);
    if (isValid) {
      setErrorMsg('');
      setStep('enterNew');
    } else {
      setErrorMsg('舊密碼不正確，請重新輸入');
    }
  };

  const handleSaveNewPin = async () => {
    if (newPin.length < 4) {
      setErrorMsg('密碼長度至少需 4 位數');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('兩次輸入的密碼不一致');
      return;
    }

    await setupPasscode(newPin, hint);
    resetForm();
    onClose();
  };

  const handleDisable = () => {
    if (confirm('確定要關閉密碼保護功能嗎？')) {
      removePasscode();
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-surface-container-high border border-outline-variant/40 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">隱私與密碼防護</h2>
              <p className="text-xs text-on-surface-variant">保障私人日記內容不被他人窺探</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: Overview */}
        {step === 'overview' && (
          <div className="space-y-5">
            {/* Status card */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    securitySettings.isPasscodeEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-on-surface">
                    {securitySettings.isPasscodeEnabled ? '已啟用密碼保護' : '尚未啟用密碼鎖'}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {securitySettings.isPasscodeEnabled
                      ? '開啟應用程式時需先驗證密碼'
                      : '建議設定 4-6 位數密碼以確保隱私'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleStartSetup}
                className="w-full py-3 px-4 rounded-2xl bg-primary text-on-primary text-sm font-medium flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                {securitySettings.isPasscodeEnabled ? '變更存取密碼' : '立即設定密碼'}
              </button>

              {securitySettings.isPasscodeEnabled && (
                <button
                  onClick={handleDisable}
                  className="w-full py-2.5 px-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 text-sm font-medium transition-colors"
                >
                  關閉密碼保護
                </button>
              )}
            </div>

            {/* Additional Auto-lock preferences */}
            {securitySettings.isPasscodeEnabled && (
              <div className="pt-3 border-t border-outline-variant/30 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">
                    自動鎖定時間
                  </label>
                  <select
                    value={securitySettings.autoLockMinutes}
                    onChange={e =>
                      updateSecuritySettings({ autoLockMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-on-surface outline-none focus:border-primary"
                  >
                    <option value={0}>切換到其他分頁或視窗立即鎖定</option>
                    <option value={1}>閒置 1 分鐘後鎖定</option>
                    <option value={5}>閒置 5 分鐘後鎖定 (推薦)</option>
                    <option value={15}>閒置 15 分鐘後鎖定</option>
                    <option value={-1}>永不自動鎖定 (僅手動鎖定)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-on-surface">防窺視模糊保護</div>
                    <div className="text-[11px] text-on-surface-variant">
                      切換離開本頁時自動隱藏日記文字
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.blurWhenInactive}
                    onChange={e =>
                      updateSecuritySettings({ blurWhenInactive: e.target.checked })
                    }
                    className="w-4 h-4 text-primary rounded accent-primary cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Enter Old PIN */}
        {step === 'enterOld' && (
          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant">
              為確保本人操作，請先輸入目前的鎖定密碼：
            </p>

            <div className="relative">
              <input
                type={showNumbers ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                value={oldPin}
                onChange={e => {
                  setOldPin(e.target.value.replace(/\D/g, ''));
                  setErrorMsg('');
                }}
                placeholder="輸入舊密碼"
                autoFocus
                className="w-full py-3 px-4 rounded-2xl bg-surface-container border border-outline-variant/40 text-center tracking-widest text-lg font-bold text-on-surface outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowNumbers(!showNumbers)}
                className="absolute right-3.5 top-3.5 text-on-surface-variant hover:text-on-surface"
              >
                {showNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStep('overview')}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface rounded-full"
              >
                取消
              </button>
              <button
                onClick={handleVerifyOld}
                disabled={oldPin.length < 4}
                className="px-5 py-2 text-xs font-medium bg-primary text-on-primary rounded-full disabled:opacity-50 transition-opacity"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* Step: Enter New PIN */}
        {step === 'enterNew' && (
          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant">
              請輸入新的 4 ~ 6 位數數位密碼：
            </p>

            <div className="relative">
              <input
                type={showNumbers ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                value={newPin}
                onChange={e => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  setErrorMsg('');
                }}
                placeholder="輸入新密碼 (4-6 位數)"
                autoFocus
                className="w-full py-3 px-4 rounded-2xl bg-surface-container border border-outline-variant/40 text-center tracking-widest text-lg font-bold text-on-surface outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowNumbers(!showNumbers)}
                className="absolute right-3.5 top-3.5 text-on-surface-variant hover:text-on-surface"
              >
                {showNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStep('overview')}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface rounded-full"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (newPin.length < 4) {
                    setErrorMsg('請輸入至少 4 位數密碼');
                    return;
                  }
                  setErrorMsg('');
                  setStep('confirmNew');
                }}
                disabled={newPin.length < 4}
                className="px-5 py-2 text-xs font-medium bg-primary text-on-primary rounded-full disabled:opacity-50 transition-opacity"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm New PIN & Optional Hint */}
        {step === 'confirmNew' && (
          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant">
              請再次輸入新密碼以確認：
            </p>

            <input
              type={showNumbers ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={8}
              value={confirmPin}
              onChange={e => {
                setConfirmPin(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              placeholder="再次輸入新密碼"
              autoFocus
              className="w-full py-3 px-4 rounded-2xl bg-surface-container border border-outline-variant/40 text-center tracking-widest text-lg font-bold text-on-surface outline-none focus:border-primary"
            />

            <div>
              <label className="text-[11px] text-on-surface-variant mb-1 block">
                密碼提示 (選填，忘記時可查看)
              </label>
              <input
                type="text"
                value={hint}
                onChange={e => setHint(e.target.value)}
                placeholder="例如：高中學號或生日組合"
                className="w-full py-2 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStep('enterNew')}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface rounded-full"
              >
                上一步
              </button>
              <button
                onClick={handleSaveNewPin}
                disabled={confirmPin.length < 4}
                className="px-5 py-2 text-xs font-medium bg-primary text-on-primary rounded-full flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                完成設定
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
