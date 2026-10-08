import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { CHALLENGE_ORDER, getPriorityLevel } from '../types';
import type { AssigneeFilter, Challenge, SortBy, Task, ViewMode } from '../types';
import { PanelFrame, HudBar, HudGroup, SegmentedControl, EmptyState, Icon, titleFallback, useTooltip, type SegmentOption } from './primitives';

const WHO_OPTIONS: SegmentOption<AssigneeFilter>[] = [
  { value: 'john', label: 'John', title: "John's missions", hint: "Show John's missions" },
  { value: 'steph', label: 'Stef', title: "Stef's missions", hint: "Show Stef's missions" },
  { value: 'megan', label: 'Megan', title: "Megan's missions", hint: "Show Megan's missions" },
  { value: 'all', label: 'All', title: 'Everyone', hint: "Show everyone's missions" },
];

// The grid is cell-tier cards in the current sort order — it is not grouped,
// so the hint must not claim it is (brief §2.3: every stat is honest).
const VIEW_OPTIONS: SegmentOption<ViewMode>[] = [
  { value: 'list', glyph: <Icon name="list" />, title: 'List', hint: 'List — one row per mission' },
  { value: 'buckets', glyph: <Icon name="grid" />, title: 'Grid', hint: 'Grid — missions as inventory cells, in sort order' },
  { value: 'matrix', glyph: <Icon name="matrix" />, title: 'Priority × CR matrix', hint: 'Matrix — Priority × CR; biggest win for least cost sits top-left' },
];

const SORT_HINT = 'Sort the cache by priority, CR, due date, or quest';
const CLEARED_HINT = 'Show missions cleared recently';
const OVERDUE_HINT = 'Open missions past their due date, including quest missions; loaded ones live in your Loadout';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'challenge', label: 'CR' },
  { value: 'due_date', label: 'Due' },
  { value: 'quest', label: 'Quest' },
];

export function Inbox() {
  const {
    inboxTasks,
    overdueTasks,
    tasks,
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
    openBulkImport,
    johnEmail,
    stephEmail,
    meganEmail,
  } = useApp();

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

  const { setNodeRef, isOver } = useDroppable({ id: 'inbox-drop-zone' });
  const clearedHint = showCompleted ? 'Hide cleared missions' : CLEARED_HINT;
  const { anchorProps: clearedTipProps, tooltip: clearedTip } = useTooltip(clearedHint);
  const { anchorProps: overdueTipProps, tooltip: overdueTip } = useTooltip(OVERDUE_HINT);

  const hideOperator = assigneeFilter !== 'all';
  const handleAddTask = () => openTaskModal(null, true);
  const visibleCount = viewMode === 'matrix' ? matrixTasks.length : inboxTasks.length + overdueTasks.length;

  const header = (
    <HudBar glyph={<Icon name="cache" />} title="Missions" count={loading ? undefined : visibleCount}>
      <HudGroup label="Who">
        <SegmentedControl ariaLabel="Operator filter" options={WHO_OPTIONS} value={assigneeFilter} onChange={setAssigneeFilter} />
      </HudGroup>
      <HudGroup label="View">
        <SegmentedControl ariaLabel="View" options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
      </HudGroup>
      {viewMode !== 'matrix' && (
        <HudGroup label="Sort">
          <select
            className="hud-select"
            aria-label="Sort missions"
            title={SORT_HINT}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </HudGroup>
      )}
      <button
        type="button"
        className={`hud-btn ${showCompleted ? 'is-active' : ''}`}
        onClick={toggleShowCompleted}
        aria-pressed={showCompleted}
        title={titleFallback(clearedHint)}
        {...clearedTipProps}
      >
        Cleared
      </button>
      {clearedTip}
    </HudBar>
  );

  return (
    <PanelFrame
      className={`pane pane-inbox ${isOver ? 'is-drop-target' : ''}`}
      header={header}
      bodyRef={setNodeRef}
    >
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <>
          {overdueTasks.length > 0 && viewMode !== 'matrix' && (
            <section className="overdue-section" aria-label="Overdue missions">
              <div className="section-header section-header--danger" title={titleFallback(OVERDUE_HINT)} {...overdueTipProps}>
                <span>Overdue</span>
                <span className="num">{overdueTasks.length}</span>
              </div>
              {overdueTip}
              <div className="task-list">
                {overdueTasks.map(task => (
                  <TaskCard key={task.task_id} task={task} hideOperator={hideOperator} />
                ))}
              </div>
            </section>
          )}

          {viewMode === 'matrix' ? (
            <MatrixView tasks={matrixTasks} hideOperator={hideOperator} onAddTask={handleAddTask} onBulkImport={openBulkImport} />
          ) : inboxTasks.length === 0 && overdueTasks.length === 0 ? (
            <EmptyState
              glyph={<Icon name="cache" size={20} />}
              title="Cache is empty"
              hint="New missions land here until you load them or file them under a quest."
              actions={<ActionButtons onAddTask={handleAddTask} onBulkImport={openBulkImport} />}
            />
          ) : viewMode === 'list' ? (
            <div className="task-list">
              {inboxTasks.map(task => (
                <TaskCard key={task.task_id} task={task} hideOperator={hideOperator} />
              ))}
              <ActionButtons onAddTask={handleAddTask} onBulkImport={openBulkImport} inline />
            </div>
          ) : (
            <div className="inventory-grid">
              {inboxTasks.map(task => (
                <TaskCard key={task.task_id} task={task} tier="cell" hideOperator={hideOperator} />
              ))}
              <button type="button" className="action-card action-card--cell" onClick={handleAddTask}>
                <span className="action-card__glyph" aria-hidden="true"><Icon name="plus" /></span>
                <span>New mission</span>
              </button>
              <button type="button" className="action-card action-card--cell" onClick={openBulkImport}>
                <span className="action-card__glyph" aria-hidden="true"><Icon name="import" /></span>
                <span>Bulk import</span>
              </button>
            </div>
          )}
        </>
      )}

      {showCompleted && (
        <section className="completed-section" aria-label="Cleared missions">
          <div className="section-header">
            <span>Cleared</span>
            <span className="num">{completedTasks.length}</span>
          </div>
          {completedTasks.length === 0 ? (
            <EmptyState compact title="No cleared missions yet" />
          ) : (
            <div className="task-list completed-list">
              {completedTasks.map(task => (
                <TaskCard key={task.task_id} task={task} completed hideOperator={hideOperator} />
              ))}
            </div>
          )}
        </section>
      )}
    </PanelFrame>
  );
}

