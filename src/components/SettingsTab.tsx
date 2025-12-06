import React, { useRef, useState } from 'react';
import { useGame } from '../state/GameStore';
import { getLedgerSnapshotForLevel, type LedgerSnapshot } from '../config/rewards';
import { BalanceChartsModal } from './BalanceChartsModal';

export const SettingsTab: React.FC = () => {
  const { state, exportCsv, importCsv, wipeAll } = useGame();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [chartOpen, setChartOpen] = useState(false);
  const [devSnapshot, setDevSnapshot] = useState<LedgerSnapshot | null>(null);

  const hasDailyBalances = (state.dailyBalances?.length ?? 0) > 0;

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

  return (
    <div className="panel" style={{ padding: 8, marginTop: 8 }}>
      <h2 className="section-title">Settings</h2>

      {/* Statistics / chart button */}
      <section style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Statistics</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            className="button-ghost"
            type="button"
            onClick={() => setChartOpen(true)}
            disabled={!hasDailyBalances}
            style={{
              width: '100%',
              textAlign: 'center',
            }}
          >
            Balance chart (last 30 days)
          </button>

          <button
            className="button-ghost"
            type="button"
            onClick={handleShowDevValues}
            style={{
              width: '100%',
              textAlign: 'center',
            }}
          >
            Show EV ledger (dev)
          </button>
        </div>
        {!hasDailyBalances && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--wow-text-muted)',
              marginTop: 4,
            }}
          >
            No days logged yet.
          </div>
        )}
        {devSnapshot && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--wow-text-muted)',
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            <div>Level: {devSnapshot.level ?? '-'}</div>
            <div>EV multiplier: {devSnapshot.multiplier.toFixed(3)}</div>
            <div>Paid: {devSnapshot.paid.toFixed(1)}</div>
            <div>Target: {devSnapshot.target.toFixed(1)}</div>
          </div>
        )}
      </section>

      {/* Data section */}
      <section style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Data</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
            className="button-ghost"
            type="button"
            style={{ color: 'var(--wow-red)', borderColor: 'var(--wow-red)' }}
            onClick={confirmWipe}
          >
            Delete database
          </button>
        </div>
      </section>

      {/* Chart modal */}
      <BalanceChartsModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        balances={state.dailyBalances ?? []}
        earned={state.dailyEarned ?? []}
        spent={state.dailySpent ?? []}
      />
    </div>
  );
};