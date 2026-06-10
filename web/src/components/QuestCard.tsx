import React, { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Quest } from '../types';
import { useApp } from '../context/AppContext';

interface QuestCardProps {
  quest: Quest;
  isCollapsed?: boolean;
  missionCount?: number;
  onToggleCollapse?: (questId: string) => void;
  /** Disables drag-to-reorder (e.g. on mobile) */
  dragDisabled?: boolean;
}

export function QuestCard({
  quest,
  isCollapsed = false,
  missionCount = 0,
  onToggleCollapse,
  dragDisabled = false,
}: QuestCardProps) {
  const { openQuestModal, johnEmail, stephEmail, meganEmail } = useApp();

  // The whole card header is the drag handle; only tracked, open quests reorder
  const canDrag = !dragDisabled && quest.is_tracked && quest.status !== 'done';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `quest-${quest.quest_id}`,
    data: { quest, type: 'quest' },
    disabled: !canDrag,
  });

  // After a real drag, the browser still fires a click on the card —
  // swallow it so finishing a drag doesn't pop the quest modal open.
  const wasDraggedRef = useRef(false);
  useEffect(() => {
    if (isDragging) {
      wasDraggedRef.current = true;
    }
  }, [isDragging]);

  const handleClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    openQuestModal(quest);
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse?.(quest.quest_id);
  };

  const truncatedTitle = isCollapsed && quest.title.length > 36
    ? quest.title.substring(0, 36) + '...'
    : quest.title;
  const leaderEmail = quest.leader_email || quest.assignee;
  const leaderName = leaderEmail === johnEmail
    ? 'John'
    : leaderEmail === stephEmail
      ? 'Stef'
      : leaderEmail === meganEmail
        ? 'Megan'
        : leaderEmail.split('@')[0];

  const isCompleted = quest.status === 'done';

  return (
    <div
      ref={setNodeRef}
      className={[
        'quest-card',
        quest.is_tracked ? 'tracked' : '',
        isCollapsed ? 'collapsed' : '',
        isDragging ? 'dragging' : '',
        isCompleted ? 'completed' : '',
        canDrag ? 'draggable' : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      {quest.is_tracked && (
        <div className="quest-tracked-indicator">
          <span>Tracked</span>
        </div>
      )}

      <div className="quest-content">
        <div className="quest-title">{truncatedTitle}</div>
        <div className="quest-leader">
          Led by {leaderName}
          {isCollapsed && ` · ${missionCount} mission${missionCount === 1 ? '' : 's'}`}
        </div>
        {!isCollapsed && quest.notes && (
          <div className="quest-notes">{quest.notes}</div>
        )}
      </div>

      {!isCompleted && (
        <button
          type="button"
          className={`quest-collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
          onClick={handleToggleCollapse}
          onPointerDown={e => e.stopPropagation()}
          title={isCollapsed ? 'Expand quest' : 'Collapse quest'}
          aria-label={isCollapsed ? 'Expand quest' : 'Collapse quest'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 15 12 9 18 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
