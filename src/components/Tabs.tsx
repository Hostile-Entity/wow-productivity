import React from 'react';

export type TabId = 'activities' | 'log' | 'rewards' | 'settings';

const tabLabels: { id: TabId; label: string }[] = [
  { id: 'activities', label: 'Activities' },
  { id: 'log', label: 'Log' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'settings', label: 'Settings' },
];

interface TabsProps {
  active: TabId;
  onChange(tab: TabId): void;
}

export const Tabs: React.FC<TabsProps> = ({ active, onChange }) => {
  return (
    <div className="tabs-bar">
      {tabLabels.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              'tabs-bar-button' +
              (isActive ? ' tabs-bar-button--active' : '')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};
