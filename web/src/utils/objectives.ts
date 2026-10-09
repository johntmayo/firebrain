/**
 * Objectives live in a mission's `notes` as markdown checklist lines.
 * Parse is tolerant (`* [ ]`, `[X]`, trailing spaces); rewrite is surgical:
 * `toggleObjective` changes only the checkbox character of one line.
 */

export interface Objective {
  /** Whether the box is ticked (`[x]` / `[X]`). */
  checked: boolean;
  /** Line text after the box, trimmed for display. */
  text: string;
  /** Original line, including marker, box, and trailing spaces. */
  raw: string;
}

export interface ParsedObjectives {
  /** Bytes before the first objective line (empty when notes start with one). */
  leading: string;
  objectives: Objective[];
  /** Bytes after the last objective line (empty when notes end on one). */
  trailing: string;
}

export interface ObjectiveCount {
  checked: number;
  total: number;
}

/** `- [ ]`, `- [x]`, `* [X]`, optional indent / trailing spaces. `[^\n]*` keeps `\r`. */
const OBJECTIVE_RE = /^([ \t]*)([-*])([ \t]+)\[([ xX])\]([^\n]*)$/;

export function isObjectiveLine(line: string): boolean {
  return OBJECTIVE_RE.test(line);
}

function parseObjectiveLine(raw: string): Objective | null {
  const m = raw.match(OBJECTIVE_RE);
  if (!m) return null;
  return {
    checked: m[4] !== ' ',
    text: m[5].replace(/^[ \t]+/, '').replace(/[ \t\r]+$/, ''),
    raw,
  };
}

/**
 * Split notes into leading free text, objective lines, and trailing free text.
 * Interstitial free text between objectives is kept by `toggleObjective`
 * (it rewrites the original string) and is not moved into leading/trailing.
 */
export function parseObjectives(notes: string): ParsedObjectives {
  if (!notes) return { leading: '', objectives: [], trailing: '' };

  const lines = notes.split('\n');
  const objectives: Objective[] = [];
  let first = -1;
  let last = -1;

  for (let i = 0; i < lines.length; i++) {
    const obj = parseObjectiveLine(lines[i]);
    if (!obj) continue;
    if (first < 0) first = i;
    last = i;
    objectives.push(obj);
  }

  if (first < 0) return { leading: notes, objectives: [], trailing: '' };

  const leading = first > 0 ? `${lines.slice(0, first).join('\n')}\n` : '';
  const trailing = last < lines.length - 1 ? `\n${lines.slice(last + 1).join('\n')}` : '';
  return { leading, objectives, trailing };
}

export function countObjectives(notes: string): ObjectiveCount {
  const { objectives } = parseObjectives(notes);
  return {
    checked: objectives.filter(o => o.checked).length,
    total: objectives.length,
  };
}

/** Honest `n/m` label, or '' when there are no objectives. */
export function formatObjectiveCount(notes: string): string {
  const { checked, total } = countObjectives(notes);
  return total === 0 ? '' : `${checked}/${total} objectives`;
}

/**
 * Toggle objective `index` (0-based among objectives). Out-of-range returns
 * the original string. Only the `[ ]` / `[x]` character on that line changes.
 */
export function toggleObjective(notes: string, index: number): string {
  const lines = notes.split('\n');
  let seen = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OBJECTIVE_RE);
    if (!m) continue;
    seen += 1;
    if (seen !== index) continue;
    const nextChecked = m[4] === ' ';
    const box = nextChecked ? 'x' : ' ';
    lines[i] = `${m[1]}${m[2]}${m[3]}[${box}]${m[5]}`;
    return lines.join('\n');
  }

  return notes;
}

/**
 * Append a blank unchecked objective. Existing notes stay byte-identical
 * except for a separating newline (when needed) and the new line.
 */
export function appendObjective(notes: string, text = ''): string {
  const line = `- [ ] ${text}`;
  if (!notes) return line;
  return notes.endsWith('\n') ? notes + line : `${notes}\n${line}`;
}

/**
 * Tooltip excerpt: free-text lines only (checklist syntax stripped). When
 * any objectives exist, append an honest `n/m objectives` line instead of
 * the raw `- [ ]` rows.
 */
export function notesExcerpt(notes: string, maxLen = 160): string {
  if (!notes) return '';
  const free = notes
    .split('\n')
    .filter(line => !isObjectiveLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const clipped = free.length > maxLen ? `${free.slice(0, maxLen)}…` : free;
  const count = formatObjectiveCount(notes);
  if (!count) return clipped;
  return clipped ? `${clipped}\n${count}` : count;
}
