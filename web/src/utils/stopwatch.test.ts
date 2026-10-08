import { describe, expect, it } from 'vitest';
import {
  INITIAL_STOPWATCH,
  deserialize,
  elapsedMs,
  format,
  pause,
  reset,
  serialize,
  setMode,
  start,
  targetMs,
  tick,
  type StopwatchState,
} from './stopwatch';

const T0 = 1_700_000_000_000;

describe('format', () => {
  it('renders mm:ss with zero padding', () => {
    expect(format(0)).toBe('00:00');
    expect(format(999)).toBe('00:00');
    expect(format(1_000)).toBe('00:01');
    expect(format(61_000)).toBe('01:01');
    expect(format(25 * 60_000)).toBe('25:00');
  });
  it('lets minutes grow past 59 and never goes negative', () => {
    expect(format(100 * 60_000)).toBe('100:00');
    expect(format(-5_000)).toBe('00:00');
  });
});

describe('counting up', () => {
  it('starts paused at zero', () => {
    const t = tick(INITIAL_STOPWATCH, T0);
    expect(t).toMatchObject({ running: false, done: false, displayMs: 0, elapsedMs: 0 });
  });
  it('accumulates while running and freezes when paused', () => {
    let s = start(INITIAL_STOPWATCH, T0);
    expect(tick(s, T0 + 1_200).displayMs).toBe(1_200);
    expect(tick(s, T0 + 1_200).running).toBe(true);
    s = pause(s, T0 + 1_200);
    expect(s.startedAt).toBeNull();
    expect(s.elapsedBefore).toBe(1_200);
    expect(tick(s, T0 + 60_000).displayMs).toBe(1_200);
  });
  it('resumes from the paused total', () => {
    let s = start(INITIAL_STOPWATCH, T0);
    s = pause(s, T0 + 1_000);
    s = start(s, T0 + 10_000);
    expect(elapsedMs(s, T0 + 12_500)).toBe(3_500);
  });
  it('start is idempotent while running; pause is idempotent while paused', () => {
    const running = start(INITIAL_STOPWATCH, T0);
    expect(start(running, T0 + 500)).toBe(running);
    expect(pause(INITIAL_STOPWATCH, T0)).toBe(INITIAL_STOPWATCH);
  });
  it('reset clears the total but keeps the mode', () => {
    const s = reset(start(setMode(INITIAL_STOPWATCH, '15'), T0));
    expect(s).toEqual({ mode: '15', startedAt: null, elapsedBefore: 0 });
  });
});

describe('counting down', () => {
  it('maps presets to targets', () => {
    expect(targetMs('up')).toBe(0);
    expect(targetMs('5')).toBe(300_000);
    expect(targetMs('25')).toBe(1_500_000);
  });
  it('shows the full preset at the instant of starting, then rounds remaining up to whole seconds', () => {
    const s = start(setMode(INITIAL_STOPWATCH, '5'), T0);
    expect(tick(s, T0).displayMs).toBe(300_000);
    expect(format(tick(s, T0 + 400).displayMs)).toBe('05:00');
    expect(format(tick(s, T0 + 1_000).displayMs)).toBe('04:59');
    expect(tick(s, T0 + 150_000).fraction).toBeCloseTo(0.5);
  });
  it('fires done exactly once when crossing zero and comes back paused at the target', () => {
    const s = start(setMode(INITIAL_STOPWATCH, '5'), T0);
    const hit = tick(s, T0 + 300_250);
    expect(hit.done).toBe(true);
    expect(hit.displayMs).toBe(0);
    expect(hit.running).toBe(false);
    expect(hit.state).toEqual({ mode: '5', startedAt: null, elapsedBefore: 300_000 });
    // Ticking the frozen state again is quiet.
    const again = tick(hit.state, T0 + 400_000);
    expect(again.done).toBe(false);
    expect(again.displayMs).toBe(0);
  });
  it('does not chime for a countdown that finished before a reload (state already paused)', () => {
    const stale: StopwatchState = { mode: '5', startedAt: null, elapsedBefore: 300_000 };
    expect(tick(stale, T0).done).toBe(false);
  });
  it('starting a finished countdown starts it over', () => {
    const finished: StopwatchState = { mode: '5', startedAt: null, elapsedBefore: 300_000 };
    const s = start(finished, T0);
    expect(s.elapsedBefore).toBe(0);
    expect(tick(s, T0 + 1_000).displayMs).toBe(299_000);
  });
  it('switching mode resets the run', () => {
    const s = setMode(start(INITIAL_STOPWATCH, T0), '25');
    expect(s).toEqual({ mode: '25', startedAt: null, elapsedBefore: 0 });
  });
});

describe('persistence', () => {
  it('round-trips through serialize/deserialize', () => {
    const s = start(setMode(INITIAL_STOPWATCH, '15'), T0);
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it('falls back to the initial state on missing or malformed input', () => {
    expect(deserialize(null)).toEqual(INITIAL_STOPWATCH);
    expect(deserialize('')).toEqual(INITIAL_STOPWATCH);
    expect(deserialize('{not json')).toEqual(INITIAL_STOPWATCH);
    expect(deserialize(JSON.stringify({ mode: '99', startedAt: 'x', elapsedBefore: -4 }))).toEqual(INITIAL_STOPWATCH);
  });
});
