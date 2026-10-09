import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { normalizePriority } from '../types';
import type { Priority, Challenge, CreateTaskInput, UpdateTaskInput } from '../types';
import { appendObjective, countObjectives, parseObjectives, toggleObjective } from '../utils/objectives';
import { isMissionPhase } from '../utils/engagement';
import { Dialog, SegmentedControl, type SegmentOption } from './primitives';
import { EngagePicker } from './FocusRow';

const PRIORITY_OPTIONS: SegmentOption<Priority>[] = [
  { value: 'high', label: 'P1', title: 'P1 — highest', hint: 'P1 — do first' },
  { value: 'medium', label: 'P2', title: 'P2 — standard', hint: 'P2 — standard' },
  { value: 'low', label: 'P3', title: 'P3 — lower', hint: 'P3 — when there\'s room' },
];

type ChallengeChoice = Challenge | 'unset';

const CR_OPTIONS: SegmentOption<ChallengeChoice>[] = [
  { value: 'low', label: 'CR 1', title: '1 cell', hint: 'CR 1 — light, costs 1 cell' },
  { value: 'medium', label: 'CR 2', title: '2 cells', hint: 'CR 2 — standard, costs 2 cells' },
  { value: 'high', label: 'CR 3', title: '3 cells', hint: 'CR 3 — heavy, costs 3 cells' },
  { value: 'unset', label: '—', title: 'Not set (counts as CR 2)', hint: '— — unset, counted as CR 2' },
];

