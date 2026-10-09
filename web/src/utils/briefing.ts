import { CHALLENGE_POINTS, getPriorityLevel, type Task } from '../types';

/** localStorage key: YYYY-MM-DD of the last time this device dismissed the briefing. */
export const BRIEFING_SEEN_KEY = 'firebrain_briefing_seen';

/** Local calendar day as `YYYY-MM-DD`. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True when this device has not dismissed the briefing today. */
export function isBriefingDue(seen: string | null | undefined, key: string): boolean {
  return !seen || seen !== key;
}

/**
 * Calendar day of a YYYY-MM-DD string or ISO timestamp.
 * Date-only values are local calendar days (no UTC shift). Timestamps use
 * the device's local day so "loaded yesterday" matches the operator's clock.
 */
export function dateKeyOf(value: string): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : todayKey(d);
  }
  if (!value.includes('T')) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? `${m[1]}-${m[2]}-${m[3]}` : todayKey(d);
}

/** CR cost of a mission. Unset challenge counts as 2, same as the Case. */
export function missionCr(challenge: Task['challenge']): number {
  if (challenge === 'low') return CHALLENGE_POINTS.low;
  if (challenge === 'high') return CHALLENGE_POINTS.high;
  return CHALLENGE_POINTS.medium;
}

export function readBriefingSeen(): string {
  try {
    return localStorage.getItem(BRIEFING_SEEN_KEY) || '';
  } catch {
    return '';
  }
}

export function writeBriefingSeen(key = todayKey()): void {
  try {
    localStorage.setItem(BRIEFING_SEEN_KEY, key);
  } catch {
    /* private mode / storage blocked */
  }
}

/**
 * Open missions still in the viewer's Case whose load day is before today.
 * `today_slot` + `today_user` mark "loaded"; `today_set_at` is the load day.
 */
export function leftoversOf(tasks: readonly Task[], viewer: string, key: string): Task[] {
  return tasks.filter(t => (
    t.status === 'open'
    && Boolean(t.today_slot)
    && t.today_user === viewer
    && Boolean(dateKeyOf(t.today_set_at))
    && dateKeyOf(t.today_set_at) < key
  ));
}

function dueDay(task: Task): string {
  return dateKeyOf(task.due_date);
}

function dueSortValue(task: Task): number {
  const due = dueDay(task);
  if (!due) return Number.MAX_SAFE_INTEGER;
  const [y, mo, d] = due.split('-').map(Number);
  return Date.UTC(y, mo - 1, d);
}

/** 0 overdue · 1 due today · 2 other P1 · 3 everything else (not suggested). */
function suggestionRank(task: Task, key: string): number {
  const due = dueDay(task);
  if (due && due < key) return 0;
  if (due === key) return 1;
  if (getPriorityLevel(task.priority) === 1) return 2;
  return 3;
}

/**
 * Open, unloaded missions of `viewer`, overdue / due-today first, then P1
 * by due date. Fills sequentially up to `capacityLeft` (sum of CR) and
 * stops before a mission that would exceed — overload is not suggested.
 */
export function suggestLoad(
  tasks: readonly Task[],
  viewer: string,
  capacityLeft: number,
  now = new Date(),
): Task[] {
  if (capacityLeft <= 0) return [];
  const key = todayKey(now);
  const ranked = tasks
    .filter(t => t.status === 'open' && !t.today_slot && t.assignee === viewer)
    .map(t => ({ t, rank: suggestionRank(t, key) }))
    .filter(x => x.rank < 3)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const ad = dueSortValue(a.t);
      const bd = dueSortValue(b.t);
      if (ad !== bd) return ad - bd;
      return a.t.title.localeCompare(b.t.title);
    });

  const picked: Task[] = [];
  let left = capacityLeft;
  for (const { t } of ranked) {
    const cr = missionCr(t.challenge);
    if (cr > left) break;
    picked.push(t);
    left -= cr;
  }
  return picked;
}
