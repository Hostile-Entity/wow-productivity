// src/components/SettingsTab.tsx
import React, { useRef, useState, useEffect } from 'react';
import './SettingsTab.css';
import { useGame } from '../state/GameStore';
import { getLedgerSnapshotForLevel, type LedgerSnapshot } from '../config/rewards';
import { BalanceChartsModal } from './BalanceChartsModal';

function clampVolume(v: number) {
  return Math.max(0, Math.min(100, v));
}

function parseVersionNumber(input: string | null): number | null {
  if (!input) return null;
  const match = input.match(/v(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
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
  const { state, exportBackupJson, importBackupJson, wipeAll, setSoundVolume } = useGame();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [chartOpen, setChartOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [devSnapshot, setDevSnapshot] = useState<LedgerSnapshot | null>(null);
  const [swVersion, setSwVersion] = useState<string | null>('detecting...');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  const hasDailyBalances = (state.dailyBalances?.length ?? 0) > 0;

  useEffect(() => {
    let cancelled = false;

    async function resolveCachedVersion(): Promise<string | null> {
      if (!('caches' in window)) return null;
      const keys = await caches.keys();
      const versions = keys
        .map((k) => {
          const m = k.match(/^wow-productivity-v(\d+)$/i);
          return m ? Number(m[1]) : null;
        })
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

      if (versions.length === 0) return null;
      return `v${Math.max(...versions)}`;
    }

    async function fetchVersion() {
      try {
        const cachedVersion = await resolveCachedVersion();
        if (!cancelled && cachedVersion) {
          setSwVersion(cachedVersion);
        }

        const resp = await fetch(
          `${import.meta.env.BASE_URL}sw.js?ts=${Date.now()}`,
          { cache: 'no-store' },
        );
        if (!resp.ok) {
          if (!cancelled && !cachedVersion) setSwVersion('unknown');
          return;
        }

        const code = await resp.text();
        const match = code.match(/wow-productivity-v(\d+)/i);
        if (!cancelled) {
          setSwVersion(match ? `v${match[1]}` : (cachedVersion ?? 'unknown'));
        }
      } catch {
        if (!cancelled) {
          const cachedVersion = await resolveCachedVersion();
          setSwVersion(cachedVersion ?? 'unknown');
        }
      }
    }
    void fetchVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  async function getRegistration() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser.');
    }

    const reg =
      (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)) ??
      (await navigator.serviceWorker.getRegistration());

    if (!reg) {
      throw new Error('Service worker is not registered yet.');
    }

    return reg;
  }

  async function waitForWaitingWorker(
    reg: ServiceWorkerRegistration,
    timeoutMs: number,
  ): Promise<ServiceWorker | null> {
    if (reg.waiting) return reg.waiting;

    return new Promise<ServiceWorker | null>((resolve) => {
      let resolved = false;

      const finish = (worker: ServiceWorker | null) => {
        if (resolved) return;
        resolved = true;
        resolve(worker);
      };

      const timer = window.setTimeout(() => {
        finish(reg.waiting ?? null);
      }, timeoutMs);

      const onUpdateFound = () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            window.clearTimeout(timer);
            finish(reg.waiting ?? installing);
          } else if (installing.state === 'redundant') {
            window.clearTimeout(timer);
            finish(null);
          }
        });
      };

      reg.addEventListener('updatefound', onUpdateFound, { once: true });

      if (reg.installing) {
        onUpdateFound();
      }
    });
  }

  async function handleApplyUpdate() {
    setIsApplyingUpdate(true);

    try {
      const reg = await getRegistration();
      await reg.update();

      const targetWorker = await waitForWaitingWorker(reg, 8000);
      if (!targetWorker) {
        alert('No new update to apply right now.');
        return;
      }

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };

        navigator.serviceWorker.addEventListener('controllerchange', finish, {
          once: true,
        });

        targetWorker.postMessage({ type: 'SKIP_WAITING' });
        window.setTimeout(finish, 4000);
      });

      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply update.';
      alert(`Apply failed: ${msg}`);
    } finally {
      setIsApplyingUpdate(false);
    }
  }

  async function handleCheckForUpdates() {
    setIsCheckingUpdate(true);

    try {
      await getRegistration();

      const resp = await fetch(
        `${import.meta.env.BASE_URL}sw.js?ts=${Date.now()}`,
        { cache: 'no-store' },
      );
      if (!resp.ok) {
        throw new Error(`Failed to fetch sw.js (${resp.status})`);
      }

      const code = await resp.text();
      const match = code.match(/wow-productivity-v(\d+)/i);
      if (!match) {
        throw new Error('Could not read version from sw.js');
      }

      const remote = Number(match[1]);
      const current = parseVersionNumber(swVersion);
      if (!Number.isFinite(remote)) {
        throw new Error('Invalid version in sw.js');
      }

      if (!current || remote > current) {
        const shouldApply = confirm(`Update v${remote} is available.\n\nApply now?`);
        if (shouldApply) {
          await handleApplyUpdate();
        }
      } else {
        alert(`You are up to date (v${remote}).`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update check failed.';
      alert(`Update check failed: ${msg}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function handleExport() {
    const json = await exportBackupJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wow-productivity-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importBackupJson(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid backup file.';
      alert(`Import failed: ${msg}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
            Export backup as JSON
          </button>

          <button
            className="button-ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import backup from JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
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

      <section className="settings-section">
        <div className="settings-section-title">Updates</div>
        <div className="settings-button-column">
          <button
            className="button-ghost"
            type="button"
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdate || isApplyingUpdate}
          >
            {isApplyingUpdate
              ? 'Applying update...'
              : isCheckingUpdate
                ? 'Checking updates...'
                : 'Check for update'}
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
