/**
 * Subtle clicky sound effects for drag and drop operations
 * Uses Web Audio API to generate percussive click sounds
 */

let audioContext: AudioContext | null = null;

/**
 * Mute preference. Persisted by ThemeContext under `firebrain_sound`
 * ('on' | 'off'); read here at module load so the flag is right even before
 * the provider mounts. Checked before every play.
 */
export const SOUND_STORAGE_KEY = 'firebrain_sound';

function readStoredSoundsEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

let soundsEnabled = typeof window !== 'undefined' ? readStoredSoundsEnabled() : true;

export function setSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}

export function areSoundsEnabled(): boolean {
  return soundsEnabled;
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a clicky, percussive sound using filtered noise
 * @param duration - Duration in milliseconds (very short for clicks)
 * @param volume - Volume (0-1)
 * @param frequency - Filter frequency in Hz (higher = brighter click)
 */
function playClick(
  duration: number = 15,
  volume: number = 0.15,
  frequency: number = 2000
): void {
  if (!soundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * (duration / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1;
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Very short envelope for clicky sound
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.001);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
    
    source.start(now);
    source.stop(now + duration / 1000);
  } catch (err) {
    // Silently fail if audio context is not available
    console.debug('Sound effect failed:', err);
  }
}

/**
 * Play a short pure tone (sine) with a soft attack/decay envelope.
 * Used for the stopwatch chime; clicks above are noise-based.
 */
function playTone(
  frequency: number,
  duration: number = 160,
  volume: number = 0.12,
  startDelayMs: number = 0
): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const t0 = ctx.currentTime + startDelayMs / 1000;
    const t1 = t0 + duration / 1000;
    gainNode.gain.setValueAtTime(0, t0);
    gainNode.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t1);
    osc.start(t0);
    osc.stop(t1);
  } catch (err) {
    console.debug('Sound effect failed:', err);
  }
}

/**
 * Sound effects for different drag and drop actions
 */
export const sounds = {
  /**
   * Play when starting to drag - subtle click
   */
  dragStart: () => {
    playClick(12, 0.12, 2500);
  },

  /**
   * Play when dropping on a valid target - satisfying click
   */
  dropSuccess: () => {
    playClick(20, 0.18, 3000);
    setTimeout(() => playClick(15, 0.12, 3500), 25);
  },

  /**
   * Play when dropping on an invalid target or canceling - softer click
   */
  dropCancel: () => {
    playClick(18, 0.1, 1500);
  },

  /**
   * Play when hovering over a valid drop zone - very subtle tick
   */
  hoverOver: () => {
    playClick(8, 0.08, 2000);
  },

  /**
   * Play when swapping tasks - double click
   */
  swap: () => {
    playClick(15, 0.15, 2800);
    setTimeout(() => playClick(12, 0.12, 3200), 20);
  },

  /**
   * Play when a stopwatch countdown reaches zero — a short rising two-note chime.
   */
  timerDone: () => {
    playTone(880, 140, 0.12, 0);
    playTone(1320, 220, 0.12, 150);
  },
};
