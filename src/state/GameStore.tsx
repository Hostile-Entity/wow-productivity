import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

import { type Activity, type GameState, type LogEntry, type RewardType } from '../types';

import {
  clearAll,
  deleteActivity,
  deleteLogEntry,
  getAllActivities,
  getAllLog,
  putActivity,
  putLogEntry,
} from '../db/db';

import { deriveState, getUnproductiveMinutesSoFar } from './gameLogic';
import { rewardFor } from '../config/activities';
import { chestCoinsForLevel, rollChestLootForLevel } from '../config/rewards';
import { MAX_LEVEL } from '../config/leveling';
import { applyEffectsToReward, getInstantCoinsForReward } from '../config/effects';
import {
  playTabClickSound,
  playUiClickSound,
  playLevelUpSound,
  playChestRewardSounds,
  playNegativeCoinsSound,
  playInstantRewardCoinsSound,
  playRewardUseSound,
} from '../audio/soundManager';

type NewActivityPayload = {
  name: string;
  category: Activity['category'];
  tier: Activity['tier'];
};

type LogActivityPayload = {
  activity: Activity;
  when: Date;
  minutes: number;
};

interface GameContextValue {
  state: GameState;
  addOrUpdateActivity(payload: NewActivityPayload, id?: string): Promise<void>;
  removeActivity(id: string): Promise<void>;
  logActivity(p: LogActivityPayload): Promise<void>;
  removeLogEntry(id: string): Promise<void>;
  openChest(): Promise<void>;
  useReward(type: RewardType): Promise<void>;
  exportCsv(): Promise<string>;
  importCsv(csv: string): Promise<void>;
  wipeAll(): Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const emptyState: GameState = {
  loading: true,
  activities: [],
  log: [],
  level: 1,
  xpTotal: 0,
  xpIntoLevel: 0,
  xpToNextLevel: 0,
  coins: 0,
  boxesAvailable: 0,
  chestLevel: null,
  rewardsInventory: [],
  dailyBalances: [],
  dailyEarned: [],
  dailySpent: [],
  activeEffects: [],
  effectsSnapshot: {
    coinsBonusMultiplier: 1,
    xpBonusMultiplier: 1,
    unproductiveDiscountMultiplier: 1,
  },
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(emptyState);

  // Track previous level for level-up sound
  const prevStateRef = useRef<GameState | null>(null);
  const didInitRef = useRef(false);

  async function refresh() {
    const [activities, log] = await Promise.all([getAllActivities(), getAllLog()]);
    const derived = deriveState(activities as any, log as any);
      setState({
        loading: false,
        activities,
        log,
        ...derived,
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  // --- Global click sound handler ---
  useEffect(() => {
    function handleClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest<HTMLElement>(
        'button, [role="button"], a, [data-click-sound]',
      );
      if (!clickable) return;

      // Skip disabled buttons
      if (clickable instanceof HTMLButtonElement && clickable.disabled) {
        return;
      }

      const isTabButton = clickable.classList.contains('tabs-bar-button');

      if (isTabButton) {
        playTabClickSound();
      } else {
        playUiClickSound();
      }
    }

    // Capture phase to catch clicks even if React stops propagation
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  // --- Level-up sound watcher ---
  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev) {
      // Level up sound
      if (state.level > prev.level) {
        playLevelUpSound();
      }
  
      // Money just went negative: play once
      if (prev.coins >= 0 && state.coins < 0) {
        playNegativeCoinsSound();
      }
    }
  
    prevStateRef.current = state;
  }, [state]);

  async function addOrUpdateActivity(
    payload: NewActivityPayload,
    id?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const activity: Activity = {
      id: id ?? crypto.randomUUID(),
      name: payload.name,
      category: payload.category,
      tier: payload.tier,
      createdAt: now,
    };
    await putActivity(activity);
    await refresh();
  }

  async function removeActivity(id: string): Promise<void> {
    await deleteActivity(id);
    await refresh();
  }

  async function logActivity(p: LogActivityPayload): Promise<void> {
    const minutesBefore =
      p.activity.category === 'unproductive'
        ? getUnproductiveMinutesSoFar(state.log, p.when)
        : 0;
  
    const baseReward = rewardFor(
      p.activity.category,
      p.activity.tier,
      p.minutes,
      { unproductiveMinutesBefore: minutesBefore },
    );
  
    const finalReward = applyEffectsToReward(baseReward, {
      category: p.activity.category,
      when: p.when,
      log: state.log,
    });
  
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      kind: 'activity',
      timestamp: p.when.toISOString(),
      activityId: p.activity.id,
      activityName: p.activity.name,
      category: p.activity.category,
      tier: p.activity.tier,
      minutes: p.minutes,
      coinsDelta: finalReward.coins,
      xpDelta: finalReward.xp,
    };
    await putLogEntry(entry);
    await refresh();
  }


  async function removeLogEntry(id: string): Promise<void> {
    await deleteLogEntry(id);
    await refresh();
  }

  async function openChest(): Promise<void> {
    if (state.boxesAvailable <= 0) return;

    const chestLevel = state.chestLevel ?? state.level;
    const now = new Date().toISOString();

    const coinsFromChest = chestCoinsForLevel(chestLevel);

    // Multi/zero item chest loot using EV ledger + quality ranges
    const loot = rollChestLootForLevel(chestLevel, state.log);

    const chestEntry: LogEntry = {
      id: crypto.randomUUID(),
      kind: 'box-opened',
      timestamp: now,
      coinsDelta: coinsFromChest,
      sourceLevel: chestLevel,
      // no rewardType here anymore (items logged separately)
    };

    await putLogEntry(chestEntry);

    // Log each dropped item as its own reward-gained entry
    for (const rewardType of loot.items) {
      const rewardEntry: LogEntry = {
        id: crypto.randomUUID(),
        kind: 'reward-gained',
        timestamp: now,
        rewardType,
      } as LogEntry;
      await putLogEntry(rewardEntry);
    }

    await refresh();

    // Play coins pickup, then each item sound in sequence
    playChestRewardSounds();
  }

  async function useReward(type: RewardType): Promise<void> {
    const now = new Date().toISOString();
  
    // Log that reward was used
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      kind: 'reward-used',
      timestamp: now,
      rewardType: type,
    } as LogEntry;
    await putLogEntry(entry);
  
    const instantCoins = getInstantCoinsForReward(type);
  
    if (instantCoins !== null && instantCoins !== 0) {
      const coinsEntry: LogEntry = {
        id: crypto.randomUUID(),
        kind: 'coins-adjust',
        timestamp: now,
        coinsDelta: instantCoins,
      };
      await putLogEntry(coinsEntry);
  
      // START / MEDITATE style rewards → coins pickup sound
      playInstantRewardCoinsSound();
    } else {
      // All other rewards → reward.ogg
      playRewardUseSound();
    }
  
    await refresh();
  }
  

