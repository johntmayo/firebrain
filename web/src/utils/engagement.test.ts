import { describe, expect, it } from 'vitest';
import { format } from './stopwatch';
import {
  COOLDOWN_MS,
  DEFAULT_PRESET_MINUTES,
  INITIAL_ENGAGEMENT,
  PLUS_FIVE_MS,
  canEngage,
  complete,
  deserialize,
  engage,
  engageDuration,
  expire,
  pause,
  plus5,
  reconcile,
  serialize,
  skipCooldown,
  standDown,
  start,
  startCooldown,
  tick,
  type EngagementState,
} from './engagement';

const T0 = 1_700_000_000_000;
const SPEC = { id: 'm-spec', title: 'Write spec' };
const OTHER = { id: 'm-other', title: 'Other mission' };

function runningAt(minutes = 25, at = T0): EngagementState {
  return engage(INITIAL_ENGAGEMENT, SPEC, minutes, at);
}

describe('engage / standDown', () => {
  it('starts a running countdown and remembers the choice', () => {
    const s = engage(INITIAL_ENGAGEMENT, SPEC, 15, T0);
    expect(s).toMatchObject({
      phase: 'running',
      missionId: SPEC.id,
      title: SPEC.title,
      durationMs: 15 * 60_000,
      startedAt: T0,
      elapsedBefore: 0,
      lastPresetMinutes: 15,
    });
    expect(tick(s, T0).displayMs).toBe(15 * 60_000);
    expect(format(tick(s, T0).displayMs)).toBe('15:00');
  });

  it('rejects a second mission until stand down', () => {
    const s = runningAt(25);
    expect(engage(s, OTHER, 5, T0 + 1000)).toBe(s);
    expect(canEngage(s, OTHER.id)).toBe(false);
    expect(canEngage(s, SPEC.id)).toBe(true);
    const cleared = standDown(s);
    expect(cleared.phase).toBe('idle');
    expect(cleared.lastPresetMinutes).toBe(25);
    expect(engage(cleared, OTHER, 5, T0 + 2000).missionId).toBe(OTHER.id);
  });

  it('ignores invalid minutes or a missing mission id', () => {
    expect(engage(INITIAL_ENGAGEMENT, SPEC, 0, T0)).toBe(INITIAL_ENGAGEMENT);
    expect(engage(INITIAL_ENGAGEMENT, SPEC, -5, T0)).toBe(INITIAL_ENGAGEMENT);
    expect(engage(INITIAL_ENGAGEMENT, { id: '', title: 'x' }, 15, T0)).toBe(INITIAL_ENGAGEMENT);
  });

  it('allows a 1-minute custom choice (smoke / tests)', () => {
    const s = engage(INITIAL_ENGAGEMENT, SPEC, 1, T0);
    expect(s.durationMs).toBe(60_000);
    expect(s.lastPresetMinutes).toBe(1);
  });
});

describe('pause / resume / plus5', () => {
  it('freezes remaining while paused and resumes from there', () => {
    let s = runningAt(5);
    s = pause(s, T0 + 90_000);
    expect(s.phase).toBe('paused');
    expect(s.startedAt).toBeNull();
    expect(tick(s, T0 + 10 * 60_000).displayMs).toBe(210_000);
    s = start(s, T0 + 10 * 60_000);
    expect(s.phase).toBe('running');
    expect(format(tick(s, T0 + 10 * 60_000 + 1_000).displayMs)).toBe('03:29');
  });

  it('start is idempotent while running; pause is idempotent while paused', () => {
    const running = runningAt();
    expect(start(running, T0 + 500)).toBe(running);
    expect(pause(INITIAL_ENGAGEMENT, T0)).toBe(INITIAL_ENGAGEMENT);
  });

  it('adds five minutes while running without resetting elapsed', () => {
    const s = plus5(runningAt(25), T0 + 60_000);
    expect(s.durationMs).toBe(30 * 60_000);
    expect(format(tick(s, T0 + 60_000).displayMs)).toBe('29:00');
  });

  it('plus5 from chimed resumes a fresh five minutes', () => {
    const hit = tick(runningAt(5), T0 + 300_250);
    expect(hit.chimed).toBe(true);
    const resumed = plus5(hit.state, T0 + 301_000);
    expect(resumed.phase).toBe('running');
    expect(format(tick(resumed, T0 + 301_000).displayMs)).toBe('05:00');
    expect(tick(resumed, T0 + 301_000 + PLUS_FIVE_MS).chimed).toBe(true);
  });
});

