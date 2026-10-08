import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../types';
import { getPriorityLevel } from '../types';
import { useApp } from '../context/AppContext';
import { describeOperator } from '../utils/operators';
import { getDueDateStatus } from '../utils/dueDate';
import { ItemCard, Icon, challengeToCr, type ActionMenuItem, type ItemCardTier } from './primitives';

interface TaskCardProps {
  task: Task;
  tier?: ItemCardTier;
  /** Rendered inside the loadout list. */
  inSlot?: boolean;
  completed?: boolean;
  /** Hide the operator chip (e.g. the list is already filtered to one operator). */
  hideOperator?: boolean;
  /** Hide the quest chip (e.g. nested inside its own quest). */
  hideQuest?: boolean;
  /** Show a "Loaded" chip when the mission is in a loadout (matrix view). */
  showLoaded?: boolean;
  /** Hide priority / CR when the layout already encodes them (matrix cells). */
  hidePriority?: boolean;
  hideCr?: boolean;
  draggable?: boolean;
}

/**
 * TaskCard — connects a mission to the app (context, drag-and-drop) and
 * renders it through the ItemCard primitive. All presentation lives in
 * ItemCard; this file only decides *what* to show and wires the actions.
 */
export function TaskCard({
  task,
  tier = 'row',
  inSlot = false,
  completed = false,
  hideOperator = false,
  hideQuest = false,
  showLoaded = false,
  hidePriority = false,
  hideCr = false,
  draggable = true,
}: TaskCardProps) {
  const {
    completeTask,
    cancelTask,
    openTaskModal,
    updateTask,
    loadTask,
    clearToday,
    currentUser,
    viewingLoadoutUser,
    johnEmail,
    stephEmail,
    meganEmail,
    quests,
  } = useApp();

  const isCompleted = completed || task.status === 'done';
  const canDrag = draggable && !isCompleted;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.task_id,
    data: { task, fromSlot: inSlot },
    disabled: !canDrag,
  });

  const operator = useMemo(
    () => describeOperator(task.assignee, { johnEmail, stephEmail, meganEmail }),
    [task.assignee, johnEmail, stephEmail, meganEmail],
  );

  const quest = useMemo(() => {
    if (hideQuest || !task.quest_id) return undefined;
    const q = quests.find(x => x.quest_id === task.quest_id);
    return q ? { title: q.title, color: q.color || undefined } : undefined;
  }, [hideQuest, task.quest_id, quests]);

  const due = getDueDateStatus(task.due_date);
  const canEditLoadout = viewingLoadoutUser === currentUser;

  const completedLabel = isCompleted && task.completed_at
    ? `Cleared ${new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : undefined;

  const loadAction = !isCompleted && canEditLoadout
    ? task.today_slot
      ? { kind: 'unload' as const, onSelect: () => { void clearToday(task.task_id); } }
      : { kind: 'load' as const, onSelect: () => { void loadTask(task.task_id); } }
    : undefined;

  // The "more" menu duplicates the hover actions so that touch (where load/edit
  // are hidden to save width) still has a click path for every drag action.
  const menuItems: ActionMenuItem[] = [];
  if (!isCompleted) {
    if (loadAction) {
      menuItems.push({
        id: 'load',
        label: loadAction.kind === 'load' ? 'Load into today' : 'Unload from today',
        glyph: <Icon name={loadAction.kind === 'load' ? 'load' : 'unload'} />,
        onSelect: loadAction.onSelect,
      });
    }
    menuItems.push({ id: 'edit', label: 'Edit mission', glyph: <Icon name="edit" />, onSelect: () => openTaskModal(task) });
    if (task.quest_id) {
      menuItems.push({
        id: 'unquest',
        label: 'Remove from quest',
        glyph: <Icon name="unlink" />,
        onSelect: () => { void updateTask({ task_id: task.task_id, quest_id: '' }).catch(() => {}); },
      });
    }
    menuItems.push({ id: 'sep', separator: true });
    menuItems.push({
      id: 'delete',
      label: 'Delete mission',
      glyph: <Icon name="trash" />,
      danger: true,
      onSelect: () => {
        if (window.confirm('Delete this mission? You can not undo this.')) {
          void cancelTask(task.task_id).catch(() => {});
        }
      },
    });
  }

  return (
    <ItemCard
      title={task.title}
      notes={task.notes}
      createdAt={task.created_at}
      priorityLevel={getPriorityLevel(task.priority)}
      cr={challengeToCr(task.challenge)}
      crUnset={!task.challenge}
      due={due}
      operator={hideOperator ? undefined : operator}
      quest={quest}
      loaded={showLoaded && Boolean(task.today_slot)}
      hidePriority={hidePriority}
      hideCr={hideCr}
      tier={tier}
      completed={isCompleted}
      completedLabel={completedLabel}
      dragging={isDragging}
      onOpen={() => openTaskModal(task)}
      onDone={isCompleted ? undefined : () => { void completeTask(task.task_id); }}
      onEdit={isCompleted ? undefined : () => openTaskModal(task)}
      loadAction={loadAction}
      menuItems={menuItems}
      rootRef={canDrag ? setNodeRef : undefined}
      rootProps={canDrag ? ({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>) : undefined}
      className={canDrag ? 'is-draggable' : ''}
    />
  );
}
