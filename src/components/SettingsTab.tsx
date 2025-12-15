// src/components/SettingsTab.tsx
import React, { useRef, useState, useEffect } from 'react';
import './SettingsTab.css';
import { useGame } from '../state/GameStore';
import { getLedgerSnapshotForLevel, type LedgerSnapshot } from '../config/rewards';
import { BalanceChartsModal } from './BalanceChartsModal';

function clampVolume(v: number) {
  return Math.max(0, Math.min(100, v));
}

const VolumePopup: React.FC<{
  open: boolean;
  value: number;
  onChange(v: number): void;
  onClose(): void;
}> = ({ open, value, onChange, onClose }) => {
  if (!open) return null;

  const vol = clampVolume(Number.isFinite(value) ? value : 100);

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <div className="bottom-sheet-title">Sound volume</div>
        </div>

        <div className="bottom-sheet-body">
          <div className="settings-volume-row">
            <input
              className="settings-volume-slider"
              type="range"
              min={0}
              max={100}
              value={vol}
              onChange={(e) => onChange(clampVolume(Number(e.target.value)))}
            />
            <div className="small-muted-text settings-volume-value">
              {vol === 0 ? 'Muted' : `${vol}%`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsTab: React.FC = () => {
  const { state, exportCsv, importCsv, wipeAll, setSoundVolume } = useGame();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [chartOpen, setChartOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [devSnapshot, setDevSnapshot] = useState<LedgerSnapshot | null>(null);
  const [swVersion, setSwVersion] = useState<string | null>(null);

  const hasDailyBalances = (state.dailyBalances?.length ?? 0) > 0;

  useEffect(() => {
    async function fetchVersion() {
      if (!('caches' in window)) return;
      try {
        const keys = await caches.keys();
        const key = keys.find((k) => k.startsWith('wow-productivity-'));
        if (!key) return;

        const match = key.match(/-v(\d+)/);
        const version = match ? `v${match[1]}` : key;
        setSwVersion(version);
      } catch {
        // ignore
      }
    }

    void fetchVersion();
  }, []);

  async function handleExport() {
    const csv = await exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wow-productivity-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importCsv(text);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function confirmWipe() {
    if (confirm('Delete all data? This cannot be undone.')) {
      void wipeAll();
    }
  }

  function handleShowDevValues() {
    const chestLevel = state.chestLevel ?? state.level;
    const snap = getLedgerSnapshotForLevel(state.log as any, chestLevel);
    setDevSnapshot(snap);
  }

  const volumeValue = clampVolume(
    Number.isFinite(state.soundVolume as any) ? (state.soundVolume as any) : 100,
  );

  return (
    <div className="panel panel--padded panel--mt-8">
      <h2 className="section-title">Settings</h2>

      {/* Statistics */}
      <section className="settings-section">
        <div className="settings-section-title">Statistics</div>
        <div className="settings-button-column">
          <button
            className="button-ghost settings-wide-button"
            type="button"
            onClick={() => setChartOpen(true)}
            disabled={!hasDailyBalances}
          >
            Balance chart (last 30 days)
          </button>

          <button
            className="button-ghost settings-wide-button"
            type="button"
            onClick={handleShowDevValues}
          >
            Show EV ledger (dev)
          </button>
        </div>

        {!hasDailyBalances && (
          <div className="small-muted-text settings-note">No days logged yet.</div>
        )}

        {devSnapshot && (
          <div className="small-muted-text settings-dev-snapshot">
            <div>Level: {devSnapshot.level ?? '-'}</div>
            <div>EV multiplier: {devSnapshot.multiplier.toFixed(3)}</div>
            <div>Paid: {devSnapshot.paid.toFixed(1)}</div>
            <div>Target: {devSnapshot.target.toFixed(1)}</div>
          </div>
        )}
      </section>

      {/* Audio */}
      <section className="settings-section">
        <div className="settings-section-title">Audio</div>
        <div className="settings-button-column">
          <button
            className="button-ghost settings-wide-button"
            type="button"
            onClick={() => setVolumeOpen(true)}
          >
            Sound volume: {volumeValue === 0 ? 'Muted' : `${volumeValue}%`}
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-button-column">
          <button className="button-ghost" type="button" onClick={handleExport}>
            Export log as CSV
          </button>

          <button
            className="button-ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import log from CSV
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />

          <button
            className="button-ghost button-ghost--danger"
            type="button"
            onClick={confirmWipe}
          >
            Delete database
          </button>
        </div>
      </section>

      {swVersion && (
        <div className="small-muted-text settings-version">App version: {swVersion}</div>
      )}

      <BalanceChartsModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        balances={state.dailyBalances ?? []}
        earned={state.dailyEarned ?? []}
        spent={state.dailySpent ?? []}
      />

      <VolumePopup
        open={volumeOpen}
        value={volumeValue}
        onChange={setSoundVolume}
        onClose={() => setVolumeOpen(false)}
      />
    </div>
  );
};
