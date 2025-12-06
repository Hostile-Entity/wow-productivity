import itemsJson from '../data/items.json';
import rewardMultipliersJson from '../data/reward_multipliers.json';
import type { RewardType, LogEntry } from '../types';
import { EVLedger } from './evLedger';

export const CHEST_COINS = 36;

// ----- Per-level reward multiplier -----

type RewardMultiplierMap = Record<string, number>;
const LEVEL_REWARD_MULTIPLIERS = rewardMultipliersJson as RewardMultiplierMap;

export function getLevelRewardMultiplier(level: number): number {
  const key = String(level);
  const val = LEVEL_REWARD_MULTIPLIERS[key];
  return typeof val === 'number' ? val : 1;
}

export function chestCoinsForLevel(level: number): number {
  const base = CHEST_COINS * getLevelRewardMultiplier(level);
  const VARIANCE = 0.2; // +/- 20 %
  const factor = 1 - VARIANCE + Math.random() * (2 * VARIANCE); // [0.8, 1.2]
  return Math.round(base * factor);
}

// ----- Items & qualities -----

export type RewardQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

type RawItem = {
  name: string;
  quality: RewardQuality;
  value: number;
  amount: number;
  itemLevel: number;
  requiredLevel: number;
  description: string;
  icon: string;
};

type RawItems = Record<RewardType, RawItem>;
const RAW_ITEMS = itemsJson as RawItems;

export interface RewardMeta {
  type: RewardType;
  name: string;
  quality: RewardQuality;
  itemLevel: number;
  requiredLevel: number;
  useDescription: string;
  icon: string;
  value: number;
  amount: number;
}

export interface LedgerSnapshot {
  paid: number;
  target: number;
  multiplier: number;
  level: number | null;
  baselineEv: number;
  targetThis: number;
}

export function getLedgerSnapshotForLevel(
  log: LogEntry[],
  level: number | null,
): LedgerSnapshot {
  const ledger = buildLedgerFromLog(log);

  // If level is missing or outside chest range, just show current ledger state
  if (
    level == null ||
    level < MIN_CHEST_LEVEL ||
    level > MAX_CHEST_LEVEL
  ) {
    return {
      paid: ledger.paid,
      target: ledger.target,
      multiplier: 1,
      level: level ?? null,
      baselineEv: 0,
      targetThis: 0,
    };
  }

  const { baselineEv } = computeBaselineEvForLevel(level);
  const targetThis = computeTargetValueForLevel(level);
  const multiplier =
    baselineEv > 1e-9 ? ledger.multiplier(baselineEv, targetThis) : 1;

  return {
    paid: ledger.paid,
    target: ledger.target,
    multiplier,
    level,
    baselineEv,
    targetThis,
  };
}

export const REWARD_META: Record<RewardType, RewardMeta> = Object.fromEntries(
  Object.entries(RAW_ITEMS).map(([type, item]) => [
    type,
    {
      type: type as RewardType,
      name: item.name,
      quality: item.quality,
      itemLevel: item.itemLevel,
      requiredLevel: item.requiredLevel,
      useDescription: item.description,
      icon: item.icon,
      value: item.value,
      amount: item.amount,
    },
  ]),
) as Record<RewardType, RewardMeta>;

// Legacy random table (by total amount)
const totalAmount = Object.values(REWARD_META).reduce(
  (sum, meta) => sum + meta.amount,
  0,
);

export const RANDOM_REWARD_TABLE: { type: RewardType; p: number }[] =
  Object.values(REWARD_META).map((meta) => ({
    type: meta.type,
    p: meta.amount / totalAmount,
  }));

export function rollRandomReward(): RewardType | null {
  const r = Math.random();
  let acc = 0;
  for (const row of RANDOM_REWARD_TABLE) {
    acc += row.p;
    if (r < acc) return row.type;
  }
  return null;
}

export function rewardLabel(type: RewardType): string {
  return REWARD_META[type].name;
}

// ----- Chest level / quality windows -----

export const MIN_CHEST_LEVEL = 2;
export const MAX_CHEST_LEVEL = 79;

export const QUALITY_LEVEL_RANGES: Record<RewardQuality, Array<[number, number]>> = {
  common: [[2, 49]],
  uncommon: [[10, 59]],
  rare: [[20, 79]],
  epic: [[40, 79]],
  legendary: [[80, 80]], // 0 probability from chests
};

function clampRange(range: [number, number]): [number, number] | null {
  let [a, b] = range;
  if (a < MIN_CHEST_LEVEL) a = MIN_CHEST_LEVEL;
  if (b > MAX_CHEST_LEVEL) b = MAX_CHEST_LEVEL;
  if (a > b) return null;
  return [a, b];
}

function eligibleLevelsCountForQuality(q: RewardQuality): number {
  const ranges = QUALITY_LEVEL_RANGES[q] ?? [];
  let total = 0;
  for (const r of ranges) {
    const cr = clampRange(r);
    if (!cr) continue;
    const [a, b] = cr;
    total += b - a + 1;
  }
  return total;
}

