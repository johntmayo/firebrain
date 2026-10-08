import React, { createContext, useContext } from 'react';
import { titleFallback, useTooltip } from './Tooltip';

const PANE_DRAG_HINT = 'Drag to reorder panes';

/**
 * When a pane is sortable (desktop), the SortableDesktopPane provides its
 * dnd-kit attributes/listeners here and the HudBar title becomes the drag
 * handle. No floating pill, nothing overlapping the header controls.
 */
export interface PaneDragHandle {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: Record<string, Function> | undefined;
  label: string;
}

export const PaneDragHandleContext = createContext<PaneDragHandle | null>(null);

interface HudBarProps {
  glyph?: React.ReactNode;
  title: React.ReactNode;
  /** Shown as a mono count next to the title; omit to hide. */
  count?: number | string;
  /** Right-hand controls: SegmentedControls, buttons, selects. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * HudBar — pane header (brief §4.2).
 * Left: glyph + title (display type) + count. Right: controls grouped.
 * One row on desktop; horizontally scrollable under touch.
 */
export function HudBar({ glyph, title, count, children, className = '' }: HudBarProps) {
  const drag = useContext(PaneDragHandleContext);
  const { anchorProps: dragHintProps, tooltip: dragHintTip } = useTooltip(PANE_DRAG_HINT, Boolean(drag));

  const titleProps: React.HTMLAttributes<HTMLHeadingElement> = drag
    ? {
        ...(drag.attributes as React.HTMLAttributes<HTMLHeadingElement>),
        ...(drag.listeners as React.HTMLAttributes<HTMLHeadingElement>),
        ...dragHintProps,
        title: titleFallback(`Drag to move the ${drag.label} pane`),
      }
    : {};

  return (
    <header className={`hud-bar ${className}`.trim()}>
      <h2 className={`hud-bar__title t-display ${drag ? 'hud-bar__title--grip' : ''}`.trim()} {...titleProps}>
        {glyph && <span className="hud-bar__glyph" aria-hidden="true">{glyph}</span>}
        <span className="hud-bar__label">{title}</span>
        {count !== undefined && count !== '' && (
          <span className="hud-bar__count num">{count}</span>
        )}
      </h2>
      {dragHintTip}
      {children && <div className="hud-bar__controls">{children}</div>}
    </header>
  );
}

/** Visual grouping inside HudBar controls: `<HudGroup label="Sort">…</HudGroup>` */
export function HudGroup({ label, children, className = '' }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`hud-group ${className}`.trim()}>
      {label && <span className="hud-group__label t-2xs">{label}</span>}
      {children}
    </div>
  );
}
