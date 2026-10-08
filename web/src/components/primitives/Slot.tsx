import React from 'react';

export type SlotState = 'empty' | 'filled' | 'locked' | 'over';

interface SlotProps {
  state: SlotState;
  /** Cells spanned along the row (= mission CR). Only meaningful when filled. */
  span?: 1 | 2 | 3;
  /** Drop-target highlight. */
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  innerRef?: React.Ref<HTMLDivElement>;
  label?: string;
}

/**
 * Slot — one cell (or CR-wide run of cells) in the Case grid (brief §4.5, §6).
 * Locked cells are visible but disabled; `over` is the overflow-tray treatment.
 * The Case layout itself lands in Phase 1.5; this is the cell primitive.
 */
export function Slot({ state, span = 1, active, children, className = '', style, innerRef, label }: SlotProps) {
  return (
    <div
      ref={innerRef}
      className={`slot slot--${state} ${active ? 'is-active' : ''} ${className}`.trim()}
      style={{ ...style, gridColumn: span > 1 ? `span ${span}` : undefined }}
      aria-disabled={state === 'locked' || undefined}
      aria-label={label}
    >
      {state === 'locked' && <span className="slot__lock" aria-hidden="true">▒</span>}
      {children}
    </div>
  );
}