function isLevelEligibleForQuality(level: number, q: RewardQuality): boolean {
  const ranges = QUALITY_LEVEL_RANGES[q] ?? [];
  for (const r of ranges) {
    const cr = clampRange(r);
    if (!cr) continue;
    const [a, b] = cr;
    if (level >= a && level <= b) return true;
  }
  return false;
}

function dropProbabilityForItem(level: number, item: RewardMeta): number {
  if (!isLevelEligibleForQuality(level, item.quality)) return 0;
  if (item.quality === 'legendary') return 1;

  const L = eligibleLevelsCountForQuality(item.quality);
  if (L <= 0) return 0;

  const p = item.amount / L;
  if (p <= 0) return 0;

  if (p > 1 + 1e-12) {
    console.warn(
      `[loot] item '${item.name}' has amount=${item.amount} but only ${L} eligible levels`,
    );
  }

  return Math.min(1, Math.max(0, p));
}

// ----- Baseline EV per level -----

type BaselineRow = {
  meta: RewardMeta;
  pBase: number;
  value: number;
};

function computeBaselineEvForLevel(level: number): {
  perItem: BaselineRow[];
  baselineEv: number;
} {
  const levelMult = getLevelRewardMultiplier(level);
  const perItem: BaselineRow[] = [];
  let baselineEv = 0;

  for (const meta of Object.values(REWARD_META)) {
    const p0 = dropProbabilityForItem(level, meta);
    if (p0 <= 0.00001) {
      perItem.push({ meta, pBase: 0, value: meta.value });
      continue;
    }
    const pBase = p0 * levelMult;
    perItem.push({ meta, pBase, value: meta.value });
    baselineEv += pBase * meta.value;
  }

  return { perItem, baselineEv };
}

// Simple target function: same as baseline EV; can be swapped later if needed.
function computeTargetValueForLevel(level: number): number {
  const { baselineEv } = computeBaselineEvForLevel(level);
  return baselineEv;
}

// ----- Ledger reconstruction from log -----

function buildLedgerFromLog(log: LogEntry[]): EVLedger {
  const ledger = new EVLedger();
  if (!log.length) return ledger;

  const sorted = [...log].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let chestIndex = 0;

  for (const raw of sorted) {
    const e: any = raw;

    if (e.kind === 'box-opened') {
      chestIndex += 1;

      let lvl: number;
      lvl = chestIndex + 1;

      if (lvl < MIN_CHEST_LEVEL) lvl = MIN_CHEST_LEVEL;
      if (lvl > MAX_CHEST_LEVEL) lvl = MAX_CHEST_LEVEL;

      const { baselineEv } = computeBaselineEvForLevel(lvl);
      console.log(`[dev] level=${lvl} baselineEv=${baselineEv}`);
      ledger.target += baselineEv;
      console.log(`[dev] level=${lvl} target=${ledger.target}`);

      // Legacy single-item chests: rewardType on box-opened
      const legacyRewardType = e.rewardType as RewardType | undefined;
      if (legacyRewardType && REWARD_META[legacyRewardType]) {
        ledger.paid += REWARD_META[legacyRewardType].value;
      }
    }

    if (e.kind === 'reward-gained') {
      const rt = e.rewardType as RewardType;
      const meta = REWARD_META[rt];
      if (meta) ledger.paid += meta.value;
    }
  }

  return ledger;
}

// ----- Chest loot API -----

export interface ChestLootResult {
  items: RewardType[];
  qualityBreakdown: Partial<Record<RewardQuality, number>>;
  totalValue: number;
}

export function rollChestLootForLevel(
  level: number,
  log: LogEntry[],
): ChestLootResult {
  if (level < MIN_CHEST_LEVEL || level > MAX_CHEST_LEVEL) {
    return { items: [], qualityBreakdown: {}, totalValue: 0 };
  }

  const ledger = buildLedgerFromLog(log);
  const { perItem, baselineEv } = computeBaselineEvForLevel(level);

  if (baselineEv <= 1e-9) {
    return { items: [], qualityBreakdown: {}, totalValue: 0 };
  }

  const targetThis = computeTargetValueForLevel(level);
  const mult = ledger.multiplier(baselineEv, targetThis);

  const items: RewardType[] = [];
  const qualityBreakdown: Partial<Record<RewardQuality, number>> = {};
  let totalValue = 0;

  for (const row of perItem) {
    const p = Math.max(0, Math.min(1, row.pBase * mult));
    if (Math.random() < p) {
      const t = row.meta.type;
      items.push(t);
      const q = row.meta.quality;
      qualityBreakdown[q] = (qualityBreakdown[q] ?? 0) + 1;
      totalValue += row.value;
    }
  }

  // Booking is implicit: when you log box-opened + reward-gained,
  // buildLedgerFromLog will see it the next time.

  return { items, qualityBreakdown, totalValue };
}