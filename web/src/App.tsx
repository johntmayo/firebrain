import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Inbox } from './components/Inbox';
import { TodayPlanner } from './components/TodayPlanner';
import { TaskModal } from './components/TaskModal';
import { QuestsPanel } from './components/QuestsPanel';
import { Toast } from './components/Toast';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { PasswordScreen } from './components/PasswordScreen';
import { Gizmodroar } from './components/Gizmodroar';
import { clearSessionToken, isAuthenticated } from './api/client';
import { sounds } from './utils/sounds';
import type { Task, Quest } from './types';
import firebrainLogo from './assets/firebrain_logo.svg';

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
  } = useApp();
  
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  
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
  
  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    const quest = event.active.data.current?.quest as Quest | undefined;
    if (task) {
      setActiveTask(task);
    } else if (quest) {
      // For quests, we'll show the quest title in the drag preview
      setActiveTask({
        ...quest,
        task_id: quest.quest_id,
        title: `Quest: ${quest.title}`,
        priority: 'medium',
        challenge: '',
        due_date: '',
        today_slot: '',
        today_set_at: '',
        completed_at: '',
        today_user: '',
      } as Task);
    }
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    
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
    
    // Quests cannot be dragged to the loadout - only missions can
    if (active.data.current?.type === 'quest') {
      sounds.dropCancel();
      showToast('Quests can\'t go in the loadout — drag individual missions instead', 'error');
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
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app">
        <header className="app-header">
          <div className="app-logo">
            <img className="app-logo-image" src={firebrainLogo} alt="Fire Brain logo" />
            <h1>Fire Brain</h1>
          </div>
          
          <div className="user-info">
            <ThemeSwitcher />
            <span>operator:</span>
            <span className={`user-badge ${userBadgeClass}`}>
              {displayName}
            </span>
            <button className="logout-btn" onClick={handleLogout} title="Log out">
              LOG OUT
            </button>
          </div>
        </header>
        
        <main className="app-main">
          <TodayPlanner />
          <QuestsPanel />
          <Inbox />
        </main>
        
        {/* Status Bar Footer */}
        <footer className="status-bar">
          <div className="status-group">
            <div className="status-item">
              <span className="label">SYS</span>
              <div className="scan-bar"></div>
            </div>
            <div className="status-item">
              <span className="label">ENERGY</span>
              <div className="energy-bar">
                <div className="energy-bar-fill" style={{ width: `${energyPercent}%` }}></div>
              </div>
              <span className="value">{energyPercent}%</span>
            </div>
          </div>
          <div className="status-group">
            <div className="status-item">
              <span className="label">STREAK</span>
              <span className="value gold">0 DAYS</span>
            </div>
            <div className="status-item">
              <span className="label">RANK</span>
              <span className="value purple">INITIATE</span>
            </div>
            <div className="status-item">
              <span className="label">XP</span>
              <span className="value">0</span>
            </div>
          </div>
        </footer>

        <Gizmodroar />
        
        <TaskModal />
        <Toast />
      </div>
      
      <DragOverlay>
        {activeTask ? (
          <div className="drag-preview">
            <div style={{ fontWeight: 500 }}>{activeTask.title}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)',
              marginTop: '4px' 
            }}>
              {activeTask.priority}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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

