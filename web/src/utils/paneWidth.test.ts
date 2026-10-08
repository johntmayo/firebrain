import { describe, expect, it } from 'vitest';
import {
  TODAY_PANE_WIDTH,
  TODAY_PANE_WIDTH_KEY,
  clampPaneWidth,
  parseStoredPaneWidth,
  resizedPaneWidth,
} from './paneWidth';

const bounds = { min: 400, max: 900 };

describe('clampPaneWidth', () => {
  it('keeps in-range widths and rounds to whole pixels', () => {
    expect(clampPaneWidth(576, bounds)).toBe(576);
    expect(clampPaneWidth(576.6, bounds)).toBe(577);
  });

  it('clamps to the bounds', () => {
    expect(clampPaneWidth(10, bounds)).toBe(400);
    expect(clampPaneWidth(5000, bounds)).toBe(900);
  });

  it('snaps non-finite input to the minimum', () => {
    expect(clampPaneWidth(Number.NaN, bounds)).toBe(400);
    expect(clampPaneWidth(Number.POSITIVE_INFINITY, bounds)).toBe(400);
    expect(clampPaneWidth(Number.NEGATIVE_INFINITY, bounds)).toBe(400);
  });
});

describe('parseStoredPaneWidth', () => {
  it('returns null (keep the CSS default) when nothing usable is stored', () => {
    expect(parseStoredPaneWidth(null, bounds)).toBeNull();
    expect(parseStoredPaneWidth(undefined, bounds)).toBeNull();
    expect(parseStoredPaneWidth('', bounds)).toBeNull();
    expect(parseStoredPaneWidth('wide', bounds)).toBeNull();
    expect(parseStoredPaneWidth('0', bounds)).toBeNull();
    expect(parseStoredPaneWidth('-20', bounds)).toBeNull();
  });

  it('parses and clamps a stored number', () => {
    expect(parseStoredPaneWidth('620', bounds)).toBe(620);
    expect(parseStoredPaneWidth(' 620 ', bounds)).toBe(620);
    expect(parseStoredPaneWidth('120', bounds)).toBe(400);
    expect(parseStoredPaneWidth('2000', bounds)).toBe(900);
  });
});

describe('resizedPaneWidth', () => {
  it('applies the drag delta within the bounds', () => {
    expect(resizedPaneWidth(576, 120, bounds)).toBe(696);
    expect(resizedPaneWidth(576, -120, bounds)).toBe(456);
    expect(resizedPaneWidth(576, -500, bounds)).toBe(400);
    expect(resizedPaneWidth(576, 1000, bounds)).toBe(900);
  });
});

describe('Loadout pane constants', () => {
  it('bounds are sane and the storage key is the documented one', () => {
    expect(TODAY_PANE_WIDTH.min).toBeLessThan(TODAY_PANE_WIDTH.max);
    expect(TODAY_PANE_WIDTH.min).toBeGreaterThanOrEqual(360);
    expect(TODAY_PANE_WIDTH.max).toBeLessThanOrEqual(900);
    expect(TODAY_PANE_WIDTH_KEY).toBe('firebrain_today_panel_width');
  });
});
