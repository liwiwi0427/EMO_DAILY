import React from 'react';
import { PenLine } from 'lucide-react';
import { useDiary } from '../context/DiaryContext';

export const FloatingActionButton: React.FC = () => {
  const { openEditor, currentView } = useDiary();

  if (currentView === 'settings') return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-5 md:right-8 z-30">
      <button
        onClick={() => openEditor()}
        title="記錄新日記"
        className="w-14 h-14 rounded-2xl sm:rounded-3xl bg-primary text-on-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 group"
        aria-label="新增日記"
      >
        <PenLine className="w-6 h-6 transition-transform group-hover:rotate-6" />
      </button>
    </div>
  );
};
