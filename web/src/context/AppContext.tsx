import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Task, AssigneeFilter, ViewMode, TodaySlot, CreateTaskInput, UpdateTaskInput, Challenge, Quest, CreateQuestInput, UpdateQuestInput, SortBy } from '../types';
import { PRIORITY_ORDER, CHALLENGE_ORDER } from '../types';
import { api, setCurrentUserEmail, isAuthenticated, type BulkImportResponse } from '../api/client';

const JOHN_EMAIL = import.meta.env.VITE_JOHN_EMAIL || 'john@example.com';
const STEPH_EMAIL = import.meta.env.VITE_STEPH_EMAIL || 'steph@example.com';

interface AppContextType {
  // User
  currentUser: string;
  isJohn: boolean;
  johnEmail: string;
  stephEmail: string;
  
  // Tasks (Missions)
  tasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  error: string | null;
  
  // Quests
  quests: Quest[];
  loadingQuests: boolean;
  selectedQuest: Quest | null;
  isQuestModalOpen: boolean;
  isCreatingQuest: boolean;
  
  // UI State
  assigneeFilter: AssigneeFilter;
  viewMode: ViewMode;
  showCompleted: boolean;
  sortBy: SortBy;
  selectedTask: Task | null;
  isModalOpen: boolean;
  isCreating: boolean;
  toast: { message: string; type: 'success' | 'error' } | null;
  viewingLoadoutUser: string; // Which user's loadout we're viewing

  // Actions
  setAssigneeFilter: (filter: AssigneeFilter) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleShowCompleted: () => void;
  setSortBy: (sortBy: SortBy) => void;
  openTaskModal: (task: Task | null, creating?: boolean) => void;
  closeModal: () => void;
  setViewingLoadoutUser: (email: string) => void;
  refreshTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  bulkCreateTasks: (inputs: CreateTaskInput[]) => Promise<BulkImportResponse>;
  assignToday: (taskId: string, slot: TodaySlot, swapWithTaskId?: string) => Promise<void>;
  clearToday: (taskId: string) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
  
  // Quest Actions
  refreshQuests: () => Promise<void>;
  createQuest: (input: CreateQuestInput) => Promise<void>;
  updateQuest: (input: UpdateQuestInput) => Promise<void>;
  toggleQuestTracked: (questId: string) => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  createQuestMission: (questId: string, title: string, assignee?: string) => Promise<void>;
  openQuestModal: (quest: Quest | null, creating?: boolean) => void;
  closeQuestModal: () => void;
  
