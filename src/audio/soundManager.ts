// src/audio/soundManager.ts
import { assetUrl } from '../utils/assets';

// --- Master volume (0..1). Multiplies existing per-sound volumes. ---
let SFX_MASTER = 1; // 1 = current tuned volumes (max)

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function setSfxMasterVolume01(v01: number) {
  SFX_MASTER = clamp01(v01);
  // Apply immediately to all loaded audios
  applyVolumes();
}

// Small helper to avoid errors if browser blocks autoplay.
function safePlay(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // ignore autoplay errors
  });
}

const tabClickAudio =
  typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/iUiInterfaceButtonA.ogg')) // tabs-bar-button only
    : null;

const uiClickAudio =
  typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/uChatScrollButton.ogg')) // all other buttons
    : null;

const levelUpAudio =
  typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/LevelUp.ogg'))
    : null;

// --- Chest / loot sounds ---

// Coins pickup
const coinsPickupAudio =
  typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/LootCoinSmall.ogg')) // adjust filename if needed
    : null;

const rewardUseAudio =
  typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/SealofMight.ogg'))
    : null;

const negativeCoinsSound =
  typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/NPCBloodElfFemaleNoblePissed08.ogg'))
    : null;

// Base volumes (these represent "100%" in your settings)
const BASE_VOLUMES = {
  tabClick: 0.5,
  uiClick: 0.5,
  levelUp: 0.8,
  coinsPickup: 0.7,
  rewardUse: 0.7,
  negativeCoins: 0.7,
};

function applyVolumes() {
  if (tabClickAudio) tabClickAudio.volume = clamp01(BASE_VOLUMES.tabClick * SFX_MASTER);
  if (uiClickAudio) uiClickAudio.volume = clamp01(BASE_VOLUMES.uiClick * SFX_MASTER);
  if (levelUpAudio) levelUpAudio.volume = clamp01(BASE_VOLUMES.levelUp * SFX_MASTER);
  if (coinsPickupAudio) coinsPickupAudio.volume = clamp01(BASE_VOLUMES.coinsPickup * SFX_MASTER);
  if (rewardUseAudio) rewardUseAudio.volume = clamp01(BASE_VOLUMES.rewardUse * SFX_MASTER);
  if (negativeCoinsSound) negativeCoinsSound.volume = clamp01(BASE_VOLUMES.negativeCoins * SFX_MASTER);
}

// Initialize volumes once
applyVolumes();

// --- Chest queue (coins + loot sounds in sequence) ---

let chestQueue: HTMLAudioElement[] = [];
let chestPlaying = false;

function playNextChestSound() {
  const next = chestQueue.shift();
  if (!next) {
    chestPlaying = false;
    return;
  }

  chestPlaying = true;
  next.currentTime = 0;
  next.onended = () => {
    next.onended = null;
    playNextChestSound();
  };

  void next.play().catch(() => {
    playNextChestSound();
  });
}

function enqueueChestSounds(audios: (HTMLAudioElement | null | undefined)[]) {
  const valid = audios.filter((a): a is HTMLAudioElement => !!a);
  if (!valid.length) return;

  chestQueue.push(...valid);
  if (!chestPlaying) {
    playNextChestSound();
  }
}

// --- Public API ---

export function playTabClickSound() {
  safePlay(tabClickAudio);
}

export function playUiClickSound() {
  safePlay(uiClickAudio);
}

export function playLevelUpSound() {
  safePlay(levelUpAudio);
}

export function playNegativeCoinsSound() {
  safePlay(negativeCoinsSound);
}

export function playInstantRewardCoinsSound() {
  safePlay(coinsPickupAudio);
}

// Non-instant reward = generic reward sound
export function playRewardUseSound() {
  safePlay(rewardUseAudio);
}

// Plays: coins pickup -> each item sound (by kind), one after another
export function playChestRewardSounds() {
  const audios: (HTMLAudioElement | null | undefined)[] = [];
  if (coinsPickupAudio) audios.push(coinsPickupAudio);
  enqueueChestSounds(audios);
}
