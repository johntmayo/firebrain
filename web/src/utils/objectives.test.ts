import { describe, expect, it } from 'vitest';
import {
  appendObjective,
  countObjectives,
  formatObjectiveCount,
  notesExcerpt,
  parseObjectives,
  toggleObjective,
} from './objectives';

describe('parseObjectives', () => {
  it('returns empty parts when notes are empty', () => {
    expect(parseObjectives('')).toEqual({ leading: '', objectives: [], trailing: '' });
  });

  it('treats notes with no objectives as leading free text', () => {
    const notes = 'Just a thought.\nAnother line.';
    expect(parseObjectives(notes)).toEqual({
      leading: notes,
      objectives: [],
      trailing: '',
    });
  });

  it('splits leading / objectives / trailing and keeps surrounding bytes', () => {
    const notes = 'Agenda still in draft.\n- [ ] Book the room\n- [x] Send invites\nConfirm with Stef.';
    const parsed = parseObjectives(notes);
    expect(parsed.leading).toBe('Agenda still in draft.\n');
    expect(parsed.trailing).toBe('\nConfirm with Stef.');
    expect(parsed.objectives).toEqual([
      { checked: false, text: 'Book the room', raw: '- [ ] Book the room' },
      { checked: true, text: 'Send invites', raw: '- [x] Send invites' },
    ]);
  });

  it('tolerates * markers, [X], and trailing spaces', () => {
    const notes = '* [ ] star  \n- [X] done\t';
    const parsed = parseObjectives(notes);
    expect(parsed.objectives).toHaveLength(2);
    expect(parsed.objectives[0]).toEqual({ checked: false, text: 'star', raw: '* [ ] star  ' });
    expect(parsed.objectives[1]).toEqual({ checked: true, text: 'done', raw: '- [X] done\t' });
  });

  it('does not treat lookalikes as objectives', () => {
    const notes = '- [] missing space\n- [x ] extra\nnot a list\n- todo';
    expect(parseObjectives(notes).objectives).toEqual([]);
    expect(parseObjectives(notes).leading).toBe(notes);
  });
});

describe('toggleObjective — surgical rewrite', () => {
  const mixed = 'Lead\n- [ ] open  \n* [X] upper\n- [x] lower\nTrail';

  it('checks an open box and leaves every other byte identical', () => {
    const next = toggleObjective(mixed, 0);
    expect(next).toBe('Lead\n- [x] open  \n* [X] upper\n- [x] lower\nTrail');
    expect(next.slice(0, 5)).toBe(mixed.slice(0, 5));
    expect(next.slice(17)).toBe(mixed.slice(17));
  });

  it('unchecks [X] and [x] without touching the marker or trailing spaces', () => {
    expect(toggleObjective(mixed, 1)).toBe('Lead\n- [ ] open  \n* [ ] upper\n- [x] lower\nTrail');
    expect(toggleObjective(mixed, 2)).toBe('Lead\n- [ ] open  \n* [X] upper\n- [ ] lower\nTrail');
  });

  it('round-trips check then uncheck to the original bytes', () => {
    const notes = 'Keep me\n- [ ] one\n- [ ] two  \n* [ ] three\nAfter';
    const checked = toggleObjective(notes, 1);
    expect(checked).toBe('Keep me\n- [ ] one\n- [x] two  \n* [ ] three\nAfter');
    expect(toggleObjective(checked, 1)).toBe(notes);
  });

  it('returns the original string for out-of-range indexes', () => {
    const notes = '- [ ] only';
    expect(toggleObjective(notes, -1)).toBe(notes);
    expect(toggleObjective(notes, 1)).toBe(notes);
    expect(toggleObjective('no boxes here', 0)).toBe('no boxes here');
  });

  it('preserves CRLF bytes around an untouched line', () => {
    const notes = 'Lead\r\n- [ ] a\r\nTrail\r';
    const next = toggleObjective(notes, 0);
    expect(next).toBe('Lead\r\n- [x] a\r\nTrail\r');
    expect(toggleObjective(next, 0)).toBe(notes);
  });
});

describe('countObjectives', () => {
  it('is honest: checked / total from notes, never invented', () => {
    expect(countObjectives('')).toEqual({ checked: 0, total: 0 });
    expect(countObjectives('plain notes')).toEqual({ checked: 0, total: 0 });
    expect(countObjectives('- [ ] a\n- [x] b\n- [X] c')).toEqual({ checked: 2, total: 3 });
    expect(formatObjectiveCount('- [ ] a\n- [x] b')).toBe('1/2 objectives');
    expect(formatObjectiveCount('plain')).toBe('');
  });
});

describe('appendObjective', () => {
  it('keeps existing notes byte-identical except the append', () => {
    const notes = 'Keep me\n- [ ] existing';
    const next = appendObjective(notes);
    expect(next.startsWith(notes)).toBe(true);
    expect(next).toBe(`${notes}\n- [ ] `);
  });

  it('does not add a second newline when notes already end with one', () => {
    expect(appendObjective('Done.\n', 'next')).toBe('Done.\n- [ ] next');
    expect(appendObjective('', 'first')).toBe('- [ ] first');
  });
});

describe('notesExcerpt', () => {
  it('strips checklist syntax and shows n/m objectives instead', () => {
    const notes = 'Agenda still in draft.\n- [ ] Book the room\n- [x] Send invites\nConfirm with Stef.';
    expect(notesExcerpt(notes)).toBe('Agenda still in draft.\nConfirm with Stef.\n1/2 objectives');
  });

  it('is just the count when notes are only objectives', () => {
    expect(notesExcerpt('- [ ] a\n- [ ] b\n- [ ] c')).toBe('0/3 objectives');
  });

  it('leaves plain notes as an excerpt (truncated at maxLen)', () => {
    expect(notesExcerpt('Bring insurance card')).toBe('Bring insurance card');
    expect(notesExcerpt('x'.repeat(200), 160)).toBe(`${'x'.repeat(160)}…`);
  });
});
