import React from 'react';
import type { Challenge, PriorityLevel } from '../../types';
import type { OperatorTone } from '../../utils/operators';
import type { DueDateStatus } from '../../utils/dueDate';
import { Icon } from './Icon';

type Tone =
  | 'neutral'
  | 'p1' | 'p2' | 'p3'
  | 'danger' | 'warning' | 'success' | 'accent'
  | 'quest';

interface StatChipProps {
  glyph?: React.ReactNode;
  children?: React.ReactNode;
  tone?: Tone;
  /** Mono + tabular numerals for the value. */
  mono?: boolean;
  /** Outlined (default) or filled. */
  filled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * StatChip — a labeled value (brief §4.4). Fixed 18px height. The hit area,
 * when interactive, comes from the parent.
 */
export function StatChip({ glyph, children, tone = 'neutral', mono, filled, title, className = '', style }: StatChipProps) {
  return (
    <span
      className={`stat-chip stat-chip--${tone} ${filled ? 'stat-chip--filled' : ''} ${className}`.trim()}
      title={title}
      style={style}
    >
      {glyph && <span className="stat-chip__glyph" aria-hidden="true">{glyph}</span>}
      {children !== undefined && children !== null && (
        <span className={`stat-chip__value ${mono ? 'num' : ''}`.trim()}>{children}</span>
      )}
    </span>
  );
}

/* ---- Specialised chips used in the ItemCard stat row ------------------ */

const PRIORITY_HINT: Record<PriorityLevel, string> = {
  1: 'Priority 1 — do first',
  2: 'Priority 2 — standard',
  3: 'Priority 3 — when there\'s room',
};

export function PriorityChip({ level }: { level: PriorityLevel }) {
  return (
    <StatChip tone={`p${level}` as Tone} mono title={PRIORITY_HINT[level]}>
      P{level}
    </StatChip>
  );
}

export function challengeToCr(challenge: Challenge | ''): 1 | 2 | 3 {
  if (challenge === 'low') return 1;
  if (challenge === 'high') return 3;
  return 2;
}

/** CR as 1–3 pips. CR is the mission's energy cost: one cell per pip. */
export function CrPips({ cr, unset }: { cr: 1 | 2 | 3; unset?: boolean }) {
  return (
    <StatChip
      tone="neutral"
      className={`stat-chip--cr ${unset ? 'stat-chip--cr-unset' : ''}`.trim()}
      title={unset ? `CR not set — counted as ${cr}` : `CR ${cr} — costs ${cr} cell${cr === 1 ? '' : 's'} of Energy`}
    >
      <span className="cr-pips" aria-label={`CR ${cr}`}>
        {[1, 2, 3].map(i => (
          <span key={i} className={`cr-pip ${i <= cr ? 'is-on' : ''}`} />
        ))}
      </span>
    </StatChip>
  );
}

export function DueChip({ status }: { status: DueDateStatus }) {
  if (!status.label) return null;
  const overdue = status.tier === 'overdue';
  const tone: Tone = overdue ? 'danger' : status.tier === 'today' || status.tier === 'tomorrow' ? 'warning' : 'neutral';
  return (
    <StatChip
      tone={tone}
      mono
      title={status.exact ? `${overdue ? 'Overdue — due' : 'Due'} ${status.exact}` : undefined}
      glyph={overdue ? <Icon name="alert" size={12} /> : undefined}
    >
      {status.label}
    </StatChip>
  );
}

export function OperatorChip({ initial, name, tone }: { initial: string; name: string; tone: OperatorTone }) {
  return (
    <StatChip className={`stat-chip--op stat-chip--op-${tone}`} title={name} mono>
      {initial}
    </StatChip>
  );
}

export function QuestChip({ title, color }: { title: string; color?: string }) {
  return (
    <StatChip
      tone="quest"
      title={`Part of quest ‘${title}’`}
      className="stat-chip--quest"
      style={color ? ({ '--quest-color': color } as React.CSSProperties) : undefined}
      glyph={<span className="quest-dot" />}
    >
      <span className="clamp-1">{title}</span>
    </StatChip>
  );
}

export function LoadedChip() {
  return (
    <StatChip tone="accent" title="In the Loadout today" glyph={<Icon name="loadout" size={12} />}>
      Loaded
    </StatChip>
  );
}
