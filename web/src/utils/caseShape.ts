/**
 * Which Case shape to render (CHASSIS_BRIEF §6): 6×3 on desktop, 3×6 on a
 * handheld. The JS layout (`packCase`) and the CSS grid must agree, so the
 * shape is decided once here and both consume the result.
 *
 * A user-shrunk desktop Loadout pane and a phone pane can be the same width,
 * so the pane's own width cannot tell the two apart; the handheld decision
 * comes from the app's mobile breakpoint. Container width is only used as a
 * floor: a desktop pane narrower than `CASE_NARROW_PANE_PX` (e.g. the 340px
 * pane at ≤1100px viewports, whose case is 304px) can't hold six legible
 * cells and falls back to 3×6.
 */
import { DESKTOP_CASE, HANDHELD_CASE, type CaseGridShape } from './casePacking';

/** Below this content width a 6-wide row cannot hold legible cells. */
export const CASE_NARROW_PANE_PX = 320;
/** Gap between cells, kept in sync with `--case-gap` in case.css. */
export const CASE_CELL_GAP_PX = 3;
/**
 * A CR1 cell narrower than this shows only its priority chip; at or above it
 * the cell carries title + P chip + CR pips (the cell-tier chips in case.css
 * need ~68px for P + CR plus the card's bar and padding). The default
 * Loadout pane at 1440px yields 87px cells; a phone (3-wide) yields ~110px.
 */
export const CASE_TIGHT_CELL_PX = 80;

export function caseShapeFor(containerWidth: number | null, handheld: boolean): CaseGridShape {
  if (handheld) return HANDHELD_CASE;
  if (containerWidth !== null && containerWidth > 0 && containerWidth < CASE_NARROW_PANE_PX) return HANDHELD_CASE;
  return DESKTOP_CASE;
}

/** Width of one cell for a given container width and column count. */
export function caseCellWidth(containerWidth: number | null, cols: number, gap = CASE_CELL_GAP_PX): number | null {
  if (containerWidth === null || containerWidth <= 0 || cols <= 0) return null;
  return Math.floor((containerWidth - gap * (cols - 1)) / cols);
}

export function isTightCell(cellWidth: number | null): boolean {
  return cellWidth !== null && cellWidth < CASE_TIGHT_CELL_PX;
}

/**
 * Next free 1-based slot strings for `count` new missions appended after the
 * current loadout. `today_slot` is an ordered position string ('1', '2', …);
 * legacy codes (B1, M1…) and blanks are ignored for the max.
 */
export function nextSlots(existingSlots: string[], count: number): string[] {
  let max = 0;
  for (const s of existingSlots) {
    const n = Number(s);
    if (Number.isFinite(n) && n > max) max = Math.floor(n);
  }
  return Array.from({ length: Math.max(0, count) }, (_, i) => String(max + i + 1));
}
