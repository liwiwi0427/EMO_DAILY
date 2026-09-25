import React from 'react';
import { BookOpen, Calendar, BarChart3, Cloud, Shield } from 'lucide-react';
import { useDiary, ViewTab } from '../context/DiaryContext';

export const Navigation: React.FC = () => {
  const { currentView, setCurrentView, entries, securitySettings } = useDiary();

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'timeline',
      label: '日誌列表',
      icon: <BookOpen className="w-5 h-5" />,
      badge: entries.length,
    },
    {
      id: 'calendar',
      label: '日曆檢視',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'stats',
      label: '心情統計',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: '雲端與安全',
      icon: <Cloud className="w-5 h-5" />,
      badge: securitySettings.isPasscodeEnabled ? undefined : '!',
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (M3 Signature Pill Indicator) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-lg border-t border-outline-variant/30 px-3 py-1.5 flex items-center justify-around">
        {navItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className="flex flex-col items-center justify-center py-1 px-3 min-w-[64px] min-h-[48px] select-none transition-all group"
            >
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-medium mt-1 tracking-tight transition-colors ${
                  isActive ? 'text-on-surface font-semibold' : 'text-on-surface-variant'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Top Segmented Navigation Tabs */}
      <div className="hidden md:flex items-center justify-center pt-3 pb-2 border-b border-outline-variant/20 bg-surface/50">
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-surface-container border border-outline-variant/30">
          {navItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-on-primary/20 text-on-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
