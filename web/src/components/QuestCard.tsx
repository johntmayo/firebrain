import React, { useEffect, useMemo, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Quest } from '../types';
import { useApp } from '../context/AppContext';
import { describeOperator } from '../utils/operators';
import { isOverdueDate } from '../utils/dueDate';
import { openMissionsOfQuest } from '../utils/questMissions';
import { QuestLogEntry } from './primitives';

interface QuestCardProps {
  quest: Quest;
  expanded: boolean;
  onToggle: (questId: string) => void;
  /** Disables drag-to-reorder (e.g. on mobile) */
  dragDisabled?: boolean;
}

/**
 * QuestCard — connects a quest to the app and renders it through the
 * QuestLogEntry primitive. Progress is derived from real data only:
 * `done/total` once completed missions are loaded, `n open` otherwise.
 */
export function QuestCard({ quest, expanded, onToggle, dragDisabled = false }: QuestCardProps) {
  const { openQuestModal, toggleQuestTracked, tasks, completedTasks, johnEmail, stephEmail, meganEmail } = useApp();

  const isCompleted = quest.status === 'done';
  const canDrag = !dragDisabled && quest.is_tracked && !isCompleted;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `quest-${quest.quest_id}`,
    data: { quest, type: 'quest' },
    disabled: !canDrag,
  });

  // After a real drag the browser still fires a click on the row — swallow it
  // so finishing a drag doesn't pop the quest dialog open.
  const wasDraggedRef = useRef(false);
  useEffect(() => {
    if (isDragging) wasDraggedRef.current = true;
  }, [isDragging]);

  const leader = useMemo(
    () => describeOperator(quest.leader_email || quest.assignee, { johnEmail, stephEmail, meganEmail }),
    [quest.leader_email, quest.assignee, johnEmail, stephEmail, meganEmail],
  );

  // Same "open missions of this quest" definition as the nested list and the
  // Complete quest dialog (utils/questMissions.ts), so the counts always agree.
  const { openCount, overdueCount } = useMemo(() => {
    const open = openMissionsOfQuest(tasks, quest.quest_id);
    return { openCount: open.length, overdueCount: open.filter(t => isOverdueDate(t.due_date)).length };
  }, [tasks, quest.quest_id]);

  const doneCount = useMemo(
    () => (completedTasks.length > 0 ? completedTasks.filter(t => t.quest_id === quest.quest_id).length : undefined),
    [completedTasks, quest.quest_id],
  );

  const handleOpen = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    openQuestModal(quest);
  };

  return (
    <QuestLogEntry
      title={quest.title}
      color={quest.color || undefined}
      leader={leader}
      progress={{ open: openCount, done: doneCount }}
      overdueCount={overdueCount}
      tracked={quest.is_tracked}
      expanded={expanded}
      completed={isCompleted}
      dragging={isDragging}
      onToggle={() => onToggle(quest.quest_id)}
      onOpen={handleOpen}
      onTrackToggle={() => { void toggleQuestTracked(quest.quest_id).catch(() => {}); }}
      rootRef={canDrag ? setNodeRef : undefined}
      rootProps={canDrag ? ({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>) : undefined}
      className={canDrag ? 'is-draggable' : ''}
    />
  );
}
