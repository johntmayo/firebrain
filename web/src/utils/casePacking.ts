/**
 * The Case — pure layout math for the loadout grid (CHASSIS_BRIEF §6).
 *
 * The grid is fixed (6×3 desktop, 3×6 handheld = 18 cells). The energy level
 * decides how many cells are *live* (10 / 14 / 18); the rest are locked and sit
 * at the end of reading order (bottom-right). Items flow left→right, top→bottom
 * in `today_slot` order; each item is one row tall and `cr` cells wide.
 *
 * No auto-reflow: if an item does not fit in the remaining live cells of its
 * row it wraps to the next row and leaves a gap, like a real inventory. The
 * CapacityBar counts CR points (cells *used*), not cells occupied visually, so a
 * gap never costs budget — but an item that cannot be placed anywhere in the
 * live grid is shown in the overflow tray. The tray shares the case's columns
 * and every tray item still spans exactly `cr` cells — overflowing never costs
 * more room than the mission's CR. Each tray item is flagged `overBudget` when
 * its cumulative CR exceeds capacity (the overflow treatment: energy, not
 * danger); an item that is within budget but merely squeezed out by gaps is not.
 */

export type CaseCr = 1 | 2 | 3;

export interface CaseItem {
  id: string;
  cr: CaseCr;
}

export interface CaseGridShape {
  cols: number;
  rows: number;
}

/** Any item the layout knows the loadout position of (placed or overflow). */
export interface OrderedItem extends CaseItem {
  /** Position in the ordered loadout (0-based). */
  index: number;
}

export interface PlacedItem extends OrderedItem {
  row: number;
  col: number;
  /** Cells spanned (== cr). */
  span: number;
}

export interface OverflowItem extends OrderedItem {
  /** True when this item pushes cumulative CR past capacity. */
  overBudget: boolean;
}

export interface CaseCell {
  row: number;
  col: number;
  /** Reading-order index (row * cols + col). */
  n: number;
  state: 'item' | 'free' | 'locked';
  /** Set when state === 'item'. */
  itemId?: string;
  /** True on the first cell of an item span. */
  itemStart?: boolean;
}

export interface CaseLayout extends CaseGridShape {
  /** Live cells (10 / 14 / 18). */
  capacity: number;
  /** Sum of CR over *all* items (placed + overflow). */
  used: number;
  placed: PlacedItem[];
  overflow: OverflowItem[];
  /** Every cell in reading order, for rendering. */
  cells: CaseCell[];
  /** Live cells with nothing in them (drop targets). */
  freeCells: CaseCell[];
}

export const DESKTOP_CASE: CaseGridShape = { cols: 6, rows: 3 };
export const HANDHELD_CASE: CaseGridShape = { cols: 3, rows: 6 };

export function isLiveCell(n: number, capacity: number): boolean {
  return n < capacity;
}

/**
 * Lay items into the case. `capacity` is clamped to the grid size.
 */
export function packCase(items: CaseItem[], capacity: number, shape: CaseGridShape = DESKTOP_CASE): CaseLayout {
  const { cols, rows } = shape;
  const total = cols * rows;
  const live = Math.max(0, Math.min(capacity, total));

  const cells: CaseCell[] = [];
  for (let n = 0; n < total; n++) {
    cells.push({ row: Math.floor(n / cols), col: n % cols, n, state: isLiveCell(n, live) ? 'free' : 'locked' });
  }

  const placed: PlacedItem[] = [];
  const overflow: OverflowItem[] = [];
  let used = 0;
  let cursor = 0; // next cell to try, in reading order

  items.forEach((item, index) => {
    const span = Math.max(1, Math.min(3, item.cr)) as CaseCr;
    used += span;
    const overBudget = used > live;

    // Find the first position at or after the cursor where the span fits
    // entirely within one row and only over free live cells. Searching forward
    // (rather than only at the cursor) is what makes "wrap and leave a gap" work.
    let start = -1;
    for (let n = cursor; n < total; n++) {
      const col = n % cols;
      if (col + span > cols) continue; // would cross the row edge
      let ok = true;
      for (let k = 0; k < span; k++) {
        if (cells[n + k].state !== 'free') { ok = false; break; }
      }
      if (ok) { start = n; break; }
    }

    if (start === -1 || overBudget) {
      overflow.push({ ...item, cr: span, index, overBudget });
      return;
    }

    for (let k = 0; k < span; k++) {
      cells[start + k].state = 'item';
      cells[start + k].itemId = item.id;
      cells[start + k].itemStart = k === 0;
    }
    placed.push({ ...item, cr: span, span, index, row: cells[start].row, col: cells[start].col });
    cursor = start + span;
  });

  return {
    cols,
    rows,
    capacity: live,
    used,
    placed,
    overflow,
    cells,
    freeCells: cells.filter(c => c.state === 'free'),
  };
}

/**
 * Where a drop on cell `n` should insert in the ordered loadout.
 * - On an occupied cell: before that item.
 * - On a free (or locked) cell: after every item that starts before it.
 * Returns a 0-based index into the *items* array that produced the layout.
 */
export function insertIndexForCell(layout: CaseLayout, n: number): number {
  const cell = layout.cells[n];
  if (cell?.state === 'item' && cell.itemId) {
    const hit = layout.placed.find(p => p.id === cell.itemId);
    if (hit) return hit.index;
  }
  let count = 0;
  for (const p of layout.placed) {
    const startN = p.row * layout.cols + p.col;
    if (startN < n) count = Math.max(count, p.index + 1);
  }
  return count;
}

/**
 * Reorder helper used by ↑/↓ and drops: move `from` to `to` in a copy.
 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [it] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, it);
  return next;
}
