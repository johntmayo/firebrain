import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { isBoundPhase } from '../../utils/engagement';
import { sounds } from '../../utils/sounds';
import {
  STOPWATCH_MODES,
  STOPWATCH_STORAGE_KEY,
  deserialize,
  format,
  pause,
  reset,
  serialize,
  setMode,
  start,
  tick,
  type StopwatchMode,
  type StopwatchState,
} from '../../utils/stopwatch';
import { Icon, SegmentedControl, Tooltip, type SegmentOption } from '../primitives';
import { Gadget } from './Gadget';

const TICK_MS = 250;

const MODE_OPTIONS: SegmentOption<StopwatchMode>[] = STOPWATCH_MODES.map(m => ({
  value: m,
  label: m === 'up' ? 'Up' : m,
  title: m === 'up' ? 'Count up from 00:00' : `Count down ${m} min`,
}));

export interface StopwatchSnapshot {
  display: string;
  running: boolean;
}

interface StopwatchProps {
  /** Lets the drawer echo the readout on its pull tab while collapsed. */
  onSnapshot?: (snap: StopwatchSnapshot) => void;
}

function readState(): StopwatchState {
  try {
    return deserialize(localStorage.getItem(STOPWATCH_STORAGE_KEY));
  } catch {
    return deserialize(null);
  }
}

function writeState(state: StopwatchState) {
  try {
    localStorage.setItem(STOPWATCH_STORAGE_KEY, serialize(state));
  } catch {
    /* storage unavailable — the stopwatch still works for this session */
  }
}

/**
 * Stopwatch gadget — count up, or count down from a preset and chime at zero.
 * All timing math is in utils/stopwatch.ts; this component owns the interval,
 * persistence, and the two side effects (chime + notice).
 */
