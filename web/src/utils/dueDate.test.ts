import { describe, expect, it } from 'vitest';
import { getDueDateStatus, isOverdueDate, parseDueDate } from './dueDate';

// A fixed "now": Wednesday 2026-10-07, mid-day local time.
const NOW = new Date(2026, 9, 7, 12, 30);

describe('parseDueDate', () => {
  it('parses YYYY-MM-DD as a local calendar day (no UTC shift)', () => {
    const d = parseDueDate('2026-10-07')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 7]);
    expect(d.getHours()).toBe(0);
  });

  it('returns null for empty or garbage input', () => {
    expect(parseDueDate('')).toBeNull();
    expect(parseDueDate('not a date')).toBeNull();
  });

  it('accepts ISO timestamps and strips the time', () => {
    const d = parseDueDate('2026-10-07T23:59:00')!;
    expect(d.getDate()).toBe(7);
    expect(d.getHours()).toBe(0);
  });
});

describe('isOverdueDate', () => {
  it('is overdue only strictly before today', () => {
    expect(isOverdueDate('2026-10-06', NOW)).toBe(true);
    expect(isOverdueDate('2026-10-07', NOW)).toBe(false);
    expect(isOverdueDate('2026-10-08', NOW)).toBe(false);
    expect(isOverdueDate('', NOW)).toBe(false);
  });
});

describe('getDueDateStatus', () => {
  it('labels overdue in days late', () => {
    expect(getDueDateStatus('2026-10-03', NOW)).toMatchObject({ tier: 'overdue', label: '4d late' });
  });
  it('labels today / tomorrow', () => {
    expect(getDueDateStatus('2026-10-07', NOW)).toMatchObject({ tier: 'today', label: 'Today' });
    expect(getDueDateStatus('2026-10-08', NOW)).toMatchObject({ tier: 'tomorrow', label: 'Tmrw' });
  });
  it('uses the weekday within a week and Mon D beyond', () => {
    expect(getDueDateStatus('2026-10-10', NOW)).toMatchObject({ tier: 'this-week', label: 'Sat' });
    expect(getDueDateStatus('2026-10-21', NOW)).toMatchObject({ tier: 'later', label: 'Oct 21' });
  });
  it('always carries an exact date for the tooltip', () => {
    expect(getDueDateStatus('2026-10-21', NOW).exact).toMatch(/Oct 21, 2026/);
  });
  it('is empty for no due date', () => {
    expect(getDueDateStatus('', NOW)).toEqual({ tier: 'none', label: '', exact: '' });
  });
});
