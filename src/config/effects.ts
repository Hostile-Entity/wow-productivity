import effectsJson from '../data/effects.json';
import type {
  ActivityCategory,
  RewardType,
  LogEntry,
  ActiveEffect,
  EffectsSnapshot,
  EffectKind,
} from '../types';
import { REWARD_META } from './rewards';

type RawEffectDef = {
  rewardType: RewardType;
  kind: EffectKind;
  percent: number;        // effect magnitude in %
  durationHours: number;  // 24 for your current buffs
  categories: ActivityCategory[];
};

type RawEffects = Record<string, RawEffectDef>;

const RAW_EFFECTS = effectsJson as RawEffects;

export interface EffectMeta extends RawEffectDef {
  id: string;
  durationMs: number;
}

// Map rewardType -> effect meta (only for timed effects)
export const EFFECTS_META: Partial<Record<RewardType, EffectMeta>> =
  Object.fromEntries(
    Object.entries(RAW_EFFECTS).map(([id, raw]) => [
      raw.rewardType,
      {
        ...raw,
        id,
        durationMs: raw.durationHours * 60 * 60 * 1000,
      },
    ]),
  ) as Partial<Record<RewardType, EffectMeta>>;

// Instant-coin rewards (trusted, no 24h effect)
export const START_REWARDS: RewardType[] = ['start_40', 'start_80', 'start_160'];

export const MEDITATE_REWARDS: RewardType[] = [
  'meditate_5min',
  'meditate_10min',
  'meditate_15min',
];

// Returns coins to grant immediately if this reward is "instant"
export function getInstantCoinsForReward(type: RewardType): number | null {
  if (START_REWARDS.includes(type) || MEDITATE_REWARDS.includes(type)) {
    // For these, value in items.json is equal to bonus gold
    return REWARD_META[type].value;
  }

  return null;
}

/**
 * Compute active timed effects at a given moment.
 * Assumes log is sorted ascending.
 */
export function buildEffectsFromLog(
  log: LogEntry[],
  now: Date,
): { activeEffects: ActiveEffect[]; snapshot: EffectsSnapshot } {
  const latestUseByReward = new Map<RewardType, string>();

  for (const e of log) {
    if (e.kind !== 'reward-used') continue;
    const rewardType = (e as any).rewardType as RewardType | undefined;
    if (!rewardType) continue;
    if (!EFFECTS_META[rewardType]) continue; // only timed effects
    latestUseByReward.set(rewardType, e.timestamp);
  }

  const activeEffects: ActiveEffect[] = [];
  const nowMs = now.getTime();

  for (const [rewardType, usedAt] of latestUseByReward.entries()) {
    const meta = EFFECTS_META[rewardType];
    if (!meta) continue;

    const startMs = new Date(usedAt).getTime();
    const expiresMs = startMs + meta.durationMs;
    if (expiresMs <= nowMs) continue;

    activeEffects.push({
      id: rewardType,
      rewardType,
      kind: meta.kind,
      percent: meta.percent,
      expiresAt: new Date(expiresMs).toISOString(),
    });
  }

  const snapshot: EffectsSnapshot = {
    coinsBonusMultiplier: 1,
    xpBonusMultiplier: 1,
    unproductiveDiscountMultiplier: 1,
  };

  for (const eff of activeEffects) {
    const meta = EFFECTS_META[eff.rewardType]!;
    const p = eff.percent / 100;

    switch (eff.kind) {
      case 'coins-bonus':
        snapshot.coinsBonusMultiplier *= 1 + p;
        break;
      case 'xp-bonus':
        snapshot.xpBonusMultiplier *= 1 + p;
        break;
      case 'discount':
        snapshot.unproductiveDiscountMultiplier *= 1 - p;
        break;
    }
  }

  return { activeEffects, snapshot };
}

/**
 * Apply all active timed effects as of `when` to the base reward.
 * Used both in the actual log and the preview.
 */
export function applyEffectsToReward(
  base: { coins: number; xp: number },
  opts: { category: ActivityCategory; when: Date; log: LogEntry[] },
): { coins: number; xp: number } {
  const { category, when, log } = opts;

  const cutoffMs = when.getTime();
  const relevantLog = log.filter(
    (e) => new Date(e.timestamp).getTime() <= cutoffMs,
  );

  const { activeEffects } = buildEffectsFromLog(relevantLog, when);

  let coins = base.coins;
  let xp = base.xp;

  for (const eff of activeEffects) {
    const meta = EFFECTS_META[eff.rewardType]!;
    if (!meta.categories.includes(category)) continue;

    const p = eff.percent / 100;

    switch (eff.kind) {
      case 'coins-bonus':
        coins = Math.round(coins * (1 + p));
        break;
      case 'xp-bonus':
        xp = Math.round(xp * (1 + p));
        break;
      case 'discount':
        // Works for negative "cost" coins too
        coins = Math.round(coins * (1 - p));
        break;
    }
  }

  return { coins, xp };
}