export function Stopwatch({ onSnapshot }: StopwatchProps) {
  const {
    showToast,
    engagement,
    engagementTick,
    pauseEngagement,
    resumeEngagement,
    plusFive,
    startCooldown,
  } = useApp();
  const bound = isBoundPhase(engagement.phase);
  const [state, setState] = useState<StopwatchState>(readState);
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((next: StopwatchState) => {
    setState(next);
    writeState(next);
    setNow(Date.now());
  }, []);

  const snap = tick(state, now);

  // Drive the clock only while running.
  useEffect(() => {
    if (!snap.running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [snap.running]);

  // Countdown crossed zero on this render: freeze, chime, notify. `done` is
  // only true when *we* were running, so a reload after the fact stays quiet.
  useEffect(() => {
    if (!snap.done) return;
    commit(snap.state);
    sounds.timerDone();
    showToast(`Stopwatch — ${stateRef.current.mode} min countdown finished`, 'success');
  }, [snap.done, snap.state, commit, showToast]);

  const standaloneDisplay = format(snap.displayMs);
  const boundDisplay = format(engagementTick.displayMs);
  const boundTitle = engagement.phase === 'cooldown' || engagement.phase === 'cooldown-offer'
    ? 'Break'
    : (engagement.title || 'Engage');
  const display = bound ? boundDisplay : standaloneDisplay;
  const running = bound ? engagementTick.running : snap.running;

  useEffect(() => {
    onSnapshot?.({ display, running });
  }, [display, running, onSnapshot]);

  const onStartPause = () => commit(snap.running ? pause(state, Date.now()) : start(state, Date.now()));
  const onReset = () => commit(reset(state));
  const onMode = (mode: StopwatchMode) => commit(setMode(state, mode));

  const onBoundStartPause = () => {
    if (engagement.phase === 'cooldown-offer') {
      startCooldown();
      return;
    }
    if (engagementTick.running) pauseEngagement();
    else resumeEngagement();
  };

  const countdown = state.mode !== 'up';
  const canReset = snap.elapsedMs > 0;
  const boundCanStart = engagement.phase === 'running' || engagement.phase === 'paused'
    || engagement.phase === 'cooldown' || engagement.phase === 'cooldown-offer';
  const boundStartLabel = engagement.phase === 'cooldown-offer'
    ? 'Start'
    : (engagementTick.running ? 'Pause' : 'Start');

  return (
    <Gadget
      id="stopwatch"
      name={bound ? boundTitle : 'Stopwatch'}
      icon={<Icon name="clock" size={14} className="gadget__icon" />}
      teach={bound
        ? 'Bound to the active mission clock. Start, pause, and +5 drive the same countdown as the Focus row.'
        : 'Stopwatch — time-box a mission. Count up, or pick a countdown; it chimes when it hits zero and keeps running if you collapse the belt.'}
    >
      <div className={`stopwatch ${bound ? 'stopwatch--bound' : ''}`.trim()}>
        <div className="stopwatch__row">
          <Tooltip content={bound
            ? (engagement.phase === 'cooldown' || engagement.phase === 'cooldown-offer' ? 'Break remaining' : `Time left on ${boundTitle}`)
            : (countdown ? `Time left of ${state.mode} min` : 'Time elapsed since start')}
          >
            <output
              className={`stopwatch__display num ${running ? 'is-running' : ''} ${!bound && countdown && snap.displayMs === 0 && canReset ? 'is-done' : ''} ${bound && engagement.phase === 'chimed' ? 'is-done' : ''}`.trim()}
              aria-live="off"
              aria-label={bound || countdown ? 'Time remaining' : 'Time elapsed'}
            >
              {display}
            </output>
          </Tooltip>
          <div className="stopwatch__controls">
            {bound ? (
              <>
                <Tooltip content={engagementTick.running ? 'Pause the engagement clock' : 'Resume the engagement clock'}>
                  <button
                    type="button"
                    className={`gadget-btn ${engagementTick.running ? '' : 'gadget-btn--primary'}`.trim()}
                    onClick={onBoundStartPause}
                    disabled={!boundCanStart}
                    aria-pressed={engagementTick.running}
                    data-action={engagementTick.running ? 'pause' : 'start'}
                  >
                    {boundStartLabel}
                  </button>
                </Tooltip>
                <Tooltip content="+5 minutes">
                  <button
                    type="button"
                    className="gadget-btn"
                    onClick={plusFive}
                    disabled={engagement.phase === 'idle' || engagement.phase === 'cooldown-offer'}
                    data-action="plus5"
                  >
                    +5
                  </button>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip content={snap.running ? 'Pause — keeps the time; Start resumes' : (countdown ? `Start the ${state.mode} min countdown` : 'Start counting up')}>
                  <button
                    type="button"
                    className={`gadget-btn ${snap.running ? '' : 'gadget-btn--primary'}`.trim()}
                    onClick={onStartPause}
                    aria-pressed={snap.running}
                    data-action={snap.running ? 'pause' : 'start'}
                  >
                    {snap.running ? 'Pause' : 'Start'}
                  </button>
                </Tooltip>
                <Tooltip content="Reset to zero (or back to the full countdown)">
                  <button
                    type="button"
                    className="gadget-btn"
                    onClick={onReset}
                    disabled={!canReset && !snap.running}
                    data-action="reset"
                  >
                    Reset
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>
        <div className="stopwatch__track" aria-hidden="true">
          <div className="stopwatch__fill" style={{ width: `${Math.round((bound ? engagementTick.fraction : snap.fraction) * 100)}%` }} />
        </div>
        {bound ? (
          <p className="stopwatch__bound-label t-2xs clamp-1" title={boundTitle}>{boundTitle}</p>
        ) : (
          <Tooltip content="Mode — Up counts elapsed time; 5 / 15 / 25 count down that many minutes. Switching resets." block>
            <SegmentedControl
              options={MODE_OPTIONS}
              value={state.mode}
              onChange={onMode}
              ariaLabel="Stopwatch mode"
              block
              className="stopwatch__modes"
            />
          </Tooltip>
        )}
      </div>
    </Gadget>
  );
}
