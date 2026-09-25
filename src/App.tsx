import React, { useState, useEffect } from 'react';
import { DiaryProvider, useDiary } from './context/DiaryContext';
import { TopAppBar } from './components/TopAppBar';
import { Navigation } from './components/Navigation';
import { DiaryList } from './components/DiaryList';
import { CalendarView } from './components/CalendarView';
import { StatsView } from './components/StatsView';
import { SettingsBackupView } from './components/SettingsBackupView';
import { DiaryEditorModal } from './components/DiaryEditorModal';
import { PasscodeSettingsModal } from './components/PasscodeSettingsModal';
import { LockScreen } from './components/LockScreen';
import { FloatingActionButton } from './components/FloatingActionButton';
import { Toast } from './components/Toast';

const DiaryAppContent: React.FC = () => {
  const { currentView, isLocked, securitySettings } = useDiary();
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Privacy screen blur when window blurs / inactive
  useEffect(() => {
    if (!securitySettings.blurWhenInactive) return;

    const handleBlur = () => setIsWindowBlurred(true);
    const handleFocus = () => setIsWindowBlurred(false);

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [securitySettings.blurWhenInactive]);

  return (
    <div className={`min-h-screen bg-surface text-on-surface flex flex-col transition-all ${
      isWindowBlurred && securitySettings.isPasscodeEnabled ? 'filter blur-md' : ''
    }`}>
      {/* Top App Bar */}
      <TopAppBar onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)} />

      {/* Navigation tabs */}
      <Navigation />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 pb-16">
        {currentView === 'timeline' && <DiaryList />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'stats' && <StatsView />}
        {currentView === 'settings' && (
          <SettingsBackupView onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)} />
        )}
      </main>

      {/* Signature Floating Action Button */}
      <FloatingActionButton />

      {/* Diary Editor Modal */}
      <DiaryEditorModal />

      {/* Passcode Security Settings Modal */}
      <PasscodeSettingsModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
      />

      {/* Toast notifications */}
      <Toast />

      {/* Lock Screen Overlay (Blocks access until unlocked) */}
      {isLocked && <LockScreen />}
    </div>
  );
};

export default function App() {
  return (
    <DiaryProvider>
      <DiaryAppContent />
    </DiaryProvider>
  );
}
