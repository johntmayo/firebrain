import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../types';
import { useApp } from '../context/AppContext';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  showDragHandle?: boolean;
  inSlot?: boolean;
  completed?: boolean;
}

export function TaskCard({ task, compact = false, showDragHandle = true, inSlot = false, completed = false }: TaskCardProps) {
  const { completeTask, openTaskModal, johnEmail, stephEmail } = useApp();
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
    data: { task, fromSlot: inSlot },
    disabled: completed, // Disable dragging for completed tasks
  });
  
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="1"/>
            <circle cx="9" cy="5" r="1"/>
            <circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="12" r="1"/>
            <circle cx="15" cy="5" r="1"/>
            <circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
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