function ActionButtons({ onAddTask, onBulkImport, inline }: { onAddTask: () => void; onBulkImport: () => void; inline?: boolean }) {
  return (
    <div className={`action-row ${inline ? 'action-row--inline' : ''}`}>
      <button type="button" className="action-card" onClick={onAddTask}>
        <span className="action-card__glyph" aria-hidden="true"><Icon name="plus" /></span>
        <span>New mission</span>
      </button>
      <button type="button" className="action-card" onClick={onBulkImport}>
        <span className="action-card__glyph" aria-hidden="true"><Icon name="import" /></span>
        <span>Bulk import</span>
      </button>
    </div>
  );
}

const matrixPriorities = [
  { level: 1, label: 'P1', description: 'Highest' },
  { level: 2, label: 'P2', description: 'Standard' },
  { level: 3, label: 'P3', description: 'Lower' },
];

const matrixChallenges: { challenge: Challenge; label: string; description: string }[] = [
  { challenge: 'low', label: 'CR 1', description: '1 cell' },
  { challenge: 'medium', label: 'CR 2', description: '2 cells' },
  { challenge: 'high', label: 'CR 3', description: '3 cells' },
];

function MatrixView({
  tasks,
  hideOperator,
  onAddTask,
  onBulkImport,
}: {
  tasks: Task[];
  hideOperator: boolean;
  onAddTask: () => void;
  onBulkImport: () => void;
}) {
  const tasksByCell = useMemo(() => (
    tasks.reduce<Record<string, Task[]>>((groups, task) => {
      const key = `${getPriorityLevel(task.priority)}-${task.challenge || 'medium'}`;
      (groups[key] ||= []).push(task);
      return groups;
    }, {})
  ), [tasks]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        glyph={<Icon name="matrix" size={20} />}
        title="No open missions for this operator"
        hint="The matrix includes cache, loadout, and quest missions."
        actions={<ActionButtons onAddTask={onAddTask} onBulkImport={onBulkImport} />}
      />
    );
  }

  return (
    <div className="matrix-wrap">
      <div className="matrix-note t-xs">
        All open missions for this operator — cache, loadout, and quests. Priority down, CR across.
      </div>
      <div className="matrix" role="grid" aria-label="Open missions by priority and CR">
        <div className="matrix__corner t-2xs" aria-hidden="true">P × CR</div>
        {matrixChallenges.map(({ challenge, label, description }) => (
          <div key={challenge} className="matrix__axis" role="columnheader">
            <span className="num">{label}</span>
            <small className="t-2xs">{description}</small>
          </div>
        ))}

        {matrixPriorities.map(({ level, label, description }) => (
          <React.Fragment key={level}>
            <div className={`matrix__axis matrix__axis--p${level}`} role="rowheader">
              <span className="num">{label}</span>
              <small className="t-2xs">{description}</small>
            </div>
            {matrixChallenges.map(({ challenge }) => {
              const cellTasks = tasksByCell[`${level}-${challenge}`] || [];
              return (
                <div key={`${level}-${challenge}`} className="matrix__cell" role="gridcell">
                  <div className="matrix__count num t-2xs">{cellTasks.length}</div>
                  {cellTasks.length > 0 ? (
                    <div className="matrix__list">
                      {cellTasks.map(task => (
                        <TaskCard key={task.task_id} task={task} tier="compact" hideOperator={hideOperator} hidePriority hideCr showLoaded />
                      ))}
                    </div>
                  ) : (
                    <div className="matrix__empty t-xs">Clear</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <ActionButtons onAddTask={onAddTask} onBulkImport={onBulkImport} />
    </div>
  );
}
