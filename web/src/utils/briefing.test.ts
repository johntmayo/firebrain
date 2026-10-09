import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  dateKeyOf,
  isBriefingDue,
  leftoversOf,
  missionCr,
  suggestLoad,
  todayKey,
} from './briefing';

function task(id: string, o: Partial<Task> = {}): Task {
  return {
    task_id: id,
    created_at: '2026-10-01T00:00:00.000Z',
    created_by: 'john@x.test',
    updated_at: '2026-10-01T00:00:00.000Z',
    updated_by: 'john@x.test',
    title: id,
    notes: '',
    priority: 'medium',
    challenge: 'medium',
    assignee: 'john@x.test',
    status: 'open',
    due_date: '',
    today_slot: '',
    today_set_at: '',
    completed_at: '',
    today_user: '',
    quest_id: '',
    ...o,
  };
}

const JOHN = 'john@x.test';
const STEF = 'stef@x.test';
const NOW = new Date(2026, 9, 9, 12, 0, 0);
const TODAY = '2026-10-09';

describe('todayKey', () => {
  it('formats a local calendar day as YYYY-MM-DD', () => {
    expect(todayKey(NOW)).toBe('2026-10-09');
    expect(todayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('pads month and day', () => {
    expect(todayKey(new Date(2026, 8, 2))).toBe('2026-09-02');
  });
});

describe('isBriefingDue', () => {
  it('is due when seen is missing', () => {
    expect(isBriefingDue(null, TODAY)).toBe(true);
    expect(isBriefingDue(undefined, TODAY)).toBe(true);
    expect(isBriefingDue('', TODAY)).toBe(true);
  });

  it('is due when seen is a different day', () => {
    expect(isBriefingDue('2026-10-08', TODAY)).toBe(true);
  });

  it('is not due when seen is today', () => {
    expect(isBriefingDue(TODAY, TODAY)).toBe(false);
  });
});

describe('dateKeyOf', () => {
  it('keeps YYYY-MM-DD as a calendar day', () => {
    expect(dateKeyOf('2026-10-08')).toBe('2026-10-08');
  });

  it('uses the local day of an ISO timestamp', () => {
    expect(dateKeyOf(NOW.toISOString())).toBe(TODAY);
  });

  it('is empty for blank or garbage', () => {
    expect(dateKeyOf('')).toBe('');
    expect(dateKeyOf('not a date')).toBe('');
  });
});

describe('missionCr', () => {
  it('maps challenge to cells; unset counts as 2', () => {
    expect(missionCr('low')).toBe(1);
    expect(missionCr('medium')).toBe(2);
    expect(missionCr('high')).toBe(3);
    expect(missionCr('')).toBe(2);
  });
});

describe('leftoversOf', () => {
  const leftover = task('harassment', {
    today_slot: '5',
    today_user: JOHN,
    today_set_at: '2026-10-08T18:00:00.000Z',
  });

  it('keeps open loaded missions of the viewer whose load day is before today', () => {
    expect(leftoversOf([leftover], JOHN, TODAY).map(t => t.task_id)).toEqual(['harassment']);
  });

  it('drops missions loaded today, other operators, unloaded, or closed', () => {
    const loadedToday = task('today', { today_slot: '1', today_user: JOHN, today_set_at: '2026-10-09T10:00:00.000Z' });
    const otherUser = task('stef', { today_slot: '2', today_user: STEF, today_set_at: '2026-10-08T10:00:00.000Z' });
    const unloaded = task('cache', { today_set_at: '2026-10-08T10:00:00.000Z' });
    const done = task('done', { status: 'done', today_slot: '3', today_user: JOHN, today_set_at: '2026-10-08T10:00:00.000Z' });
    const missingSetAt = task('noset', { today_slot: '4', today_user: JOHN, today_set_at: '' });
    expect(leftoversOf([loadedToday, otherUser, unloaded, done, missingSetAt], JOHN, TODAY)).toEqual([]);
  });
});

describe('suggestLoad', () => {
  it('orders overdue, then due-today, then P1 by due date', () => {
    const dueToday = task('due-today', { due_date: '2026-10-09', priority: 'low', challenge: 'low' });
    const overdueLate = task('overdue-1d', { due_date: '2026-10-08', priority: 'high', challenge: 'low' });
    const overdueEarlier = task('overdue-4d', { due_date: '2026-10-05', priority: 'medium', challenge: 'low' });
    const p1Soon = task('p1-soon', { due_date: '2026-10-12', priority: 'high', challenge: 'low' });
    const p1Later = task('p1-later', { due_date: '2026-10-20', priority: 'urgent', challenge: 'low' });
    const p2 = task('p2-ignored', { due_date: '2026-10-11', priority: 'medium', challenge: 'low' });

    const picked = suggestLoad(
      [p2, p1Later, dueToday, p1Soon, overdueLate, overdueEarlier],
      JOHN,
      10,
      NOW,
    );
    expect(picked.map(t => t.task_id)).toEqual([
      'overdue-4d',
      'overdue-1d',
      'due-today',
      'p1-soon',
      'p1-later',
    ]);
  });

  it('stops before a mission that would exceed remaining capacity', () => {
    const a = task('fits', { due_date: '2026-10-08', challenge: 'medium' }); // CR 2
    const b = task('too-big', { due_date: '2026-10-07', challenge: 'high' }); // CR 3, overdue earlier
    const c = task('would-fit-if-skipped', { due_date: '2026-10-06', challenge: 'low' }); // CR 1, overdue earliest

    // Order: c (CR1), b (CR3), a (CR2). Capacity 4 → take c (left 3), stop at b (3>3? 3==3 take? 3<=3 take).
    // capacity 3: take c (left 2), stop at b (3 > 2), do not skip to a.
    const picked = suggestLoad([a, b, c], JOHN, 3, NOW);
    expect(picked.map(t => t.task_id)).toEqual(['would-fit-if-skipped']);
  });

  it('fills while missions fit and includes one that lands exactly on capacity', () => {
    const a = task('cr1', { due_date: '2026-10-05', challenge: 'low' });
    const b = task('cr2', { due_date: '2026-10-06', challenge: 'medium' });
    const picked = suggestLoad([a, b], JOHN, 3, NOW);
    expect(picked.map(t => t.task_id)).toEqual(['cr1', 'cr2']);
  });

  it('ignores loaded missions, other operators, and closed missions', () => {
    const loaded = task('loaded', { due_date: '2026-10-01', today_slot: '1', today_user: JOHN });
    const stef = task('stef', { assignee: STEF, due_date: '2026-10-01', priority: 'high' });
    const done = task('done', { status: 'done', due_date: '2026-10-01', priority: 'high' });
    const open = task('open', { due_date: '2026-10-01', challenge: 'low' });
    expect(suggestLoad([loaded, stef, done, open], JOHN, 10, NOW).map(t => t.task_id)).toEqual(['open']);
  });

  it('returns nothing when there is no remaining capacity', () => {
    const open = task('open', { due_date: '2026-10-01', challenge: 'low' });
    expect(suggestLoad([open], JOHN, 0, NOW)).toEqual([]);
    expect(suggestLoad([open], JOHN, -2, NOW)).toEqual([]);
  });

  it('counts unset challenge as CR 2 when testing the capacity stop', () => {
    const unset = task('unset', { due_date: '2026-10-01', challenge: '' });
    const next = task('next', { due_date: '2026-10-02', challenge: 'low' });
    expect(suggestLoad([unset, next], JOHN, 2, NOW).map(t => t.task_id)).toEqual(['unset']);
    expect(suggestLoad([unset, next], JOHN, 1, NOW)).toEqual([]);
  });
});
