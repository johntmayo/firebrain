import React, { useState, useEffect, useMemo } from 'react';
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
import { BulkImportModal } from './components/BulkImportModal';
import { PasswordScreen } from './components/PasswordScreen';
import { GadgetDrawer } from './components/GadgetDrawer';
import { SettingsModal } from './components/SettingsModal';
import { BriefingModal } from './components/BriefingModal';
import { clearSessionToken, isAuthenticated } from './api/client';
import { isBriefingDue, readBriefingSeen, todayKey, writeBriefingSeen } from './utils/briefing';
import { sounds } from './utils/sounds';
import { describeOperator } from './utils/operators';
import { getPriorityLevel } from './types';
import type { Task, Quest } from './types';
import firebrainLogo from './assets/firebrain_logo.svg';
import {
  ActionMenu,
  Icon,
  OperatorBadge,
  PaneDragHandleContext,
  PriorityChip,
  type ActionMenuItem,
  type IconName,
} from './components/primitives';

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

function getPaneIcon(pane: DesktopPane): IconName {
  if (pane === 'today') return 'loadout';
  if (pane === 'quests') return 'quest';
  return 'cache';
}

function AppContent() {
  const {
    currentUser,
    johnEmail,
    stephEmail,
    meganEmail,
    viewingLoadoutUser,
    setAssigneeFilter,
    loadTask,
    reorderLoadoutTasks,
    clearToday,
    showToast,
    loadoutTasks,
    updateTask,
    reorderQuests,
  } = useApp();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [briefingOpen, setBriefingOpen] = React.useState(false);

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

  const openBriefing = React.useCallback(() => setBriefingOpen(true), []);
  const closeBriefing = React.useCallback(() => {
    // Esc / Skip / Start / backdrop all mark today so the sheet does not reopen.
    writeBriefingSeen(todayKey());
    setBriefingOpen(false);
  }, []);

  React.useEffect(() => {
    const tryOpen = () => {
      if (viewingLoadoutUser !== currentUser) return;
      if (isBriefingDue(readBriefingSeen(), todayKey())) setBriefingOpen(true);
    };
    tryOpen();
    const onVis = () => {
      if (document.visibilityState === 'visible') tryOpen();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [viewingLoadoutUser, currentUser]);

  const handleFilterOverdue = React.useCallback(() => {
    if (currentUser === johnEmail) setAssigneeFilter('john');
    else if (currentUser === stephEmail) setAssigneeFilter('steph');
    else if (currentUser === meganEmail) setAssigneeFilter('megan');
    closeBriefing();
    if (isMobileViewport) setActiveMobilePane('inbox');
  }, [closeBriefing, currentUser, isMobileViewport, johnEmail, meganEmail, setAssigneeFilter, stephEmail]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 10,
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
      sounds.dragStart();
    } else if (quest) {
      setActiveQuest(quest);
      sounds.dragStart();
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
        showToast('Quests can\'t be loaded — load their missions instead', 'error');
      } else {
        sounds.dropCancel();
      }
      return;
    }

    // Dropped on a Case cell (free cell or an item's cell). The droppable
    // carries `insertIndex` from casePacking.insertIndexForCell: a free cell
    // inserts after everything that starts before it, an item cell inserts
    // before that item. Slots are renumbered 1..n in the resulting order.
    if (overId.startsWith('case-cell-')) {
      if (!isViewingOwnLoadout) {
        showToast('You can only edit your own loadout', 'error');
        sounds.dropCancel();
        return;
      }

      const task = active.data.current?.task as Task | undefined;
      if (!task) {
        sounds.dropCancel();
        return;
      }
      const ids = loadoutTasks.map(loadoutTask => loadoutTask.task_id);
      const rawIndex = Number(over.data.current?.insertIndex);
      const insertIndex = Number.isFinite(rawIndex) ? Math.max(0, Math.min(rawIndex, ids.length)) : ids.length;
      const fromIndex = ids.indexOf(task.task_id);

      let nextIds: string[];
      if (fromIndex === -1) {
        if (insertIndex >= ids.length) {
          sounds.dropSuccess();
          void loadTask(task.task_id);
          return;
        }
        nextIds = [...ids.slice(0, insertIndex), task.task_id, ...ids.slice(insertIndex)];
      } else {
        const toIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
        if (toIndex === fromIndex) {
          sounds.dropCancel();
          return;
        }
        nextIds = arrayMove(ids, fromIndex, toIndex);
      }

      try {
        await reorderLoadoutTasks(nextIds);
        sounds.dropSuccess();
      } catch {
        sounds.dropCancel();
      }
      return;
    }

    if (overId.startsWith('loadout-task-')) {
      if (!isViewingOwnLoadout) {
        showToast('You can only edit your own loadout', 'error');
        sounds.dropCancel();
        return;
      }

      const task = active.data.current?.task as Task;
      if (!task) return;
      const targetTaskId = overId.replace('loadout-task-', '');
      const fromIndex = loadoutTasks.findIndex(loadoutTask => loadoutTask.task_id === task.task_id);
      const toIndex = loadoutTasks.findIndex(loadoutTask => loadoutTask.task_id === targetTaskId);

      if (fromIndex === -1 || toIndex === -1) {
        sounds.dropSuccess();
        void loadTask(task.task_id);
        return;
      }

      if (fromIndex === toIndex) {
        sounds.dropCancel();
        return;
      }

      try {
        await reorderLoadoutTasks(arrayMove(loadoutTasks, fromIndex, toIndex).map(loadoutTask => loadoutTask.task_id));
        sounds.dropSuccess();
      } catch {
        sounds.dropCancel();
      }
      return;
    }

    // Dropped on loadout flow: append when not targeting a specific row.
    if (overId === 'loadout-drop-zone') {
      if (!isViewingOwnLoadout) {
        showToast('You can only edit your own loadout', 'error');
        sounds.dropCancel();
        return;
      }

      const task = active.data.current?.task as Task;
      if (!task) return;
      sounds.dropSuccess();
      void loadTask(task.task_id);
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
    // Dropped on the Cache - unload and detach from any quest
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
        if (task.quest_id) {
          await updateTask({ task_id: task.task_id, quest_id: '' });
        }
        sounds.dropSuccess();
      } catch {
        sounds.dropCancel();
      }
      return;
    } else {
      sounds.dropCancel();
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveQuest(null);
    setActivePanel(null);
    sounds.dropCancel();
  };

  const operator = useMemo(
    () => describeOperator(currentUser, { johnEmail, stephEmail, meganEmail }),
    [currentUser, johnEmail, stephEmail, meganEmail],
  );

  const handleLogout = () => {
    clearSessionToken();
    localStorage.removeItem('firebrain_user_email');
    window.location.reload();
  };

  const operatorMenuItems: ActionMenuItem[] = [
    { id: 'settings', label: 'Settings…', glyph: <Icon name="settings" />, onSelect: () => setSettingsOpen(true) },
    { id: 'sep', separator: true },
    { id: 'logout', label: 'Log out', glyph: <Icon name="logout" />, onSelect: handleLogout },
  ];

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
            <img className="app-logo__image" src={firebrainLogo} alt="" />
            <h1 className="app-logo__name t-display">Fire Brain</h1>
          </div>

          <ActionMenu
            label={`${operator.name} — settings and sign out`}
            hint="Settings and sign out"
            items={operatorMenuItems}
            triggerClassName="operator-menu-trigger"
            trigger={<OperatorBadge operator={operator} withName size="sm" title="" />}
          />
        </header>

        {isMobileViewport ? (
          <>
            <main className="app-main mobile-layout">
              <section className={`mobile-pane ${activeMobilePane === 'quests' ? 'is-active' : ''}`}>
                <QuestsPanel />
              </section>
              <section className={`mobile-pane ${activeMobilePane === 'inbox' ? 'is-active' : ''}`}>
                <Inbox />
              </section>
              <section className={`mobile-pane ${activeMobilePane === 'today' ? 'is-active' : ''}`}>
                <TodayPlanner onOpenBriefing={openBriefing} />
              </section>
            </main>

            <nav className="mobile-tab-bar" aria-label="Panes">
              {(['quests', 'inbox', 'today'] as MobilePane[]).map(pane => (
                <button
                  key={pane}
                  type="button"
                  className={`mobile-tab ${activeMobilePane === pane ? 'is-active' : ''}`}
                  onClick={() => setActiveMobilePane(pane)}
                  aria-current={activeMobilePane === pane ? 'page' : undefined}
                  aria-label={`${getDesktopPaneLabel(pane)} pane`}
                >
                  <Icon name={getPaneIcon(pane)} size={20} className="mobile-tab__icon" />
                  <span className="mobile-tab__label">{getDesktopPaneLabel(pane)}</span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          <main className="app-main desktop-layout">
            <SortableContext items={desktopPaneOrder} strategy={horizontalListSortingStrategy}>
              {desktopPaneOrder.map(pane => (
                <SortableDesktopPane key={pane} pane={pane}>
                  {pane === 'today' ? (
                    <TodayPlanner onOpenBriefing={openBriefing} />
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

        <GadgetDrawer />

        <TaskModal />
        <QuestModal />
        <QuestCompleteModal />
        <BulkImportModal />
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          operator={operator}
          onLogout={handleLogout}
        />
        <BriefingModal
          open={briefingOpen}
          onClose={closeBriefing}
          onFilterOverdue={handleFilterOverdue}
        />
        <Toast />
      </div>

      <DragOverlay dropAnimation={null}>
        {activePanel ? (
          <div className="drag-preview drag-preview--panel">
            <div className="drag-preview__title">{getDesktopPaneLabel(activePanel)}</div>
            <div className="drag-preview__hint t-xs">Drop left, middle, or right</div>
          </div>
        ) : activeQuest ? (
          <div className="drag-preview">
            <div className="drag-preview__title">{activeQuest.title}</div>
            <div className="drag-preview__hint t-xs">Drop on another quest to reorder</div>
          </div>
        ) : activeTask ? (
          <div className="drag-preview">
            <div className="drag-preview__title">{activeTask.title}</div>
            <div className="drag-preview__hint"><PriorityChip level={getPriorityLevel(activeTask.priority)} /></div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Desktop panes are sortable. The pane's own HudBar title is the drag handle
 * (via PaneDragHandleContext); nothing floats over the header controls.
 */
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

  const handle = useMemo(
    () => ({ attributes: attributes as React.HTMLAttributes<HTMLElement>, listeners, label: getDesktopPaneLabel(pane) }),
    [attributes, listeners, pane],
  );

  return (
    <section
      ref={setNodeRef}
      className={`desktop-pane-shell desktop-pane-shell--${pane} ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-drop-target' : ''}`}
      style={style}
    >
      <PaneDragHandleContext.Provider value={handle}>
        {children}
      </PaneDragHandleContext.Provider>
    </section>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleAuthenticated = () => {
    setAuthenticated(true);
  };

  if (checking) {
    return null;
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
