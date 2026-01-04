import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { BulkImportModal } from './BulkImportModal';
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
    sortBy,
    setSortBy,
    openTaskModal
  } = useApp();

  const [showBulkImport, setShowBulkImport] = useState(false);
  
  const handleAddTask = () => {
    openTaskModal(null, true);
  };
  
  return (
    <div className="pane pane-inbox">
      <div className="pane-header">
        <h2>
          <span className="icon">◈</span>
          THE CACHE
        </h2>
        
        <div className="filter-row">
          <button 
            className={`filter-btn ${assigneeFilter === 'john' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('john')}
          >
            JOHN
          </button>
          <button 
            className={`filter-btn ${assigneeFilter === 'steph' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('steph')}
          >
            STEF
          </button>
          <button 
            className={`filter-btn ${assigneeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('all')}
          >
            ALL
          </button>
          
          <div className="view-toggle">
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ≡
            </button>
            <button 
              className={viewMode === 'buckets' ? 'active' : ''}
              onClick={() => setViewMode('buckets')}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
          
          <div className="sort-toggle">
            <button 
              className={`filter-btn ${sortBy === 'priority' ? 'active' : ''}`}
              onClick={() => setSortBy('priority')}
              title="Sort by Priority"
            >
              PRIORITY
            </button>
            <button 
              className={`filter-btn ${sortBy === 'challenge' ? 'active' : ''}`}
              onClick={() => setSortBy('challenge')}
              title="Sort by Challenge"
            >
              CHALLENGE
            </button>
          </div>
          
          <button 
            className={`filter-btn ${showCompleted ? 'active' : ''}`}
            onClick={toggleShowCompleted}
            title="Show completed tasks"
          >
            ✓ DONE
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
        showBulkImport={showBulkImport}
        onToggleBulkImport={() => setShowBulkImport(!showBulkImport)}
      />

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
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
  onAddTask,
  showBulkImport,
  onToggleBulkImport
}: {
  tasks: Task[];
  completedTasks: Task[];
  showCompleted: boolean;
  loading: boolean;
  viewMode: 'list' | 'buckets';
  onAddTask: () => void;
  showBulkImport: boolean;
  onToggleBulkImport: () => void;
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
          <div className="empty-state-icon">◇</div>
          <div className="empty-state-text">
            CACHE EMPTY
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
            <span>◆ CLEARED ({completedTasks.length})</span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <div className="empty-state-text" style={{ fontSize: '0.7rem' }}>
                NO CLEARED QUESTS
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
        
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="add-task-btn" style={{ flex: 1 }} onClick={onAddTask}>
          <span>+</span>
          NEW QUEST
        </button>
        <button
          className="add-task-btn"
          style={{ flex: 1, background: 'var(--accent-secondary)' }}
          onClick={onToggleBulkImport}
        >
          <span>◆</span>
          BULK IMPORT
        </button>
      </div>

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
      />
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
  // Sort tasks by priority but display in a single grid (inventory style)
  const priorityOrder: Record<Priority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  
  const sortedTasks = [...tasks].sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  
  return (
    <div className="inventory-grid">
      {sortedTasks.map(task => (
        <TaskCard key={task.task_id} task={task} compact />
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
          <span className="completed-date">◆ CLEARED {completedDate}</span>
        </div>
      </div>
    </div>
  );
}

