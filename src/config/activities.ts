import type {
  ActivityCategory,
  ActivityTier,
  DailyTier,
  ProductiveTier,
  UnproductiveTier,
} from '../types';

import rawConfig from '../data/activityRewards.json';

export interface ActivityReward {
  coins: number;
  xp: number;
}

interface DailyRewardConfig {
  coins: number;
  xp: number;
}

interface PerMinuteRewardConfig {
  coinsPerMinute: number;
}

interface UnproductiveScalingConfig {
  hourlyIncreaseRate: number; // 0.2 => +20% per completed hour
}

interface ActivityRewardsConfig {
  daily: Record<DailyTier, DailyRewardConfig>;
  productive: Record<ProductiveTier, PerMinuteRewardConfig>;
  unproductive: Record<UnproductiveTier, PerMinuteRewardConfig>;
  unproductiveScaling: UnproductiveScalingConfig;
}

const CONFIG = rawConfig as ActivityRewardsConfig;

const XP_PER_MINUTE_PER_GOLD = 5;

export const DAILY_REWARDS = CONFIG.daily;
export const PRODUCTIVE_RATES = CONFIG.productive;
export const UNPRODUCTIVE_RATES = CONFIG.unproductive;
export const UNPRODUCTIVE_SCALING_RATE =
  CONFIG.unproductiveScaling?.hourlyIncreaseRate ?? 0;

export interface RewardForOptions {
  // Total unproductive minutes already logged in this “day” (5am–5am)
  unproductiveMinutesBefore?: number;
}

function clampMinutes(minutes: number): number {
  return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}

// Piecewise integration over hours:
// hour 0  -> multiplier 1.0
// hour 1  -> multiplier 1 + 0.2  = 1.2
// hour 2  -> multiplier 1 + 0.4  = 1.4
// ...
function unproductiveCoinsWithScaling(
  baseCoinsPerMinute: number,
  minutes: number,
  minutesBefore: number,
): number {
  const rate = UNPRODUCTIVE_SCALING_RATE;
  if (rate <= 0) {
    return baseCoinsPerMinute * minutes;
  }

  let remaining = minutes;
  let prevMinutes = minutesBefore;
  let coins = 0;

  while (remaining > 0) {
    const hourIndex = Math.floor(prevMinutes / 60); // completed hours before this minute
    const multiplier = 1 + hourIndex * rate;

    const minutesIntoCurrentHour = prevMinutes % 60;
    const freeInThisHour = 60 - minutesIntoCurrentHour;

    const blockMinutes = Math.min(remaining, freeInThisHour);

    coins += baseCoinsPerMinute * multiplier * blockMinutes;

    prevMinutes += blockMinutes;
    remaining -= blockMinutes;
  }

  return coins;
}

export function rewardFor(
  category: ActivityCategory,
  tier: ActivityTier,
  minutes: number,
  opts?: RewardForOptions,
): ActivityReward {
  if (category === 'daily') {
    const r = CONFIG.daily[tier as DailyTier] ?? CONFIG.daily.minor;
    return { coins: r.coins, xp: r.xp };
  }

  const m = clampMinutes(minutes);

  if (category === 'productive') {
    const base = CONFIG.productive[tier as ProductiveTier] ?? CONFIG.productive.gray;
    const coins = Math.round(base.coinsPerMinute * m);
    const xp = Math.round(base.coinsPerMinute * XP_PER_MINUTE_PER_GOLD * m);
    return { coins, xp };
  }

  // unproductive
  const base =
    CONFIG.unproductive[tier as UnproductiveTier] ?? CONFIG.unproductive.idle;

  const minutesBefore = Math.max(0, opts?.unproductiveMinutesBefore ?? 0);

  const coinsRaw = unproductiveCoinsWithScaling(
    base.coinsPerMinute,
    m,
    minutesBefore,
  );

  const coins = Math.round(coinsRaw);
  return { coins, xp: 0 }; // no XP from unproductive
}