export function TaskModal() {
  const {
    isModalOpen,
    selectedTask,
    isCreating,
    taskModalDefaultQuestId,
    closeModal,
    createTask,
    updateTask,
    cancelTask,
    assignToday,
    johnEmail,
    stephEmail,
    meganEmail,
    quests,
    currentUser,
    engagement,
    engageMission,
  } = useApp();
  const [engageOpen, setEngageOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [challenge, setChallenge] = useState<Challenge | ''>('');
  const [assignee, setAssignee] = useState(johnEmail);
  const [dueDate, setDueDate] = useState('');
  const [questId, setQuestId] = useState('');
  const [saving, setSaving] = useState(false);
  const [addToLoadout, setAddToLoadout] = useState(false);

  // Populate form for edit/create; include modal/create flags so repeated "new mission"
  // openings always reset form state.
  useEffect(() => {
    if (isModalOpen && selectedTask && !isCreating) {
      setTitle(selectedTask.title);
      setNotes(selectedTask.notes || '');
      setPriority(normalizePriority(selectedTask.priority));
      setChallenge(selectedTask.challenge || '');
      setAssignee(selectedTask.assignee);
      setDueDate(selectedTask.due_date ? selectedTask.due_date.substring(0, 10) : '');
      setQuestId(selectedTask.quest_id || '');
    } else {
      setTitle('');
      setNotes('');
      setPriority('medium');
      setChallenge('medium');
      setAssignee(johnEmail);
      setDueDate('');
      setQuestId(taskModalDefaultQuestId || '');
      setAddToLoadout(false);
    }
  }, [isModalOpen, isCreating, selectedTask, johnEmail, taskModalDefaultQuestId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isCreating) {
      const input: CreateTaskInput = {
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        challenge: challenge || undefined,
        assignee,
        due_date: dueDate || undefined,
        quest_id: questId || undefined,
      };

      closeModal();
      void createTask(input)
        .then(newTask => {
          if (addToLoadout && newTask) return assignToday(newTask.task_id);
        })
        .catch(() => { /* handled in context */ });
      return;
    }

    if (selectedTask) {
      const input: UpdateTaskInput = {
        task_id: selectedTask.task_id,
        title: title.trim(),
        notes: notes.trim(),
        priority,
        challenge: challenge || undefined,
        assignee,
        due_date: dueDate,
        quest_id: questId,
      };

      closeModal();
      void updateTask(input).catch(() => { /* handled in context */ });
    }
  };

  const isEditingSelected = !isCreating && selectedTask;
  const isReadOnly = Boolean(isEditingSelected && selectedTask.status === 'done');
  const parsedObjectives = parseObjectives(notes);
  const objectiveCount = countObjectives(notes);

  const persistNotes = (next: string) => {
    setNotes(next);
    if (isCreating || !selectedTask || isReadOnly) return;
    void updateTask({ task_id: selectedTask.task_id, notes: next }, { close: false, toast: false }).catch(() => {
      setNotes(notes);
    });
  };

  const handleToggleObjective = (index: number) => {
    if (isReadOnly) return;
    persistNotes(toggleObjective(notes, index));
  };

  const handleAddObjective = () => {
    if (isReadOnly) return;
    setNotes(appendObjective(notes));
  };

  const handleDeleteMission = async () => {
    if (!selectedTask || isCreating || saving) return;
    if (!window.confirm('Delete this mission? You can not undo this.')) return;

    setSaving(true);
    try {
      await cancelTask(selectedTask.task_id);
      closeModal();
    } catch {
      // handled in context
    } finally {
      setSaving(false);
    }
  };

  const isLoadedOwn = Boolean(
    isEditingSelected
    && selectedTask.today_slot
    && (selectedTask.today_user === currentUser || selectedTask.assignee === currentUser)
  );
  const activeOther = isMissionPhase(engagement.phase) && engagement.missionId !== selectedTask?.task_id;

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={closeModal} disabled={saving}>
        Close
      </button>
      {isLoadedOwn && !isReadOnly && (
        <button type="button" className="btn btn--secondary" onClick={() => setEngageOpen(true)} disabled={saving}>
          Engage
        </button>
      )}
      {isEditingSelected && !isReadOnly && (
        <button type="button" className="btn btn--danger" onClick={handleDeleteMission} disabled={saving}>
          Delete
        </button>
      )}
      {!isReadOnly && (
        <button type="submit" className="btn btn--primary" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : isCreating ? 'Create mission' : 'Save changes'}
        </button>
      )}
    </>
  );

  return (
    <>
    <Dialog
      open={isModalOpen}
      title={isCreating ? 'New mission' : 'Mission'}
      onClose={closeModal}
      footer={footer}
      busy={saving}
      formProps={{ onSubmit: handleSubmit }}
    >
      <fieldset className="form-fields" disabled={isReadOnly}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            className="form-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs doing?"
            data-autofocus
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="form-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any extra details…"
          />
        </div>

        <div className="form-group objectives">
          <div className="objectives__head">
            <span className="form-label" id="objectives-label">Objectives</span>
            {objectiveCount.total > 0 && (
              <span className="objectives__count num" aria-live="polite">
                {objectiveCount.checked}/{objectiveCount.total}
              </span>
            )}
            {!isReadOnly && (
              <button type="button" className="objectives__add hit" onClick={handleAddObjective}>
                + Objective
              </button>
            )}
          </div>
          {parsedObjectives.objectives.length > 0 && (
            <ul className="objectives__list" aria-labelledby="objectives-label">
              {parsedObjectives.objectives.map((obj, i) => (
                <li key={`${i}:${obj.raw}`} className="objectives__row">
                  <label className="objectives__item">
                    <input
                      type="checkbox"
                      className="objectives__check hit"
                      checked={obj.checked}
                      disabled={isReadOnly}
                      onChange={() => handleToggleObjective(i)}
                    />
                    <span className={`objectives__text${obj.checked ? ' is-done' : ''}`}>
                      {obj.text || 'New objective'}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <span className="form-label" id="priority-label">Priority</span>
            <SegmentedControl ariaLabel="Priority" size="md" block options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
          </div>
          <div className="form-group">
            <span className="form-label" id="cr-label">CR · energy cost</span>
            <SegmentedControl
              ariaLabel="Challenge rating"
              size="md"
              block
              options={CR_OPTIONS}
              value={challenge || 'unset'}
              onChange={v => setChallenge(v === 'unset' ? '' : v)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="assignee">Operator</label>
            <select id="assignee" className="form-select" value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value={johnEmail}>John</option>
              <option value={stephEmail}>Stef</option>
              <option value={meganEmail}>Megan</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="dueDate">Due</label>
            <input id="dueDate" type="date" className="form-input num" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="questId">Quest</label>
          <select id="questId" className="form-select" value={questId} onChange={e => setQuestId(e.target.value)}>
            <option value="">No quest</option>
            {quests.map(q => (
              <option key={q.quest_id} value={q.quest_id}>
                {q.is_tracked ? '● ' : '○ '}{q.title}
              </option>
            ))}
            {selectedTask?.quest_id && !quests.some(q => q.quest_id === selectedTask.quest_id) && (
              <option value={selectedTask.quest_id}>(cleared or unknown quest)</option>
            )}
          </select>
        </div>

        {isCreating && (
          <label className="form-check">
            <input type="checkbox" checked={addToLoadout} onChange={e => setAddToLoadout(e.target.checked)} />
            Load into today's loadout
          </label>
        )}
      </fieldset>
    </Dialog>
    <EngagePicker
      key={selectedTask?.task_id ?? 'closed'}
      open={engageOpen && isLoadedOwn}
      missionTitle={selectedTask?.title ?? ''}
      lastPresetMinutes={engagement.lastPresetMinutes}
      blockedReason={activeOther ? 'Stand down first' : null}
      onClose={() => setEngageOpen(false)}
      onStart={minutes => {
        if (!selectedTask) return;
        engageMission(selectedTask, minutes);
        setEngageOpen(false);
        closeModal();
      }}
    />
    </>
  );
}
