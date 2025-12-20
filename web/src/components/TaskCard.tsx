import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../types';
import { useApp } from '../context/AppContext';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  showDragHandle?: boolean;
  inSlot?: boolean;
}

export function TaskCard({ task, compact = false, showDragHandle = true, inSlot = false }: TaskCardProps) {
  const { completeTask, openTaskModal, johnEmail, stephEmail } = useApp();
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
    data: { task, fromSlot: inSlot },
  });
  
  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    completeTask(task.task_id);
  };
  
  const handleClick = () => {
    openTaskModal(task);
  };
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const assigneeName = task.assignee === johnEmail ? 'John' : 
                       task.assignee === stephEmail ? 'Stef' : 
                       task.assignee.split('@')[0];
  
  return (
    <div
      ref={setNodeRef}
      className={`task-card ${isDragging ? 'dragging' : ''} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {showDragHandle && (
        <div className="drag-handle" {...listeners} {...attributes}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5" />
            <circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
          </svg>
        </div>
      )}
      
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className={`priority-pill ${task.priority}`}>
            {task.priority}
          </span>
          
          {!inSlot && (
            <span className="task-assignee">{assigneeName}</span>
          )}
          
          {task.due_date && (
            <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
              📅 {formatDate(task.due_date)}
            </span>
          )}
          
          {task.notes && (
            <span className="task-notes-icon" title="Has notes">📝</span>
          )}
        </div>
      </div>
      
      <div className="task-actions">
        <button 
          className="btn-done" 
          onClick={handleDone}
          title="Mark as done"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
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

