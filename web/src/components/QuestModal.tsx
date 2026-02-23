import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import type { CreateQuestInput, UpdateQuestInput } from '../types';
import { PRIORITY_ORDER } from '../types';

const QUEST_PRESET_COLORS = [
  '#7b68ee', '#00d4aa', '#d4a84b', '#ff4757', '#ff7b4a',
  '#9b59b6', '#3498db', '#2ecc71', '#e74c3c', '#1abc9c',
  '#e67e22', '#95a5a6',
];

export function QuestModal() {
  const {
    isQuestModalOpen,
    selectedQuest,
    isCreatingQuest,
    closeQuestModal,
    createQuest,
    updateQuest,
    toggleQuestTracked,
    trackedQuests,
    johnEmail,
    stephEmail,
    meganEmail,
    tasks,
    createQuestMission,
  } = useApp();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState(johnEmail);
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isQuestModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isQuestModalOpen]);

  // Populate form when editing
  useEffect(() => {
    if (selectedQuest) {
      setTitle(selectedQuest.title);
      setNotes(selectedQuest.notes || '');
      setAssignee(selectedQuest.assignee);
      setColor(selectedQuest.color || '');
    } else {
      // Reset for new quest
      setTitle('');
      setNotes('');
      setAssignee(johnEmail);
      setColor('');
    }
    setQuickAddTitle('');
  }, [selectedQuest, johnEmail]);

  if (!isQuestModalOpen) return null;

  // Missions in this quest (open, not in loadout)
  const questMissions = selectedQuest
    ? tasks
        .filter(t => t.status === 'open' && t.quest_id === selectedQuest.quest_id && !t.today_slot)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    : [];

  // Count overdue missions
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const overdueCount = questMissions.filter(t => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    return dueDay.getTime() < today.getTime();
  }).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    try {
      if (isCreatingQuest) {
        const input: CreateQuestInput = {
          title: title.trim(),
          notes: notes.trim() || undefined,
          assignee,
          color: color.trim() || undefined,
        };
        await createQuest(input);
      } else if (selectedQuest) {
        const input: UpdateQuestInput = {
          quest_id: selectedQuest.quest_id,
          title: title.trim(),
          notes: notes.trim(),
          assignee,
          color: color.trim() || undefined,
        };
        await updateQuest(input);
      }
    } catch {
      // Error already handled in context
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeQuestModal();
    }
  };

  const handleToggleTracked = async () => {
    if (!selectedQuest) return;

    try {
      await toggleQuestTracked(selectedQuest.quest_id);
    } catch {
      // Error handled in context
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !selectedQuest || quickAddSaving) return;

    setQuickAddSaving(true);
    try {
      await createQuestMission(selectedQuest.quest_id, quickAddTitle.trim(), selectedQuest.assignee);
      setQuickAddTitle('');
    } finally {
      setQuickAddSaving(false);
    }
  };

  const isEditMode = !isCreatingQuest && selectedQuest;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal ${isEditMode ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isCreatingQuest ? '⚔ NEW QUEST' : '⚔ QUEST DETAILS'}</h3>
          <button className="modal-close" onClick={closeQuestModal}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="quest-title">OBJECTIVE *</label>
              <input
                id="quest-title"
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter quest objective..."
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="quest-notes">INTEL</label>
              <textarea
                id="quest-notes"
                className="form-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional intel..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="quest-assignee">OPERATOR</label>
              <select
                id="quest-assignee"
                className="form-select"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
              >
                <option value={johnEmail}>JOHN</option>
                <option value={stephEmail}>STEF</option>
                <option value={meganEmail}>MEGAN</option>
              </select>
            </div>

            <div className="form-group">
              <label>QUEST COLOR</label>
              <div className="quest-color-picker">
                {QUEST_PRESET_COLORS.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    className={`quest-color-swatch ${color === hex ? 'active' : ''}`}
                    style={{ background: hex }}
                    onClick={() => setColor(hex)}
                    title={hex}
                  />
                ))}
                <input
                  type="text"
                  className="quest-color-hex"
                  placeholder="#hex"
                  value={color && !QUEST_PRESET_COLORS.includes(color) ? color : ''}
                  onChange={e => {
                    const v = e.target.value.trim().replace(/^#/, '');
                    setColor(v ? '#' + v.slice(0, 6) : '');
                  }}
                  maxLength={7}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Missions in this quest use this color; drag to Cache to reset to Threat Level color.
              </div>
            </div>

            {!isCreatingQuest && selectedQuest && (
              <div className="form-group">
                <label>TRACKING STATUS</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${selectedQuest.is_tracked ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleToggleTracked}
                    style={{ flex: 1 }}
                  >
                    {selectedQuest.is_tracked ? '⚡ TRACKED' : '○ UNTRACKED'}
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ({trackedQuests.length} tracked)
                  </span>
                </div>
              </div>
            )}

            {/* Missions section - edit mode only */}
            {isEditMode && (
              <div className="quest-details-missions">
                <div className="quest-details-header">
                  <span>MISSIONS ({questMissions.length})</span>
                  {overdueCount > 0 && (
                    <span className="quest-overdue-badge">{overdueCount} overdue</span>
                  )}
                </div>

                {questMissions.length > 0 ? (
                  <div className="quest-details-list">
                    {questMissions.map(mission => (
                      <TaskCard
                        key={mission.task_id}
                        task={mission}
                        compact
                        showDragHandle={false}
                        questColor={selectedQuest.color || undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="quest-details-empty">
                    <span className="quest-details-empty-text">No missions in this quest</span>
                  </div>
                )}

                <form
                  className="quest-quick-add"
                  onSubmit={handleQuickAdd}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="text"
                    className="quest-quick-add-input"
                    placeholder="+ Add mission..."
                    value={quickAddTitle}
                    onChange={e => setQuickAddTitle(e.target.value)}
                    disabled={quickAddSaving}
                  />
                </form>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeQuestModal}
              disabled={saving}
            >
              ABORT
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'PROCESSING...' : isCreatingQuest ? 'DEPLOY QUEST' : 'CONFIRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
