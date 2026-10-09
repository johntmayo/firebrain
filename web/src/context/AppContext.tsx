import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Task, AssigneeFilter, ViewMode, TodaySlot, CreateTaskInput, UpdateTaskInput, Challenge, Quest, CreateQuestInput, UpdateQuestInput, SortBy, LoadoutConfig, EnergyLevel, QuestCompletionMode } from '../types';
import { PRIORITY_ORDER, CHALLENGE_ORDER, CHALLENGE_POINTS, compareQuestSortOrder, ENERGY_POINTS_LIMIT, pointsLimitFor } from '../types';
import { api, setCurrentUserEmail, isAuthenticated, type BulkImportResponse } from '../api/client';
import { openMissionsOfQuest } from '../utils/questMissions';
import { areSoundsEnabled, sounds } from '../utils/sounds';
import {
  ENGAGEMENT_STORAGE_KEY,
  canEngage,
  complete as completeEngagement,
  deserialize as deserializeEngagement,
  engage as engageClock,
  engageDuration,
  expire as expireEngagement,
  isMissionPhase,
  pause as pauseClock,
  plus5,
  reconcile as reconcileEngagement,
  serialize as serializeEngagement,
  skipCooldown as skipCooldownClock,
  standDown as standDownClock,
  start as startClock,
  startCooldown as startCooldownClock,
  tick as tickEngagement,
  type EngagementState,
  type EngagementTick,
} from '../utils/engagement';

export type { EngagementState, EngagementTick };

declare global {
  interface Window {
    /** Smoke / tests only — not rendered. */
    __fbEngage?: {
      expire: () => void;
      nextDurationMs: (ms: number) => void;
      getPhase: () => EngagementState['phase'];
    };
  }
}

const JOHN_EMAIL = import.meta.env.VITE_JOHN_EMAIL || 'john@example.com';
const STEPH_EMAIL = import.meta.env.VITE_STEPH_EMAIL || 'steph@example.com';
const MEGAN_EMAIL = import.meta.env.VITE_MEGAN_EMAIL || 'megan@example.com';

interface AppContextType {
  // User
  currentUser: string;
  isJohn: boolean;
  johnEmail: string;
  stephEmail: string;
  meganEmail: string;
  
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
  pendingQuestCompletion: { questId: string; questTitle: string; openMissionCount: number } | null;
  
  // UI State
  assigneeFilter: AssigneeFilter;
  viewMode: ViewMode;
  showCompleted: boolean;
  sortBy: SortBy;
  selectedTask: Task | null;
  isModalOpen: boolean;
  isCreating: boolean;
  taskModalDefaultQuestId: string | null;
  notices: Notice[];
  isBulkImportOpen: boolean;
  viewingLoadoutUser: string; // Which user's loadout we're viewing
  loadoutConfig: LoadoutConfig | null; // Current user's energy level and points (only for own loadout)

  // Engagement (one active mission + clock, per device)
  engagement: EngagementState;
  engagementTick: EngagementTick;
  engageMission: (mission: Pick<Task, 'task_id' | 'title'>, minutes: number) => boolean;
  standDown: () => void;
  pauseEngagement: () => void;
  resumeEngagement: () => void;
  plusFive: () => void;
  acknowledgeChime: () => void;
  completeActive: () => Promise<void>;
  startCooldown: () => void;
  skipCooldown: () => void;

  // Actions
  setAssigneeFilter: (filter: AssigneeFilter) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleShowCompleted: () => void;
  setSortBy: (sortBy: SortBy) => void;
  openTaskModal: (task: Task | null, creating?: boolean, defaultQuestId?: string) => void;
  closeModal: () => void;
  openBulkImport: () => void;
  closeBulkImport: () => void;
  dismissNotice: (id: number) => void;
  setViewingLoadoutUser: (email: string) => void;
  refreshTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  bulkCreateTasks: (inputs: CreateTaskInput[]) => Promise<BulkImportResponse>;
  assignToday: (taskId: string, slot?: TodaySlot, swapWithTaskId?: string) => Promise<void>;
  /** Append a mission to the end of the viewer's own loadout (click equivalent of drag-to-loadout). */
  loadTask: (taskId: string) => Promise<void>;
  reorderLoadoutTasks: (orderedTaskIds: string[]) => Promise<void>;
  clearToday: (taskId: string) => Promise<void>;
  refreshLoadoutConfig: () => Promise<void>;
  setEnergyLevel: (level: EnergyLevel) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
  
