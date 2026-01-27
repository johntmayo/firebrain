import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Quest } from '../types';
import { useApp } from '../context/AppContext';

interface QuestCardProps {
  quest: Quest;
  isCollapsed?: boolean;
}

export function QuestCard({ quest, isCollapsed = false }: QuestCardProps) {
  const { openQuestModal, completeQuest } = useApp();
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `quest-${quest.quest_id}`,
    data: { quest, type: 'quest' },
    disabled: !quest.is_tracked || quest.status === 'done', // Only draggable if tracked and not completed
  });

  const handleClick = () => {
    openQuestModal(quest);
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quest.status !== 'done') {
      completeQuest(quest.quest_id);
    }
  };

  const truncatedTitle = quest.title.length > 30 
    ? quest.title.substring(0, 30) + '...' 
    : quest.title;

  const isCompleted = quest.status === 'done';

  // Collapsed view for inactive quests
  if (isCollapsed && !quest.is_tracked) {
    return (
      <div
        className="quest-card collapsed"
        onClick={handleClick}
      >
        <span className="quest-title-truncated">{truncatedTitle}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`quest-card ${quest.is_tracked ? 'tracked' : ''} ${isDragging ? 'dragging' : ''} ${isCompleted ? 'completed' : ''}`}
      onClick={handleClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {quest.is_tracked && (
        <div className="quest-tracked-indicator">
          <span>⚡ TRACKED</span>
        </div>
      )}
      
      <div className="quest-content">
        <div className="quest-title">{quest.title}</div>
        {quest.notes && (
          <div className="quest-notes">{quest.notes}</div>
        )}
      </div>

      {!isCompleted && (
        <div className="quest-actions">
          {quest.is_tracked && (
            <div 
              className="quest-drag-handle"
              {...listeners}
              {...attributes}
              onClick={(e) => e.stopPropagation()}
              title="Drag to loadout to create mission"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="12" r="1"/>
                <circle cx="9" cy="5" r="1"/>
                <circle cx="9" cy="19" r="1"/>
                <circle cx="15" cy="12" r="1"/>
                <circle cx="15" cy="5" r="1"/>
                <circle cx="15" cy="19" r="1"/>
              </svg>
            </div>
          )}
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
  );
}

