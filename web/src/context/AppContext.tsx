import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Task, AssigneeFilter, ViewMode, TodaySlot, CreateTaskInput, UpdateTaskInput } from '../types';
import { PRIORITY_ORDER } from '../types';
import { api, setCurrentUserEmail, type BulkImportResponse } from '../api/client';

const JOHN_EMAIL = import.meta.env.VITE_JOHN_EMAIL || 'john@example.com';
const STEPH_EMAIL = import.meta.env.VITE_STEPH_EMAIL || 'steph@example.com';

interface AppContextType {
  // User
  currentUser: string;
  isJohn: boolean;
  johnEmail: string;
  stephEmail: string;
  
  // Tasks
  tasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  error: string | null;
  
  // UI State
  assigneeFilter: AssigneeFilter;
  viewMode: ViewMode;
  showCompleted: boolean;
  selectedTask: Task | null;
  isModalOpen: boolean;
  isCreating: boolean;
  toast: { message: string; type: 'success' | 'error' } | null;
  
  // Actions
  setAssigneeFilter: (filter: AssigneeFilter) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleShowCompleted: () => void;
  openTaskModal: (task: Task | null, creating?: boolean) => void;
  closeModal: () => void;
  refreshTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  bulkCreateTasks: (inputs: CreateTaskInput[]) => Promise<BulkImportResponse>;
  assignToday: (taskId: string, slot: TodaySlot, swapWithTaskId?: string) => Promise<void>;
  clearToday: (taskId: string) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
  
  // Computed
  inboxTasks: Task[];
  todayTasks: Map<TodaySlot, Task>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // For demo purposes, we'll simulate the current user
  // In production, this would come from Google Sign-In
  const [currentUser, setCurrentUser] = useState<string>(JOHN_EMAIL);
  const isJohn = currentUser === JOHN_EMAIL;
  
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('john');
  const [viewMode, setViewMode] = useState<ViewMode>('buckets');
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  // Fetch tasks
  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await api.getTasks('open');
      setTasks(fetchedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  // Set current user email for API calls whenever it changes
  useEffect(() => {
    setCurrentUserEmail(currentUser);
  }, [currentUser]);
  
  // Initial fetch (after setting user email)
  useEffect(() => {
    setCurrentUserEmail(currentUser);
    refreshTasks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Modal handlers
  const openTaskModal = useCallback((task: Task | null, creating = false) => {
    setSelectedTask(task);
    setIsCreating(creating);
    setIsModalOpen(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setIsCreating(false);
  }, []);
  
  // Toggle showing completed tasks
  const toggleShowCompleted = useCallback(async () => {
    const newValue = !showCompleted;
    setShowCompleted(newValue);
    
    if (newValue && completedTasks.length === 0) {
      // Fetch completed tasks
      try {
        const doneTasks = await api.getTasks('done');
        setCompletedTasks(doneTasks);
      } catch (err) {
        showToast('Failed to load completed tasks', 'error');
      }
    }
  }, [showCompleted, completedTasks.length, showToast]);
  
  // Task actions with optimistic updates
  const createTask = useCallback(async (input: CreateTaskInput) => {
    try {
      const newTask = await api.createTask(input);
      setTasks(prev => [newTask, ...prev]);
      showToast('Task created', 'success');
      closeModal();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create task', 'error');
      throw err;
    }
  }, [closeModal, showToast]);

  const bulkCreateTasks = useCallback(async (inputs: CreateTaskInput[]) => {
    try {
      const result = await api.bulkCreateTasks(inputs);
      if (result.success_count > 0) {
        // Refresh tasks to get the newly created ones
        await refreshTasks();
      }
      showToast(`Imported ${result.success_count} tasks${result.error_count > 0 ? ` (${result.error_count} failed)` : ''}`, 'success');
      return result;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import tasks', 'error');
      throw err;
    }
  }, [refreshTasks, showToast]);
  
  const updateTask = useCallback(async (input: UpdateTaskInput) => {
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === input.task_id ? { ...t, ...input } : t
    ));
    
    try {
      const updatedTask = await api.updateTask(input);
      setTasks(prev => prev.map(t => 
        t.task_id === updatedTask.task_id ? updatedTask : t
      ));
      showToast('Task updated', 'success');
      closeModal();
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to update task', 'error');
      throw err;
    }
  }, [tasks, closeModal, showToast]);
  
  const completeTask = useCallback(async (taskId: string) => {
    const previousTasks = tasks;
    const completedTask = tasks.find(t => t.task_id === taskId);
    
    // Optimistic update - remove from list
    setTasks(prev => prev.filter(t => t.task_id !== taskId));
    
    try {
      const result = await api.completeTask(taskId);
      // Add to completed tasks if we're showing them
      if (completedTask) {
        setCompletedTasks(prev => [{ ...completedTask, ...result, status: 'done' }, ...prev]);
      }
      showToast('Task completed! 🎉', 'success');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to complete task', 'error');
    }
  }, [tasks, showToast]);
  
  const assignToday = useCallback(async (taskId: string, slot: TodaySlot, swapWithTaskId?: string) => {
    if (!isJohn) {
      showToast('Only John can edit Today slots', 'error');
      return;
    }
    
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.task_id === taskId) {
        return { ...t, today_slot: slot, today_set_at: new Date().toISOString() };
      }
      if (swapWithTaskId && t.task_id === swapWithTaskId) {
        const sourceTask = prev.find(x => x.task_id === taskId);
        return { ...t, today_slot: sourceTask?.today_slot || '' };
      }
      return t;
    }));
    
