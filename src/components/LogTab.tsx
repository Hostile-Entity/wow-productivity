import React from 'react';
import { useGame } from '../state/GameStore';
import type { ActivityLogEntry, BoxOpenedLogEntry, LogEntry } from '../types';

function describeEntry(e: LogEntry): string {
  if (e.kind === 'activity') {
    const a = e as ActivityLogEntry;
    const sign = a.coinsDelta > 0 ? '+' : '';
    return `${a.activityName} (${a.category}/${a.tier})  ${sign}${a.coinsDelta}c, +${a.xpDelta}xp`;
  }
  if (e.kind === 'box-opened') {
    const b = e as BoxOpenedLogEntry;
    return `Opened level chest (+${b.coinsDelta}c${
      b.rewardType ? ', ' + b.rewardType : ''
    })`;
  }
  if (e.kind === 'reward-used') {
    return `Used reward: ${(e as any).rewardType}`;
  }
  if (e.kind === 'coins-adjust') {
    const c = e as any;
    const sign = c.coinsDelta > 0 ? '+' : '';
    return `Coins adjustment ${sign}${c.coinsDelta}`;
  }
  if (e.kind === 'reward-gained') {
    return `Gained reward: ${(e as any).rewardType}`;
  }
  return (e as any).kind;
}

export const LogTab: React.FC = () => {
  const { state, removeLogEntry } = useGame();

  return (
    <div className="panel tab-panel" style={{ padding: 8 }}>
      <h2 className="section-title">Log</h2>
      <div
          style={{
            flex: 1,
            overflow: 'auto',
            paddingBottom: 80,
          }}
        >
        {[...state.log]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
          .map((e) => (
            <div key={e.id} className="card-row">
              <div>
                <div className="card-title">{describeEntry(e)}</div>
                <div className="card-subtitle">
                  {new Date(e.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                className="button-ghost"
                type="button"
                style={{ fontSize: 10 }}
                onClick={() => {
                  const ok = confirm(
                    `Delete this log entry?\n\n${describeEntry(e)}`
                  );
                  if (ok) {
                    void removeLogEntry(e.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        {state.log.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--wow-text-muted)' }}>
            Nothing logged yet.
          </div>
        )}
      </div>
    </div>
  );
};
