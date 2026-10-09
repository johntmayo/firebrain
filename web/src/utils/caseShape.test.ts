import { describe, expect, it } from 'vitest';
import { DESKTOP_CASE, HANDHELD_CASE } from './casePacking';
import { CASE_NARROW_PANE_PX, CASE_TIGHT_CELL_PX, caseCellWidth, caseShapeFor, isTightCell, nextSlots } from './caseShape';

describe('caseShapeFor', () => {
  it('is 6×3 on desktop regardless of pane width above the floor', () => {
    expect(caseShapeFor(null, false)).toEqual(DESKTOP_CASE);
    expect(caseShapeFor(334, false)).toEqual(DESKTOP_CASE);
    expect(caseShapeFor(900, false)).toEqual(DESKTOP_CASE);
  });

  it('is 3×6 on a handheld even though the phone pane is wider than the desktop pane', () => {
    expect(caseShapeFor(374, true)).toEqual(HANDHELD_CASE);
    expect(caseShapeFor(null, true)).toEqual(HANDHELD_CASE);
  });

  it('falls back to 3×6 when a desktop pane is too narrow for six cells', () => {
    expect(caseShapeFor(CASE_NARROW_PANE_PX - 1, false)).toEqual(HANDHELD_CASE);
    expect(caseShapeFor(CASE_NARROW_PANE_PX, false)).toEqual(DESKTOP_CASE);
    // An unmeasured (0) container is not "narrow"; wait for the real width.
    expect(caseShapeFor(0, false)).toEqual(DESKTOP_CASE);
  });
});

describe('caseCellWidth / isTightCell', () => {
  it('splits the container into equal cells minus the gaps', () => {
    expect(caseCellWidth(334, 6, 3)).toBe(53);
    expect(caseCellWidth(348, 4, 3)).toBe(84);
    expect(caseCellWidth(null, 6)).toBeNull();
    expect(caseCellWidth(300, 0)).toBeNull();
  });

  it('flags narrow CR1 cells as tight (priority chip only)', () => {
    expect(isTightCell(53)).toBe(true);
    expect(isTightCell(84)).toBe(false);
    expect(isTightCell(null)).toBe(false);
  });

  it('is not tight at the default desktop (1440) and phone cell widths after the density pass', () => {
    expect(CASE_TIGHT_CELL_PX).toBe(80);
    expect(isTightCell(CASE_TIGHT_CELL_PX - 1)).toBe(true);
    expect(isTightCell(CASE_TIGHT_CELL_PX)).toBe(false);
    // 576px Loadout pane → 540px case → 87px cells; 390px phone → 338px case → 110px cells (3-wide).
    expect(caseCellWidth(540, 6)).toBe(87);
    expect(isTightCell(caseCellWidth(540, 6))).toBe(false);
    expect(caseCellWidth(338, 3)).toBe(110);
    expect(isTightCell(caseCellWidth(338, 3))).toBe(false);
    // Laptop (340px pane → 304px case) falls back to 3×6 with 99px cells — still not tight.
    expect(caseShapeFor(304, false)).toEqual(HANDHELD_CASE);
    expect(caseCellWidth(304, 3)).toBe(99);
    expect(isTightCell(caseCellWidth(304, 3))).toBe(false);
  });
});

describe('nextSlots', () => {
  it('continues numbering after the highest numeric slot', () => {
    expect(nextSlots(['1', '2', '3'], 2)).toEqual(['4', '5']);
    expect(nextSlots([], 1)).toEqual(['1']);
  });

  it('ignores legacy codes and blanks', () => {
    expect(nextSlots(['B1', 'M1', '', '4'], 1)).toEqual(['5']);
    expect(nextSlots(['B1', 'M1'], 2)).toEqual(['1', '2']);
  });

  it('returns nothing for a non-positive count', () => {
    expect(nextSlots(['1'], 0)).toEqual([]);
    expect(nextSlots(['1'], -2)).toEqual([]);
  });
});