  // Computed
  inboxTasks: Task[];
  overdueTasks: Task[];
  todayTasks: Map<TodaySlot, Task>;
  accomplishedToday: Task[];
  trackedQuests: Quest[];
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
  // Get logged-in user from localStorage (set during login)
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('firebrain_user_email') || JOHN_EMAIL;
  });
  const isJohn = currentUser === JOHN_EMAIL;
  
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Quests state
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  
  // UI state - default to logged-in user
  const loggedInUser = localStorage.getItem('firebrain_user_email') || JOHN_EMAIL;
  const defaultFilter: AssigneeFilter = loggedInUser === JOHN_EMAIL ? 'john' : 
                                        loggedInUser === STEPH_EMAIL ? 'steph' : 'all';
  
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>(defaultFilter);
  const [viewMode, setViewMode] = useState<ViewMode>('buckets');
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewingLoadoutUser, setViewingLoadoutUser] = useState<string>(() => {
    return loggedInUser;
  }); // Start viewing own loadout
  
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
      // If the token was cleared due to an auth error, reload to show login screen
      if (!isAuthenticated()) {
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  // Set current user email for API calls whenever it changes
  // Note: Backend now gets user from session token, but we keep this for any frontend logic
  useEffect(() => {
    setCurrentUserEmail(currentUser);
    // Also update localStorage if it changed
    localStorage.setItem('firebrain_user_email', currentUser);
  }, [currentUser]);
  
  // Fetch completed tasks for accomplished section
  const fetchCompletedTasks = useCallback(async () => {
    try {
      const doneTasks = await api.getTasks('done');
      setCompletedTasks(doneTasks);
    } catch (err) {
      // Silently fail - not critical for accomplished section
      console.error('Failed to load completed tasks:', err);
    }
  }, []);

  // Fetch quests
  const refreshQuests = useCallback(async () => {
    try {
      setLoadingQuests(true);
      const fetchedQuests = await api.getQuests('open');
      setQuests(fetchedQuests);
    } catch (err) {
      console.error('Failed to fetch quests:', err);
      showToast('Failed to load quests', 'error');
    } finally {
      setLoadingQuests(false);
    }
  }, [showToast]);
  
  // Initial fetch (after setting user email)
  useEffect(() => {
    setCurrentUserEmail(currentUser);
    setViewingLoadoutUser(currentUser); // Start viewing own loadout
    refreshTasks();
    fetchCompletedTasks(); // Also fetch completed tasks for accomplished section
    refreshQuests(); // Fetch quests
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
  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    try {
      const newTask = await api.createTask(input);
      setTasks(prev => [newTask, ...prev]);
      showToast('Mission created', 'success');
      closeModal();
      return newTask;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create mission', 'error');
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
      showToast(`Imported ${result.success_count} missions${result.error_count > 0 ? ` (${result.error_count} failed)` : ''}`, 'success');
      return result;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import missions', 'error');
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
      console.log('[updateTask] input:', input);
      console.log('[updateTask] backend response:', updatedTask);
      console.log('[updateTask] response quest_id:', JSON.stringify(updatedTask.quest_id));
      // Merge backend response with current task state so partial responses
      // (e.g. backend missing quest_id) don't clobber optimistic fields
      setTasks(prev => prev.map(t =>
        t.task_id === updatedTask.task_id ? { ...t, ...updatedTask } : t
      ));
      showToast('Mission updated', 'success');
      closeModal();
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to update mission', 'error');
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
      // Backend clears today_slot to free up the slot, but keeps today_user for filtering
      if (completedTask) {
        const completedTaskData = { 
          ...completedTask, 
          ...result, 
          status: 'done' as const,
          // Ensure today_slot is cleared (backend should do this, but be explicit)
          today_slot: '' as const,
          today_set_at: ''
        };
        setCompletedTasks(prev => [completedTaskData, ...prev]);
      }
      // Refresh tasks to ensure we get the latest state from backend (slot cleared)
      await refreshTasks();
      showToast('Mission completed! 🎉', 'success');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to complete mission', 'error');
    }
  }, [tasks, showToast, refreshTasks]);
  
  const assignToday = useCallback(async (taskId: string, slot: TodaySlot, swapWithTaskId?: string) => {
    // Only allow editing if viewing own loadout
    if (viewingLoadoutUser !== currentUser) {
      showToast('You can only edit your own Today slots', 'error');
      return;
    }
    
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.task_id === taskId) {
        return { ...t, today_slot: slot, today_set_at: new Date().toISOString(), today_user: currentUser };
      }
      if (swapWithTaskId && t.task_id === swapWithTaskId) {
        const sourceTask = prev.find(x => x.task_id === taskId);
        return { ...t, today_slot: sourceTask?.today_slot || '', today_user: sourceTask?.today_slot ? currentUser : '' };
      }
      return t;
    }));
    
    try {
      const result = await api.assignToday(taskId, slot, swapWithTaskId);
      setTasks(prev => prev.map(t => {
        if (t.task_id === result.task.task_id) {
          // Ensure today_user is set (defensive)
          return { ...result.task, today_user: result.task.today_user || currentUser };
        }
        if (result.swappedTask && t.task_id === result.swappedTask.task_id) {
          return { ...result.swappedTask, today_user: result.swappedTask.today_user || currentUser };
        }
        return t;
      }));
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to assign to Today', 'error');
    }
  }, [viewingLoadoutUser, currentUser, tasks, showToast]);
  
  const clearToday = useCallback(async (taskId: string) => {
    // Only allow editing if viewing own loadout
    if (viewingLoadoutUser !== currentUser) {
      showToast('You can only edit your own Today slots', 'error');
      return;
    }
    
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, today_slot: '', today_set_at: '', today_user: '' } : t
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
  }, [viewingLoadoutUser, currentUser, tasks, showToast]);

  // Quest modal handlers
  const openQuestModal = useCallback((quest: Quest | null, creating = false) => {
    setSelectedQuest(quest);
    setIsCreatingQuest(creating);
    setIsQuestModalOpen(true);
  }, []);
  
  const closeQuestModal = useCallback(() => {
    setIsQuestModalOpen(false);
    setSelectedQuest(null);
    setIsCreatingQuest(false);
  }, []);

  // Quest actions
  const createQuest = useCallback(async (input: CreateQuestInput) => {
    try {
      const newQuest = await api.createQuest(input);
      setQuests(prev => [newQuest, ...prev]);
      showToast('Quest created', 'success');
      closeQuestModal();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create quest', 'error');
      throw err;
    }
  }, [closeQuestModal, showToast]);

  const updateQuest = useCallback(async (input: UpdateQuestInput) => {
    const previousQuests = quests;
    
    // Optimistic update
    setQuests(prev => prev.map(q => 
      q.quest_id === input.quest_id ? { ...q, ...input } : q
    ));
    
    try {
      const updatedQuest = await api.updateQuest(input);
      // Merge backend response with current quest state so partial responses
      // don't clobber optimistic fields (e.g. color)
      setQuests(prev => prev.map(q =>
        q.quest_id === updatedQuest.quest_id ? { ...q, ...updatedQuest } : q
      ));
      showToast('Quest updated', 'success');
      closeQuestModal();
    } catch (err) {
      setQuests(previousQuests); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to update quest', 'error');
      throw err;
    }
  }, [quests, closeQuestModal, showToast]);

  const toggleQuestTracked = useCallback(async (questId: string) => {
    const previousQuests = quests;
    const quest = quests.find(q => q.quest_id === questId);
    
    if (!quest) return;
    
    const newTrackedStatus = !quest.is_tracked;
    
    // Check limit if trying to track
    if (newTrackedStatus) {
      const trackedCount = quests.filter(q => q.is_tracked && q.status === 'open' && q.assignee === quest.assignee).length;
      if (trackedCount >= 3) {
        showToast('Maximum 3 tracked quests allowed. Untrack another quest first.', 'error');
        return;
      }
    }
    
    // Optimistic update
    setQuests(prev => prev.map(q => 
      q.quest_id === questId 
        ? { ...q, is_tracked: newTrackedStatus, tracked_at: newTrackedStatus ? new Date().toISOString() : '' }
        : q
    ));
    
    try {
      const updatedQuest = await api.toggleQuestTracked(questId);
      setQuests(prev => prev.map(q => 
        q.quest_id === updatedQuest.quest_id ? updatedQuest : q
      ));
      showToast(newTrackedStatus ? 'Quest tracked' : 'Quest untracked', 'success');
    } catch (err) {
      setQuests(previousQuests); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to toggle quest tracking', 'error');
      throw err;
    }
  }, [quests, showToast]);

  const completeQuest = useCallback(async (questId: string) => {
    const previousQuests = quests;
    
    // Optimistic update - remove from list
    setQuests(prev => prev.filter(q => q.quest_id !== questId));
    
    try {
      await api.completeQuest(questId);
      await refreshQuests(); // Refresh to get updated state
      showToast('Quest completed! 🎉', 'success');
    } catch (err) {
      setQuests(previousQuests); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to complete quest', 'error');
    }
  }, [quests, showToast, refreshQuests]);

  // Create a mission inside a quest without closing the quest modal
  const createQuestMission = useCallback(async (questId: string, title: string, assignee?: string) => {
    try {
      const newTask = await api.createTask({
        title,
        quest_id: questId,
        priority: 'medium',
        assignee: assignee || currentUser,
      });
      setTasks(prev => [newTask, ...prev]);
      showToast('Mission created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create mission', 'error');
    }
  }, [currentUser, showToast]);

  // Helper: check if a due_date is past (overdue)
  const isOverdue = (dueDateStr: string) => {
    if (!dueDateStr) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDateStr);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    return dueDay.getTime() < today.getTime();
  };

  // Filter: base inbox missions (open, not in loadout, not in a quest, matches assignee)
  const inboxBase = tasks.filter(t => {
    if (t.status !== 'open') return false;
    if (t.today_slot) return false;
    if (t.quest_id) return false;
    switch (assigneeFilter) {
      case 'john': return t.assignee === JOHN_EMAIL;
      case 'steph': return t.assignee === STEPH_EMAIL;
      case 'all': return true;
    }
  });

  // Overdue tasks: pulled out of the main list, sorted most-overdue first
  const overdueTasks = inboxBase
    .filter(t => isOverdue(t.due_date))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const overdueIds = new Set(overdueTasks.map(t => t.task_id));

  // Computed values — inbox minus overdue, sorted by selected sort
  const inboxTasks = inboxBase
    .filter(t => !overdueIds.has(t.task_id))
    .sort((a, b) => {
      if (sortBy === 'due_date') {
        // Earliest due date first; no due date sorts to bottom
        const aHas = Boolean(a.due_date);
        const bHas = Boolean(b.due_date);
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (aHas && bHas) {
          const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          if (dateDiff !== 0) return dateDiff;
        }
        // Secondary: priority
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (sortBy === 'quest') {
        // Group by quest_id (unquested last), then priority within groups
        // Note: quest_id is empty for inbox tasks, so this sort is mainly useful
        // when applied to the full task set; here it falls back to priority
        const aQuest = a.quest_id || '\uffff';
        const bQuest = b.quest_id || '\uffff';
        if (aQuest !== bQuest) return aQuest.localeCompare(bQuest);
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (sortBy === 'challenge') {
        const aChallenge = a.challenge || 'high';
        const bChallenge = b.challenge || 'high';
        const challengeDiff = CHALLENGE_ORDER[aChallenge as Challenge] - CHALLENGE_ORDER[bChallenge as Challenge];
        if (challengeDiff !== 0) return challengeDiff;
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
      } else {
        // Default: priority
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        const aChallenge = a.challenge || 'high';
        const bChallenge = b.challenge || 'high';
        const challengeDiff = CHALLENGE_ORDER[aChallenge as Challenge] - CHALLENGE_ORDER[bChallenge as Challenge];
        if (challengeDiff !== 0) return challengeDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  
  // Filter todayTasks by viewingLoadoutUser
  // For backward compatibility: if today_user is empty, check assignee instead
  const todayTasks = new Map<TodaySlot, Task>();
  tasks.forEach(t => {
    if (t.today_slot && t.status === 'open') {
      // Check if task belongs to viewing user
      const belongsToUser = t.today_user 
        ? t.today_user === viewingLoadoutUser 
        : t.assignee === viewingLoadoutUser; // Backward compatibility
      
      if (belongsToUser) {
        todayTasks.set(t.today_slot as TodaySlot, t);
      }
    }
  });

  // Tasks accomplished today (completed today, filtered by viewingLoadoutUser)
  const today = new Date().toDateString();
  const accomplishedToday = completedTasks.filter(t => {
    if (!t.completed_at) return false;
    const completedDate = new Date(t.completed_at).toDateString();
    // Filter by the user whose loadout we're viewing
    return completedDate === today && t.today_user === viewingLoadoutUser;
  }).sort((a, b) => {
    // Sort by slot priority first (B1 > M1-M3 > S1-S5), then by completion time
    const slotOrder: Record<string, number> = { 'B1': 0, 'M1': 1, 'M2': 2, 'M3': 3, 'S1': 4, 'S2': 5, 'S3': 6, 'S4': 7, 'S5': 8 };
    const aSlot = a.today_slot || '';
    const bSlot = b.today_slot || '';
    const slotDiff = (slotOrder[aSlot] ?? 99) - (slotOrder[bSlot] ?? 99);
    if (slotDiff !== 0) return slotDiff;
    // Then by completion time (most recent first)
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
  });

  // Tracked quests (filtered by current user)
  const trackedQuests = quests.filter(q => 
    q.is_tracked && q.status === 'open' && q.assignee === currentUser
  );
  
  // User is logged in as themselves - no switching needed
  // Viewing toggles (JOHN/STEF/ALL buttons and loadout toggle) still work for viewing
  
  const value: AppContextType = {
    currentUser,
    isJohn,
    johnEmail: JOHN_EMAIL,
    stephEmail: STEPH_EMAIL,
    tasks,
    completedTasks,
    loading,
    error,
    quests,
    loadingQuests,
    selectedQuest,
    isQuestModalOpen,
    isCreatingQuest,
    assigneeFilter,
    viewMode,
    showCompleted,
    sortBy,
    selectedTask,
    isModalOpen,
    isCreating,
    toast,
    setAssigneeFilter,
    setViewMode,
    toggleShowCompleted,
    setSortBy,
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
    refreshQuests,
    createQuest,
    updateQuest,
    toggleQuestTracked,
    completeQuest,
    createQuestMission,
    openQuestModal,
    closeQuestModal,
    inboxTasks,
    overdueTasks,
    todayTasks,
    accomplishedToday,
    trackedQuests,
    viewingLoadoutUser,
    setViewingLoadoutUser,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