  // Quest Actions
  refreshQuests: () => Promise<void>;
  createQuest: (input: CreateQuestInput) => Promise<void>;
  updateQuest: (input: UpdateQuestInput) => Promise<void>;
  toggleQuestTracked: (questId: string) => Promise<void>;
  reorderQuests: (activeQuestId: string, targetQuestId: string) => Promise<void>;
  requestCompleteQuest: (questId: string) => Promise<void>;
  completeQuest: (questId: string, mode?: QuestCompletionMode) => Promise<void>;
  cancelQuestCompletion: () => void;
  openQuestModal: (quest: Quest | null, creating?: boolean) => void;
  closeQuestModal: () => void;
  
  // Computed
  inboxTasks: Task[];
  overdueTasks: Task[];
  loadoutTasks: Task[];
  accomplishedToday: Task[];
  trackedQuests: Quest[];
  questColorById: Record<string, string>;
}

export interface Notice {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const NOTICE_DURATION_MS = 3500;
const MAX_VISIBLE_NOTICES = 4;

const AppContext = createContext<AppContextType | null>(null);

function getTaskPoints(task: Pick<Task, 'challenge'>) {
  return task.challenge ? CHALLENGE_POINTS[task.challenge] : CHALLENGE_POINTS.medium;
}

function calculateLoadoutPoints(tasks: Task[], email: string) {
  return tasks.reduce((total, task) => {
    if (task.status !== 'open' || !task.today_slot) return total;

    const belongsToUser = task.today_user
      ? task.today_user === email
      : task.assignee === email;

    return belongsToUser ? total + getTaskPoints(task) : total;
  }, 0);
}

function createOptimisticTask(input: CreateTaskInput, currentUser: string): Task {
  const now = new Date().toISOString();
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    task_id: `optimistic-${randomId}`,
    created_at: now,
    created_by: currentUser,
    updated_at: now,
    updated_by: currentUser,
    title: input.title.trim(),
    notes: input.notes || '',
    priority: input.priority || 'medium',
    challenge: input.challenge || '',
    assignee: input.assignee || currentUser,
    status: 'open',
    due_date: input.due_date || '',
    today_slot: '',
    today_set_at: '',
    completed_at: '',
    today_user: '',
    quest_id: input.quest_id || '',
  };
}

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
  const [pendingQuestCompletion, setPendingQuestCompletion] = useState<{ questId: string; questTitle: string; openMissionCount: number } | null>(null);
  
  // UI state - default to logged-in user
  const loggedInUser = localStorage.getItem('firebrain_user_email') || JOHN_EMAIL;
  const defaultFilter: AssigneeFilter = loggedInUser === JOHN_EMAIL ? 'john' : 
                                        loggedInUser === STEPH_EMAIL ? 'steph' :
                                        loggedInUser === MEGAN_EMAIL ? 'megan' : 'all';
  
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>(defaultFilter);
  const [viewMode, setViewMode] = useState<ViewMode>('buckets');
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [taskModalDefaultQuestId, setTaskModalDefaultQuestId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticeTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const nextNoticeId = useRef(1);
  const [viewingLoadoutUser, setViewingLoadoutUser] = useState<string>(() => {
    return loggedInUser;
  }); // Start viewing own loadout
  const [loadoutConfig, setLoadoutConfig] = useState<LoadoutConfig | null>(null);

  const [engagement, setEngagement] = useState<EngagementState>(() => {
    try {
      return deserializeEngagement(localStorage.getItem(ENGAGEMENT_STORAGE_KEY));
    } catch {
      return deserializeEngagement(null);
    }
  });
  const [engagementNow, setEngagementNow] = useState(() => Date.now());
  const engagementRef = useRef(engagement);
  engagementRef.current = engagement;
  const nextEngageMsRef = useRef<number | null>(null);

  const persistEngagement = useCallback((next: EngagementState) => {
    try {
      localStorage.setItem(ENGAGEMENT_STORAGE_KEY, serializeEngagement(next));
    } catch {
      /* storage unavailable — the clock still works for this session */
    }
  }, []);

  const commitEngagement = useCallback((next: EngagementState) => {
    setEngagement(next);
    persistEngagement(next);
    setEngagementNow(Date.now());
  }, [persistEngagement]);

  const engagementTick = useMemo(() => tickEngagement(engagement, engagementNow), [engagement, engagementNow]);

  useEffect(() => {
    if (!engagementTick.running) return;
    const id = setInterval(() => setEngagementNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [engagementTick.running]);

  useEffect(() => {
    if (!engagementTick.chimed && !engagementTick.cooldownDone) return;
    commitEngagement(engagementTick.state);
    if (areSoundsEnabled()) sounds.timerDone();
  }, [engagementTick.chimed, engagementTick.cooldownDone, engagementTick.state, commitEngagement]);

  const engageMission = useCallback((mission: Pick<Task, 'task_id' | 'title'>, minutes: number): boolean => {
    const prev = engagementRef.current;
    if (!canEngage(prev, mission.task_id) && isMissionPhase(prev.phase) && prev.missionId !== mission.task_id) {
      return false;
    }
    const override = nextEngageMsRef.current;
    nextEngageMsRef.current = null;
    const spec = { id: mission.task_id, title: mission.title };
    const next = override != null
      ? engageDuration(prev, spec, override, Date.now(), minutes)
      : engageClock(prev, spec, minutes, Date.now());
    if (next === prev) return false;
    commitEngagement(next);
    return true;
  }, [commitEngagement]);

  const standDown = useCallback(() => {
    commitEngagement(standDownClock(engagementRef.current));
  }, [commitEngagement]);

  const pauseEngagement = useCallback(() => {
    commitEngagement(pauseClock(engagementRef.current, Date.now()));
  }, [commitEngagement]);

  const resumeEngagement = useCallback(() => {
    commitEngagement(startClock(engagementRef.current, Date.now()));
  }, [commitEngagement]);

  const plusFive = useCallback(() => {
    commitEngagement(plus5(engagementRef.current, Date.now()));
  }, [commitEngagement]);

  const acknowledgeChime = useCallback(() => {
    const snap = tickEngagement(engagementRef.current, Date.now());
    if (snap.chimed) commitEngagement(snap.state);
  }, [commitEngagement]);

  const startCooldown = useCallback(() => {
    commitEngagement(startCooldownClock(engagementRef.current, Date.now()));
  }, [commitEngagement]);

  const skipCooldown = useCallback(() => {
    commitEngagement(skipCooldownClock(engagementRef.current));
  }, [commitEngagement]);

  useEffect(() => {
    window.__fbEngage = {
      expire() {
        commitEngagement(expireEngagement(engagementRef.current, Date.now()));
      },
      nextDurationMs(ms: number) {
        nextEngageMsRef.current = Number.isFinite(ms) && ms > 0 ? ms : null;
      },
      getPhase() {
        return engagementRef.current.phase;
      },
    };
    return () => {
      delete window.__fbEngage;
    };
  }, [commitEngagement]);
  
  // Notices (toasts): each has its own timer, rapid successive notices stack
  // instead of replacing each other, and any notice can be dismissed early.
  const dismissNotice = useCallback((id: number) => {
    const timer = noticeTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      noticeTimers.current.delete(id);
    }
    setNotices(prev => prev.filter(n => n.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = nextNoticeId.current++;
    setNotices(prev => {
      const next = [...prev, { id, message, type }];
      // Drop the oldest if the stack is too tall; clear its timer too.
      while (next.length > MAX_VISIBLE_NOTICES) {
        const dropped = next.shift()!;
        const timer = noticeTimers.current.get(dropped.id);
        if (timer) clearTimeout(timer);
        noticeTimers.current.delete(dropped.id);
      }
      return next;
    });
    const timer = setTimeout(() => {
      noticeTimers.current.delete(id);
      setNotices(prev => prev.filter(n => n.id !== id));
    }, NOTICE_DURATION_MS);
    noticeTimers.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = noticeTimers.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const openBulkImport = useCallback(() => setIsBulkImportOpen(true), []);
  const closeBulkImport = useCallback(() => setIsBulkImportOpen(false), []);

  const parseLoadoutOrder = useCallback((slot: string): number => {
    if (!slot) return Number.MAX_SAFE_INTEGER;
    const parsedNumber = Number(slot);
    if (!Number.isNaN(parsedNumber) && parsedNumber > 0) {
      return parsedNumber;
    }
    const legacyOrder: Record<string, number> = {
      B1: 1, M1: 2, M2: 3, M3: 4, S1: 5, S2: 6, S3: 7, S4: 8, S5: 9,
    };
    return legacyOrder[slot] || Number.MAX_SAFE_INTEGER;
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
      // If auth is invalid, force login screen
      if (!isAuthenticated()) {
        window.location.reload();
        return;
      }
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
      // If auth is invalid, force login screen
      if (!isAuthenticated()) {
        window.location.reload();
        return;
      }
      console.error('Failed to fetch quests:', err);
      showToast('Failed to load quests', 'error');
    } finally {
      setLoadingQuests(false);
    }
  }, [showToast]);
  
  const refreshLoadoutConfig = useCallback(async () => {
    try {
      const config = await api.getLoadoutConfig();
      setLoadoutConfig(config);
    } catch (err) {
      if (!isAuthenticated()) return;
      console.error('Failed to load loadout config:', err);
      // Fallback so SET ENERGY row still shows if backend isn't redeployed yet
      setLoadoutConfig({
        energy_level: 'medium',
        points_used: 0,
        points_limit: ENERGY_POINTS_LIMIT.medium,
      });
    }
  }, []);

  // Initial fetch (after setting user email)
  useEffect(() => {
    setCurrentUserEmail(currentUser);
    setViewingLoadoutUser(currentUser); // Start viewing own loadout
    refreshTasks();
    refreshQuests(); // Fetch quests
    refreshLoadoutConfig();
    fetchCompletedTasks(); // Needed for Accomplished Today after a reload
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Modal handlers
  const openTaskModal = useCallback((task: Task | null, creating = false, defaultQuestId?: string) => {
    setSelectedTask(task);
    setIsCreating(creating);
    setTaskModalDefaultQuestId(defaultQuestId || null);
    setIsModalOpen(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setIsCreating(false);
    setTaskModalDefaultQuestId(null);
  }, []);
  
  // Toggle showing completed tasks
  const toggleShowCompleted = useCallback(async () => {
    const newValue = !showCompleted;
    setShowCompleted(newValue);
    
    if (newValue && completedTasks.length === 0) {
      try {
        await fetchCompletedTasks();
      } catch {
        showToast('Failed to load completed tasks', 'error');
      }
    }
  }, [showCompleted, completedTasks.length, fetchCompletedTasks, showToast]);
  
  // Task actions with optimistic updates
  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    const optimisticTask = createOptimisticTask(input, currentUser);
    setTasks(prev => [optimisticTask, ...prev]);
    closeModal();

    try {
      const newTask = await api.createTask(input);
      setTasks(prev => prev.map(t => (
        t.task_id === optimisticTask.task_id ? newTask : t
      )));
      showToast('Mission created', 'success');
      return newTask;
    } catch (err) {
      setTasks(prev => prev.filter(t => t.task_id !== optimisticTask.task_id));
      showToast(err instanceof Error ? err.message : 'Failed to create mission', 'error');
      throw err;
    }
  }, [closeModal, currentUser, showToast]);

  const bulkCreateTasks = useCallback(async (inputs: CreateTaskInput[]) => {
    try {
      const result = await api.bulkCreateTasks(inputs);
      const createdTasks = result.results
        .filter((item): item is typeof item & { task: Task } => item.success && Boolean(item.task))
        .map(item => item.task);
      if (createdTasks.length > 0) {
        setTasks(prev => [...createdTasks, ...prev]);
      }
      showToast(`Imported ${result.success_count} missions${result.error_count > 0 ? ` (${result.error_count} failed)` : ''}`, 'success');
      return result;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import missions', 'error');
      throw err;
    }
  }, [showToast]);
  
  const updateTask = useCallback(async (input: UpdateTaskInput) => {
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.task_id === input.task_id ? { ...t, ...input } : t
    ));
    closeModal();
    
    try {
      const updatedTask = await api.updateTask(input);
      // Merge backend response with current task state so partial responses
      // (e.g. backend missing quest_id) don't clobber optimistic fields
      setTasks(prev => prev.map(t =>
        t.task_id === updatedTask.task_id ? { ...t, ...updatedTask } : t
      ));
      showToast('Mission updated', 'success');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to update mission', 'error');
      throw err;
    }
  }, [tasks, closeModal, showToast]);
  
  const completeTask = useCallback(async (taskId: string) => {
    const previousTasks = tasks;
    const completedTask = tasks.find(t => t.task_id === taskId);
    const previousEngagement = engagementRef.current;
    const wasActive = isMissionPhase(previousEngagement.phase) && previousEngagement.missionId === taskId;
    if (wasActive) {
      commitEngagement(completeEngagement(previousEngagement));
    }
    
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
      showToast('Mission cleared', 'success');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      if (wasActive) commitEngagement(previousEngagement);
      showToast(err instanceof Error ? err.message : 'Failed to complete mission', 'error');
    }
  }, [tasks, showToast, commitEngagement]);

  const completeActive = useCallback(async () => {
    const id = engagementRef.current.missionId;
    if (!id || !isMissionPhase(engagementRef.current.phase)) return;
    await completeTask(id);
  }, [completeTask]);

  const cancelTask = useCallback(async (taskId: string) => {
    const previousTasks = tasks;

    // Optimistic update - remove from open task list immediately
    setTasks(prev => prev.filter(t => t.task_id !== taskId));

    try {
      await api.cancelTask(taskId);
      showToast('Mission deleted', 'success');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to delete mission', 'error');
      throw err;
    }
  }, [tasks, showToast]);
  
  const assignToday = useCallback(async (taskId: string, slot?: TodaySlot, swapWithTaskId?: string) => {
    // Only allow editing if viewing own loadout
    if (viewingLoadoutUser !== currentUser) {
      showToast('You can only edit your own loadout', 'error');
      return;
    }
    
    const previousTasks = tasks;
    
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.task_id === taskId) {
        return {
          ...t,
          today_slot: slot || t.today_slot || String(prev.filter(x => x.today_slot && x.today_user === currentUser).length + 1),
          today_set_at: new Date().toISOString(),
          today_user: currentUser,
        };
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
        return t;
      }));
    } catch (err) {
      setTasks(previousTasks); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to assign to Today', 'error');
    }
  }, [viewingLoadoutUser, currentUser, tasks, showToast]);

  const reorderLoadoutTasks = useCallback(async (orderedTaskIds: string[]) => {
    if (viewingLoadoutUser !== currentUser) {
      showToast('You can only edit your own loadout', 'error');
      return;
    }

    const previousTasks = tasks;
    const slotByTaskId = new Map(orderedTaskIds.map((taskId, index) => [taskId, String(index + 1)]));

    setTasks(prev => prev.map(task => {
      const nextSlot = slotByTaskId.get(task.task_id);
      if (!nextSlot) return task;
      return {
        ...task,
        today_slot: nextSlot,
        today_set_at: task.today_set_at || new Date().toISOString(),
        today_user: currentUser,
      };
    }));

    try {
      for (const taskId of orderedTaskIds) {
        const nextSlot = slotByTaskId.get(taskId);
        if (!nextSlot) continue;
        await api.assignToday(taskId, nextSlot);
      }
    } catch (err) {
      setTasks(previousTasks);
      showToast(err instanceof Error ? err.message : 'Failed to reorder loadout', 'error');
      throw err;
    }
  }, [currentUser, tasks, viewingLoadoutUser, showToast]);
  
  const clearToday = useCallback(async (taskId: string) => {
    // Only allow editing if viewing own loadout
    if (viewingLoadoutUser !== currentUser) {
      showToast('You can only edit your own loadout', 'error');
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
      showToast(err instanceof Error ? err.message : 'Failed to unload from today', 'error');
    }
  }, [viewingLoadoutUser, currentUser, tasks, showToast]);

  const setEnergyLevel = useCallback(async (level: EnergyLevel) => {
    try {
      await api.setEnergyLevel(level);
      await refreshLoadoutConfig();
      showToast('Energy level set to ' + level, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set energy level', 'error');
      throw err;
    }
  }, [showToast, refreshLoadoutConfig]);

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

  const completeQuest = useCallback(async (questId: string, mode: QuestCompletionMode = 'detach_open') => {
    const previousQuests = quests;
    const previousTasks = tasks;
    
    // Optimistic update - remove from list
    setQuests(prev => prev.filter(q => q.quest_id !== questId));
    
    try {
      const result = await api.completeQuest(questId, mode);

      // Keep frontend task state aligned with completion mode.
      if (result.completion_mode === 'detach_open') {
        setTasks(prev => prev.map(t =>
          t.status === 'open' && t.quest_id === questId
            ? { ...t, quest_id: '' }
            : t
        ));
      } else {
        setTasks(prev => prev.filter(t => !(t.status === 'open' && t.quest_id === questId)));
      }

      await refreshQuests(); // Refresh to get updated state

      if (result.affected_open_missions > 0) {
        const missionNoun = result.affected_open_missions === 1 ? 'mission' : 'missions';
        if (result.completion_mode === 'detach_open') {
          showToast(`Quest cleared. ${result.affected_open_missions} ${missionNoun} moved to the Cache.`, 'success');
        } else {
          showToast(`Quest cleared. ${result.affected_open_missions} ${missionNoun} cleared with it.`, 'success');
        }
      } else {
        showToast('Quest cleared', 'success');
      }
    } catch (err) {
      setQuests(previousQuests); // Rollback
      setTasks(previousTasks);
      showToast(err instanceof Error ? err.message : 'Failed to complete quest', 'error');
    }
  }, [quests, tasks, showToast, refreshQuests]);

  const requestCompleteQuest = useCallback(async (questId: string) => {
    const quest = quests.find(q => q.quest_id === questId);
    if (!quest || quest.status === 'done') return;

    const openMissionCount = openMissionsOfQuest(tasks, questId).length;

    setPendingQuestCompletion({
      questId,
      questTitle: quest.title,
      openMissionCount,
    });
  }, [quests, tasks]);

  const cancelQuestCompletion = useCallback(() => {
    setPendingQuestCompletion(null);
  }, []);

  // Move a tracked quest to another tracked quest's position (drag-to-reorder)
  const reorderQuests = useCallback(async (activeQuestId: string, targetQuestId: string) => {
    const previousQuests = quests;
    const tracked = quests
      .filter(q => q.is_tracked && q.status !== 'done')
      .slice()
      .sort(compareQuestSortOrder);

    const fromIndex = tracked.findIndex(q => q.quest_id === activeQuestId);
    const toIndex = tracked.findIndex(q => q.quest_id === targetQuestId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const reordered = [...tracked];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const orderById = new Map(reordered.map((q, index) => [q.quest_id, index + 1]));

    // Optimistic update
    setQuests(prev => prev.map(q => (
      orderById.has(q.quest_id) ? { ...q, sort_order: orderById.get(q.quest_id)! } : q
    )));

    try {
      await api.reorderQuests(reordered.map(q => q.quest_id));
    } catch (err) {
      setQuests(previousQuests); // Rollback
      showToast(err instanceof Error ? err.message : 'Failed to reorder quests', 'error');
    }
  }, [quests, showToast]);

  // "Today" rolls over at local midnight. Recompute when the tab regains
  // visibility (laptop lid, phone unlock) and on a one-minute tick so a
  // long-lived tab doesn't keep yesterday's date.
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const refresh = () => setTodayKey(prev => {
      const next = new Date().toDateString();
      return next === prev ? prev : next;
    });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const interval = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const isOverdue = useCallback((dueDateStr: string) => {
    if (!dueDateStr) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDateStr);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    return dueDay.getTime() < today.getTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const matchesAssigneeFilter = useCallback((t: Task) => {
    switch (assigneeFilter) {
      case 'john': return t.assignee === JOHN_EMAIL;
      case 'steph': return t.assignee === STEPH_EMAIL;
      case 'megan': return t.assignee === MEGAN_EMAIL;
      case 'all': return true;
    }
  }, [assigneeFilter]);

  const inboxBase = useMemo(() => tasks.filter(t => {
    if (t.status !== 'open') return false;
    if (t.today_slot) return false;
    if (t.quest_id) return false;
    return matchesAssigneeFilter(t);
  }), [matchesAssigneeFilter, tasks]);

  // Overdue spans every open mission for the filter — including missions
  // nested in quests — except those already loaded for today (they're being
  // handled; listing them again would only duplicate the Loadout).
  const overdueTasks = useMemo(() => (
    tasks
      .filter(t => t.status === 'open' && !t.today_slot && matchesAssigneeFilter(t) && isOverdue(t.due_date))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  ), [tasks, matchesAssigneeFilter, isOverdue]);

  const inboxTasks = useMemo(() => {
    const overdueIds = new Set(overdueTasks.map(t => t.task_id));

    return inboxBase
      .filter(t => !overdueIds.has(t.task_id))
      .sort((a, b) => {
        if (sortBy === 'due_date') {
          const aHas = Boolean(a.due_date);
          const bHas = Boolean(b.due_date);
          if (aHas !== bHas) return aHas ? -1 : 1;
          if (aHas && bHas) {
            const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            if (dateDiff !== 0) return dateDiff;
          }
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        }
        if (sortBy === 'quest') {
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
          const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          const aChallenge = a.challenge || 'high';
          const bChallenge = b.challenge || 'high';
          const challengeDiff = CHALLENGE_ORDER[aChallenge as Challenge] - CHALLENGE_ORDER[bChallenge as Challenge];
          if (challengeDiff !== 0) return challengeDiff;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [inboxBase, overdueTasks, sortBy]);
  
  const loadoutTasks = useMemo(() => (
    tasks.filter(t => {
      if (t.today_slot && t.status === 'open') {
        const belongsToUser = t.today_user 
          ? t.today_user === viewingLoadoutUser 
          : t.assignee === viewingLoadoutUser;
        return belongsToUser;
      }
      return false;
    }).sort((a, b) => {
      const slotDiff = parseLoadoutOrder(a.today_slot || '') - parseLoadoutOrder(b.today_slot || '');
      if (slotDiff !== 0) return slotDiff;
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    })
  ), [parseLoadoutOrder, tasks, viewingLoadoutUser]);

  // Missions completed today belong to the viewer if they were on the
  // viewer's loadout, or — when completed straight from the cache and so
  // never loaded (today_user empty) — if the viewer is the assignee.
  const accomplishedToday = useMemo(() => (
    completedTasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at).toDateString();
      if (completedDate !== todayKey) return false;
      return t.today_user
        ? t.today_user === viewingLoadoutUser
        : t.assignee === viewingLoadoutUser;
    }).sort((a, b) => {
      const slotDiff = parseLoadoutOrder(a.today_slot || '') - parseLoadoutOrder(b.today_slot || '');
      if (slotDiff !== 0) return slotDiff;
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    })
  ), [completedTasks, parseLoadoutOrder, todayKey, viewingLoadoutUser]);

  const loadTask = useCallback(async (taskId: string) => {
    const maxOrder = loadoutTasks.reduce((max, t) => {
      const order = parseLoadoutOrder(t.today_slot || '');
      return order !== Number.MAX_SAFE_INTEGER && order > max ? order : max;
    }, 0);
    await assignToday(taskId, String(maxOrder + 1));
  }, [assignToday, loadoutTasks, parseLoadoutOrder]);

  const trackedQuests = useMemo(() => (
    quests.filter(q => q.is_tracked && q.status === 'open')
  ), [quests]);

  const questColorById = useMemo(() => (
    quests.reduce<Record<string, string>>((map, quest) => {
      if (quest.color) map[quest.quest_id] = quest.color;
      return map;
    }, {})
  ), [quests]);

  // If the engaged mission vanished, was unloaded, or is no longer open, leave
  // the clock silently. Cooldown / offer have no mission to validate.
  useEffect(() => {
    if (loading) return;
    const valid = tasks
      .filter(t => t.status === 'open' && t.today_slot)
      .map(t => t.task_id);
    const next = reconcileEngagement(engagementRef.current, valid);
    if (next !== engagementRef.current) commitEngagement(next);
  }, [tasks, loading, commitEngagement]);

  const effectiveLoadoutConfig = useMemo(() => (
    loadoutConfig
      ? {
          ...loadoutConfig,
          points_used: calculateLoadoutPoints(tasks, currentUser),
          points_limit: pointsLimitFor(loadoutConfig.energy_level),
        }
      : loadoutConfig
  ), [currentUser, loadoutConfig, tasks]);
  
  // User is logged in as themselves - no switching needed
  // Viewing toggles (JOHN/STEF/ALL buttons and loadout toggle) still work for viewing
  
  const value: AppContextType = {
    currentUser,
    isJohn,
    johnEmail: JOHN_EMAIL,
    stephEmail: STEPH_EMAIL,
    meganEmail: MEGAN_EMAIL,
    tasks,
    completedTasks,
    loading,
    error,
    quests,
    loadingQuests,
    selectedQuest,
    isQuestModalOpen,
    isCreatingQuest,
    pendingQuestCompletion,
    assigneeFilter,
    viewMode,
    showCompleted,
    sortBy,
    selectedTask,
    isModalOpen,
    isCreating,
    taskModalDefaultQuestId,
    notices,
    isBulkImportOpen,
    setAssigneeFilter,
    setViewMode,
    toggleShowCompleted,
    setSortBy,
    openTaskModal,
    closeModal,
    openBulkImport,
    closeBulkImport,
    dismissNotice,
    refreshTasks,
    createTask,
    updateTask,
    completeTask,
    cancelTask,
    bulkCreateTasks,
    assignToday,
    loadTask,
    reorderLoadoutTasks,
    clearToday,
    refreshLoadoutConfig,
    setEnergyLevel,
    showToast,
    refreshQuests,
    createQuest,
    updateQuest,
    toggleQuestTracked,
    reorderQuests,
    requestCompleteQuest,
    completeQuest,
    cancelQuestCompletion,
    openQuestModal,
    closeQuestModal,
    inboxTasks,
    overdueTasks,
    loadoutTasks,
    accomplishedToday,
    trackedQuests,
    questColorById,
    viewingLoadoutUser,
    setViewingLoadoutUser,
    loadoutConfig: effectiveLoadoutConfig,
    engagement,
    engagementTick,
    engageMission,
    standDown,
    pauseEngagement,
    resumeEngagement,
    plusFive,
    acknowledgeChime,
    completeActive,
    startCooldown,
    skipCooldown,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

