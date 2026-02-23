import type { Task, CreateTaskInput, UpdateTaskInput, AssignTodayInput, Quest, CreateQuestInput, UpdateQuestInput, LoadoutConfig, EnergyLevel } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SESSION_TOKEN_KEY = 'firebrain_session_token';

// Current user email - will be set by the app
let currentUserEmail = '';

export function setCurrentUserEmail(email: string) {
  currentUserEmail = email;
}

// Get session token from localStorage
export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

// Set session token in localStorage
export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

// Clear session token
export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getSessionToken();
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  task?: Task;
  tasks?: Task[];
  quest?: Quest;
  quests?: Quest[];
  swapped_task?: Task;
  total?: number;
  success_count?: number;
  error_count?: number;
  results?: any[];
  token?: string;
  userEmail?: string;
  expiresAt?: number;
  energy_level?: EnergyLevel;
  points_used?: number;
  points_limit?: number;
}

function toLegacyTodaySlot(slot: string): string | null {
  const trimmed = (slot || '').trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;

  const slotMap: Record<number, string> = {
    1: 'B1',
    2: 'M1',
    3: 'M2',
    4: 'M3',
    5: 'S1',
    6: 'S2',
    7: 'S3',
    8: 'S4',
    9: 'S5',
  };

  return slotMap[numeric] || null;
}

export interface BulkImportResult {
  index: number;
  success: boolean;
  task?: Task;
  error?: string;
}

export interface BulkImportResponse {
  total: number;
  success_count: number;
  error_count: number;
  results: BulkImportResult[];
}

