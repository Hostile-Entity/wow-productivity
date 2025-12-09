import React, { useState } from 'react';
import './styles/theme.css';
import { useGame } from './state/GameStore';
import { HeaderBar } from './components/HeaderBar';
import { Tabs, type TabId } from './components/Tabs';
import { ActivitiesTab } from './components/ActivitiesTab';
import { LogTab } from './components/LogTab';
import { RewardsTab } from './components/RewardsTab';
import { SettingsTab } from './components/SettingsTab';
import { AddActivityDialog } from './components/AddActivityDialog';

export const App: React.FC = () => {
  const { state } = useGame();
  const [tab, setTab] = useState<TabId>('activities');
  const [showAdd, setShowAdd] = useState(false);

  if (state.loading) {
    return (
      <div className="app-root">
        <div className="app-frame">
          <div className="panel" style={{ padding: 16, marginTop: 40 }}>
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
  
        {/* NEW wrapper */}
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
          <AddActivityDialog open={true} onClose={() => setShowAdd(false)} />
        )}
      </div>
    </div>
  );
};
