import React from 'react';
import { Tooltip } from './Tooltip';
import { Icon } from './Icon';

interface CapacityBarProps {
  /** Cells used (sum of CR across loaded missions). */
  used: number;
  /** Cells available (live) at the current energy level. */
  limit: number;
  /** Energy level name for the tooltip copy. */
  energyLabel?: string;
  className?: string;
}

/**
 * CapacityBar — the single source of truth for the loadout budget (brief §4.6).
 * Mono label (`7 / 10`, `+3` when over) and one segment per live cell; over-
 * capacity segments are appended in the danger tone. The ? explains CR → cells.
 */
export function CapacityBar({ used, limit, energyLabel, className = '' }: CapacityBarProps) {
  const safeLimit = Math.max(0, limit);
  const over = Math.max(0, used - safeLimit);
  const filled = Math.min(used, safeLimit);

  const tooltip = (
    <div className="tooltip__body">
      <strong>{used} of {safeLimit} cells used{over > 0 ? `, ${over} over` : ''}.</strong>
      <div>Each mission costs its CR in cells. Energy sets how many cells are live: Light 7 · Medium 10 · Heavy 12.</div>
      {energyLabel && <div className="tooltip__meta">Today is {energyLabel}.</div>}
    </div>
  );

  return (
    <div
      className={`cap-bar ${over > 0 ? 'is-over' : ''} ${className}`.trim()}
      role="meter"
      aria-label="Loadout capacity"
      aria-valuemin={0}
      aria-valuemax={safeLimit}
      aria-valuenow={used}
      aria-valuetext={`${used} of ${safeLimit} cells${over > 0 ? `, ${over} over` : ''}`}
    >
      <span className="cap-bar__label num">
        {used} / {safeLimit}
        {over > 0 && <span className="cap-bar__over"> +{over}</span>}
      </span>
      <span className="cap-bar__track" aria-hidden="true">
        {Array.from({ length: safeLimit }).map((_, i) => (
          <span key={`c${i}`} className={`cap-bar__seg ${i < filled ? 'is-on' : ''}`} />
        ))}
        {Array.from({ length: over }).map((_, i) => (
          <span key={`o${i}`} className="cap-bar__seg is-over" />
        ))}
      </span>
      <Tooltip content={tooltip}>
        <button type="button" className="cap-bar__info icon-btn hit" aria-label="How capacity works">
          <Icon name="info" size={12} />
        </button>
      </Tooltip>
    </div>
  );
}
