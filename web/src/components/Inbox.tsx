import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import type { Priority } from '../types';

export function Inbox() {
  const { 
    inboxTasks, 
    loading, 
    assigneeFilter, 
    setAssigneeFilter,
    viewMode,
    setViewMode,
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
            Steph
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
        </div>
      </div>
      
      <InboxContent 
        tasks={inboxTasks}
        loading={loading}
        viewMode={viewMode}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

function InboxContent({ 
  tasks, 
  loading, 
  viewMode, 
  onAddTask 
}: { 
  tasks: typeof useApp extends () => infer R ? R['inboxTasks'] : never;
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
      ) : tasks.length === 0 ? (
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
        
      <button className="add-task-btn" onClick={onAddTask}>
        <span>+</span>
        Add Task
      </button>
    </div>
  );
}

function ListView({ tasks }: { tasks: typeof useApp extends () => infer R ? R['inboxTasks'] : never }) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard key={task.task_id} task={task} />
      ))}
    </div>
  );
}

function BucketsView({ tasks }: { tasks: typeof useApp extends () => infer R ? R['inboxTasks'] : never }) {
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