  async function exportCsv(): Promise<string> {
    const log = await getAllLog();
    const header = [
      'id',
      'kind',
      'timestamp',
      'activityName',
      'category',
      'tier',
      'minutes',
      'coinsDelta',
      'xpDelta',
      'rewardType',
      'notes',
    ];
    const rows = log.map((e) => {
      const anyE: any = e;
      return [
        e.id,
        e.kind,
        e.timestamp,
        anyE.activityName ?? '',
        anyE.category ?? '',
        anyE.tier ?? '',
        anyE.minutes ?? '',
        anyE.coinsDelta ?? '',
        anyE.xpDelta ?? '',
        anyE.rewardType ?? '',
        e.notes ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    return [header.join(','), ...rows].join('\n');
  }

  async function importCsv(csv: string): Promise<void> {
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return;
    const [headerLine, ...dataLines] = lines;
    const header = headerLine.split(',').map((h) => h.replace(/(^"|"$)/g, ''));
    const idx = (name: string) => header.indexOf(name);

    await clearAll();

    for (const line of dataLines) {
      const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) =>
        c.replace(/(^"|"$)/g, '').replace(/""/g, '"'),
      );
      const kind = cols[idx('kind')] as LogEntry['kind'];
      const base: any = {
        id: cols[idx('id')] || crypto.randomUUID(),
        kind,
        timestamp: cols[idx('timestamp')],
        notes: cols[idx('notes')] || undefined,
      };

      if (kind === 'activity') {
        const entry: LogEntry = {
          ...base,
          activityName: cols[idx('activityName')],
          category: cols[idx('category')],
          tier: cols[idx('tier')],
          minutes: Number(cols[idx('minutes')] || 0),
          coinsDelta: Number(cols[idx('coinsDelta')] || 0),
          xpDelta: Number(cols[idx('xpDelta')] || 0),
        };
        await putLogEntry(entry);
      } else if (kind === 'box-opened') {
        const entry: LogEntry = {
          ...base,
          coinsDelta: Number(cols[idx('coinsDelta')] || 0),
          rewardType: (cols[idx('rewardType')] || undefined) as any,
          sourceLevel: 0,
        };
        await putLogEntry(entry);
      } else if (kind === 'reward-gained' || kind === 'reward-used') {
        const entry: LogEntry = {
          ...base,
          rewardType: cols[idx('rewardType')] as RewardType,
        };
        await putLogEntry(entry);
      } else if (kind === 'coins-adjust') {
        const entry: LogEntry = {
          ...base,
          coinsDelta: Number(cols[idx('coinsDelta')] || 0),
        };
        await putLogEntry(entry);
      }
    }

    await refresh();
  }

  async function wipeAll(): Promise<void> {
    await clearAll();
    await refresh();
  }

  const value: GameContextValue = {
    state,
    addOrUpdateActivity,
    removeActivity,
    logActivity,
    removeLogEntry,
    openChest,
    useReward,
    exportCsv,
    importCsv,
    wipeAll,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
