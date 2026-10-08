/**
 * Drag-resizable pane widths: clamp to the pane's bounds and round-trip
 * through localStorage. Pure, so the Loadout resizer (TodayPlanner) can be
 * unit-tested without a DOM; the Quests pane keeps its own inline logic.
 */
export interface PaneWidthBounds {
  min: number;
  max: number;
}

/** Loadout pane: default is the CSS clamp(480px, 40vw, 640px) until the user drags. */
export const TODAY_PANE_WIDTH: PaneWidthBounds = { min: 400, max: 900 };
export const TODAY_PANE_WIDTH_KEY = 'firebrain_today_panel_width';

/** Integer width inside [min, max]; non-finite input snaps to min. */
export function clampPaneWidth(width: number, bounds: PaneWidthBounds): number {
  if (!Number.isFinite(width)) return bounds.min;
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(width)));
}

/**
 * Parse a stored width. `null` means "no user choice yet" so the caller keeps
 * the CSS default; garbage and non-positive values are treated the same way,
 * while an out-of-range number is clamped rather than discarded.
 */
export function parseStoredPaneWidth(raw: string | null | undefined, bounds: PaneWidthBounds): number | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return clampPaneWidth(n, bounds);
}

/** Width after dragging the pane's right-edge grip by `deltaX` pixels. */
export function resizedPaneWidth(startWidth: number, deltaX: number, bounds: PaneWidthBounds): number {
  return clampPaneWidth(startWidth + deltaX, bounds);
}
