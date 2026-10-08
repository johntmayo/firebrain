export type DueDateTier = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'later' | 'none';

export interface DueDateStatus {
  tier: DueDateTier;
  /** Short relative label for the stat row ("2d late", "Today", "Fri", "Oct 21"). */
  label: string;
  /** Exact date for tooltips ("Tue, Oct 21, 2026"). */
  exact: string;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parse YYYY-MM-DD (or any Date-parsable string) as a local calendar day. */
export function parseDueDate(dueDateStr: string): Date | null {
  if (!dueDateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDateStr);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dueDateStr);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function isOverdueDate(dueDateStr: string, now = new Date()): boolean {
  const due = parseDueDate(dueDateStr);
  if (!due) return false;
  return due.getTime() < startOfDay(now).getTime();
}

export function getDueDateStatus(dueDateStr: string, now = new Date()): DueDateStatus {
  const dueDay = parseDueDate(dueDateStr);
  if (!dueDay) return { tier: 'none', label: '', exact: '' };

  const today = startOfDay(now);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  const exact = dueDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (diffDays < 0) {
    const late = Math.abs(diffDays);
    return { tier: 'overdue', label: `${late}d late`, exact };
  }
  if (diffDays === 0) return { tier: 'today', label: 'Today', exact };
  if (diffDays === 1) return { tier: 'tomorrow', label: 'Tmrw', exact };
  if (diffDays <= 7) {
    return { tier: 'this-week', label: dueDay.toLocaleDateString('en-US', { weekday: 'short' }), exact };
  }
  return { tier: 'later', label: dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), exact };
}