async function apiCall<T>(action: string, body?: object): Promise<T> {
  const token = getSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', token);
  // Note: userEmail is no longer sent - backend gets it from the session token
  
  const requestBody = body ? { ...body, token: token } : undefined;
  
  const response = await fetch(url.toString(), {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'text/plain' } : {},
    body: body ? JSON.stringify(requestBody) : undefined,
  });
  
  const data = await response.json();
  
  if (data.error) {
    // Google Apps Script always returns HTTP 200 after redirect,
    // so check the error message for auth failures instead of status code
    const errorStr = String(data.error).toLowerCase();
    if (response.status === 401 || errorStr.includes('unauthorized') || errorStr.includes('invalid or expired session')) {
      clearSessionToken();
    }
    throw new Error(data.error);
  }

  return data;
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; userEmail: string; expiresAt: number }> {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', 'login');
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    const data: ApiResponse<{ token: string; userEmail: string; expiresAt: number }> = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return { token: data.token!, userEmail: data.userEmail!, expiresAt: data.expiresAt! };
  },
  
  async getTasks(status?: string, assignee?: string): Promise<Task[]> {
    const token = getSessionToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', 'getTasks');
    url.searchParams.set('token', token);
    // Note: userEmail is no longer sent - backend gets it from the session token
    if (status) url.searchParams.set('status', status);
    if (assignee) url.searchParams.set('assignee', assignee);
    
    const response = await fetch(url.toString());
    
    const data: ApiResponse<Task[]> = await response.json();
    
    if (data.error) {
      const errorStr = String(data.error).toLowerCase();
      if (response.status === 401 || errorStr.includes('unauthorized') || errorStr.includes('invalid or expired session')) {
        clearSessionToken();
      }
      throw new Error(data.error);
    }

    return data.tasks || [];
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    const data = await apiCall<ApiResponse<Task>>('createTask', input);
    return data.task!;
  },
  
  async updateTask(input: UpdateTaskInput): Promise<Task> {
    const data = await apiCall<ApiResponse<Task>>('updateTask', input);
    return data.task!;
  },
  
  async completeTask(taskId: string): Promise<Task> {
    const data = await apiCall<ApiResponse<Task>>('completeTask', { task_id: taskId });
    return data.task!;
  },

  async cancelTask(taskId: string): Promise<Task> {
    const data = await apiCall<ApiResponse<Task>>('cancelTask', { task_id: taskId });
    return data.task!;
  },
  
  async assignToday(taskId: string, todaySlot?: string, swapWithTaskId?: string): Promise<{ task: Task; swappedTask?: Task }> {
    const body: AssignTodayInput = { task_id: taskId };
    if (todaySlot) body.today_slot = todaySlot;
    if (swapWithTaskId) body.swap_with_task_id = swapWithTaskId;

    try {
      const data = await apiCall<ApiResponse<Task>>('assignToday', body);
      return { task: data.task!, swappedTask: data.swapped_task };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const legacySlot = todaySlot ? toLegacyTodaySlot(todaySlot) : null;
      const shouldRetryWithLegacySlot =
        /invalid today_slot/i.test(message) &&
        !!legacySlot &&
        legacySlot !== String(todaySlot).trim().toUpperCase();

      if (!shouldRetryWithLegacySlot) {
        throw err;
      }

      const fallbackBody: AssignTodayInput = {
        task_id: taskId,
        today_slot: legacySlot,
      };
      if (swapWithTaskId) fallbackBody.swap_with_task_id = swapWithTaskId;

      const data = await apiCall<ApiResponse<Task>>('assignToday', fallbackBody);
      return { task: data.task!, swappedTask: data.swapped_task };
    }
  },
  
  async clearToday(taskId: string): Promise<Task> {
    const data = await apiCall<ApiResponse<Task>>('clearToday', { task_id: taskId });
    return data.task!;
  },

  async getLoadoutConfig(): Promise<LoadoutConfig> {
    const token = getSessionToken();
    if (!token) throw new Error('Not authenticated');
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', 'getLoadoutConfig');
    url.searchParams.set('token', token);
    const response = await fetch(url.toString());
    const data: ApiResponse<LoadoutConfig> = await response.json();
    if (data.error) {
      const err = String(data.error).toLowerCase();
      if (response.status === 401 || err.includes('unauthorized') || err.includes('invalid or expired session'))
        clearSessionToken();
      throw new Error(data.error);
    }
    return {
      energy_level: data.energy_level!,
      points_used: data.points_used ?? 0,
      points_limit: data.points_limit ?? 10,
    };
  },

  async setEnergyLevel(energy_level: EnergyLevel): Promise<LoadoutConfig> {
    const data = await apiCall<ApiResponse<LoadoutConfig>>('setEnergyLevel', { energy_level });
    if (data.error) throw new Error(data.error);
    return {
      energy_level: data.energy_level!,
      points_used: data.points_used ?? 0,
      points_limit: data.points_limit ?? 10,
    };
  },

  async bulkCreateTasks(tasks: CreateTaskInput[]): Promise<BulkImportResponse> {
    const data = await apiCall<ApiResponse<BulkImportResponse>>('bulkCreateTasks', { tasks });
    return {
      total: data.total || 0,
      success_count: data.success_count || 0,
      error_count: data.error_count || 0,
      results: data.results || []
    };
  },

  // Quest endpoints
  async getQuests(status?: string, assignee?: string): Promise<Quest[]> {
    const token = getSessionToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', 'getQuests');
    url.searchParams.set('token', token);
    if (status) url.searchParams.set('status', status);
    if (assignee) url.searchParams.set('assignee', assignee);
    
    const response = await fetch(url.toString());
    
    const data: ApiResponse<Quest[]> = await response.json();
    
    if (data.error) {
      const errorStr = String(data.error).toLowerCase();
      if (response.status === 401 || errorStr.includes('unauthorized') || errorStr.includes('invalid or expired session')) {
        clearSessionToken();
      }
      throw new Error(data.error);
    }

    return data.quests || [];
  },

  async createQuest(input: CreateQuestInput): Promise<Quest> {
    const data = await apiCall<ApiResponse<Quest>>('createQuest', input);
    return data.quest!;
  },

  async updateQuest(input: UpdateQuestInput): Promise<Quest> {
    const data = await apiCall<ApiResponse<Quest>>('updateQuest', input);
    return data.quest!;
  },

  async toggleQuestTracked(questId: string): Promise<Quest> {
    const data = await apiCall<ApiResponse<Quest>>('toggleQuestTracked', { quest_id: questId });
    return data.quest!;
  },

  async completeQuest(questId: string): Promise<Quest> {
    const data = await apiCall<ApiResponse<Quest>>('completeQuest', { quest_id: questId });
    return data.quest!;
  },
};
