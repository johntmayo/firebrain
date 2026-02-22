export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Challenge = 'low' | 'medium' | 'high';
export type Status = 'open' | 'done' | 'archived';
export type TodaySlot = 'B1' | 'M1' | 'M2' | 'M3' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

/** Loadout energy level: light=7, medium=10, heavy=12 points */
export type EnergyLevel = 'light' | 'medium' | 'heavy';

/** Point cost per slot for energy-based loadout limits */
export const SLOT_POINTS: Record<TodaySlot, number> = {
  B1: 3, M1: 2, M2: 2, M3: 2, S1: 1, S2: 1, S3: 1, S4: 1, S5: 1,
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
  status: Status;
  completed_at: string;
  color: string; // hex or preset id; missions in this quest use this color
}

export interface CreateQuestInput {
  title: string;
  notes?: string;
  assignee?: string;
  color?: string;
}

export interface UpdateQuestInput {
  quest_id: string;
  title?: string;
  notes?: string;
  assignee?: string;
  status?: Status;
  color?: string;
}

export interface AssignTodayInput {
  task_id: string;
  today_slot: TodaySlot;
  swap_with_task_id?: string;
}

export type SortBy = 'priority' | 'challenge' | 'due_date' | 'quest';
export type AssigneeFilter = 'john' | 'steph' | 'megan' | 'all';
export type ViewMode = 'list' | 'buckets';

export const SLOT_CONFIG = {
  B1: { label: 'Big', size: 'big' as const },
  M1: { label: 'Medium 1', size: 'medium' as const },
  M2: { label: 'Medium 2', size: 'medium' as const },
  M3: { label: 'Medium 3', size: 'medium' as const },
  S1: { label: 'Small 1', size: 'small' as const },
  S2: { label: 'Small 2', size: 'small' as const },
  S3: { label: 'Small 3', size: 'small' as const },
  S4: { label: 'Small 4', size: 'small' as const },
  S5: { label: 'Small 5', size: 'small' as const },
} as const;

export const ALL_SLOTS: TodaySlot[] = ['B1', 'M1', 'M2', 'M3', 'S1', 'S2', 'S3', 'S4', 'S5'];

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

