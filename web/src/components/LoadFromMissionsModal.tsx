import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getPriorityLevel, type Task } from '../types';
import { getDueDateStatus } from '../utils/dueDate';
import { nextSlots } from '../utils/caseShape';
import { Dialog, PriorityChip, CrPips, DueChip, QuestChip, EmptyState, Icon, challengeToCr } from './primitives';

interface LoadFromMissionsModalProps {
  open: boolean;
  onClose: () => void;
  /** Live cells at the current energy level. */
  capacity: number;
  /** CR already loaded. */
  used: number;
}

/**
 * Load from Missions — the tap-first alternative to dragging into the Case
 * (brief §6, PLAN 1.5). Lists the viewer's open, unloaded missions (cache and
 * quest missions) as checkbox rows with a running "+N CR" against the free
 * cells; confirm assigns each selected mission to the next slot, in order.
 */
export function LoadFromMissionsModal({ open, onClose, capacity, used }: LoadFromMissionsModalProps) {
  const { tasks, quests, loadoutTasks, currentUser, assignToday } = useApp();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setSelected(new Set());
  }, [open]);

  const candidates = useMemo<Task[]>(() => (
    tasks
      .filter(t => t.status === 'open' && !t.today_slot && t.assignee === currentUser)
      .sort((a, b) => {
        const p = getPriorityLevel(a.priority) - getPriorityLevel(b.priority);
        if (p !== 0) return p;
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        return a.title.localeCompare(b.title);
      })
  ), [tasks, currentUser]);

  const questById = useMemo(() => new Map(quests.map(q => [q.quest_id, q])), [quests]);

  const selectedCr = candidates.reduce((sum, t) => (selected.has(t.task_id) ? sum + challengeToCr(t.challenge) : sum), 0);
  const free = Math.max(0, capacity - used);
  const overBy = Math.max(0, used + selectedCr - capacity);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    const ids = candidates.filter(t => selected.has(t.task_id)).map(t => t.task_id);
    if (ids.length === 0) { onClose(); return; }
    setBusy(true);
    try {
      // Slots are computed up front: `today_slot` is a 1-based position string
      // and each assign must land after the previous one.
      const slots = nextSlots(loadoutTasks.map(t => t.today_slot || ''), ids.length);
      for (let i = 0; i < ids.length; i++) {
        await assignToday(ids[i], slots[i]);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <span className={`pick-total num t-xs ${overBy > 0 ? 'is-over' : ''}`} aria-live="polite">
        +{selectedCr} CR
        <span className="pick-total__sep" aria-hidden="true">·</span>
        {overBy > 0 ? `${overBy} over` : `${free - selectedCr} free`}
      </span>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="button" className="btn btn--primary" onClick={() => { void confirm(); }} disabled={busy || selected.size === 0}>
        <Icon name="import" />
        Load {selected.size > 0 ? selected.size : ''}
      </button>
    </>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Load from Missions" footer={footer} busy={busy} className="pick-dialog">
      {candidates.length === 0 ? (
        <EmptyState compact glyph={<Icon name="cache" size={20} />} title="Nothing to load" hint="Every open mission of yours is already in the Case." />
      ) : (
        <ul className="pick-list" aria-label="Open missions">
          {candidates.map(task => {
            const checked = selected.has(task.task_id);
            const quest = task.quest_id ? questById.get(task.quest_id) : undefined;
            const due = getDueDateStatus(task.due_date);
            const level = getPriorityLevel(task.priority);
            return (
              <li key={task.task_id} className={`pick-row pick-row--p${level} ${checked ? 'is-checked' : ''}`.trim()}>
                <label className="pick-row__label">
                  <input
                    type="checkbox"
                    className="pick-row__input"
                    checked={checked}
                    onChange={() => toggle(task.task_id)}
                    disabled={busy}
                    aria-label={`Load ${task.title}`}
                  />
                  <span className="pick-row__box" aria-hidden="true">
                    {checked && <Icon name="check" size={12} className="pick-row__check" />}
                  </span>
                  <span className="pick-row__bar" aria-hidden="true" />
                  <span className="pick-row__main">
                    <span className="pick-row__title clamp-1">{task.title}</span>
                    <span className="pick-row__stats">
                      <PriorityChip level={level} />
                      <CrPips cr={challengeToCr(task.challenge)} unset={!task.challenge} />
                      <DueChip status={due} />
                      {quest && <QuestChip title={quest.title} color={quest.color || undefined} />}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
