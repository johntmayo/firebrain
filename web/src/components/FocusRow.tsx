import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ENGAGEMENT_PRESETS, isBoundPhase } from '../utils/engagement';
import { format } from '../utils/stopwatch';
import { Dialog } from './primitives';
import '../styles/focus.css';

export interface FocusRowObjectives {
  label: string;
  done: number;
  total: number;
}

/**
 * FocusRow — the active-mission clock under the Loadout capacity bar.
 * Optional `objectives` is derived from notes (honest n/m); unused when idle.
 */
export function FocusRow({ objectives }: { objectives?: FocusRowObjectives | null } = {}) {
  const {
    engagement,
    engagementTick,
    completeActive,
    plusFive,
    standDown,
    startCooldown,
    skipCooldown,
    pauseEngagement,
    resumeEngagement,
  } = useApp();

  if (!isBoundPhase(engagement.phase)) return null;

  const clock = format(engagementTick.displayMs);
  const running = engagementTick.running;

  if (engagement.phase === 'chimed') {
    return (
      <div className="focus-row focus-row--chimed" data-focus-row data-focus-phase="chimed" role="status">
        <div className="focus-row__card">
          <div className="focus-row__copy">
            Checkpoint
            <span className="focus-row__copy-sub t-xs">{engagement.title} · clock chimed</span>
          </div>
          <div className="focus-row__actions">
            <button type="button" className="hud-btn hud-btn--primary" data-focus-action="complete" onClick={() => { void completeActive(); }}>
              Complete
            </button>
            <button type="button" className="hud-btn" data-focus-action="plus5" onClick={plusFive}>
              +5 min
            </button>
            <button type="button" className="hud-btn" data-focus-action="stand-down" onClick={standDown}>
              Stand down
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (engagement.phase === 'cooldown-offer') {
    return (
      <div className="focus-row focus-row--offer" data-focus-row data-focus-phase="cooldown-offer" role="status">
        <div className="focus-row__card">
          <div className="focus-row__copy">Take 5?</div>
          <div className="focus-row__actions">
            <button type="button" className="hud-btn hud-btn--primary" data-focus-action="start-cooldown" onClick={startCooldown}>
              Start
            </button>
            <button type="button" className="hud-btn" data-focus-action="skip-cooldown" onClick={skipCooldown}>
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (engagement.phase === 'cooldown') {
    return (
      <div className="focus-row focus-row--break" data-focus-row data-focus-phase="cooldown" role="status">
        <span className="focus-row__glyph" aria-hidden="true">☕</span>
        <span className="focus-row__title clamp-1">Break</span>
        <span className="focus-row__dot" aria-hidden="true">·</span>
        <span className="focus-row__clock num">{clock}</span>
        <div className="focus-row__actions">
          <button type="button" className="hud-btn" data-focus-action="skip-cooldown" onClick={skipCooldown}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="focus-row"
      data-focus-row
      data-focus-phase={engagement.phase}
      data-mission-id={engagement.missionId ?? undefined}
    >
      <button
        type="button"
        className="focus-row__glyph"
        onClick={running ? pauseEngagement : resumeEngagement}
        aria-label={running ? 'Pause' : 'Resume'}
        title={running ? 'Pause' : 'Resume'}
        data-focus-action={running ? 'pause' : 'resume'}
      >
        <span aria-hidden="true">{running ? '▶' : '❚❚'}</span>
      </button>
      <span className="focus-row__title clamp-1">{engagement.title}</span>
      <span className="focus-row__dot" aria-hidden="true">·</span>
      <span className="focus-row__clock num" aria-label="Time remaining">{clock}</span>
      {objectives && objectives.total > 0 && (
        <>
          <span className="focus-row__dot" aria-hidden="true">·</span>
          <span className="focus-row__obj t-xs clamp-1" title={objectives.label}>
            {objectives.label}
            <span className="num"> {objectives.done}/{objectives.total}</span>
          </span>
        </>
      )}
      <div className="focus-row__actions">
        <button type="button" className="hud-btn hud-btn--primary" data-focus-action="complete" onClick={() => { void completeActive(); }}>
          Complete
        </button>
        <button type="button" className="hud-btn" data-focus-action="plus5" onClick={plusFive}>
          +5
        </button>
        <button type="button" className="hud-btn" data-focus-action="stand-down" onClick={standDown}>
          Stand down
        </button>
      </div>
    </div>
  );
}

export interface EngagePickerProps {
  open: boolean;
  missionTitle: string;
  lastPresetMinutes: number;
  blockedReason?: string | null;
  onClose: () => void;
  onStart: (minutes: number) => void;
}

/**
 * Clock picker: 5 · 15 · 25 · 45 · custom (minutes) → Start.
 * Remembers the last choice via the caller (engagement.lastPresetMinutes).
 */
export function EngagePicker({
  open,
  missionTitle,
  lastPresetMinutes,
  blockedReason,
  onClose,
  onStart,
}: EngagePickerProps) {
  const lastIsPreset = (ENGAGEMENT_PRESETS as readonly number[]).includes(lastPresetMinutes);
  const [mode, setMode] = useState<'preset' | 'custom'>(lastIsPreset ? 'preset' : 'custom');
  const [preset, setPreset] = useState(lastIsPreset ? lastPresetMinutes : 25);
  const [custom, setCustom] = useState(String(lastIsPreset ? 25 : lastPresetMinutes));

  const minutes = useMemo(() => {
    if (mode === 'preset') return preset;
    const n = Number(custom);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [mode, preset, custom]);

  return (
    <Dialog
      open={open}
      title="Engage"
      onClose={onClose}
      className="dialog--engage"
      footer={(
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn--primary"
            data-engage-start
            disabled={!!blockedReason || minutes <= 0}
            onClick={() => {
              if (minutes <= 0 || blockedReason) return;
              onStart(minutes);
            }}
          >
            Start
          </button>
        </>
      )}
    >
      <div className="engage-picker">
        <p className="engage-picker__hint t-xs clamp-1" title={missionTitle}>
          {blockedReason || missionTitle}
        </p>
        <div className="engage-picker__presets" role="group" aria-label="Duration">
          {ENGAGEMENT_PRESETS.map(n => (
            <button
              key={n}
              type="button"
              className={`hud-btn engage-picker__preset ${mode === 'preset' && preset === n ? 'is-selected' : ''}`}
              data-engage-preset={n}
              aria-pressed={mode === 'preset' && preset === n}
              onClick={() => {
                setMode('preset');
                setPreset(n);
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={`hud-btn engage-picker__preset ${mode === 'custom' ? 'is-selected' : ''}`}
            data-engage-preset="custom"
            aria-pressed={mode === 'custom'}
            onClick={() => setMode('custom')}
          >
            Custom
          </button>
        </div>
        {mode === 'custom' && (
          <label className="engage-picker__custom">
            <input
              className="engage-picker__input num"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              data-engage-custom
              value={custom}
              onChange={e => setCustom(e.target.value)}
              aria-label="Custom minutes"
            />
            <span className="engage-picker__unit t-xs">minutes</span>
          </label>
        )}
      </div>
    </Dialog>
  );
}
