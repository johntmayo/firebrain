import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { QuestCompletionMode } from '../types';

export function QuestCompleteModal() {
  const { pendingQuestCompletion, cancelQuestCompletion, completeQuest } = useApp();
  const [saving, setSaving] = useState(false);

  if (!pendingQuestCompletion) return null;

  const handleChoose = async (mode: QuestCompletionMode) => {
    if (saving) return;
    setSaving(true);
    try {
      await completeQuest(pendingQuestCompletion.questId, mode);
      cancelQuestCompletion();
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) {
      cancelQuestCompletion();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal quest-complete-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>COMPLETE QUEST</h3>
        </div>
        <div className="modal-body">
          <div className="quest-complete-copy">
            {pendingQuestCompletion.openMissionCount > 0 ? (
              <>
                <p>
                  <strong>{pendingQuestCompletion.questTitle}</strong> has {pendingQuestCompletion.openMissionCount}{' '}
                  open {pendingQuestCompletion.openMissionCount === 1 ? 'mission' : 'missions'}.
                </p>
                <p>How should we handle those missions?</p>
              </>
            ) : (
              <>
                <p><strong>{pendingQuestCompletion.questTitle}</strong> has no open missions.</p>
                <p>Choose how to complete this quest.</p>
              </>
            )}
          </div>
        </div>
        <div className="modal-footer quest-complete-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={cancelQuestCompletion}
            disabled={saving}
          >
            CANCEL
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => handleChoose('cascade_done')}
            disabled={saving}
            title="Complete quest and complete all open missions in it"
          >
            COMPLETE QUEST + MISSIONS
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleChoose('detach_open')}
            disabled={saving}
            title="Complete quest and move open missions to Inbox"
            autoFocus
          >
            {saving ? 'PROCESSING...' : 'COMPLETE QUEST + MOVE MISSIONS TO INBOX'}
          </button>
        </div>
      </div>
    </div>
  );
}
