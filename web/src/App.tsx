import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Inbox } from './components/Inbox';
import { TodayPlanner } from './components/TodayPlanner';
import { TaskModal } from './components/TaskModal';
import { QuestModal } from './components/QuestModal';
import { QuestsPanel } from './components/QuestsPanel';
import { Toast } from './components/Toast';
import { QuestCompleteModal } from './components/QuestCompleteModal';

import { PasswordScreen } from './components/PasswordScreen';
import { Gizmodroar } from './components/Gizmodroar';
import { clearSessionToken, isAuthenticated } from './api/client';
import { sounds } from './utils/sounds';
import { getPriorityLevel } from './types';
import type { Task, Quest } from './types';
import firebrainLogo from './assets/firebrain_logo.svg';

type MobilePane = 'today' | 'quests' | 'inbox';
type DesktopPane = 'today' | 'quests' | 'inbox';
const MOBILE_BREAKPOINT_PX = 900;
const DESKTOP_PANE_ORDER_KEY = 'firebrain_desktop_pane_order';
const DEFAULT_DESKTOP_PANE_ORDER: DesktopPane[] = ['today', 'quests', 'inbox'];

function isDesktopPane(value: string): value is DesktopPane {
  return value === 'today' || value === 'quests' || value === 'inbox';
}

