import React from 'react';
import { titleFallback, useTooltip } from './Tooltip';

export interface SegmentOption<T extends string> {
  value: T;
  /** Visible label. Use `glyph` alone for icon-only segments. */
  label?: React.ReactNode;
  glyph?: React.ReactNode;
  /** Short accessible name; the `aria-label` for glyph-only segments. */
  title?: string;
  /** One teaching sentence: what this choice does. Hover/focus tooltip; `title` on touch. */
  hint?: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** `sm` fits inside a HudBar; `md` is for forms/dialogs. */
  size?: 'sm' | 'md';
  /** Stretch to fill the parent width (forms). */
  block?: boolean;
  /** Fallback hint for segments that don't carry their own. */
  hint?: string;
  className?: string;
}

interface SegButtonProps<T extends string> {
  opt: SegmentOption<T>;
  selected: boolean;
  hint?: string;
  onChange: (value: T) => void;
}

/**
 * One segment. Owns its tooltip via `useTooltip` so the `<button class="seg__btn">`
 * stays the direct child of `.seg` (the CSS and the `::after` hit expansion rely on it).
 */
function SegButton<T extends string>({ opt, selected, hint, onChange }: SegButtonProps<T>) {
  const { anchorProps, tooltip } = useTooltip(hint, Boolean(hint) && !opt.disabled);
  const iconOnly = Boolean(opt.glyph && !opt.label);
  const name = opt.title ?? hint;
  return (
    <>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={iconOnly ? name : undefined}
        tabIndex={selected ? 0 : -1}
        data-value={opt.value}
        className={`seg__btn ${selected ? 'is-selected' : ''} ${iconOnly ? 'seg__btn--glyph' : ''}`.trim()}
        title={hint ? titleFallback(hint) : opt.title}
        disabled={opt.disabled}
        onClick={() => !selected && onChange(opt.value)}
        onPointerDown={e => e.stopPropagation()}
        {...anchorProps}
      >
        {opt.glyph && <span className="seg__glyph" aria-hidden={opt.label ? 'true' : undefined}>{opt.glyph}</span>}
        {opt.label && <span className="seg__label">{opt.label}</span>}
      </button>
      {tooltip}
    </>
  );
}

/**
 * SegmentedControl — every mutually-exclusive choice (brief §4.8).
 * Equal-width segments, one selected, ≥ 32px hit height (44px on touch).
 * Roving-tabindex radiogroup: arrow keys move the selection.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'sm',
  block,
  hint,
  className = '',
}: SegmentedControlProps<T>) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const enabled = options.filter(o => !o.disabled);
    const idx = enabled.findIndex(o => o.value === value);
    if (idx === -1) return;
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    onChange(next.value);
    const btn = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
    btn?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`seg seg--${size} ${block ? 'seg--block' : ''} ${className}`.trim()}
      onKeyDown={onKeyDown}
    >
      {options.map(opt => (
        <SegButton key={opt.value} opt={opt} selected={opt.value === value} hint={opt.hint ?? hint} onChange={onChange} />
      ))}
    </div>
  );
}
