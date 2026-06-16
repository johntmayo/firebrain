/**
 * Priority is a P1/P2/P3 system mapped onto stored values:
 *   P1 = 'high', P2 = 'medium', P3 = 'low'.
 * 'urgent' is a legacy stored value and is treated as P1 everywhere in the UI.
 */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type PriorityLevel = 1 | 2 | 3;
export type Challenge = 'low' | 'medium' | 'high';

export function getPriorityLevel(priority: Priority): PriorityLevel {
  if (priority === 'urgent' || priority === 'high') return 1;
  if (priority === 'medium') return 2;
  return 3;
}

export const PRIORITY_BY_LEVEL: Record<PriorityLevel, Priority> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};

/** Collapse legacy 'urgent' into 'high' (P1) */
export function normalizePriority(priority: Priority): Priority {
  return priority === 'urgent' ? 'high' : priority;
}
export type Status = 'open' | 'done' | 'archived' | 'canceled';
export type TodaySlot = string;

/** Loadout energy level: light=7, medium=10, heavy=12 points */
export type EnergyLevel = 'light' | 'medium' | 'heavy';

/** Challenge points per mission (used for daily bandwidth feedback) */
export const CHALLENGE_POINTS: Record<Challenge, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export const ENERGY_POINTS_LIMIT: Record<EnergyLevel, number> = {
  light: 7,
  medium: 10,
  heavy: 12,
};

export interface LoadoutConfig {
  energy_level: EnergyLevel;
  points_used: number;
  points_limit: number;
}

// Mission (formerly Task) - things that can be added to daily loadout
export interface Task {
  task_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  title: string;
  notes: string;
  priority: Priority;
  challenge: Challenge | '';
  assignee: string;
  status: Status;
  due_date: string;
  today_slot: TodaySlot | '';
  today_set_at: string;
  completed_at: string;
  today_user: string;
  quest_id: string; // when set, mission is nested in this quest and uses quest color
}

// Alias for clarity - Task is now Mission
export type Mission = Task;

export interface CreateTaskInput {
  title: string;
  notes?: string;
  priority?: Priority;
  challenge?: Challenge;
  assignee?: string;
  due_date?: string;
  quest_id?: string;
}

export interface UpdateTaskInput {
  task_id: string;
  title?: string;
  notes?: string;
  priority?: Priority;
  challenge?: Challenge;
  assignee?: string;
  status?: Status;
  due_date?: string;
  quest_id?: string;
}

// Quest - longer-term abstract goals that can be tracked
export interface Quest {
  quest_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  title: string;
  notes: string;
  is_tracked: boolean;
  tracked_at: string;
  assignee: string;
  leader_email: string;
  status: Status;
  completed_at: string;
  color: string; // hex or preset id; missions in this quest use this color
  sort_order: number | ''; // manual ordering on the Quests board; '' = unordered (sorts last)
}

/** Sort quests by manual sort_order; quests without one keep their relative order at the end. */
export function compareQuestSortOrder(a: Quest, b: Quest): number {
  const aOrder = typeof a.sort_order === 'number' && a.sort_order > 0 ? a.sort_order : Number.MAX_SAFE_INTEGER;
  const bOrder = typeof b.sort_order === 'number' && b.sort_order > 0 ? b.sort_order : Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder;
}

export interface CreateQuestInput {
  title: string;
  notes?: string;
  assignee?: string;
  leader_email?: string;
  color?: string;
}

export interface UpdateQuestInput {
  quest_id: string;
  title?: string;
  notes?: string;
  assignee?: string;
  leader_email?: string;
  status?: Status;
  color?: string;
}

export type QuestCompletionMode = 'detach_open' | 'cascade_done';

export interface AssignTodayInput {
  task_id: string;
  today_slot?: TodaySlot;
  swap_with_task_id?: string;
}

export type SortBy = 'priority' | 'challenge' | 'due_date' | 'quest';
export type AssigneeFilter = 'john' | 'steph' | 'megan' | 'all';
export type ViewMode = 'list' | 'buckets' | 'matrix';

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const CHALLENGE_ORDER: Record<Challenge, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

