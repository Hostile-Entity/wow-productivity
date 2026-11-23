import { assetUrl } from '../utils/assets';

type SoundKey =
  | 'tabClick'
  | 'uiClick'
  | 'levelUp'
  | 'coinsPickup'
  | 'rewardUse'
  | 'negativeCoins';

const SOUND_FILES: Record<SoundKey, string> = {
  tabClick: assetUrl('sounds/iUiInterfaceButtonA.ogg'),
  uiClick: assetUrl('sounds/uChatScrollButton.ogg'),
  levelUp: assetUrl('sounds/LevelUp.ogg'),
  coinsPickup: assetUrl('sounds/LootCoinSmall.ogg'),
  rewardUse: assetUrl('sounds/SealofMight.ogg'),
  negativeCoins: assetUrl('sounds/NPCBloodElfFemaleNoblePissed08.ogg'),
};

const BASE_VOLUMES: Record<SoundKey, number> = {
  tabClick: 0.5,
  uiClick: 0.5,
  levelUp: 0.8,
  coinsPickup: 0.7,
  rewardUse: 0.7,
  negativeCoins: 0.7,
};
const ATTACK_SECONDS = 0.004;

let SFX_MASTER = 0;
let audioContext: AudioContext | null = null;
const buffers = new Map<SoundKey, AudioBuffer>();
const loading = new Map<SoundKey, Promise<AudioBuffer>>();

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext || (window as Window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const { audioSession } = window.navigator as Navigator & {
      audioSession?: { type: string };
    };
    // Where supported, mix app sounds with music instead of taking over audio.
    if (audioSession) audioSession.type = 'ambient';
  } catch {
    // Playback still works when this session type is unavailable.
  }
  audioContext = new Ctor();
  return audioContext;
}

export function setSfxMasterVolume01(v01: number) {
  SFX_MASTER = clamp01(v01);
}

async function loadBuffer(key: SoundKey) {
  if (buffers.has(key)) return buffers.get(key) as AudioBuffer;
  const existing = loading.get(key);
  if (existing) return existing;

  const ctx = getAudioContext();
  if (!ctx) throw new Error('AudioContext not available');

  const promise = fetch(SOUND_FILES[key])
    .then((resp) => resp.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      buffers.set(key, buffer);
      loading.delete(key);
      return buffer;
    })
    .catch((err) => {
      loading.delete(key);
      throw err;
    });

  loading.set(key, promise);
  return promise;
}

async function ensureResumed() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

function canPlaySound() {
  return SFX_MASTER > 0 && typeof document !== 'undefined' && !document.hidden;
}

async function playSound(key: SoundKey, onEnded?: () => void) {
  if (!canPlaySound()) return onEnded?.();
  const ctx = await ensureResumed();
  if (!ctx) return onEnded?.();

  let buffer: AudioBuffer;
  try {
    buffer = await loadBuffer(key);
  } catch {
    return onEnded?.();
  }
  if (!canPlaySound()) return onEnded?.();

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const start = ctx.currentTime;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(
    clamp01(BASE_VOLUMES[key] * SFX_MASTER),
    start + ATTACK_SECONDS,
  );

  source.connect(gain);
  gain.connect(ctx.destination);

  if (onEnded) {
    source.onended = onEnded;
  }

  try {
    source.start(start);
  } catch {
    if (onEnded) onEnded();
  }
}

let chestQueue: SoundKey[] = [];
let chestPlaying = false;

function playNextChestSound() {
  const next = chestQueue.shift();
  if (!next) {
    chestPlaying = false;
    return;
  }

  chestPlaying = true;
  void playSound(next, playNextChestSound);
}

function enqueueChestSounds(keys: SoundKey[]) {
  if (!keys.length) return;
  chestQueue.push(...keys);
  if (!chestPlaying) playNextChestSound();
}

export function playTabClickSound() {
  void playSound('tabClick');
}

export function playUiClickSound() {
  void playSound('uiClick');
}

export function playLevelUpSound() {
  void playSound('levelUp');
}

export function playNegativeCoinsSound() {
  void playSound('negativeCoins');
}

export function playInstantRewardCoinsSound() {
  void playSound('coinsPickup');
}

export function playRewardUseSound() {
  void playSound('rewardUse');
}

export function playChestRewardSounds() {
  enqueueChestSounds(['coinsPickup']);
}
