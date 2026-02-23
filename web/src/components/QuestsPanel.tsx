import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { QuestCard } from './QuestCard';
import { QuestModal } from './QuestModal';
import { TaskCard } from './TaskCard';
import type { Task, Quest } from '../types';

export function QuestsPanel() {
  const {
    quests,
    tasks,
    openQuestModal,
  } = useApp();

  // Quests are shared containers: every user can see all open quests.
  const filteredQuests = quests.filter(q => q.status !== 'done');

  const activeQuests = filteredQuests.filter(q => q.is_tracked);
  const inactiveQuests = filteredQuests.filter(q => !q.is_tracked);

  // Missions nested in a quest (open only, not currently in Today loadout)
  const missionsInQuest = (questId: string): Task[] =>
    tasks.filter(t => t.status === 'open' && t.quest_id === questId && !t.today_slot);

  return (
    <div className="pane pane-quests">
      <div className="pane-header">
        <h2>
          <span className="icon">⚔</span>
          QUESTS
        </h2>
        <button 
          className="add-quest-btn"
          onClick={() => openQuestModal(null, true)}
        >
          + NEW QUEST
        </button>
      </div>

      <div className="pane-content">
        {/* Tracked Quests Section */}
        <div className="quests-section">
          <div className="quests-section-header">
            <span>⚡ TRACKED ({activeQuests.length})</span>
          </div>
          <div className="quests-tracked-list">
            {activeQuests.length > 0 ? (
              activeQuests.map(quest => (
                <QuestWithMissions key={quest.quest_id} quest={quest} missions={missionsInQuest(quest.quest_id)} />
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-text">NO TRACKED QUESTS</div>
                <div className="empty-state-subtext">Track quests to pin them at the top</div>
              </div>
            )}
          </div>
        </div>

        {/* Inactive Quests Section */}
        {inactiveQuests.length > 0 && (
          <div className="quests-section">
            <div className="quests-section-header">
              <span>◇ INACTIVE ({inactiveQuests.length})</span>
            </div>
            <div className="quests-inactive-list">
              {inactiveQuests.map(quest => (
                <QuestWithMissions key={quest.quest_id} quest={quest} missions={missionsInQuest(quest.quest_id)} isCollapsed />
              ))}
            </div>
          </div>
        )}
      </div>

      <QuestModal />
    </div>
  );
}

interface QuestWithMissionsProps {
  quest: Quest;
  missions: Task[];
  isCollapsed?: boolean;
}

function QuestWithMissions({ quest, missions, isCollapsed = false }: QuestWithMissionsProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `quest-drop-${quest.quest_id}`,
    data: { questId: quest.quest_id },
  });

  const questColor = quest.color || undefined;

  return (
    <div
      ref={setNodeRef}
      className={`quest-with-missions ${isOver ? 'drag-over' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={questColor ? ({ '--quest-color': questColor } as React.CSSProperties) : undefined}
    >
      <QuestCard quest={quest} isCollapsed={isCollapsed} />
      {/* Missions nested inside the quest card */}
      {!isCollapsed && (
        <div className="quest-missions-inner">
          {missions.length > 0 ? (
            <div className="quest-missions-list">
              {missions.map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  showDragHandle
                  inSlot={false}
                  questColor={questColor}
                />
              ))}
            </div>
          ) : (
            <div className="quest-missions-empty">
              <span className="quest-missions-empty-text">Drop missions here</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

