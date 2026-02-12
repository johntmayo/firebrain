import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task, Quest } from '../types';
import { useApp } from '../context/AppContext';
import { useTimer } from '../context/TimerContext';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  showDragHandle?: boolean;
  inSlot?: boolean;
  completed?: boolean;
  showTimerButton?: boolean;
  onTimerClick?: () => void;
  isTimerActive?: boolean;
  /** When set (e.g. from nested quest), mission uses this color instead of priority */
  questColor?: string;
}

export function TaskCard({
  task,
  compact = false,
  showDragHandle = true,
  inSlot = false,
  completed = false,
  showTimerButton = false,
  onTimerClick,
  isTimerActive = false,
  questColor: questColorProp,
}: TaskCardProps) {
  const { completeTask, openTaskModal, johnEmail, stephEmail, quests } = useApp();
  const { activeTimer, getTimerProgress } = useTimer();

  // Resolve quest color: prop override, or from task.quest_id
  const questColor = questColorProp ?? (task.quest_id ? quests.find((q: Quest) => q.quest_id === task.quest_id)?.color : undefined);
  const hasQuestColor = Boolean(questColor && questColor.trim());

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
    data: { task, fromSlot: inSlot },
    disabled: completed, // Disable dragging for completed tasks
  });

  const timerProgress = getTimerProgress();
  const isActiveTimer = timerProgress && activeTimer?.taskId === task.task_id;
  
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
  
  const dueStatus = getDueDateStatus(task.due_date);
  const assigneeName = task.assignee === johnEmail ? 'John' :
                       task.assignee === stephEmail ? 'Stef' :
                       task.assignee.split('@')[0];
  
  const isCompleted = completed || task.status === 'done';
  
  return (
    <div
      ref={setNodeRef}
      className={`task-card priority-${task.priority} ${isDragging ? 'dragging' : ''} ${compact ? 'compact' : ''} ${isCompleted ? 'completed' : ''} ${hasQuestColor ? 'quest-colored' : ''} ${dueStatus.className}`}
      onClick={handleClick}
      style={{
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        ...(hasQuestColor && questColor ? ({ '--task-accent': questColor } as React.CSSProperties) : {}),
      }}
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
      {/* Timer Progress Bar - only show on active timer task */}
      {isActiveTimer && timerProgress && (
        <div
          className="task-timer-progress"
          style={{
            width: `${timerProgress.progress}%`,
            background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))'
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
              <span className={`task-due ${dueStatus.badgeClass}`}>
                ◷ {dueStatus.label}
              </span>
            )}
            
            {task.notes && (
              <span className="task-notes-icon" title="Has notes">◆</span>
            )}
          </div>
        </div>
        
        {!isCompleted && (
          <div className="task-actions">
            {showTimerButton && onTimerClick && (
              <button
                className={`btn-timer-icon ${isTimerActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTimerClick();
                }}
                title={isTimerActive ? "Timer active" : "Start timer"}
              >
                ⏱️
              </button>
            )}
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

export type DueDateTier = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'none';

interface DueDateStatus {
  tier: DueDateTier;
  label: string;
  className: string;    // CSS class for the card div
  badgeClass: string;   // CSS class for the badge span
}

export function getDueDateStatus(dueDateStr: string): DueDateStatus {
  if (!dueDateStr) {
    return { tier: 'none', label: '', className: '', badgeClass: '' };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDateStr);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const label = overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
    return { tier: 'overdue', label, className: 'due-overdue', badgeClass: 'overdue' };
  }
  if (diffDays === 0) {
    return { tier: 'today', label: 'Due Today', className: 'due-today', badgeClass: 'due-today' };
  }
  if (diffDays === 1) {
    return { tier: 'tomorrow', label: 'Due Tomorrow', className: 'due-tomorrow', badgeClass: 'due-tomorrow' };
  }
  if (diffDays <= 7) {
    const dayName = dueDay.toLocaleDateString('en-US', { weekday: 'short' });
    return { tier: 'this-week', label: `Due ${dayName}`, className: '', badgeClass: '' };
  }

  const formatted = dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { tier: 'none', label: formatted, className: '', badgeClass: '' };
}

