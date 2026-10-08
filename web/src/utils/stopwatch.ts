/**
 * Stopwatch gadget logic — pure functions over a tiny persisted state.
 *
 * The state never stores a running total; it stores *when* the current run
 * started plus what had accumulated before it, so elapsed time can be
 * recomputed from the wall clock after a reload or a long background tab.
 *
 *   elapsed(now) = elapsedBefore + (startedAt ? now - startedAt : 0)
 *
 * `mode` is the segmented-control value: 'up' counts up from 00:00; a numeric
 * string ('5' | '15' | '25') counts down from that many minutes.
 */

export type StopwatchMode = 'up' | '5' | '15' | '25';

export interface StopwatchState {
  mode: StopwatchMode;
  /** Epoch ms when the current run began; null while paused. */
  startedAt: number | null;
  /** Ms accumulated by previous runs (before `startedAt`). */
  elapsedBefore: number;
}

export interface StopwatchTick {
  /** Possibly-updated state: a finished countdown comes back paused at its target. */
  state: StopwatchState;
  elapsedMs: number;
  /** What the readout shows: elapsed when counting up, remaining when counting down. */
  displayMs: number;
  running: boolean;
  /** True on the tick that crosses zero on a countdown (fires exactly once per run). */
  done: boolean;
  /** 0–1 progress through a countdown; 0 when counting up. */
  fraction: number;
}

export const STOPWATCH_MODES: StopwatchMode[] = ['up', '5', '15', '25'];
export const STOPWATCH_STORAGE_KEY = 'firebrain_stopwatch';

export const INITIAL_STOPWATCH: StopwatchState = { mode: 'up', startedAt: null, elapsedBefore: 0 };

/** Countdown target in ms; 0 means "count up". */
export function targetMs(mode: StopwatchMode): number {
  return mode === 'up' ? 0 : Number(mode) * 60_000;
}

export function elapsedMs(state: StopwatchState, now: number): number {
  const live = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
  return state.elapsedBefore + live;
}

export function tick(state: StopwatchState, now: number): StopwatchTick {
  const running = state.startedAt !== null;
  const target = targetMs(state.mode);
  const elapsed = elapsedMs(state, now);

  if (target === 0) {
    return { state, elapsedMs: elapsed, displayMs: elapsed, running, done: false, fraction: 0 };
  }

  if (elapsed >= target) {
    // Countdown finished: freeze at the target. `done` only when we were the
    // running instance that crossed zero, so a reload after the fact is quiet.
    const frozen: StopwatchState = { ...state, startedAt: null, elapsedBefore: target };
    return { state: frozen, elapsedMs: target, displayMs: 0, running: false, done: running, fraction: 1 };
  }

  const remaining = target - elapsed;
  // Round remaining *up* to the next whole second so 25:00 reads 25:00 at
  // the moment of starting, and 00:00 only when actually finished.
  const displayMs = Math.ceil(remaining / 1000) * 1000;
  return { state, elapsedMs: elapsed, displayMs, running, done: false, fraction: elapsed / target };
}

export function start(state: StopwatchState, now: number): StopwatchState {
  if (state.startedAt !== null) return state;
  const target = targetMs(state.mode);
  // Starting a finished countdown starts it over.
  const elapsedBefore = target > 0 && state.elapsedBefore >= target ? 0 : state.elapsedBefore;
  return { ...state, startedAt: now, elapsedBefore };
}

export function pause(state: StopwatchState, now: number): StopwatchState {
  if (state.startedAt === null) return state;
  return { ...state, startedAt: null, elapsedBefore: elapsedMs(state, now) };
}

export function reset(state: StopwatchState): StopwatchState {
  return { ...state, startedAt: null, elapsedBefore: 0 };
}

/** Switching mode always resets — a half-run stopwatch is meaningless as a countdown. */
export function setMode(state: StopwatchState, mode: StopwatchMode): StopwatchState {
  return { mode, startedAt: null, elapsedBefore: 0 };
}

/** `mm:ss`; minutes keep growing past 59 (so 1h40 reads `100:00`). Whole seconds, floored. */
export function format(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Parse a persisted state, falling back to the initial state on anything malformed. */
export function deserialize(raw: string | null | undefined): StopwatchState {
  if (!raw) return INITIAL_STOPWATCH;
  try {
    const v = JSON.parse(raw) as Partial<StopwatchState>;
    const mode = STOPWATCH_MODES.includes(v.mode as StopwatchMode) ? (v.mode as StopwatchMode) : 'up';
    const startedAt = typeof v.startedAt === 'number' && Number.isFinite(v.startedAt) ? v.startedAt : null;
    const elapsedBefore = typeof v.elapsedBefore === 'number' && Number.isFinite(v.elapsedBefore) && v.elapsedBefore >= 0 ? v.elapsedBefore : 0;
    return { mode, startedAt, elapsedBefore };
  } catch {
    return INITIAL_STOPWATCH;
  }
}

export function serialize(state: StopwatchState): string {
  return JSON.stringify(state);
}
