// src/audio/soundManager.ts
import { assetUrl } from '../utils/assets';

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
        ? new Audio(assetUrl('sounds/uChatScrollButton.ogg'))   // all other buttons
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

    const negativeCoinsSound = typeof Audio !== 'undefined'
    ? new Audio(assetUrl('sounds/NPCBloodElfFemaleNoblePissed08.ogg'))
    : null;

    // Volumes
    if (tabClickAudio) tabClickAudio.volume = 0.5;
    if (uiClickAudio) uiClickAudio.volume = 0.5;
    if (levelUpAudio) levelUpAudio.volume = 0.8;
    if (coinsPickupAudio) coinsPickupAudio.volume = 0.7;
    if (rewardUseAudio) rewardUseAudio.volume = 0.7;
    if (negativeCoinsSound) negativeCoinsSound.volume = 0.7;

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