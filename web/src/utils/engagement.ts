/**
 * Engagement clock — pure functions over a persisted per-device state.
 *
 * Exactly one active mission. The clock is a countdown the operator chose;
 * a chime is a checkpoint, not a deadline. Completing offers a 5-minute
 * cooldown. Nothing here logs time or derives duration from CR.
 *
 *   remaining(now) = durationMs - (elapsedBefore + (startedAt ? now - startedAt : 0))
 *
 * Persistence stores *when* the current run started plus what had already
 * accumulated, so a reload can recompute remaining from the wall clock.
 */

export type EngagementPhase =
  | 'idle'
  | 'running'
  | 'paused'
  | 'chimed'
  | 'cooldown-offer'
  | 'cooldown';

export interface EngagementMission {
  id: string;
  title: string;
}

export interface EngagementState {
  phase: EngagementPhase;
  missionId: string | null;
  title: string;
  durationMs: number;
  /** Epoch ms when the current run began; null while paused / idle / chimed / offered. */
  startedAt: number | null;
  /** Ms accumulated by previous runs (before `startedAt`). */
  elapsedBefore: number;
  /** Last duration the operator picked, in minutes. Survives stand-down. */
  lastPresetMinutes: number;
}

export interface EngagementTick {
  /** Possibly-updated state: crossing zero freezes into chimed or idle. */
  state: EngagementState;
  remainingMs: number;
  /** Remaining, rounded *up* to the next whole second (00:00 only when finished). */
  displayMs: number;
  running: boolean;
  /** True on the tick that crosses zero on a mission countdown. */
  chimed: boolean;
  /** True on the tick that finishes a cooldown. */
  cooldownDone: boolean;
  /** 0–1 progress through the current countdown; 0 when idle / offered. */
  fraction: number;
}

export const ENGAGEMENT_PRESETS = [5, 15, 25, 45] as const;
export const DEFAULT_PRESET_MINUTES = 25;
export const COOLDOWN_MINUTES = 5;
export const PLUS_FIVE_MS = 5 * 60_000;
export const COOLDOWN_MS = COOLDOWN_MINUTES * 60_000;
export const ENGAGEMENT_STORAGE_KEY = 'firebrain_engagement';

export const INITIAL_ENGAGEMENT: EngagementState = {
  phase: 'idle',
  missionId: null,
  title: '',
  durationMs: 0,
  startedAt: null,
  elapsedBefore: 0,
  lastPresetMinutes: DEFAULT_PRESET_MINUTES,
};

const PHASES: readonly EngagementPhase[] = [
  'idle',
  'running',
  'paused',
  'chimed',
  'cooldown-offer',
  'cooldown',
];

export function isMissionPhase(phase: EngagementPhase): boolean {
  return phase === 'running' || phase === 'paused' || phase === 'chimed';
}

export function isClockPhase(phase: EngagementPhase): boolean {
  return isMissionPhase(phase) || phase === 'cooldown';
}

export function isBoundPhase(phase: EngagementPhase): boolean {
  return phase !== 'idle';
}

export function elapsedMs(state: EngagementState, now: number): number {
  const live = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
  return state.elapsedBefore + live;
}

export function remainingMs(state: EngagementState, now: number): number {
  if (!isClockPhase(state.phase) || state.durationMs <= 0) return 0;
  return Math.max(0, state.durationMs - elapsedMs(state, now));
}

function displayFromRemaining(remaining: number): number {
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / 1000) * 1000;
}

