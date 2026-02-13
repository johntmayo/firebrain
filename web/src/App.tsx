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
import { isAuthenticated, getSessionToken } from './api/client';
import { sounds } from './utils/sounds';
import type { Task, TodaySlot, Quest } from './types';

function AppContent() {
  const { 
    currentUser, 
    isJohn, 
    johnEmail, 
    stephEmail,
    viewingLoadoutUser,
    assignToday, 
    clearToday,
    showToast,
    todayTasks,
    tasks,
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
    
    // Check if dropped on a Today slot (for regular tasks/missions)
    if (overId.startsWith('slot-')) {
      if (!isViewingOwnLoadout) {
        showToast('You can only edit your own Today slots', 'error');
        sounds.dropCancel();
        return;
      }
      
      const targetSlot = overId.replace('slot-', '') as TodaySlot;
      const task = active.data.current?.task as Task;
      
      if (!task) return;
      
      // Check if slot is occupied
      const occupyingTask = todayTasks.get(targetSlot);
      
      if (occupyingTask && occupyingTask.task_id !== task.task_id) {
        // Slot is occupied - perform swap
        sounds.swap();
        assignToday(task.task_id, targetSlot, occupyingTask.task_id);
      } else if (!occupyingTask) {
        // Slot is empty
        sounds.dropSuccess();
        assignToday(task.task_id, targetSlot);
      }
      // If same task dropped on its own slot, do nothing
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
                      currentUser.split('@')[0];
  
  // Calculate some stats for status bar
  const totalSlotsFilled = Array.from(todayTasks.values()).filter(Boolean).length;
  const energyPercent = Math.round((totalSlotsFilled / 9) * 100);
  
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C12 2 8 6 8 10C8 12 9 13.5 10 14.5C9 15 8.5 16 8.5 17C8.5 19.5 10 21 12 22C14 21 15.5 19.5 15.5 17C15.5 16 15 15 14 14.5C15 13.5 16 12 16 10C16 6 12 2 12 2Z" fill="var(--accent-primary)"/>
              <path d="M12 6C12 6 10 8 10 10C10 11 10.5 11.75 11 12.25C10.5 12.5 10.25 13 10.25 13.5C10.25 14.75 11 15.5 12 16C13 15.5 13.75 14.75 13.75 13.5C13.75 13 13.5 12.5 13 12.25C13.5 11.75 14 11 14 10C14 8 12 6 12 6Z" fill="var(--accent-secondary)"/>
            </svg>
            <h1>Fire Brain</h1>
          </div>
          
          <div className="user-info">
            <ThemeSwitcher />
            <span>operator:</span>
            <span className={`user-badge ${isJohn ? 'john' : 'steph'}`}>
              {displayName}
            </span>
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

