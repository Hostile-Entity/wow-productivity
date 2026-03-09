import React from 'react';
import './LogTab.css';
import { useGame } from '../state/GameStore';
import type { ActivityLogEntry, BoxOpenedLogEntry, LogEntry } from '../types';
import { CoinsDisplay } from './CoinsDisplay';
import { formatCoinsShort } from '../utils/coins';
import { formatDurationLabel } from '../utils/duration';
import { Virtuoso } from 'react-virtuoso';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeOnly(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function describeEntry(e: LogEntry): string {
  if (e.kind === 'activity') {
    const a = e as ActivityLogEntry;
    const coinsText = formatCoinsShort(a.coinsDelta);
    const xpSign = a.xpDelta > 0 ? '+' : '';

    const hasDuration =
      a.category !== 'daily' && typeof a.minutes === 'number' && a.minutes > 0;

    const durationText = hasDuration
      ? `, duration ${formatDurationLabel(a.minutes)}`
      : '';

    return `${a.activityName} (${a.category}/${a.tier})  ${coinsText}, ${xpSign}${a.xpDelta}xp${durationText}`;
  }
  if (e.kind === 'box-opened') {
    const b = e as BoxOpenedLogEntry;
    const coinsText = formatCoinsShort(b.coinsDelta);
    return `Opened level chest (${coinsText}${
      b.rewardType ? ', ' + b.rewardType : ''
    })`;
  }
  if (e.kind === 'reward-used') {
    return `Used reward: ${(e as any).rewardType}`;
  }
  if (e.kind === 'coins-adjust') {
    const c = e as any;
    const coinsText = formatCoinsShort(c.coinsDelta);
    return `Coins adjustment ${coinsText}`;
  }
  if (e.kind === 'reward-gained') {
    return `Gained reward: ${(e as any).rewardType}`;
  }
  return (e as any).kind;
}

function renderEntryTitle(e: LogEntry): React.ReactNode {
  if (e.kind === 'activity') {
    const a = e as ActivityLogEntry;
    const xpSign = a.xpDelta > 0 ? '+' : '';

    const hasDuration =
      a.category !== 'daily' && typeof a.minutes === 'number' && a.minutes > 0;

    return (
      <>
        {a.activityName} ({a.category}/{a.tier})
        {hasDuration && (
          <>
            {' · '}
            {formatDurationLabel(a.minutes)}
          </>
        )}
        {' · '}
        <CoinsDisplay amount={a.coinsDelta} showPlus />
        {' · '}
        {xpSign}
        {a.xpDelta}
        {' XP'}
      </>
    );
  }

  if (e.kind === 'box-opened') {
    const b = e as BoxOpenedLogEntry;
    return (
      <>
        Opened level chest · <CoinsDisplay amount={b.coinsDelta} showPlus />
        {b.rewardType ? ` · ${b.rewardType}` : ''}
      </>
    );
  }

  if (e.kind === 'coins-adjust') {
    const c = e as any;
    return (
      <>
        Coins adjustment · <CoinsDisplay amount={c.coinsDelta} showPlus />
      </>
    );
  }

  if (e.kind === 'reward-used') {
    return <>Used reward: {(e as any).rewardType}</>;
  }

  if (e.kind === 'reward-gained') {
    return <>Gained reward: {(e as any).rewardType}</>;
  }

  return <>{(e as any).kind}</>;
}

export const LogTab: React.FC = () => {
  const { state, removeLogEntry } = useGame();

  const entries = React.useMemo(
    () =>
      [...state.log].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [state.log],
  );

  return (
    <div className="panel tab-panel panel--padded">
      <h2 className="section-title">Log</h2>

      {entries.length === 0 ? (
        <div className="scroll-list">
          <div className="empty-state">Nothing logged yet.</div>
        </div>
      ) : (
        <Virtuoso
          className="scroll-list"
          overscan={120}
          increaseViewportBy={{ top: 450, bottom: 900 }}
          data={entries}
          itemContent={(index, e) => {
            const day = formatDayKey(e.timestamp);
            const prevDay = index > 0 ? formatDayKey(entries[index - 1].timestamp) : null;
            const showDayHeader = index === 0 || day !== prevDay;

            return (
              <>
                {showDayHeader && <div className="log-day-header">{day}</div>}

                <div className="card-row">
                  <div>
                    <div className="card-title">{renderEntryTitle(e)}</div>
                    <div className="card-subtitle">{formatTimeOnly(e.timestamp)}</div>
                  </div>

                  <button
                    className="button-ghost button-ghost--small"
                    type="button"
                    onClick={() => {
                      const ok = confirm(
                        `Delete this log entry?\n\n${describeEntry(e)}`,
                      );
                      if (ok) {
                        void removeLogEntry(e.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            );
          }}
        />
      )}
    </div>
  );
};
