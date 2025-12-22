import type { Task, CreateTaskInput, UpdateTaskInput, AssignTodayInput, TodaySlot } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Current user email - will be set by the app
let currentUserEmail = '';

export function setCurrentUserEmail(email: string) {
  currentUserEmail = email;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  task?: Task;
  tasks?: Task[];
  swapped_task?: Task;
}

async function apiCall<T>(action: string, body?: object): Promise<T> {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('userEmail', currentUserEmail);
  
  const response = await fetch(url.toString(), {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'text/plain' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
}

export const api = {
  async getTasks(status?: string, assignee?: string): Promise<Task[]> {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', 'getTasks');
    url.searchParams.set('userEmail', currentUserEmail);
    if (status) url.searchParams.set('status', status);
    if (assignee) url.searchParams.set('assignee', assignee);
    
    const response = await fetch(url.toString());
    
    const data: ApiResponse<Task[]> = await response.json();
    
    if (data.error) {
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
  
  async assignToday(taskId: string, slot: TodaySlot, swapWithTaskId?: string): Promise<{ task: Task; swappedTask?: Task }> {
    const body: AssignTodayInput = { task_id: taskId, today_slot: slot };
    if (swapWithTaskId) body.swap_with_task_id = swapWithTaskId;
    
    const data = await apiCall<ApiResponse<Task>>('assignToday', body);
    return { task: data.task!, swappedTask: data.swapped_task };
  },
  
  async clearToday(taskId: string): Promise<Task> {
    const data = await apiCall<ApiResponse<Task>>('clearToday', { task_id: taskId });
    return data.task!;
  },
};
