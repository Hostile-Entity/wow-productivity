import React from 'react';
import { useGame } from '../state/GameStore';
import type { ActivityLogEntry, BoxOpenedLogEntry, LogEntry } from '../types';
import { CoinsDisplay } from './CoinsDisplay';
import { formatCoinsShort } from '../utils/coins';
import { formatDurationLabel } from '../utils/duration';

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

  return (
    <div className="panel tab-panel panel--padded">
      <h2 className="section-title">Log</h2>
      <div className="scroll-list">
        {[...state.log]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime(),
          )
          .map((e) => (
            <div key={e.id} className="card-row">
              <div>
                <div className="card-title">
                  {renderEntryTitle(e)}
                </div>
                <div className="card-subtitle">
                  {new Date(e.timestamp).toLocaleString()}
                </div>
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
          ))}
        {state.log.length === 0 && (
          <div className="empty-state">
            Nothing logged yet.
          </div>
        )}
      </div>
    </div>
  );
};
