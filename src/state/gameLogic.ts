import {
  type DailyBalancePoint,
  type GameState,
  type LogEntry,
  type RewardStack,
  type RewardType,
} from '../types';

import {
  levelFromXp,
  xpIntoLevel,
  xpRequiredForNextLevel,
  MAX_LEVEL,
} from '../config/leveling';

import { REWARD_META } from '../config/rewards';
import { buildEffectsFromLog } from '../config/effects';

export const DAY_RESET_HOUR = 5; // 5am local boundary

export function getDayBucket(input: Date | string): string {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  // Before 5am counts as previous day
  if (d.getHours() < DAY_RESET_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Total unproductive minutes already logged in this 5am–5am “day”
export function getUnproductiveMinutesSoFar(
  log: LogEntry[],
  when: Date,
): number {
  const bucket = getDayBucket(when);
  let total = 0;

  for (const e of log) {
    if (e.kind !== 'activity') continue;
    if (e.category !== 'unproductive') continue;
    if (getDayBucket(e.timestamp) !== bucket) continue;

    const mins = (e as any).minutes ?? 0;
    if (!Number.isFinite(mins) || mins <= 0) continue;
    total += mins;
  }

  return total;
}

export function deriveState(
  activities: GameState['activities'],
  log: LogEntry[],
): Omit<GameState, 'loading' | 'activities' | 'log'> {
  const sorted = [...log].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let xpTotal = 0;
  let coins = 0;

  const rewardTypes = Object.keys(REWARD_META) as RewardType[];

  const emptyCounts = rewardTypes.reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<RewardType, number>,
  );

  const gained: Record<RewardType, number> = { ...emptyCounts };
  const used: Record<RewardType, number> = { ...emptyCounts };

  // 5am–5am “days”
  const dailyBalanceMap = new Map<string, number>();
  const dailyEarnedMap = new Map<string, number>();
  const dailySpentMap = new Map<string, number>();

  for (const e of sorted) {
    let coinsDelta = 0;

    switch (e.kind) {
      case 'activity':
        xpTotal += e.xpDelta;
        coinsDelta = e.coinsDelta;
        break;
      case 'box-opened':
        coinsDelta = e.coinsDelta;
        if (e.rewardType) gained[e.rewardType]++;
        break;
      case 'reward-gained':
        gained[e.rewardType]++;
        break;
      case 'reward-used':
        used[e.rewardType]++;
        break;
      case 'coins-adjust':
        coinsDelta = e.coinsDelta;
        break;
    }

    coins += coinsDelta;

    // *** 5am–5am bucket ***
    const dayKey = getDayBucket(e.timestamp);

    // End-of-day balance snapshot for that bucket
    dailyBalanceMap.set(dayKey, coins);

    // Per-day earned / spent for that bucket
    if (coinsDelta !== 0) {
      if (coinsDelta > 0) {
        dailyEarnedMap.set(dayKey, (dailyEarnedMap.get(dayKey) ?? 0) + coinsDelta);
      } else {
        const spent = Math.abs(coinsDelta);
        dailySpentMap.set(dayKey, (dailySpentMap.get(dayKey) ?? 0) + spent);
      }
    }
  }

  const level = levelFromXp(xpTotal);
  const xpCurr = xpIntoLevel(xpTotal);
  const xpNext =
    level === MAX_LEVEL ? 0 : Math.max(0, xpRequiredForNextLevel(level) - xpCurr);

  const levelsGained = Math.max(0, Math.min(level - 1, MAX_LEVEL - 1));
  const boxesOpened = sorted.filter((e) => e.kind === 'box-opened').length;
  const boxesAvailable = Math.max(0, levelsGained - boxesOpened);
  const chestLevel = boxesAvailable > 0 ? boxesOpened + 2 : null;

  const rewardsInventory: RewardStack[] = rewardTypes
    .map((t) => {
      const cnt = (gained[t] ?? 0) - (used[t] ?? 0);
      return { type: t, count: cnt };
    })
    .filter((r) => r.count > 0);

  const now = new Date();

  // Build contiguous 5am–5am “days” from first bucket up to today’s bucket
  let dailyBalances: DailyBalancePoint[] = [];
  let dailyEarned: DailyBalancePoint[] = [];
  let dailySpent: DailyBalancePoint[] = [];

  if (dailyBalanceMap.size > 0) {
    const dates = Array.from(dailyBalanceMap.keys()).sort();
    const firstDate = dates[0];
    const todayBucket = getDayBucket(now);

    let lastDate = dates[dates.length - 1];
    if (lastDate < todayBucket) {
      lastDate = todayBucket;
    }

    const addOneDay = (isoDay: string): string => {
      const d = new Date(isoDay + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let cursor = firstDate;
    let carryBalance = 0;

    while (cursor <= lastDate) {
      const balance = dailyBalanceMap.get(cursor);
      if (typeof balance === 'number') {
        carryBalance = balance;
      }

      const earned = dailyEarnedMap.get(cursor) ?? 0;
      const spent = dailySpentMap.get(cursor) ?? 0;

      dailyBalances.push({ date: cursor, balance: carryBalance });
      dailyEarned.push({ date: cursor, balance: earned });
      dailySpent.push({ date: cursor, balance: spent });

      cursor = addOneDay(cursor);
    }
  }

  const { activeEffects, snapshot } = buildEffectsFromLog(sorted, now);

  return {
    level,
    xpTotal,
    xpIntoLevel: xpCurr,
    xpToNextLevel: xpNext,
    coins,
    boxesAvailable,
    chestLevel,
    rewardsInventory,
    dailyBalances,
    dailyEarned,
    dailySpent,
    activeEffects,
    effectsSnapshot: snapshot,
  };
}