function getStoredDesktopPaneOrder(): DesktopPane[] {
  if (typeof window === 'undefined') return DEFAULT_DESKTOP_PANE_ORDER;

  try {
    const parsed = JSON.parse(localStorage.getItem(DESKTOP_PANE_ORDER_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_DESKTOP_PANE_ORDER;

    const savedPanes = parsed.filter((item): item is DesktopPane => (
      typeof item === 'string' && isDesktopPane(item)
    ));
    const missingPanes = DEFAULT_DESKTOP_PANE_ORDER.filter(pane => !savedPanes.includes(pane));
    return [...savedPanes, ...missingPanes].slice(0, DEFAULT_DESKTOP_PANE_ORDER.length);
  } catch {
    return DEFAULT_DESKTOP_PANE_ORDER;
  }
}

function getDesktopPaneLabel(pane: DesktopPane) {
  if (pane === 'today') return 'Loadout';
  if (pane === 'quests') return 'Quests';
  return 'Missions';
}

function AppContent() {
  const { 
    currentUser, 
    johnEmail, 
    stephEmail,
    meganEmail,
    viewingLoadoutUser,
    assignToday, 
    clearToday,
    showToast,
    loadoutConfig,
    loadoutTasks,
    updateTask,
    reorderQuests,
  } = useApp();
  
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [activeQuest, setActiveQuest] = React.useState<Quest | null>(null);
  const [activePanel, setActivePanel] = React.useState<DesktopPane | null>(null);
  const [desktopPaneOrder, setDesktopPaneOrder] = React.useState<DesktopPane[]>(getStoredDesktopPaneOrder);
  const [isMobileViewport, setIsMobileViewport] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT_PX;
  });
  const [activeMobilePane, setActiveMobilePane] = React.useState<MobilePane>('quests');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };
    setIsMobileViewport(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    localStorage.setItem(DESKTOP_PANE_ORDER_KEY, JSON.stringify(desktopPaneOrder));
  }, [desktopPaneOrder]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const collisionDetection = React.useCallback<CollisionDetection>((args) => {
    const collisions = pointerWithin(args);
    if (args.active.data.current?.type !== 'panel') {
      return collisions;
    }

    return collisions.filter(collision => isDesktopPane(String(collision.id)));
  }, []);
  
  const handleDragStart = (event: DragStartEvent) => {
    const panel = event.active.data.current?.panel as DesktopPane | undefined;
    const task = event.active.data.current?.task as Task | undefined;
    const quest = event.active.data.current?.quest as Quest | undefined;
    if (panel) {
      setActivePanel(panel);
    } else if (task) {
      setActiveTask(task);
    } else if (quest) {
      setActiveQuest(quest);
    }
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveQuest(null);
    setActivePanel(null);
    
    const { active, over } = event;
    const draggedPanel = active.data.current?.panel as DesktopPane | undefined;

    if (draggedPanel) {
      const overPane = over ? String(over.id) : '';
      if (!over || !isDesktopPane(overPane) || draggedPanel === overPane) {
        sounds.dropCancel();
        return;
      }

      setDesktopPaneOrder(prev => {
        const oldIndex = prev.indexOf(draggedPanel);
        const newIndex = prev.indexOf(overPane);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      sounds.dropSuccess();
      return;
    }
    
    const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
    
    if (!over) {
      // Dropped outside any droppable - if from a slot, clear it (only if viewing own loadout)
      const fromSlot = active.data.current?.fromSlot;
      if (fromSlot && isViewingOwnLoadout) {
        const task = active.data.current?.task as Task;
        if (task) {
          sounds.dropSuccess();
          clearToday(task.task_id);
        } else {
          sounds.dropCancel();
        }
      } else {
        sounds.dropCancel();
      }
      return;
    }
    
    const overId = over.id as string;
    
    // Quest drags reorder the Quests board (drop on another quest)
    if (active.data.current?.type === 'quest') {
      const draggedQuest = active.data.current?.quest as Quest;
      if (overId.startsWith('quest-drop-')) {
        const targetQuestId = overId.replace('quest-drop-', '');
        if (draggedQuest && targetQuestId !== draggedQuest.quest_id) {
          sounds.dropSuccess();
          reorderQuests(draggedQuest.quest_id, targetQuestId);
        } else {
          sounds.dropCancel();
        }
      } else if (overId === 'loadout-drop-zone') {
        sounds.dropCancel();
        showToast('Quests can\'t go in the loadout — drag individual missions instead', 'error');
      } else {
        sounds.dropCancel();
      }
      return;
    }
    
    // Dropped on loadout flow: always append (no blocking).
    if (overId === 'loadout-drop-zone') {
      if (!isViewingOwnLoadout) {
        showToast('You can only edit your own Today slots', 'error');
        sounds.dropCancel();
        return;
      }

      const task = active.data.current?.task as Task;
      if (!task) return;
      const parseLoadoutSlotOrder = (slotValue: string) => {
        const slot = (slotValue || '').toString().trim();
        if (!slot) return 0;

        const numeric = parseInt(slot, 10);
        if (!Number.isNaN(numeric) && numeric > 0) return numeric;

        const legacyOrder: Record<string, number> = {
          B1: 1, M1: 2, M2: 3, M3: 4, S1: 5, S2: 6, S3: 7, S4: 8, S5: 9,
        };
        return legacyOrder[slot.toUpperCase()] || 0;
      };

      const nextSlot = String(
        loadoutTasks.reduce((max, loadoutTask) => {
          const order = parseLoadoutSlotOrder(loadoutTask.today_slot || '');
          return order > max ? order : max;
        }, 0) + 1
      );

      sounds.dropSuccess();
      assignToday(task.task_id, nextSlot);
    }
    // Dropped on a Quest - assign mission to that quest
    else if (overId.startsWith('quest-drop-')) {
      const task = active.data.current?.task as Task;
      if (!task) {
        sounds.dropCancel();
        return;
      }
      const questId = overId.replace('quest-drop-', '');
      try {
        // If task is currently in a loadout slot, clear it first
        if (task.today_slot && isViewingOwnLoadout) {
          await clearToday(task.task_id);
        }
        await updateTask({ task_id: task.task_id, quest_id: questId });
        sounds.dropSuccess();
      } catch {
        sounds.dropCancel();
      }
      return;
    }
    // Dropped on Cache (inbox) - clear from loadout and clear from quest so it uses priority color again
    else if (overId === 'inbox-drop-zone') {
      const task = active.data.current?.task as Task;
      if (!task) {
        sounds.dropCancel();
        return;
      }
      try {
        if (task.today_slot && isViewingOwnLoadout) {
          await clearToday(task.task_id);
        }
        await updateTask({ task_id: task.task_id, quest_id: '' });
        sounds.dropSuccess();
      } catch {
        sounds.dropCancel();
      }
      return;
    } else {
      // Dropped somewhere invalid
      sounds.dropCancel();
    }
  };
  
  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveQuest(null);
    setActivePanel(null);
    sounds.dropCancel();
  };
  
  const displayName = currentUser === johnEmail ? 'John' : 
                      currentUser === stephEmail ? 'Stef' : 
                      currentUser === meganEmail ? 'Megan' :
                      currentUser.split('@')[0];
  const userBadgeClass = currentUser === johnEmail
    ? 'john'
    : currentUser === stephEmail
      ? 'steph'
      : currentUser === meganEmail
        ? 'megan'
        : 'user';
  
  // Calculate some stats for status bar
  const energyPercent = loadoutConfig
    ? Math.max(0, Math.round((loadoutConfig.points_used / Math.max(loadoutConfig.points_limit, 1)) * 100))
    : 0;

  const handleLogout = () => {
    clearSessionToken();
    localStorage.removeItem('firebrain_user_email');
    window.location.reload();
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`app ${isMobileViewport ? 'mobile-mode' : ''}`}>
        <header className="app-header">
          <div className="app-logo">
            <img className="app-logo-image" src={firebrainLogo} alt="Fire Brain logo" />
            <h1>Fire Brain</h1>
          </div>
          
          <div className="user-info">
            <span className={`user-badge ${userBadgeClass}`}>
              {displayName}
            </span>
            <button className="logout-btn" onClick={handleLogout} title="Log out">
              Log out
            </button>
          </div>
        </header>
        
        {isMobileViewport ? (
          <>
            <main className="app-main mobile-layout">
              <section className={`mobile-pane ${activeMobilePane === 'quests' ? 'active' : ''}`}>
                <QuestsPanel />
              </section>
              <section className={`mobile-pane ${activeMobilePane === 'inbox' ? 'active' : ''}`}>
                <Inbox />
              </section>
              <section className={`mobile-pane ${activeMobilePane === 'today' ? 'active' : ''}`}>
                <TodayPlanner />
              </section>
            </main>

            <nav className="mobile-tab-bar" aria-label="Mobile navigation">
              <button
                type="button"
                className={`mobile-tab-btn ${activeMobilePane === 'quests' ? 'active' : ''}`}
                onClick={() => setActiveMobilePane('quests')}
              >
                Quests
              </button>
              <button
                type="button"
                className={`mobile-tab-btn ${activeMobilePane === 'inbox' ? 'active' : ''}`}
                onClick={() => setActiveMobilePane('inbox')}
              >
                Missions
              </button>
              <button
                type="button"
                className={`mobile-tab-btn ${activeMobilePane === 'today' ? 'active' : ''}`}
                onClick={() => setActiveMobilePane('today')}
              >
                Loadout
              </button>
            </nav>
          </>
        ) : (
          <main className="app-main desktop-layout">
            <SortableContext items={desktopPaneOrder} strategy={horizontalListSortingStrategy}>
              {desktopPaneOrder.map(pane => (
                <SortableDesktopPane key={pane} pane={pane}>
                  {pane === 'today' ? (
                    <TodayPlanner />
                  ) : pane === 'quests' ? (
                    <QuestsPanel />
                  ) : (
                    <Inbox />
                  )}
                </SortableDesktopPane>
              ))}
            </SortableContext>
          </main>
        )}
        
        <footer className="status-bar">
          <div className="status-group">
            <div className="status-item">
              <span className="label">Sync</span>
              <div className="scan-bar"></div>
            </div>
            <div className="status-item">
              <span className="label">Energy</span>
              <div className="energy-bar">
                <div className="energy-bar-fill" style={{ width: `${energyPercent}%` }}></div>
              </div>
              <span className="value">{energyPercent}%</span>
            </div>
          </div>
          <div className="status-group">
            <div className="status-item">
              <span className="label">Streak</span>
              <span className="value gold">0 days</span>
            </div>
            <div className="status-item">
              <span className="label">Rank</span>
              <span className="value purple">Initiate</span>
            </div>
            <div className="status-item">
              <span className="label">XP</span>
              <span className="value">0</span>
            </div>
          </div>
        </footer>

        <Gizmodroar />
        
        <TaskModal />
        <QuestModal />
        <QuestCompleteModal />
        <Toast />
      </div>
      
      <DragOverlay>
        {activePanel ? (
          <div className="drag-preview panel-drag-preview">
            <div style={{ fontWeight: 600 }}>{getDesktopPaneLabel(activePanel)}</div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '4px'
            }}>
              Drop left, middle, or right
            </div>
          </div>
        ) : activeQuest ? (
          <div className="drag-preview">
            <div style={{ fontWeight: 500 }}>{activeQuest.title}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)',
              marginTop: '4px' 
            }}>
              Drop on another quest to reorder
            </div>
          </div>
        ) : activeTask ? (
          <div className="drag-preview">
            <div style={{ fontWeight: 500 }}>{activeTask.title}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)',
              marginTop: '4px' 
            }}>
              P{getPriorityLevel(activeTask.priority)}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableDesktopPane({ pane, children }: { pane: DesktopPane; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: pane,
    data: { type: 'panel', panel: pane },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section
      ref={setNodeRef}
      className={`desktop-pane-shell desktop-pane-shell-${pane} ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
      style={style}
    >
      <button
        type="button"
        className="desktop-pane-drag-handle"
        title={`Drag ${getDesktopPaneLabel(pane)} pane`}
        aria-label={`Drag ${getDesktopPaneLabel(pane)} pane`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⋮⋮</span>
        <span>{getDesktopPaneLabel(pane)}</span>
      </button>
      {children}
    </section>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated()) {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleAuthenticated = () => {
    setAuthenticated(true);
  };

  if (checking) {
    return null; // Or a loading spinner
  }

  if (!authenticated) {
    return (
      <ThemeProvider>
        <PasswordScreen onAuthenticated={handleAuthenticated} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

