import { describe, expect, it } from 'vitest';
import { DESKTOP_CASE, HANDHELD_CASE, insertIndexForCell, moveItem, packCase, type CaseItem } from './casePacking';

const item = (id: string, cr: 1 | 2 | 3): CaseItem => ({ id, cr });
const rowOf = (layout: ReturnType<typeof packCase>) =>
  layout.cells.map(c => (c.state === 'locked' ? '#' : c.state === 'free' ? '.' : c.itemStart ? c.itemId![0] : '-')).join('');

describe('packCase — grid and capacity', () => {
  it('desktop is 6×2 and energy only changes how many cells are live', () => {
    for (const [cap, locked] of [[7, 5], [10, 2], [12, 0]] as const) {
      const l = packCase([], cap, DESKTOP_CASE);
      expect(l.cells).toHaveLength(12);
      expect(l.cells.filter(c => c.state === 'locked')).toHaveLength(locked);
      expect(l.capacity).toBe(cap);
    }
  });

  it('locked cells fill from the bottom-right so live cells are a contiguous run', () => {
    const l = packCase([], 7, DESKTOP_CASE);
    expect(rowOf(l)).toBe('......' + '.#####');
    const h = packCase([], 10, HANDHELD_CASE);
    expect(rowOf(h)).toBe('....' + '....' + '..##');
  });

  it('clamps capacity to the grid', () => {
    expect(packCase([], 99, DESKTOP_CASE).capacity).toBe(12);
    expect(packCase([], -1, DESKTOP_CASE).capacity).toBe(0);
  });
});

describe('packCase — placement', () => {
  it('flows left→right, top→bottom with each item CR cells wide', () => {
    // The brief's mock: CR1 · CR2 · CR2 · (free) / CR2 · free · locked · locked
    const l = packCase([item('a', 1), item('b', 2), item('c', 2), item('d', 2)], 10, DESKTOP_CASE);
    expect(rowOf(l)).toBe('ab-c-.' + 'd-..##');
    expect(l.placed.map(p => [p.id, p.row, p.col, p.span])).toEqual([
      ['a', 0, 0, 1], ['b', 0, 1, 2], ['c', 0, 3, 2], ['d', 1, 0, 2],
    ]);
    expect(l.used).toBe(7);
    expect(l.overflow).toEqual([]);
  });

  it('wraps to the next row and leaves a gap instead of reflowing', () => {
    // 5 cells used in row 0, then a CR2 cannot fit in the single remaining cell.
    const l = packCase([item('a', 3), item('b', 2), item('c', 2)], 12, DESKTOP_CASE);
    expect(rowOf(l)).toBe('a--b-.' + 'c-....');
    // The gap at cell 5 is free and does not count against budget.
    expect(l.used).toBe(7);
    expect(l.freeCells.map(c => c.n)).toEqual([5, 8, 9, 10, 11]);
  });

  it('never places an item over locked cells', () => {
    // Medium: cells 10,11 locked. Row 1 has 4 live cells; a CR3 after a CR2 cannot fit.
    const l = packCase([item('a', 3), item('b', 3), item('c', 2), item('d', 3)], 10, DESKTOP_CASE);
    expect(rowOf(l)).toBe('a--b--' + 'c-..##');
    expect(l.overflow.map(o => [o.id, o.overBudget])).toEqual([['d', true]]); // 3+3+2+3 = 11 > 10
  });

  it('distinguishes squeezed-out (within budget) from over-budget overflow', () => {
    // Heavy (12 live). a=3,b=2 → row 0 has 1 free cell; c=2 wraps; d=3 wraps? row1: c- then d-- fits (cols 2..4).
    // Make e=3: used 3+2+2+3+3 = 13 > 12 → over budget.
    const l = packCase([item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 3)], 12, DESKTOP_CASE);
    expect(rowOf(l)).toBe('a--b-.' + 'c-d--.');
    expect(l.overflow.map(o => [o.id, o.overBudget])).toEqual([['e', true]]);

    // Same five items but e=1: used 11 ≤ 12, and the lone free cell (5 or 11) fits a CR1 → placed in the gap.
    const l2 = packCase([item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('e', 1)], 12, DESKTOP_CASE);
    expect(rowOf(l2)).toBe('a--b-.' + 'c-d--e');
    expect(l2.overflow).toEqual([]);

    // Within budget but no 2-wide run left anywhere → squeezed out, not over budget.
    const l3 = packCase([item('a', 3), item('b', 2), item('c', 2), item('d', 3), item('f', 2)], 12, DESKTOP_CASE);
    expect(l3.used).toBe(12);
    expect(l3.overflow.map(o => [o.id, o.overBudget])).toEqual([['f', false]]);
  });

  it('handheld 4×3 packs the same items in a narrower case', () => {
    const l = packCase([item('a', 1), item('b', 2), item('c', 2), item('d', 2), item('e', 3)], 10, HANDHELD_CASE);
    expect(rowOf(l)).toBe('ab-.' + 'c-d-' + '..##');
    // e (CR3) cannot fit in the 2 live cells of row 2 → overflow (used 10, not over budget).
    expect(l.overflow.map(o => [o.id, o.overBudget])).toEqual([['e', false]]);
  });

  it('coerces out-of-range CR into 1..3', () => {
    const l = packCase([{ id: 'x', cr: 9 as 3 }, { id: 'y', cr: 0 as 1 }], 12, DESKTOP_CASE);
    expect(l.placed.map(p => p.span)).toEqual([3, 1]);
  });
});

describe('insertIndexForCell', () => {
  const l = packCase([item('a', 1), item('b', 2), item('c', 2), item('d', 2)], 10, DESKTOP_CASE); // ab-c-. / d-..##

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
    expect(insertIndexForCell(l, 11)).toBe(4);
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
