import React, { useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../types';
import { useApp } from '../context/AppContext';
import { useTimer } from '../context/TimerContext';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  showDragHandle?: boolean;
  inSlot?: boolean;
  completed?: boolean;
}

export function TaskCard({ task, compact = false, showDragHandle = true, inSlot = false, completed = false }: TaskCardProps) {
  const { completeTask, openTaskModal, johnEmail, stephEmail, startTimer, pauseTimer, stopTimer } = useApp();
  const { startTimer: startClientTimer, getTimerProgress } = useTimer();
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
    data: { task, fromSlot: inSlot },
    disabled: completed, // Disable dragging for completed tasks
  });

  // Initialize client-side timer if task has an active timer
  useEffect(() => {
    if (task.timer_active && task.timer_start && task.timer_duration > 0) {
      startClientTimer(task);
    }
  }, [task.timer_active, task.timer_start, task.timer_duration, startClientTimer, task]);

  const timerProgress = getTimerProgress(task.task_id);
  
  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!completed) {
      completeTask(task.task_id);
    }
  };
  
  const handleClick = () => {
    openTaskModal(task);
  };
  
  const handleDragHandleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent opening modal when clicking handle
  };
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const assigneeName = task.assignee === johnEmail ? 'John' : 
                       task.assignee === stephEmail ? 'Stef' : 
                       task.assignee.split('@')[0];
  
  const isCompleted = completed || task.status === 'done';
  
  return (
    <div
      ref={setNodeRef}
      className={`task-card priority-${task.priority} ${isDragging ? 'dragging' : ''} ${compact ? 'compact' : ''} ${isCompleted ? 'completed' : ''}`}
      onClick={handleClick}
      style={{ opacity: isDragging ? 0.5 : 1, position: 'relative' }}
    >
      {showDragHandle && !isCompleted && (
          <div 
            className="drag-handle"
            {...listeners}
            {...attributes}
            onClick={handleDragHandleClick}
            onTouchStart={handleDragHandleClick}
            title="Drag to move"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="12" r="1"/>
              <circle cx="9" cy="5" r="1"/>
              <circle cx="9" cy="19" r="1"/>
              <circle cx="15" cy="12" r="1"/>
              <circle cx="15" cy="5" r="1"/>
              <circle cx="15" cy="19" r="1"/>
            </svg>
          </div>
      )}
      {/* Timer Progress Bar */}
      {timerProgress && (
        <div
          className="task-timer-progress"
          style={{
            width: `${timerProgress.progress}%`,
            background: task.timer_active
              ? 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))'
              : 'var(--text-muted)'
          }}
        />
      )}

      <div className="task-card-header">
        <div className="task-content">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span className={`priority-pill ${task.priority}`}>
              {task.priority.toUpperCase()}
            </span>
            
            {!inSlot && (
              <span className="task-assignee">{assigneeName}</span>
            )}
            
            {task.due_date && (
              <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                ◷ {formatDate(task.due_date)}
              </span>
            )}
            
            {task.notes && (
              <span className="task-notes-icon" title="Has notes">◆</span>
            )}
          </div>
        </div>
        
        {!isCompleted && (
          <div className="task-actions">
            {/* Timer Controls */}
            {task.timer_active ? (
              <>
                <button
                  className="btn-timer-pause"
                  onClick={(e) => {
                    e.stopPropagation();
                    pauseTimer(task.task_id);
                  }}
                  title="Pause timer"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                </button>
                <button
                  className="btn-timer-stop"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopTimer(task.task_id);
                  }}
                  title="Stop timer"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                </button>
              </>
            ) : task.timer_duration > 0 ? (
              <button
                className="btn-timer-start"
                onClick={(e) => {
                  e.stopPropagation();
                  startTimer(task.task_id, task.timer_duration);
                }}
                title={`Start ${task.timer_duration}min timer`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            ) : null}

            <button
              className="btn-done"
              onClick={handleDone}
              title="Mark as done"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

