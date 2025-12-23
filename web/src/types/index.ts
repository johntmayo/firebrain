export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'open' | 'done' | 'archived';
export type TodaySlot = 'B1' | 'M1' | 'M2' | 'M3' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export interface Task {
  task_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  title: string;
  notes: string;
  priority: Priority;
  assignee: string;
  status: Status;
  due_date: string;
  today_slot: TodaySlot | '';
  today_set_at: string;
  completed_at: string;
  today_user: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  priority?: Priority;
  assignee?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  task_id: string;
  title?: string;
  notes?: string;
  priority?: Priority;
  assignee?: string;
  status?: Status;
  due_date?: string;
}

export interface AssignTodayInput {
  task_id: string;
  today_slot: TodaySlot;
  swap_with_task_id?: string;
}

export type AssigneeFilter = 'john' | 'steph' | 'all';
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