describe('chime → complete → cooldown', () => {
  it('fires chimed exactly once when crossing zero and stays quiet after', () => {
    const s = runningAt(5);
    const hit = tick(s, T0 + 300_250);
    expect(hit.chimed).toBe(true);
    expect(hit.displayMs).toBe(0);
    expect(hit.running).toBe(false);
    expect(hit.state.phase).toBe('chimed');
    const again = tick(hit.state, T0 + 400_000);
    expect(again.chimed).toBe(false);
    expect(again.state.phase).toBe('chimed');
  });

  it('does not chime for a countdown that finished before a reload', () => {
    const stale: EngagementState = {
      ...runningAt(5),
      phase: 'chimed',
      startedAt: null,
      elapsedBefore: 300_000,
    };
    expect(tick(stale, T0).chimed).toBe(false);
  });

  it('complete offers cooldown; startCooldown runs a 5 min break; skip returns idle', () => {
    const offered = complete(runningAt(25));
    expect(offered.phase).toBe('cooldown-offer');
    expect(offered.missionId).toBeNull();
    expect(offered.lastPresetMinutes).toBe(25);

    const brk = startCooldown(offered, T0);
    expect(brk.phase).toBe('cooldown');
    expect(brk.title).toBe('Break');
    expect(brk.durationMs).toBe(COOLDOWN_MS);
    expect(format(tick(brk, T0).displayMs)).toBe('05:00');

    const done = tick(brk, T0 + COOLDOWN_MS);
    expect(done.cooldownDone).toBe(true);
    expect(done.state.phase).toBe('idle');
    expect(done.state.lastPresetMinutes).toBe(25);

    expect(skipCooldown(offered).phase).toBe('idle');
    expect(skipCooldown(brk).phase).toBe('idle');
  });

  it('cooldown can pause and plus5', () => {
    let s = startCooldown(complete(runningAt()), T0);
    s = pause(s, T0 + 30_000);
    expect(s.startedAt).toBeNull();
    expect(tick(s, T0 + 90_000).displayMs).toBe(270_000);
    s = start(s, T0 + 90_000);
    s = plus5(s, T0 + 90_000);
    expect(s.durationMs).toBe(COOLDOWN_MS + PLUS_FIVE_MS);
  });

  it('startCooldown / complete are no-ops from the wrong phase', () => {
    expect(startCooldown(runningAt(), T0)).toEqual(runningAt());
    expect(complete(INITIAL_ENGAGEMENT)).toBe(INITIAL_ENGAGEMENT);
  });
});

describe('reconcile / invalid mission id', () => {
  it('stands down when the engaged mission is missing from the open+loaded set', () => {
    const s = runningAt();
    expect(reconcile(s, [SPEC.id])).toBe(s);
    const dropped = reconcile(s, ['someone-else']);
    expect(dropped.phase).toBe('idle');
    expect(dropped.lastPresetMinutes).toBe(25);
  });

  it('stands down a persisted engaged state with no mission id', () => {
    const broken: EngagementState = { ...runningAt(), missionId: null };
    expect(reconcile(broken, [SPEC.id]).phase).toBe('idle');
  });

  it('leaves cooldown and idle alone', () => {
    const offered = complete(runningAt());
    expect(reconcile(offered, [])).toBe(offered);
    expect(reconcile(INITIAL_ENGAGEMENT, [])).toBe(INITIAL_ENGAGEMENT);
  });

  it('expire jumps a running clock to chimed and a break to idle', () => {
    expect(expire(runningAt(25), T0 + 10).phase).toBe('chimed');
    const brk = startCooldown(complete(runningAt()), T0);
    expect(expire(brk, T0 + 10).phase).toBe('idle');
  });
});

describe('persistence', () => {
  it('round-trips through serialize/deserialize', () => {
    const s = engage(INITIAL_ENGAGEMENT, SPEC, 45, T0);
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('keeps lastPresetMinutes across stand-down and restore', () => {
    const s = standDown(engage(INITIAL_ENGAGEMENT, SPEC, 45, T0));
    expect(s.lastPresetMinutes).toBe(45);
    expect(deserialize(serialize(s)).lastPresetMinutes).toBe(45);
  });

  it('falls back on missing or malformed input', () => {
    expect(deserialize(null)).toEqual(INITIAL_ENGAGEMENT);
    expect(deserialize('')).toEqual(INITIAL_ENGAGEMENT);
    expect(deserialize('{not json')).toEqual(INITIAL_ENGAGEMENT);
    expect(deserialize(JSON.stringify({ phase: 'warp', missionId: 3, lastPresetMinutes: -2 }))).toEqual(INITIAL_ENGAGEMENT);
  });

  it('treats an engaged payload with no mission id as idle, keeping last choice', () => {
    const raw = JSON.stringify({
      phase: 'running',
      missionId: '',
      title: 'ghost',
      durationMs: 1000,
      startedAt: T0,
      elapsedBefore: 0,
      lastPresetMinutes: 15,
    });
    expect(deserialize(raw)).toEqual({ ...INITIAL_ENGAGEMENT, lastPresetMinutes: 15 });
  });

  it('engageDuration is what the smoke hook uses for a 1s clock', () => {
    const s = engageDuration(INITIAL_ENGAGEMENT, SPEC, 1000, T0, 1);
    expect(s.durationMs).toBe(1000);
    expect(tick(s, T0 + 1000).chimed).toBe(true);
  });
});