export function tick(state: EngagementState, now: number): EngagementTick {
  if (state.phase === 'idle' || state.phase === 'cooldown-offer') {
    return {
      state,
      remainingMs: 0,
      displayMs: 0,
      running: false,
      chimed: false,
      cooldownDone: false,
      fraction: 0,
    };
  }

  if (state.phase === 'chimed') {
    return {
      state,
      remainingMs: 0,
      displayMs: 0,
      running: false,
      chimed: false,
      cooldownDone: false,
      fraction: 1,
    };
  }

  const running = state.startedAt !== null;
  const elapsed = elapsedMs(state, now);
  const target = state.durationMs;

  if (target > 0 && elapsed >= target) {
    if (state.phase === 'cooldown') {
      const idle = standDown(state);
      return {
        state: idle,
        remainingMs: 0,
        displayMs: 0,
        running: false,
        chimed: false,
        cooldownDone: running,
        fraction: 1,
      };
    }

    const frozen: EngagementState = {
      ...state,
      phase: 'chimed',
      startedAt: null,
      elapsedBefore: target,
    };
    return {
      state: frozen,
      remainingMs: 0,
      displayMs: 0,
      running: false,
      chimed: running,
      cooldownDone: false,
      fraction: 1,
    };
  }

  const remaining = Math.max(0, target - elapsed);
  return {
    state,
    remainingMs: remaining,
    displayMs: displayFromRemaining(remaining),
    running,
    chimed: false,
    cooldownDone: false,
    fraction: target > 0 ? elapsed / target : 0,
  };
}

function keepMemory(state: EngagementState): Pick<EngagementState, 'lastPresetMinutes'> {
  return { lastPresetMinutes: state.lastPresetMinutes };
}

export function standDown(state: EngagementState): EngagementState {
  return {
    ...INITIAL_ENGAGEMENT,
    ...keepMemory(state),
  };
}

/**
 * Start a countdown on `mission`. No-ops when another mission is already
 * engaged (running / paused / chimed) — stand down first.
 */
export function engage(
  state: EngagementState,
  mission: EngagementMission,
  minutes: number,
  now: number,
): EngagementState {
  const mins = Number(minutes);
  if (!mission?.id || !Number.isFinite(mins) || mins <= 0) return state;
  return engageDuration(state, mission, Math.round(mins * 60_000), now, mins);
}

/** Same as `engage` but duration is milliseconds (smoke / tests). */
export function engageDuration(
  state: EngagementState,
  mission: EngagementMission,
  durationMs: number,
  now: number,
  lastPresetMinutes: number = state.lastPresetMinutes,
): EngagementState {
  if (!mission?.id || !Number.isFinite(durationMs) || durationMs <= 0) return state;
  if (isMissionPhase(state.phase) && state.missionId && state.missionId !== mission.id) {
    return state;
  }
  const remembered = Number.isFinite(lastPresetMinutes) && lastPresetMinutes > 0
    ? lastPresetMinutes
    : state.lastPresetMinutes;
  return {
    phase: 'running',
    missionId: mission.id,
    title: mission.title || '',
    durationMs,
    startedAt: now,
    elapsedBefore: 0,
    lastPresetMinutes: remembered,
  };
}

/** Resume a paused mission or a paused cooldown. */
export function start(state: EngagementState, now: number): EngagementState {
  if (state.startedAt !== null) return state;
  if (state.phase === 'paused') {
    return { ...state, phase: 'running', startedAt: now };
  }
  if (state.phase === 'cooldown') {
    return { ...state, startedAt: now };
  }
  return state;
}

export function pause(state: EngagementState, now: number): EngagementState {
  if (state.startedAt === null) return state;
  if (state.phase === 'running') {
    return { ...state, phase: 'paused', startedAt: null, elapsedBefore: elapsedMs(state, now) };
  }
  if (state.phase === 'cooldown') {
    return { ...state, startedAt: null, elapsedBefore: elapsedMs(state, now) };
  }
  return state;
}

/** Add five minutes from a running, paused, chimed, or cooldown clock. */
export function plus5(state: EngagementState, now: number): EngagementState {
  if (state.phase === 'idle' || state.phase === 'cooldown-offer') return state;
  if (!isClockPhase(state.phase)) return state;

  const nextDuration = state.durationMs + PLUS_FIVE_MS;

  if (state.phase === 'chimed') {
    return {
      ...state,
      phase: 'running',
      durationMs: nextDuration,
      startedAt: now,
      elapsedBefore: state.durationMs,
    };
  }

  return { ...state, durationMs: nextDuration };
}

