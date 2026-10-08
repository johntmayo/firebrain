import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import type { CreateQuestInput, UpdateQuestInput } from '../types';
import { isOverdueDate } from '../utils/dueDate';
import { isLoadedMission, openMissionsOfQuest, orderQuestMissions } from '../utils/questMissions';
import { Dialog, StatChip } from './primitives';

const QUEST_PRESET_COLORS = [
  '#7b68ee', '#00d4aa', '#d4a84b', '#ff4757', '#ff7b4a',
  '#9b59b6', '#3498db', '#2ecc71', '#e74c3c', '#1abc9c',
  '#e67e22', '#95a5a6',
];

const TRACK_FOCUS_LIMIT = 5;

export function QuestModal() {
  const {
    isQuestModalOpen,
    selectedQuest,
    isCreatingQuest,
    closeQuestModal,
    createQuest,
    updateQuest,
    toggleQuestTracked,
    requestCompleteQuest,
    trackedQuests,
    johnEmail,
    stephEmail,
    meganEmail,
    tasks,
    openTaskModal,
  } = useApp();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [leaderEmail, setLeaderEmail] = useState(johnEmail);
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedQuest) {
      setTitle(selectedQuest.title);
      setNotes(selectedQuest.notes || '');
      setLeaderEmail(selectedQuest.leader_email || selectedQuest.assignee);
      setColor(selectedQuest.color || '');
    } else {
      setTitle('');
      setNotes('');
      setLeaderEmail(johnEmail);
      setColor('');
    }
  }, [selectedQuest, johnEmail, isQuestModalOpen]);

  // All open missions, loaded ones included — same definition as the pane,
  // the progress count and the Complete quest dialog (utils/questMissions.ts).
  const questMissions = selectedQuest
    ? orderQuestMissions(openMissionsOfQuest(tasks, selectedQuest.quest_id), { byPriority: true })
    : [];
  const overdueCount = questMissions.filter(t => isOverdueDate(t.due_date)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      if (isCreatingQuest) {
        const input: CreateQuestInput = {
          title: title.trim(),
          notes: notes.trim() || undefined,
          assignee: leaderEmail,
          leader_email: leaderEmail,
          color: color.trim() || undefined,
        };
        await createQuest(input);
      } else if (selectedQuest) {
        const input: UpdateQuestInput = {
          quest_id: selectedQuest.quest_id,
          title: title.trim(),
          notes: notes.trim(),
          assignee: leaderEmail,
          leader_email: leaderEmail,
          color: color.trim() || undefined,
        };
        await updateQuest(input);
      }
    } catch {
      // handled in context
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTracked = async () => {
    if (!selectedQuest) return;
    try {
      await toggleQuestTracked(selectedQuest.quest_id);
    } catch {
      // handled in context
    }
  };

  const handleAddMission = () => {
    if (!selectedQuest) return;
    const questId = selectedQuest.quest_id;
    closeQuestModal();
    openTaskModal(null, true, questId);
  };

  const handleCompleteQuest = async () => {
    if (!selectedQuest || isCreatingQuest || saving) return;
    setSaving(true);
    try {
      await requestCompleteQuest(selectedQuest.quest_id);
      closeQuestModal();
    } catch {
      // handled in context
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = Boolean(!isCreatingQuest && selectedQuest);

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={closeQuestModal} disabled={saving}>
        Close
      </button>
      {isEditMode && (
        <button type="button" className="btn btn--danger" onClick={handleCompleteQuest} disabled={saving}>
          Complete quest
        </button>
      )}
      <button type="submit" className="btn btn--primary" disabled={saving || !title.trim()}>
        {saving ? 'Saving…' : isCreatingQuest ? 'Create quest' : 'Save changes'}
      </button>
    </>
  );

  return (
    <Dialog
      open={isQuestModalOpen}
      title={isCreatingQuest ? 'New quest' : 'Quest'}
      onClose={closeQuestModal}
      footer={footer}
      busy={saving}
      size={isEditMode ? 'lg' : 'md'}
      formProps={{ onSubmit: handleSubmit }}
    >
      <div className="form-group">
        <label htmlFor="quest-title">Title</label>
        <input
          id="quest-title"
          type="text"
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the goal?"
          data-autofocus
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="quest-notes">Notes</label>
        <textarea
          id="quest-notes"
          className="form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any context or details…"
        />
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="quest-assignee">Lead</label>
          <select id="quest-assignee" className="form-select" value={leaderEmail} onChange={e => setLeaderEmail(e.target.value)}>
            <option value={johnEmail}>John</option>
            <option value={stephEmail}>Stef</option>
            <option value={meganEmail}>Megan</option>
          </select>
        </div>

        <div className="form-group">
          <span className="form-label">Color</span>
          <div className="color-picker">
            {QUEST_PRESET_COLORS.map(hex => (
              <button
                key={hex}
                type="button"
                className={`color-swatch hit ${color === hex ? 'is-active' : ''}`}
                style={{ background: hex }}
                onClick={() => setColor(hex)}
                title={hex}
                aria-label={`Color ${hex}`}
                aria-pressed={color === hex}
              />
            ))}
            <input
              type="text"
              className="form-input form-input--hex num"
              placeholder="#hex"
              aria-label="Custom hex color"
              value={color && !QUEST_PRESET_COLORS.includes(color) ? color : ''}
              onChange={e => {
                const v = e.target.value.trim().replace(/^#/, '');
                setColor(v ? '#' + v.slice(0, 6) : '');
              }}
              maxLength={7}
            />
          </div>
          <div className="form-hint t-xs">Missions in this quest carry this color as their quest chip.</div>
        </div>
      </div>

      {isEditMode && selectedQuest && (
        <div className="form-group">
          <span className="form-label" id="quest-tracking-label">Tracking</span>
          <div className="track-row">
            <button
              type="button"
              role="switch"
              aria-checked={selectedQuest.is_tracked}
              aria-labelledby="quest-tracking-label"
              className={`switch ${selectedQuest.is_tracked ? 'is-on' : ''}`}
              onClick={handleToggleTracked}
            >
              <span className="switch__knob" />
            </button>
            <span className="track-row__status t-sm">
              {selectedQuest.is_tracked ? 'Tracked — pinned to the HUD' : 'Not tracked — resting in the log'}
            </span>
            <StatChip mono title="Quests currently tracked">{trackedQuests.length} tracked</StatChip>
          </div>
          {trackedQuests.length > TRACK_FOCUS_LIMIT && (
            <div className="form-hint form-hint--warning t-xs">
              Tracking {trackedQuests.length} quests. Focus holds best at {TRACK_FOCUS_LIMIT} or fewer.
            </div>
          )}
        </div>
      )}

      {isEditMode && selectedQuest && (
        <section className="dialog-section" aria-label="Missions in this quest">
          <div className="section-header">
            <span>Missions</span>
            <span className="num">{questMissions.length}</span>
            {overdueCount > 0 && <StatChip tone="danger" mono>{overdueCount} late</StatChip>}
          </div>

          {questMissions.length > 0 ? (
            <div className="task-list">
              {questMissions.map(mission => (
                <div
                  key={mission.task_id}
                  className={`quest-block__row ${isLoadedMission(mission) ? 'is-deemphasized is-loaded' : ''}`.trim()}
                >
                  <TaskCard task={mission} tier="compact" hideQuest showLoaded draggable={false} />
                </div>
              ))}
            </div>
          ) : (
            <div className="quest-block__empty t-xs">No open missions in this quest</div>
          )}

          <button type="button" className="action-card action-card--slim" onClick={handleAddMission}>
            <span className="action-card__glyph" aria-hidden="true">+</span>
            <span>Mission</span>
          </button>
        </section>
      )}
    </Dialog>
  );
}
