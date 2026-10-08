import { describe, expect, it } from 'vitest';
import { parseMissionLine, parseMissionLines, resolveDueToken } from './parseMission';

// Wednesday 2026-10-07, late evening local time (would cross midnight in UTC+).
const NOW = new Date(2026, 9, 7, 23, 30);
const opts = { now: NOW };

describe('parseMissionLine — plain title', () => {
  it('defaults to P2, no CR, no due, no notes', () => {
    expect(parseMissionLine('Call dentist', opts)).toEqual({
      title: 'Call dentist',
      priority: 'medium',
      challenge: undefined,
      due_date: undefined,
      notes: undefined,
      originalText: 'Call dentist',
    });
  });
  it('collapses whitespace left behind by removed tokens', () => {
    expect(parseMissionLine('Fix   login   bug  -p1   ~high', opts).title).toBe('Fix login bug');
  });
});

describe('priority', () => {
  it('maps -p1/-p2/-p3 onto high/medium/low', () => {
    expect(parseMissionLine('A -p1', opts).priority).toBe('high');
    expect(parseMissionLine('A -p2', opts).priority).toBe('medium');
    expect(parseMissionLine('A -p3', opts).priority).toBe('low');
  });
  it('accepts legacy word tokens, case-insensitively', () => {
    expect(parseMissionLine('A -urgent', opts).priority).toBe('high');
    expect(parseMissionLine('A -High', opts).priority).toBe('high');
    expect(parseMissionLine('A -low', opts).priority).toBe('low');
  });
  it('does not eat hyphenated words in the title', () => {
    const p = parseMissionLine('Re-plan low-key offsite -p3', opts);
    expect(p.title).toBe('Re-plan low-key offsite');
    expect(p.priority).toBe('low');
  });
});

describe('challenge (CR)', () => {
  it('maps ~low/~medium/~high', () => {
    expect(parseMissionLine('A ~low', opts).challenge).toBe('low');
    expect(parseMissionLine('A ~Medium', opts).challenge).toBe('medium');
    expect(parseMissionLine('A ~HIGH', opts).challenge).toBe('high');
  });
  it('leaves challenge undefined when absent', () => {
    expect(parseMissionLine('A', opts).challenge).toBeUndefined();
  });
});

describe('due date', () => {
  it('resolves @today/@tomorrow/@nextweek as local calendar days', () => {
    expect(parseMissionLine('A @today', opts).due_date).toBe('2026-10-07');
    expect(parseMissionLine('A @tomorrow', opts).due_date).toBe('2026-10-08');
    expect(parseMissionLine('A @nextweek', opts).due_date).toBe('2026-10-14');
    expect(parseMissionLine('A @next-week', opts).due_date).toBe('2026-10-14');
  });
  it('accepts @YYYY-MM-DD and @MM/DD/YY', () => {
    expect(parseMissionLine('A @2026-12-24', opts).due_date).toBe('2026-12-24');
    expect(parseMissionLine('A @5/20/26', opts).due_date).toBe('2026-05-20');
    expect(parseMissionLine('A @05/20/2026', opts).due_date).toBe('2026-05-20');
  });
  it('rolls over month ends correctly', () => {
    expect(resolveDueToken('tomorrow', new Date(2026, 0, 31, 9))).toBe('2026-02-01');
  });
  it('drops an unparseable @token but still strips it from the title', () => {
    const p = parseMissionLine('Email @someone', opts);
    expect(p.due_date).toBeUndefined();
    expect(p.title).toBe('Email');
  });
});

describe('notes', () => {
  it('takes everything after # as notes', () => {
    const p = parseMissionLine('Call dentist #bring insurance card -p1', opts);
    expect(p.title).toBe('Call dentist');
    expect(p.notes).toBe('bring insurance card -p1');
    expect(p.priority).toBe('medium');
  });
  it('does not treat an in-word # as a note marker', () => {
    expect(parseMissionLine('Fix bug#123', opts)).toMatchObject({ title: 'Fix bug#123', notes: undefined });
  });
});

describe('full grammar', () => {
  it('parses every token in any order', () => {
    expect(parseMissionLine('Fix login bug -p1 ~high @tomorrow #notes here', opts)).toEqual({
      title: 'Fix login bug',
      priority: 'high',
      challenge: 'high',
      due_date: '2026-10-08',
      notes: 'notes here',
      originalText: 'Fix login bug -p1 ~high @tomorrow #notes here',
    });
    expect(parseMissionLine('@today ~low -p3 Water plants', opts)).toMatchObject({
      title: 'Water plants', priority: 'low', challenge: 'low', due_date: '2026-10-07',
    });
  });
  it('a line of tokens only has an empty title', () => {
    expect(parseMissionLine('-p1 ~high @today', opts).title).toBe('');
  });
});

describe('parseMissionLines', () => {
  it('splits on newlines, trims, and drops blank or title-less lines', () => {
    const list = parseMissionLines('  One -p1\n\n   \nTwo ~low\n-p2\n', opts);
    expect(list.map(m => m.title)).toEqual(['One', 'Two']);
  });
});
