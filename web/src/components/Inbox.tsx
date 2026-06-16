import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { BulkImportModal } from './BulkImportModal';
import { CHALLENGE_ORDER, getPriorityLevel } from '../types';
import type { Challenge, Priority, Quest, SortBy, Task } from '../types';

export function Inbox() {
  const {
    inboxTasks,
    overdueTasks,
    tasks,
    quests,
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
    openTaskModal,
    johnEmail,
    stephEmail,
    meganEmail,
  } = useApp();

  const [showBulkImport, setShowBulkImport] = useState(false);
  const matrixTasks = useMemo(() => (
    tasks
      .filter(task => {
        if (task.status !== 'open') return false;
        switch (assigneeFilter) {
          case 'john': return task.assignee === johnEmail;
          case 'steph': return task.assignee === stephEmail;
          case 'megan': return task.assignee === meganEmail;
          case 'all': return true;
        }
      })
      .sort((a, b) => {
        const priorityDiff = getPriorityLevel(a.priority) - getPriorityLevel(b.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const aChallenge = a.challenge || 'medium';
        const bChallenge = b.challenge || 'medium';
        const challengeDiff = CHALLENGE_ORDER[aChallenge as Challenge] - CHALLENGE_ORDER[bChallenge as Challenge];
        if (challengeDiff !== 0) return challengeDiff;

        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
  ), [assigneeFilter, johnEmail, meganEmail, stephEmail, tasks]);
  
  const handleAddTask = () => {
    openTaskModal(null, true);
  };
  
  return (
    <div className="pane pane-inbox">
      <div className="pane-header">
        <h2>
          <span className="icon">◇</span>
          Missions
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
            className={`filter-btn ${assigneeFilter === 'megan' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('megan')}
          >
            Megan
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
              ≡
            </button>
            <button 
              className={viewMode === 'buckets' ? 'active' : ''}
              onClick={() => setViewMode('buckets')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={viewMode === 'matrix' ? 'active' : ''}
              onClick={() => setViewMode('matrix')}
              title="Priority x Effort matrix"
            >
              ▦
            </button>
          </div>
          
          {viewMode === 'matrix' ? (
            <span className="matrix-scope-pill" title="Matrix includes open inbox, loadout, and quest missions">
              All open
            </span>
          ) : (
            <div className="sort-toggle">
              {([
                ['due_date', 'Due', 'Sort by Due Date'],
                ['priority', 'Priority', 'Sort by Priority'],
                ['challenge', 'Effort', 'Sort by Effort'],
                ['quest', 'Quest', 'Sort by Quest'],
              ] as [SortBy, string, string][]).map(([key, label, title]) => (
                <button
                  key={key}
                  className={`filter-btn ${sortBy === key ? 'active' : ''}`}
                  onClick={() => setSortBy(key)}
                  title={title}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          
          <button 
            className={`filter-btn ${showCompleted ? 'active' : ''}`}
            onClick={toggleShowCompleted}
            title="Show completed missions"
          >
            Done
          </button>
        </div>
      </div>
      
      <InboxContent
        tasks={inboxTasks}
        overdueTasks={overdueTasks}
        completedTasks={completedTasks}
        matrixTasks={matrixTasks}
        quests={quests}
        showCompleted={showCompleted}
        loading={loading}
        viewMode={viewMode}
        onAddTask={handleAddTask}
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
  overdueTasks,
  completedTasks,
  matrixTasks,
  quests,
  showCompleted,
  loading,
  viewMode,
  onAddTask,
  onToggleBulkImport
}: {
  tasks: Task[];
  overdueTasks: Task[];
  completedTasks: Task[];
  matrixTasks: Task[];
  quests: Quest[];
  showCompleted: boolean;
  loading: boolean;
  viewMode: 'list' | 'buckets' | 'matrix';
  onAddTask: () => void;
  onToggleBulkImport: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'inbox-drop-zone',
  });

  const isEmpty = tasks.length === 0 && overdueTasks.length === 0;

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
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <div className="overdue-section">
              <div className="overdue-header">
                <span>Overdue ({overdueTasks.length})</span>
              </div>
              <div className="task-list">
                {overdueTasks.map(task => (
                  <TaskCard key={task.task_id} task={task} />
                ))}
              </div>
            </div>
          )}
          {viewMode === 'matrix' ? (
            <MatrixView
              tasks={matrixTasks}
              quests={quests}
              onAddTask={onAddTask}
              onToggleBulkImport={onToggleBulkImport}
            />
          ) : isEmpty && !showCompleted ? (
            <div className="empty-state">
              <div className="empty-state-icon">◇</div>
              <div className="empty-state-text">
                Nothing here yet
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <ListView tasks={tasks} onAddTask={onAddTask} onToggleBulkImport={onToggleBulkImport} />
          ) : (
            <BucketsView tasks={tasks} onAddTask={onAddTask} onToggleBulkImport={onToggleBulkImport} />
          )}
        </>
      )}

      {showCompleted && (
        <div className="completed-section">
          <div className="completed-header">
            <span>Completed ({completedTasks.length})</span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <div className="empty-state-text" style={{ fontSize: '0.75rem' }}>
                No completed missions
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

    </div>
  );
}

const matrixPriorities = [
  { level: 1, label: 'P1', description: 'Highest priority' },
  { level: 2, label: 'P2', description: 'Medium priority' },
  { level: 3, label: 'P3', description: 'Lower priority' },
];

const matrixChallenges: { challenge: Challenge; label: string; description: string }[] = [
  { challenge: 'low', label: 'CR 1', description: 'Light effort' },
  { challenge: 'medium', label: 'CR 2', description: 'Moderate effort' },
  { challenge: 'high', label: 'CR 3', description: 'Heavy effort' },
];

function MatrixView({
  tasks,
  quests,
  onAddTask,
  onToggleBulkImport,
}: {
  tasks: Task[];
  quests: Quest[];
  onAddTask: () => void;
  onToggleBulkImport: () => void;
}) {
  const questById = useMemo(() => (
    quests.reduce<Record<string, Quest>>((map, quest) => {
      map[quest.quest_id] = quest;
      return map;
    }, {})
  ), [quests]);

  const tasksByCell = useMemo(() => (
    tasks.reduce<Record<string, Task[]>>((groups, task) => {
      const priorityLevel = getPriorityLevel(task.priority);
      const challenge = task.challenge || 'medium';
      const key = `${priorityLevel}-${challenge}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
      return groups;
    }, {})
  ), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="matrix-empty-state">
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <div className="empty-state-text">No open missions for this filter</div>
          <div className="empty-state-subtext">The matrix includes inbox, loadout, and quest missions.</div>
        </div>
        <ActionCards onAddTask={onAddTask} onToggleBulkImport={onToggleBulkImport} />
      </div>
    );
  }

  return (
    <div className="mission-matrix-wrap">
      <div className="mission-matrix-note">
        Showing all open missions for this assignee, including Loadout and Quest missions.
      </div>
      <div className="mission-matrix" role="grid" aria-label="Open missions by priority and effort">
        <div className="matrix-corner" aria-hidden="true">
          Priority x Effort
        </div>
        {matrixChallenges.map(({ challenge, label, description }) => (
          <div key={challenge} className={`matrix-axis-heading effort-${challenge}`}>
            <span>{label}</span>
            <small>{description}</small>
          </div>
        ))}

        {matrixPriorities.map(({ level, label, description }) => (
          <React.Fragment key={level}>
            <div className={`matrix-axis-heading priority-p${level}`}>
              <span>{label}</span>
              <small>{description}</small>
            </div>
            {matrixChallenges.map(({ challenge }) => {
              const cellTasks = tasksByCell[`${level}-${challenge}`] || [];
              return (
                <div key={`${level}-${challenge}`} className="matrix-cell" role="gridcell">
                  <div className="matrix-cell-count">{cellTasks.length}</div>
                  {cellTasks.length > 0 ? (
                    <div className="matrix-cell-list">
                      {cellTasks.map(task => (
                        <div key={task.task_id} className={`matrix-mission ${task.today_slot ? 'in-loadout' : ''}`}>
                          <TaskCard task={task} compact />
                          <MissionLocationBadges task={task} quest={task.quest_id ? questById[task.quest_id] : undefined} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="matrix-cell-empty">Clear</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="matrix-actions">
        <ActionCards onAddTask={onAddTask} onToggleBulkImport={onToggleBulkImport} />
      </div>
    </div>
  );
}

function MissionLocationBadges({ task, quest }: { task: Task; quest?: Quest }) {
  const hasLoadout = Boolean(task.today_slot);
  const hasQuest = Boolean(quest);

  if (!hasLoadout && !hasQuest) {
    return (
      <div className="matrix-location-row">
        <span className="matrix-location-badge inbox">Inbox</span>
      </div>
    );
  }

  return (
    <div className="matrix-location-row">
      {hasLoadout && (
        <span className="matrix-location-badge loadout">
          Today's Loadout{task.today_slot ? ` #${task.today_slot}` : ''}
        </span>
      )}
      {quest && (
        <span
          className="matrix-location-badge quest"
          style={quest.color ? ({ '--quest-color': quest.color } as React.CSSProperties) : undefined}
        >
          {quest.title}
        </span>
      )}
    </div>
  );
}

function ActionCards({ onAddTask, onToggleBulkImport }: { onAddTask: () => void; onToggleBulkImport: () => void }) {
  return (
    <>
      <button className="mission-action-card" onClick={onAddTask}>
        <span className="mission-action-icon">+</span>
        <span className="mission-action-label">New Mission</span>
      </button>
      <button className="mission-action-card" onClick={onToggleBulkImport}>
        <span className="mission-action-icon">◆</span>
        <span className="mission-action-label">Bulk Import</span>
      </button>
    </>
  );
}

function ListView({ tasks, onAddTask, onToggleBulkImport }: { tasks: Task[]; onAddTask: () => void; onToggleBulkImport: () => void }) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard key={task.task_id} task={task} />
      ))}
      <ActionCards onAddTask={onAddTask} onToggleBulkImport={onToggleBulkImport} />
    </div>
  );
}

function BucketsView({ tasks, onAddTask, onToggleBulkImport }: { tasks: Task[]; onAddTask: () => void; onToggleBulkImport: () => void }) {
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
      <button className="mission-action-card mission-action-card--grid" onClick={onAddTask}>
        <span className="mission-action-icon">+</span>
        <span className="mission-action-label">New Mission</span>
      </button>
      <button className="mission-action-card mission-action-card--grid" onClick={onToggleBulkImport}>
        <span className="mission-action-icon">◆</span>
        <span className="mission-action-label">Bulk Import</span>
      </button>
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
          <span className="completed-date">Done {completedDate}</span>
        </div>
      </div>
    </div>
  );
}

