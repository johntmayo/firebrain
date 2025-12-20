import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import type { Priority, Task } from '../types';

export function Inbox() {
  const { 
    inboxTasks, 
    completedTasks,
    loading, 
    assigneeFilter, 
    setAssigneeFilter,
    viewMode,
    setViewMode,
    showCompleted,
    toggleShowCompleted,
    openTaskModal 
  } = useApp();
  
  const handleAddTask = () => {
    openTaskModal(null, true);
  };
  
  return (
    <div className="pane pane-inbox">
      <div className="pane-header">
        <h2>
          <span className="icon">📥</span>
          Inbox
        </h2>
        
        <div className="filter-row">
          <button 
            className={`filter-btn ${assigneeFilter === 'john' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('john')}
          >
            John
          </button>
          <button 
            className={`filter-btn ${assigneeFilter === 'steph' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('steph')}
          >
            Stef
          </button>
          <button 
            className={`filter-btn ${assigneeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('all')}
          >
            All
          </button>
          
          <div className="view-toggle">
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button 
              className={viewMode === 'buckets' ? 'active' : ''}
              onClick={() => setViewMode('buckets')}
              title="Bucket view"
            >
              ▦
            </button>
          </div>
          
          <button 
            className={`filter-btn ${showCompleted ? 'active' : ''}`}
            onClick={toggleShowCompleted}
            title="Show completed tasks"
          >
            ✓ Done
          </button>
        </div>
      </div>
      
      <InboxContent 
        tasks={inboxTasks}
        completedTasks={completedTasks}
        showCompleted={showCompleted}
        loading={loading}
        viewMode={viewMode}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

function InboxContent({ 
  tasks, 
  completedTasks,
  showCompleted,
  loading, 
  viewMode, 
  onAddTask 
}: { 
  tasks: Task[];
  completedTasks: Task[];
  showCompleted: boolean;
  loading: boolean;
  viewMode: 'list' | 'buckets';
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'inbox-drop-zone',
  });

  return (
    <div 
      ref={setNodeRef}
      className={`pane-content ${isOver ? 'drag-over-inbox' : ''}`}
      style={{ 
        transition: 'background 0.2s ease',
        background: isOver ? 'rgba(255, 107, 53, 0.05)' : undefined 
      }}
    >
      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : tasks.length === 0 && !showCompleted ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">
            No tasks in inbox
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <ListView tasks={tasks} />
      ) : (
        <BucketsView tasks={tasks} />
      )}
      
      {showCompleted && (
        <div className="completed-section">
          <div className="completed-header">
            <span>✓ Completed ({completedTasks.length})</span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <div className="empty-state-text" style={{ fontSize: '0.85rem' }}>
                No completed tasks yet
              </div>
            </div>
          ) : (
            <div className="task-list completed-list">
              {completedTasks.map(task => (
                <CompletedTaskCard key={task.task_id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}
        
      <button className="add-task-btn" onClick={onAddTask}>
        <span>+</span>
        Add Task
      </button>
    </div>
  );
}

function ListView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard key={task.task_id} task={task} />
      ))}
    </div>
  );
}

function BucketsView({ tasks }: { tasks: Task[] }) {
  const buckets: Record<Priority, typeof tasks> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  
  tasks.forEach(task => {
    buckets[task.priority].push(task);
  });
  
  return (
    <div className="buckets-view">
      {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(priority => (
        <div key={priority} className={`bucket ${priority}`}>
          <div className="bucket-header">
            {priority} ({buckets[priority].length})
          </div>
          <div className="bucket-content">
            {buckets[priority].length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem' }}>
                <div className="empty-state-text" style={{ fontSize: '0.75rem' }}>
                  None
                </div>
              </div>
            ) : (
              buckets[priority].map(task => (
                <TaskCard key={task.task_id} task={task} compact />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompletedTaskCard({ task }: { task: Task }) {
  const { openTaskModal } = useApp();
  
  const completedDate = task.completed_at 
    ? new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  
  return (
    <div 
      className="task-card completed"
      onClick={() => openTaskModal(task)}
    >
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className="completed-date">✓ {completedDate}</span>
        </div>
      </div>
    </div>
  );
}

