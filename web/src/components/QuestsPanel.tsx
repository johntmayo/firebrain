import React, { useCallback, useEffect, useState } from 'react';
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
  const [collapsedQuestIds, setCollapsedQuestIds] = useState<Record<string, boolean>>({});
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const fallback = 360;
    if (typeof window === 'undefined') return fallback;
    const saved = Number(localStorage.getItem('firebrain_quests_panel_width') || '');
    if (Number.isFinite(saved)) return Math.max(280, Math.min(900, saved));
    return fallback;
  });

  // Missions nested in a quest (open only, not currently in Today loadout)
  const missionsInQuest = (questId: string): Task[] =>
    tasks.filter(t => t.status === 'open' && t.quest_id === questId && !t.today_slot);

  const isQuestCollapsed = useCallback((quest: Quest, defaultCollapsed = false) => {
    if (collapsedQuestIds[quest.quest_id] !== undefined) {
      return collapsedQuestIds[quest.quest_id];
    }
    return defaultCollapsed;
  }, [collapsedQuestIds]);

  const toggleQuestCollapsed = useCallback((questId: string) => {
    setCollapsedQuestIds(prev => ({ ...prev, [questId]: !prev[questId] }));
  }, []);

  useEffect(() => {
    localStorage.setItem('firebrain_quests_panel_width', String(panelWidth));
  }, [panelWidth]);

  const startResize = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setPanelWidth(Math.max(280, Math.min(900, startWidth + delta)));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  return (
    <div className="pane pane-quests" style={{ width: `${panelWidth}px` }}>
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
      <button
        type="button"
        className="quests-pane-resizer"
        onMouseDown={startResize}
        aria-label="Resize quests panel"
        title="Drag to resize quests panel"
      />

      <div className="pane-content">
        {/* Tracked Quests Section */}
        <div className="quests-section">
          <div className="quests-section-header">
            <span>⚡ TRACKED ({activeQuests.length})</span>
          </div>
          {activeQuests.length > 5 && (
            <div className="quests-track-warning">
              Tracking {activeQuests.length} quests. Recommended: keep 5 or fewer active.
            </div>
          )}
          <div className="quests-tracked-list">
            {activeQuests.length > 0 ? (
              activeQuests.map(quest => (
                <QuestWithMissions
                  key={quest.quest_id}
                  quest={quest}
                  missions={missionsInQuest(quest.quest_id)}
                  isCollapsed={isQuestCollapsed(quest, false)}
                  onToggleCollapse={toggleQuestCollapsed}
                />
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
                <QuestWithMissions
                  key={quest.quest_id}
                  quest={quest}
                  missions={missionsInQuest(quest.quest_id)}
                  isCollapsed={isQuestCollapsed(quest, true)}
                  onToggleCollapse={toggleQuestCollapsed}
                />
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
  onToggleCollapse: (questId: string) => void;
}

function QuestWithMissions({ quest, missions, isCollapsed = false, onToggleCollapse }: QuestWithMissionsProps) {
  const { viewingLoadoutUser } = useApp();
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
      <QuestCard
        quest={quest}
        isCollapsed={isCollapsed}
        missionCount={missions.length}
        onToggleCollapse={onToggleCollapse}
      />
      {/* Missions nested inside the quest card */}
      {!isCollapsed && (
        <div className="quest-missions-inner">
          {missions.length > 0 ? (
            <div className="quest-missions-list">
              {missions.map(task => (
                <div
                  key={task.task_id}
                  className={`quest-mission-row ${task.assignee === viewingLoadoutUser ? 'focused' : 'deemphasized'}`}
                >
                  <TaskCard
                    task={task}
                    showDragHandle
                    inSlot={false}
                    questColor={questColor}
                  />
                </div>
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

