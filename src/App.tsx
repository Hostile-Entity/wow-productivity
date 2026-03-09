import React, { useCallback, useState } from 'react';
import './styles/theme.css';
import { useGame } from './state/GameStore';
import { HeaderBar } from './components/HeaderBar';
import { Tabs, type TabId } from './components/Tabs';
import { ActivitiesTab } from './components/ActivitiesTab';
import { LogTab } from './components/LogTab';
import { RewardsTab } from './components/RewardsTab';
import { SettingsTab } from './components/SettingsTab';
import { AddActivityDialog } from './components/AddActivityDialog';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export const App: React.FC = () => {
  const { state } = useGame();
  const [tab, setTab] = useState<TabId>('activities');
  const [showAdd, setShowAdd] = useState(false);
  const [addDraftWhenValue, setAddDraftWhenValue] = useState<string>(() =>
    toDatetimeLocalValue(new Date()),
  );
  const [addDraftWhenTouched, setAddDraftWhenTouched] = useState(false);

  const handleWhenDraftChange = useCallback((value: string, touched: boolean) => {
    setAddDraftWhenValue(value);
    setAddDraftWhenTouched(touched);
  }, []);

  if (state.loading) {
    return (
      <div className="app-root">
        <div className="app-frame">
          <div className="panel panel--padded-lg panel--mt-40">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-frame">
        <HeaderBar
          level={state.level}
          coins={state.coins}
          xpIntoLevel={state.xpIntoLevel}
          xpToNext={state.xpToNextLevel}
        />

        <Tabs active={tab} onChange={setTab} />

        <div className="app-content">
          {tab === 'activities' && <ActivitiesTab />}
          {tab === 'log' && <LogTab />}
          {tab === 'rewards' && <RewardsTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>

        <button
          className="button-primary bottom-cta fab-plus"
          type="button"
          onClick={() => setShowAdd(true)}
          aria-label="Log completed activity"
        >
          +
        </button>

        {showAdd && (
          <AddActivityDialog
            open={true}
            onClose={() => setShowAdd(false)}
            whenValue={addDraftWhenValue}
            whenTouched={addDraftWhenTouched}
            onWhenDraftChange={handleWhenDraftChange}
          />
        )}
      </div>
    </div>
  );
};