/** Finish the active mission and offer the cooldown. */
export function complete(state: EngagementState): EngagementState {
  if (!isMissionPhase(state.phase)) return state;
  return {
    ...INITIAL_ENGAGEMENT,
    ...keepMemory(state),
    phase: 'cooldown-offer',
  };
}

export function startCooldown(state: EngagementState, now: number): EngagementState {
  if (state.phase !== 'cooldown-offer') return state;
  return {
    ...keepMemory(state),
    phase: 'cooldown',
    missionId: null,
    title: 'Break',
    durationMs: COOLDOWN_MS,
    startedAt: now,
    elapsedBefore: 0,
  };
}

export function skipCooldown(state: EngagementState): EngagementState {
  if (state.phase !== 'cooldown-offer' && state.phase !== 'cooldown') return state;
  return standDown(state);
}

/**
 * Jump the running/paused clock to its end: mission → chimed, cooldown → idle.
 * Used by the smoke test hook; not shown in the UI.
 */
export function expire(state: EngagementState, now: number): EngagementState {
  if (state.phase === 'running' || state.phase === 'paused') {
    return tick({ ...state, startedAt: now - state.durationMs, elapsedBefore: 0 }, now).state;
  }
  if (state.phase === 'cooldown') {
    return tick({ ...state, startedAt: now - state.durationMs, elapsedBefore: 0 }, now).state;
  }
  return state;
}

/**
 * If the engaged mission is no longer among the open+loaded ids, stand down.
 * Cooldown / offer / idle are unchanged (there is no mission to validate).
 */
export function reconcile(state: EngagementState, validMissionIds: Iterable<string>): EngagementState {
  if (!isMissionPhase(state.phase)) return state;
  if (!state.missionId) return standDown(state);
  const set = validMissionIds instanceof Set ? validMissionIds : new Set(validMissionIds);
  if (!set.has(state.missionId)) return standDown(state);
  return state;
}

export function canEngage(state: EngagementState, missionId: string): boolean {
  if (!isMissionPhase(state.phase)) return true;
  return state.missionId === missionId;
}

export function deserialize(raw: string | null | undefined): EngagementState {
  if (!raw) return INITIAL_ENGAGEMENT;
  try {
    const v = JSON.parse(raw) as Partial<EngagementState>;
    const phase = PHASES.includes(v.phase as EngagementPhase) ? (v.phase as EngagementPhase) : 'idle';
    const missionId = typeof v.missionId === 'string' && v.missionId ? v.missionId : null;
    const title = typeof v.title === 'string' ? v.title : '';
    const durationMs = typeof v.durationMs === 'number' && Number.isFinite(v.durationMs) && v.durationMs >= 0
      ? v.durationMs
      : 0;
    const startedAt = typeof v.startedAt === 'number' && Number.isFinite(v.startedAt) ? v.startedAt : null;
    const elapsedBefore = typeof v.elapsedBefore === 'number' && Number.isFinite(v.elapsedBefore) && v.elapsedBefore >= 0
      ? v.elapsedBefore
      : 0;
    const lastPresetMinutes = typeof v.lastPresetMinutes === 'number'
      && Number.isFinite(v.lastPresetMinutes)
      && v.lastPresetMinutes > 0
      ? v.lastPresetMinutes
      : DEFAULT_PRESET_MINUTES;

    if (isMissionPhase(phase) && !missionId) {
      return { ...INITIAL_ENGAGEMENT, lastPresetMinutes };
    }

    return { phase, missionId, title, durationMs, startedAt, elapsedBefore, lastPresetMinutes };
  } catch {
    return INITIAL_ENGAGEMENT;
  }
}

export function serialize(state: EngagementState): string {
  return JSON.stringify(state);
}
