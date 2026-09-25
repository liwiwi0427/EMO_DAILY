import React, { useState, useEffect } from 'react';
import { Lock, Delete, KeyRound, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { useDiary } from '../context/DiaryContext';

export const LockScreen: React.FC = () => {
  const { unlockApp, securitySettings, removePasscode, showToast } = useDiary();
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      setPin(prev => prev + num);
      setErrorMessage('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  // Keyboard listener for desktop convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  // Attempt auto unlock when 4 or 6 digits entered
  useEffect(() => {
    if (pin.length >= 4) {
      const timer = setTimeout(async () => {
        const success = await unlockApp(pin);
        if (!success) {
          // If 4 digits failed, wait for user to continue typing if it's 6 digits,
          // or shake if already 6 digits
          if (pin.length >= 6) {
            setErrorShake(true);
            setErrorMessage('密碼錯誤，請重新輸入');
            if ('vibrate' in navigator) navigator.vibrate([40, 60, 40]);
            setTimeout(() => {
              setErrorShake(false);
              setPin('');
            }, 600);
          }
        } else {
          setPin('');
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [pin, unlockApp]);

  const handleDirectSubmit = async () => {
    if (!pin) return;
    const success = await unlockApp(pin);
    if (!success) {
      setErrorShake(true);
      setErrorMessage('密碼錯誤，請重新輸入');
      if ('vibrate' in navigator) navigator.vibrate([40, 60, 40]);
      setTimeout(() => {
        setErrorShake(false);
        setPin('');
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-2xl transition-all">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Lock Icon & Title */}
        <div className="w-16 h-16 rounded-3xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-lg shadow-primary/10 mb-4 transition-transform hover:scale-105">
          <Lock className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-on-surface mb-1">
          心語日誌已上鎖
        </h1>
        <p className="text-sm text-on-surface-variant mb-6 text-center">
          請輸入私人數位密碼以存取您的心情與日記
        </p>

        {/* PIN Dots indicator */}
        <div
          className={`flex items-center justify-center gap-3.5 mb-6 py-2 transition-transform duration-200 ${
            errorShake ? 'translate-x-[-12px] animate-pulse' : ''
          }`}
        >
          {Array.from({ length: Math.max(4, pin.length) }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < pin.length
                  ? 'bg-primary scale-125 shadow-md shadow-primary/30'
                  : 'bg-outline-variant/50 border border-outline/30'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {errorMessage ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium mb-4 bg-rose-500/10 px-3 py-1.5 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="h-7 mb-1" />
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px] mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              type="button"
              className="h-16 rounded-2xl bg-surface-container hover:bg-surface-container-high active:scale-95 active:bg-primary-container active:text-on-primary-container text-on-surface text-2xl font-semibold transition-all flex items-center justify-center shadow-sm select-none"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            type="button"
            className="h-16 rounded-2xl bg-surface-container/60 hover:bg-surface-container text-on-surface-variant text-sm font-medium transition-all flex items-center justify-center active:scale-95"
            aria-label="清除"
          >
            清除
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            type="button"
            className="h-16 rounded-2xl bg-surface-container hover:bg-surface-container-high active:scale-95 active:bg-primary-container active:text-on-primary-container text-on-surface text-2xl font-semibold transition-all flex items-center justify-center shadow-sm select-none"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            type="button"
            className="h-16 rounded-2xl bg-surface-container/60 hover:bg-surface-container text-on-surface-variant transition-all flex items-center justify-center active:scale-95"
            aria-label="刪除最後一位"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Hint */}
        <div className="flex flex-col items-center gap-2.5 w-full">
          {pin.length >= 4 && (
            <button
              onClick={handleDirectSubmit}
              className="w-full max-w-[280px] py-3 rounded-full bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-90 active:scale-98 transition-all"
            >
              <KeyRound className="w-4 h-4" />
              確認解鎖
            </button>
          )}

          {securitySettings.securityHint && (
            <div className="text-center mt-2">
              <button
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors py-1 px-2"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHint ? '隱藏提示' : '查看密碼提示'}
              </button>
              {showHint && (
                <div className="mt-1 px-3 py-2 rounded-xl bg-surface-container-high text-xs text-on-surface border border-outline-variant/40">
                  <span className="text-on-surface-variant">提示：</span> {securitySettings.securityHint}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowEmergencyReset(true)}
            className="text-xs text-on-surface-variant/70 hover:text-rose-500 transition-colors mt-2"
          >
            忘記密碼？
          </button>
        </div>
      </div>

      {/* Emergency Reset Dialog */}
      {showEmergencyReset && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-high p-6 shadow-2xl border border-outline-variant/40">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">重設密碼保護</h3>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              若您忘記密碼，重設後將移除目前的密碼保護，您的日記資料會保留在裝置中。若您有設定雲端備份，也可隨時再次設定新密碼並同步。
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEmergencyReset(false)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
              >
                返回輸入
              </button>
              <button
                onClick={() => {
                  removePasscode();
                  setShowEmergencyReset(false);
                  showToast('已重設密碼保護', 'info');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-full transition-colors"
              >
                確認重設
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
