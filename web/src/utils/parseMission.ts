import type { Challenge, CreateTaskInput, Priority } from '../types';

/**
 * One line of mission grammar, shared by Bulk import and the Quick add gadget:
 *
 *   Fix login bug -p1 ~high @tomorrow #bring the logs
 *   ^ title       ^ P    ^ CR  ^ due     ^ notes (rest of line)
 *
 *   -p1 / -p2 / -p3            priority (legacy -urgent/-high/-medium/-low accepted)
 *   ~low / ~medium / ~high     CR (energy cost: 1 / 2 / 3 cells)
 *   @today / @tomorrow / @nextweek / @YYYY-MM-DD / @MM/DD/YY
 *   #text                      notes — everything after the first `# `
 *
 * Tokens may appear in any order; whatever is left is the title.
 */

export interface ParsedMission extends Omit<CreateTaskInput, 'priority'> {
  priority: Priority;
  challenge?: Challenge;
  originalText: string;
}

export interface ParseMissionOptions {
  /** "Now" for relative dates — injectable for tests. Defaults to the wall clock. */
  now?: Date;
}

const PRIORITY_TOKENS: Record<string, Priority> = {
  p1: 'high', p2: 'medium', p3: 'low',
  urgent: 'high', high: 'high', medium: 'medium', low: 'low',
};

/** Local calendar day as YYYY-MM-DD (no UTC shift around midnight). */
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function plusDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Resolve an `@` token to YYYY-MM-DD, or '' when it isn't a date we understand. */
export function resolveDueToken(raw: string, now: Date): string {
  const value = raw.toLowerCase();
  if (value === 'today') return toLocalYmd(now);
  if (value === 'tomorrow') return toLocalYmd(plusDays(now, 1));
  if (value === 'nextweek' || value === 'next-week') return toLocalYmd(plusDays(now, 7));

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? '' : toLocalYmd(d);
  }

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let [, month, day, year] = slash;
    if (year.length === 2) year = '20' + year;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(d.getTime()) ? '' : toLocalYmd(d);
  }

  // Anything else that Date can parse and that contains a digit (e.g. "Oct 21 2026").
  if (/\d/.test(value)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return toLocalYmd(d);
  }
  return '';
}

export function parseMissionLine(line: string, opts: ParseMissionOptions = {}): ParsedMission {
  const now = opts.now ?? new Date();
  let title = line;
  let priority: Priority = 'medium';
  let challenge: Challenge | undefined;
  let due_date = '';
  let notes = '';

  // Notes — everything after the first `#` that starts a token.
  const notesMatch = title.match(/(?:^|\s)#\s*(.+)$/);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    title = title.slice(0, notesMatch.index).trim();
  }

  const priorityMatch = title.match(/(?:^|\s)-\s*(p[123]|urgent|high|medium|low)\b/i);
  if (priorityMatch) {
    priority = PRIORITY_TOKENS[priorityMatch[1].toLowerCase()];
    title = title.replace(priorityMatch[0], ' ').trim();
  }

  const challengeMatch = title.match(/(?:^|\s)~\s*(low|medium|high)\b/i);
  if (challengeMatch) {
    challenge = challengeMatch[1].toLowerCase() as Challenge;
    title = title.replace(challengeMatch[0], ' ').trim();
  }

  const dateMatch = title.match(/(?:^|\s)@\s*([\w/.-]+)/);
  if (dateMatch) {
    due_date = resolveDueToken(dateMatch[1], now);
    title = title.replace(dateMatch[0], ' ').trim();
  }

  title = title.replace(/\s{2,}/g, ' ').trim();

  return {
    title,
    priority,
    challenge,
    due_date: due_date || undefined,
    notes: notes || undefined,
    originalText: line,
  };
}

/** Split a multi-line paste into missions, dropping blank lines and lines with no title. */
export function parseMissionLines(text: string, opts: ParseMissionOptions = {}): ParsedMission[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => parseMissionLine(l, opts))
    .filter(t => t.title);
}