    try {
      const result = await api.assignToday(taskId, slot, swapWithTaskId);
      setTasks(prev => prev.map(t => {
        if (t.task_id === result.task.task_id) return result.task;
        if (result.swappedTask && t.task_id === result.swappedTask.task_id) return result.swappedTask;
        return t;
      }));
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to assign to Today', 'error');
    }
  }, [isJohn, tasks, showToast]);
  
  const clearToday = useCallback(async (taskId: string) => {
    if (!isJohn) {
      showToast('Only John can edit Today slots', 'error');
      return;
    }
    
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, today_slot: '', today_set_at: '' } : t
    ));
    
    try {
      const updatedTask = await api.clearToday(taskId);
      setTasks(prev => prev.map(t => 
        t.task_id === updatedTask.task_id ? updatedTask : t
      ));
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to clear from Today', 'error');
    }
  }, [isJohn, tasks, showToast]);
  
  // Computed values
  const inboxTasks = tasks
    .filter(t => {
      if (t.status !== 'open') return false;
      if (t.today_slot) return false; // In Today, not Inbox
      
      switch (assigneeFilter) {
        case 'john': return t.assignee === JOHN_EMAIL;
        case 'steph': return t.assignee === STEPH_EMAIL;
        case 'all': return true;
      }
    })
    .sort((a, b) => {
      // Sort by priority, then by created_at (newest first)
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  
  const todayTasks = new Map<TodaySlot, Task>();
  tasks.forEach(t => {
    if (t.today_slot && t.status === 'open') {
      todayTasks.set(t.today_slot as TodaySlot, t);
    }
  });
  
  // Allow toggling user for demo purposes (press 'u' key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'u' && !isModalOpen) {
        setCurrentUser(prev => {
          const newUser = prev === JOHN_EMAIL ? STEPH_EMAIL : JOHN_EMAIL;
          setCurrentUserEmail(newUser);
          return newUser;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);
  
  const value: AppContextType = {
    currentUser,
    isJohn,
    johnEmail: JOHN_EMAIL,
    stephEmail: STEPH_EMAIL,
    tasks,
    completedTasks,
    loading,
    error,
    assigneeFilter,
    viewMode,
    showCompleted,
    selectedTask,
    isModalOpen,
    isCreating,
    toast,
    setAssigneeFilter,
    setViewMode,
    toggleShowCompleted,
    openTaskModal,
    closeModal,
    refreshTasks,
    createTask,
    updateTask,
    completeTask,
    bulkCreateTasks,
    assignToday,
    clearToday,
    showToast,
    inboxTasks,
    todayTasks,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

