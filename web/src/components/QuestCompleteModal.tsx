import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { QuestCompletionMode } from '../types';
import { Dialog } from './primitives';

/**
 * Complete quest — the confirm step before `completeQuest`. Vocabulary: the
 * verb for finishing is "Complete"; "Cleared" is the resulting state; "Delete"
 * is the verb for erasing (quests can't be deleted from the UI).
 *
 * With open missions the operator chooses what happens to them:
 *   Complete missions too      → cascade_done (danger-ish: it finishes them)
 *   Keep missions — move to Cache → detach_open (primary, the safe default)
 */
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

  const footer = count > 0 ? (
    <>
      <button type="button" className="btn btn--secondary" onClick={cancelQuestCompletion} disabled={saving}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn--danger"
        data-mode="cascade_done"
        onClick={() => handleChoose('cascade_done')}
        disabled={saving}
        title={`Complete the quest and mark its ${count} open ${noun} complete as well`}
      >
        Complete missions too
      </button>
      <button
        type="button"
        className="btn btn--primary"
        data-mode="detach_open"
        onClick={() => handleChoose('detach_open')}
        disabled={saving}
        title="Complete the quest; its open missions stay open and return to the Cache"
        data-autofocus
      >
        {saving ? 'Saving…' : 'Keep missions — move to Cache'}
      </button>
    </>
  ) : (
    <>
      <button type="button" className="btn btn--secondary" onClick={cancelQuestCompletion} disabled={saving}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn--primary"
        data-mode="detach_open"
        onClick={() => handleChoose('detach_open')}
        disabled={saving}
        title="Mark this quest complete"
        data-autofocus
      >
        {saving ? 'Saving…' : 'Complete quest'}
      </button>
    </>
  );

  return (
    <Dialog open={open} title="Complete quest" onClose={cancelQuestCompletion} footer={footer} busy={saving} size={count > 0 ? 'lg' : 'md'}>
      {pendingQuestCompletion && (
        <div className="dialog-copy">
          {count > 0 ? (
            <>
              <p><strong>{pendingQuestCompletion.questTitle}</strong> has <span className="num">{count}</span> open {noun}.</p>
              <p>What should happen to {count === 1 ? 'it' : 'them'}?</p>
            </>
          ) : (
            <>
              <p><strong>{pendingQuestCompletion.questTitle}</strong> has no open missions.</p>
              <p>Mark it complete?</p>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
