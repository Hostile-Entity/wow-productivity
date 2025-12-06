// src/config/leveling.ts
import rawXpTable from '../data/xp.json';

export const MAX_LEVEL = 80;

// xp.json: { "2": 155, "3": 155, ..., "80": 3845 }
type XpConfig = Record<string, number>;
const XP_CONFIG = rawXpTable as XpConfig;

// XP needed to go from current level -> next level.
// XP_FOR_LEVEL_UP[1] = xp needed 1 -> 2 (xp.json["2"]), etc.
const XP_FOR_LEVEL_UP: number[] = [];
XP_FOR_LEVEL_UP[0] = 0;

for (let level = 1; level < MAX_LEVEL; level++) {
  const targetLevel = String(level + 1);
  const value = XP_CONFIG[targetLevel];
  if (typeof value !== 'number') {
    throw new Error(`Missing XP config for level ${targetLevel} in xp.json`);
  }
  XP_FOR_LEVEL_UP[level] = value;
}

// No XP beyond max level
XP_FOR_LEVEL_UP[MAX_LEVEL] = 0;

// Cumulative XP needed to *reach* each level from level 1
// CUMULATIVE_XP[1] = 0, CUMULATIVE_XP[2] = XP_FOR_LEVEL_UP[1], etc.
const CUMULATIVE_XP: number[] = [];
CUMULATIVE_XP[0] = 0;
CUMULATIVE_XP[1] = 0;

for (let level = 2; level <= MAX_LEVEL; level++) {
  CUMULATIVE_XP[level] = CUMULATIVE_XP[level - 1] + XP_FOR_LEVEL_UP[level - 1];
}

const MAX_LEVEL_XP_CAP = XP_FOR_LEVEL_UP[MAX_LEVEL - 1] ?? 0; // e.g. 3845 for 80

export function xpRequiredForNextLevel(level: number): number {
  if (level < 1) level = 1;
  if (level >= MAX_LEVEL) return 0;
  return XP_FOR_LEVEL_UP[level];
}

export function totalXpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  return CUMULATIVE_XP[level];
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;

  // Cap at max level
  if (xp >= CUMULATIVE_XP[MAX_LEVEL]) {
    return MAX_LEVEL;
  }

  let level = 1;
  for (let lvl = 2; lvl <= MAX_LEVEL; lvl++) {
    if (xp >= CUMULATIVE_XP[lvl]) {
      level = lvl;
    } else {
      break;
    }
  }
  return level;
}

// XP already earned *within* current level (for the bar)
export function xpIntoLevel(xp: number): number {
  const level = levelFromXp(xp);

  if (level >= MAX_LEVEL) {
    // At max level, bar is locked at full (e.g. 3845 / 3845)
    return MAX_LEVEL_XP_CAP;
  }

  const baseXp = CUMULATIVE_XP[level] ?? 0;
  return Math.max(0, xp - baseXp);
}
