import itemsJson from './data/items.json';
export type RewardType = keyof typeof itemsJson;

export type ActivityCategory = 'daily' | 'productive' | 'unproductive';

export type DailyTier = 'minor' | 'major';
export type ProductiveTier = 'gray' | 'green' | 'yellow' | 'orange' | 'red';
export type UnproductiveTier = 'idle' | 'time-sink';

export type ActivityTier = DailyTier | ProductiveTier | UnproductiveTier;

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  tier: ActivityTier;
  createdAt: string; // ISO
}

export type LogKind =
  | 'activity'
  | 'box-opened'
  | 'reward-gained'
  | 'reward-used'
  | 'coins-adjust';

export interface BaseLogEntry {
  id: string;
  kind: LogKind;
  timestamp: string; // ISO
  notes?: string;
}

export interface ActivityLogEntry extends BaseLogEntry {
  kind: 'activity';
  activityId?: string;
  activityName: string;
  category: ActivityCategory;
  tier: ActivityTier;
  minutes: number;
  coinsDelta: number;
  xpDelta: number;
}

export interface BoxOpenedLogEntry extends BaseLogEntry {
  kind: 'box-opened';
  coinsDelta: number;
  sourceLevel: number;
  rewardType?: RewardType;
}

export interface RewardGainedLogEntry extends BaseLogEntry {
  kind: 'reward-gained';
  rewardType: RewardType;
}

export interface RewardUsedLogEntry extends BaseLogEntry {
  kind: 'reward-used';
  rewardType: RewardType;
}

export interface CoinsAdjustLogEntry extends BaseLogEntry {
  kind: 'coins-adjust';
  coinsDelta: number;
}

export type LogEntry =
  | ActivityLogEntry
  | BoxOpenedLogEntry
  | RewardGainedLogEntry
  | RewardUsedLogEntry
  | CoinsAdjustLogEntry;


export type EffectKind = 'coins-bonus' | 'xp-bonus' | 'discount';

export interface ActiveEffect {
  id: string;           // use rewardType as id
  rewardType: RewardType;
  kind: EffectKind;
  percent: number;      // magnitude in %
  expiresAt: string;    // ISO
}

export interface EffectsSnapshot {
  coinsBonusMultiplier: number;        // e.g. 1.2 = +20% coins
  xpBonusMultiplier: number;           // e.g. 1.15 = +15% XP
  unproductiveDiscountMultiplier: number; // e.g. 0.7 = -30% cost
}

export interface RewardStack {
  type: RewardType;
  count: number;
}

export interface DailyBalancePoint {
  date: string; // yyyy-mm-dd
  balance: number;
}

export interface GameState {
  loading: boolean;
  activities: Activity[];
  log: LogEntry[];
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  coins: number;
  boxesAvailable: number;
  chestLevel: number | null;
  rewardsInventory: RewardStack[];
  dailyBalances: DailyBalancePoint[];
  dailyEarned: DailyBalancePoint[];
  dailySpent: DailyBalancePoint[];
  activeEffects: ActiveEffect[];
  effectsSnapshot: EffectsSnapshot;
  soundVolume: number;
}