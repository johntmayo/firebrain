import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { QuestCompletionMode } from '../types';
import { Dialog } from './primitives';

export function QuestCompleteModal() {
  const { pendingQuestCompletion, cancelQuestCompletion, completeQuest } = useApp();
  const [saving, setSaving] = useState(false);

  const handleChoose = async (mode: QuestCompletionMode) => {
    if (saving || !pendingQuestCompletion) return;
    setSaving(true);
    try {
      await completeQuest(pendingQuestCompletion.questId, mode);
      cancelQuestCompletion();
    } finally {
      setSaving(false);
    }
  };

  const open = Boolean(pendingQuestCompletion);
  const count = pendingQuestCompletion?.openMissionCount ?? 0;
  const noun = count === 1 ? 'mission' : 'missions';

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={cancelQuestCompletion} disabled={saving}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => handleChoose('cascade_done')}
        disabled={saving}
        title="Clear the quest and every open mission in it"
      >
        Clear all
      </button>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => handleChoose('detach_open')}
        disabled={saving}
        title="Clear the quest; open missions return to the Cache"
        data-autofocus
      >
        {saving ? 'Saving…' : 'Clear & keep missions'}
      </button>
    </>
  );

  return (
    <Dialog open={open} title="Clear quest" onClose={cancelQuestCompletion} footer={footer} busy={saving}>
      {pendingQuestCompletion && (
        <div className="dialog-copy">
          {count > 0 ? (
            <>
              <p><strong>{pendingQuestCompletion.questTitle}</strong> has <span className="num">{count}</span> open {noun}.</p>
              <p>What happens to {count === 1 ? 'it' : 'them'}?</p>
            </>
          ) : (
            <>
              <p><strong>{pendingQuestCompletion.questTitle}</strong> has no open missions.</p>
              <p>Clear it now?</p>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
