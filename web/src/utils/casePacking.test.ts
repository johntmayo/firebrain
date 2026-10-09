import { describe, expect, it } from 'vitest';
import { DESKTOP_CASE, HANDHELD_CASE, insertIndexForCell, moveItem, packCase, type CaseItem } from './casePacking';

const item = (id: string, cr: 1 | 2 | 3): CaseItem => ({ id, cr });
const rowOf = (layout: ReturnType<typeof packCase>) =>
  layout.cells.map(c => (c.state === 'locked' ? '#' : c.state === 'free' ? '.' : c.itemStart ? c.itemId![0] : '-')).join('');

describe('packCase — grid and capacity', () => {
  it('desktop is 6×3 and energy only changes how many cells are live', () => {
    for (const [cap, locked] of [[10, 8], [14, 4], [18, 0]] as const) {
      const l = packCase([], cap, DESKTOP_CASE);
      expect(l.cells).toHaveLength(18);
      expect(l.cells.filter(c => c.state === 'locked')).toHaveLength(locked);
      expect(l.capacity).toBe(cap);
    }
  });

  it('locked cells fill from the bottom-right so live cells are a contiguous run', () => {
    const l = packCase([], 10, DESKTOP_CASE);
    expect(rowOf(l)).toBe('......' + '....##' + '######');
    const h = packCase([], 14, HANDHELD_CASE);
    expect(rowOf(h)).toBe('...' + '...' + '...' + '...' + '..#' + '###');
  });

  it('clamps capacity to the grid', () => {
    expect(packCase([], 99, DESKTOP_CASE).capacity).toBe(18);
    expect(packCase([], -1, DESKTOP_CASE).capacity).toBe(0);
  });
});

describe('packCase — placement', () => {
  it('flows left→right, top→bottom with each item CR cells wide', () => {
    // Brief mock on 6×3 Medium (14 live): CR1 · CR2 · CR2 · (free) / CR2 · free… / 2 live · 4 locked
    const l = packCase([item('a', 1), item('b', 2), item('c', 2), item('d', 2)], 14, DESKTOP_CASE);
    expect(rowOf(l)).toBe('ab-c-.' + 'd-....' + '..####');
    expect(l.placed.map(p => [p.id, p.row, p.col, p.span])).toEqual([
      ['a', 0, 0, 1], ['b', 0, 1, 2], ['c', 0, 3, 2], ['d', 1, 0, 2],
    ]);
    expect(l.used).toBe(7);
    expect(l.overflow).toEqual([]);
  });

  it('wraps to the next row and leaves a gap instead of reflowing', () => {
    // 5 cells used in row 0, then a CR2 cannot fit in the single remaining cell.
    const l = packCase([item('a', 3), item('b', 2), item('c', 2)], 18, DESKTOP_CASE);
    expect(rowOf(l)).toBe('a--b-.' + 'c-....' + '......');
    // The gap at cell 5 is free and does not count against budget.
    expect(l.used).toBe(7);
    expect(l.freeCells.map(c => c.n)).toEqual([5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('never places an item over locked cells', () => {
    // Medium: cells 14–17 locked. Row 2 has only 2 live cells; a CR3 after a
    // wrap-gap layout cannot fit there, and used 13 ≤ 14 so it is squeezed out
    // (within budget), not over-budget.
    const l = packCase([item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 3)], 14, DESKTOP_CASE);
    expect(rowOf(l)).toBe('a--b-.' + 'c-d--.' + '..####');
    expect(l.overflow.map(o => [o.id, o.overBudget])).toEqual([['e', false]]);
  });

  it('distinguishes squeezed-out (within budget) from over-budget overflow', () => {
    // Heavy (18 live). Wrap-gaps leave only isolated free cells; a trailing CR3
    // cannot find a 3-wide run (used 18, not over). A further CR3 is over budget.
    const l = packCase(
      [item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 3), item('f', 2), item('g', 3)],
      18,
      DESKTOP_CASE,
    );
    expect(rowOf(l)).toBe('a--b-.' + 'c-d--.' + 'e--f-.');
    expect(l.overflow.map(o => [o.id, o.overBudget])).toEqual([['g', false]]);

    // Same six placed items but g=1: used 16 ≤ 18. Packing never backfills
    // earlier gaps (cursor only moves forward), so the CR1 lands in the free
    // cell after f, not the wrap-gaps in rows 0–1.
    const l2 = packCase(
      [item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 3), item('f', 2), item('g', 1)],
      18,
      DESKTOP_CASE,
    );
    expect(rowOf(l2)).toBe('a--b-.' + 'c-d--.' + 'e--f-g');
    expect(l2.overflow).toEqual([]);

    // Within budget but no 2-wide run left anywhere → squeezed out, not over budget.
    const l3 = packCase(
      [item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 3), item('f', 2), item('x', 2)],
      18,
      DESKTOP_CASE,
    );
    expect(l3.used).toBe(17);
    expect(l3.overflow.map(o => [o.id, o.overBudget])).toEqual([['x', false]]);

    // A second leftover CR3 pushes cumulative CR past capacity.
    const l4 = packCase(
      [item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 3), item('f', 2), item('g', 3), item('h', 3)],
      18,
      DESKTOP_CASE,
    );
    expect(l4.overflow.map(o => [o.id, o.overBudget])).toEqual([['g', false], ['h', true]]);
  });

  it('handheld 3×6 packs the same items in a narrower case', () => {
    const l = packCase([item('a', 1), item('b', 2), item('c', 2), item('d', 2), item('e', 3)], 14, HANDHELD_CASE);
    expect(rowOf(l)).toBe('ab-' + 'c-.' + 'd-.' + 'e--' + '..#' + '###');
    expect(l.placed).toHaveLength(5);
    expect(l.overflow).toEqual([]);
  });

  it('coerces out-of-range CR into 1..3', () => {
    const l = packCase([{ id: 'x', cr: 9 as 3 }, { id: 'y', cr: 0 as 1 }], 18, DESKTOP_CASE);
    expect(l.placed.map(p => p.span)).toEqual([3, 1]);
  });
});

describe('insertIndexForCell', () => {
  const l = packCase([item('a', 1), item('b', 2), item('c', 2), item('d', 2)], 14, DESKTOP_CASE); // ab-c-. / d-.... / ..####

  it('drops on an occupied cell insert before that item', () => {
    expect(insertIndexForCell(l, 0)).toBe(0); // on a
    expect(insertIndexForCell(l, 2)).toBe(1); // on the 2nd cell of b
    expect(insertIndexForCell(l, 6)).toBe(3); // on d
  });

  it('drops on a free cell insert after everything that starts before it', () => {
    expect(insertIndexForCell(l, 5)).toBe(3); // the free cell at the end of row 0 → before d
    expect(insertIndexForCell(l, 8)).toBe(4); // after d → end
  });

  it('drops on a locked cell behave like the end', () => {
    expect(insertIndexForCell(l, 17)).toBe(4);
  });
});

describe('moveItem', () => {
  it('moves and clamps', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, 99)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, -5)).toEqual(['b', 'a', 'c']);
  });
});
