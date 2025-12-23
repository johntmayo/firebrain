/**
 * Subtle sound effects for drag and drop operations
 * Uses Web Audio API to generate sounds programmatically
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a subtle sound effect
 * @param frequency - Frequency in Hz
 * @param duration - Duration in milliseconds
 * @param volume - Volume (0-1)
 * @param type - Waveform type
 */
function playSound(
  frequency: number,
  duration: number = 100,
  volume: number = 0.1,
  type: OscillatorType = 'sine'
): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (err) {
    // Silently fail if audio context is not available
    console.debug('Sound effect failed:', err);
  }
}

/**
 * Sound effects for different drag and drop actions
 */
export const sounds = {
  /**
   * Play when starting to drag
   */
  dragStart: () => {
    playSound(200, 50, 0.08, 'sine');
  },

  /**
   * Play when dropping on a valid target
   */
  dropSuccess: () => {
    playSound(400, 80, 0.12, 'sine');
    setTimeout(() => playSound(500, 60, 0.1, 'sine'), 30);
  },

  /**
   * Play when dropping on an invalid target or canceling
   */
  dropCancel: () => {
    playSound(150, 100, 0.1, 'sine');
  },

  /**
   * Play when hovering over a valid drop zone
   */
  hoverOver: () => {
    playSound(300, 30, 0.06, 'sine');
  },

  /**
   * Play when swapping tasks
   */
  swap: () => {
    playSound(350, 60, 0.1, 'sine');
    setTimeout(() => playSound(450, 50, 0.09, 'sine'), 40);
  },
};
