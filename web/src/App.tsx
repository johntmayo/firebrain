import React from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AppProvider, useApp } from './context/AppContext';
import { Inbox } from './components/Inbox';
import { TodayPlanner } from './components/TodayPlanner';
import { TaskModal } from './components/TaskModal';
import { Toast } from './components/Toast';
import type { Task, TodaySlot } from './types';

function AppContent() {
  const { 
    currentUser, 
    isJohn, 
    johnEmail, 
    stephEmail,
    assignToday, 
    clearToday,
    showToast,
    todayTasks,
    tasks,
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
    if (task) {
      setActiveTask(task);
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    
    if (!over) {
      // Dropped outside any droppable - if from a slot, clear it
      const fromSlot = active.data.current?.fromSlot;
      if (fromSlot && isJohn) {
        const task = active.data.current?.task as Task;
        if (task) {
          clearToday(task.task_id);
        }
      }
      return;
    }
    
    const overId = over.id as string;
    
    // Check if dropped on a Today slot
    if (overId.startsWith('slot-')) {
      if (!isJohn) {
        showToast('Only John can edit Today slots', 'error');
        return;
      }
      
      const targetSlot = overId.replace('slot-', '') as TodaySlot;
      const task = active.data.current?.task as Task;
      
      if (!task) return;
      
      // Check if slot is occupied
      const occupyingTask = todayTasks.get(targetSlot);
      
      if (occupyingTask && occupyingTask.task_id !== task.task_id) {
        // Slot is occupied - perform swap
        assignToday(task.task_id, targetSlot, occupyingTask.task_id);
      } else if (!occupyingTask) {
        // Slot is empty
        assignToday(task.task_id, targetSlot);
      }
      // If same task dropped on its own slot, do nothing
    }
    // Dropped on inbox - if from slot, clear it
    else if (overId === 'inbox-drop-zone' && active.data.current?.fromSlot && isJohn) {
      const task = active.data.current?.task as Task;
      if (task?.today_slot) {
        clearToday(task.task_id);
      }
    }
  };
  
  const handleDragCancel = () => {
    setActiveTask(null);
  };
  
  const displayName = currentUser === johnEmail ? 'John' : 
                      currentUser === stephEmail ? 'Stef' : 
                      currentUser.split('@')[0];
  
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app">
        <header className="app-header">
          <div className="app-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C12 2 8 6 8 10C8 12 9 13.5 10 14.5C9 15 8.5 16 8.5 17C8.5 19.5 10 21 12 22C14 21 15.5 19.5 15.5 17C15.5 16 15 15 14 14.5C15 13.5 16 12 16 10C16 6 12 2 12 2Z" fill="#FF6B35"/>
              <path d="M12 6C12 6 10 8 10 10C10 11 10.5 11.75 11 12.25C10.5 12.5 10.25 13 10.25 13.5C10.25 14.75 11 15.5 12 16C13 15.5 13.75 14.75 13.75 13.5C13.75 13 13.5 12.5 13 12.25C13.5 11.75 14 11 14 10C14 8 12 6 12 6Z" fill="#FFD93D"/>
            </svg>
            <h1>Fire Brain</h1>
          </div>
          
          <div className="user-info">
            <span>Logged in as:</span>
            <span className={`user-badge ${isJohn ? 'john' : 'steph'}`}>
              {displayName}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              (press 'u' to switch)
            </span>
          </div>
        </header>
        
        <main className="app-main">
          <Inbox />
          <TodayPlanner />
        </main>
        
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
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

