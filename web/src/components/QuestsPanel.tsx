import React from 'react';
import { useApp } from '../context/AppContext';
import { QuestCard } from './QuestCard';
import { QuestModal } from './QuestModal';

export function QuestsPanel() {
  const {
    quests,
    trackedQuests,
    openQuestModal,
    assigneeFilter,
    johnEmail,
    stephEmail,
  } = useApp();

  // Filter quests by assignee filter
  const filteredQuests = quests.filter(q => {
    if (q.status === 'done') return false; // Don't show completed quests in main view
    
    switch (assigneeFilter) {
      case 'john': return q.assignee === johnEmail;
      case 'steph': return q.assignee === stephEmail;
      case 'all': return true;
    }
  });

  const activeQuests = filteredQuests.filter(q => q.is_tracked);
  const inactiveQuests = filteredQuests.filter(q => !q.is_tracked);

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
            <span>⚡ TRACKED ({activeQuests.length}/3)</span>
          </div>
          <div className="quests-tracked-list">
            {activeQuests.length > 0 ? (
              activeQuests.map(quest => (
                <QuestCard key={quest.quest_id} quest={quest} />
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-text">NO TRACKED QUESTS</div>
                <div className="empty-state-subtext">Track quests to drag them to your loadout</div>
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
                <QuestCard key={quest.quest_id} quest={quest} isCollapsed />
              ))}
            </div>
          </div>
        )}
      </div>

      <QuestModal />
    </div>
  );
}

