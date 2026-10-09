import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ENERGY_POINTS_LIMIT, getPriorityLevel, pointsLimitFor, type EnergyLevel, type Task } from '../types';
import { leftoversOf, missionCr, suggestLoad, todayKey } from '../utils/briefing';
import { getDueDateStatus } from '../utils/dueDate';
import { nextSlots } from '../utils/caseShape';
import {
  CrPips,
  Dialog,
  DueChip,
  EmptyState,
  Icon,
  PriorityChip,
  QuestChip,
  SegmentedControl,
  challengeToCr,
  type SegmentOption,
} from './primitives';

interface BriefingModalProps {
  open: boolean;
  onClose: () => void;
  /** Close the briefing and show the Missions overdue section. */
  onFilterOverdue?: () => void;
}

const ENERGY_OPTIONS: SegmentOption<EnergyLevel>[] = [
  { value: 'light', label: 'Light', title: `Light day — ${ENERGY_POINTS_LIMIT.light} cells`, hint: `Light — ${ENERGY_POINTS_LIMIT.light} cells live` },
  { value: 'medium', label: 'Medium', title: `Medium day — ${ENERGY_POINTS_LIMIT.medium} cells`, hint: `Medium — ${ENERGY_POINTS_LIMIT.medium} cells live` },
  { value: 'heavy', label: 'Heavy', title: `Heavy day — ${ENERGY_POINTS_LIMIT.heavy} cells`, hint: `Heavy — ${ENERGY_POINTS_LIMIT.heavy} cells live` },
];

/**
 * Briefing — once-a-day morning check-in (Dialog, not a new primitive).
 * Energy, leftovers from yesterday, an honest overdue count, and a suggested
 * load. Esc / Skip / Start all dismiss it for today. Return-to-Cache applies
 * immediately; Keep is a no-op (the mission stays in the Case).
 */
export function BriefingModal({ open, onClose, onFilterOverdue }: BriefingModalProps) {
  const {
    tasks,
    quests,
    loadoutTasks,
    currentUser,
    loadoutConfig,
    setEnergyLevel,
    assignToday,
    clearToday,
  } = useApp();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setBusy(false);
    }
  }, [open]);

  const key = todayKey();
  const leftovers = useMemo(() => leftoversOf(tasks, currentUser, key), [tasks, currentUser, key]);
  const used = loadoutTasks.reduce((sum, t) => sum + challengeToCr(t.challenge), 0);
  const energyLevel = loadoutConfig?.energy_level ?? 'medium';
  const live = pointsLimitFor(energyLevel);
  const capacityLeft = live - used;
  const suggestions = useMemo(
    () => suggestLoad(tasks, currentUser, capacityLeft),
    [tasks, currentUser, capacityLeft],
  );
  const overdueCount = useMemo(
    () => tasks.filter(t => (
      t.status === 'open' && !t.today_slot && t.assignee === currentUser && getDueDateStatus(t.due_date).tier === 'overdue'
    )).length,
    [tasks, currentUser],
  );
  const questById = useMemo(() => new Map(quests.map(q => [q.quest_id, q])), [quests]);

  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(suggestions.map(t => t.task_id));
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next.size === prev.size && [...next].every(id => prev.has(id)) ? prev : next;
    });
  }, [suggestions]);

  const selectedCr = suggestions.reduce((sum, t) => (selected.has(t.task_id) ? sum + missionCr(t.challenge) : sum), 0);
  const overBy = Math.max(0, used + selectedCr - live);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const returnLeftover = (taskId: string) => {
    void clearToday(taskId);
  };

  const returnAll = () => {
    leftovers.forEach(t => { void clearToday(t.task_id); });
  };

  const startDay = async () => {
    const ids = suggestions.filter(t => selected.has(t.task_id)).map(t => t.task_id);
    if (ids.length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    try {
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
        {overBy > 0 ? `${overBy} over` : `${Math.max(0, capacityLeft - selectedCr)} free`}
      </span>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>Skip</button>
      <button type="button" className="btn btn--primary" onClick={() => { void startDay(); }} disabled={busy}>
        Start the day
      </button>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Briefing"
      footer={footer}
      busy={busy}
      size="lg"
      className="briefing-dialog"
    >
      <div className="briefing">
        <section className="briefing-section" aria-labelledby="briefing-energy">
          <h4 id="briefing-energy" className="briefing-section__title t-xs">
            <Icon name="energy" size={14} /> Energy
          </h4>
          <SegmentedControl
            ariaLabel="Energy level"
            size="md"
            block
            options={ENERGY_OPTIONS}
            value={energyLevel}
            onChange={level => { void setEnergyLevel(level).catch(() => {}); }}
          />
          <p className="briefing-energy__live t-xs num">{live} cells live</p>
        </section>

        <section className="briefing-section" aria-labelledby="briefing-leftovers">
          <div className="briefing-section__head">
            <h4 id="briefing-leftovers" className="briefing-section__title t-xs">
              <Icon name="clock" size={14} /> Leftovers
              <span className="num">{leftovers.length}</span>
            </h4>
            {leftovers.length > 0 && (
              <div className="briefing-section__actions">
                <button type="button" className="hud-btn" onClick={() => { /* Keep is a no-op — already in the Case. */ }} disabled={busy}>
                  Keep all
                </button>
                <button type="button" className="hud-btn briefing-leftover__return-all" onClick={returnAll} disabled={busy}>
                  Return all
                </button>
              </div>
            )}
          </div>
          {leftovers.length === 0 ? (
            <p className="briefing-copy t-xs">Nothing left in the Case from yesterday.</p>
          ) : (
            <ul className="pick-list" aria-label="Leftover missions">
              {leftovers.map(task => (
                <LeftoverRow
                  key={task.task_id}
                  task={task}
                  questTitle={task.quest_id ? questById.get(task.quest_id)?.title : undefined}
                  questColor={task.quest_id ? questById.get(task.quest_id)?.color || undefined : undefined}
                  busy={busy}
                  onKeep={() => { /* Keep is a no-op */ }}
                  onReturn={() => returnLeftover(task.task_id)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="briefing-section" aria-labelledby="briefing-overdue">
          <h4 id="briefing-overdue" className={`briefing-section__title t-xs ${overdueCount > 0 ? 'briefing-section__title--danger' : ''}`.trim()}>
            <Icon name="alert" size={14} /> Overdue
            <span className="num">{overdueCount}</span>
          </h4>
          {overdueCount === 0 ? (
            <p className="briefing-copy t-xs">No open unloaded missions are overdue.</p>
          ) : (
            <>
              <p className="briefing-copy t-xs">
                {overdueCount} open unloaded {overdueCount === 1 ? 'mission is' : 'missions are'} overdue.
              </p>
              <button
                type="button"
                className="btn btn--secondary briefing-overdue__action"
                onClick={onFilterOverdue}
                disabled={busy || !onFilterOverdue}
              >
                Show overdue
              </button>
            </>
          )}
        </section>

        <section className="briefing-section" aria-labelledby="briefing-suggest">
          <h4 id="briefing-suggest" className="briefing-section__title t-xs">
            <Icon name="load" size={14} /> Suggested load
            <span className="num">{suggestions.length}</span>
          </h4>
          {suggestions.length === 0 ? (
            <EmptyState
              compact
              glyph={<Icon name="loadout" size={20} />}
              title={capacityLeft <= 0 ? 'Case is full' : 'Nothing to suggest'}
              hint={capacityLeft <= 0 ? 'Return leftovers or raise Energy to free cells.' : 'No overdue, due-today, or P1 missions are waiting in the Cache.'}
            />
          ) : (
            <ul className="pick-list briefing-suggest" aria-label="Suggested missions">
              {suggestions.map(task => {
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
        </section>
      </div>
    </Dialog>
  );
}

function LeftoverRow({
  task,
  questTitle,
  questColor,
  busy,
  onKeep,
  onReturn,
}: {
  task: Task;
  questTitle?: string;
  questColor?: string;
  busy: boolean;
  onKeep: () => void;
  onReturn: () => void;
}) {
  const level = getPriorityLevel(task.priority);
  const due = getDueDateStatus(task.due_date);
  return (
    <li className={`pick-row pick-row--p${level} briefing-leftover`}>
      <div className="briefing-leftover__row">
        <span className="pick-row__bar" aria-hidden="true" />
        <span className="briefing-leftover__main">
          <span className="pick-row__title clamp-1">{task.title}</span>
          <span className="pick-row__stats">
            <PriorityChip level={level} />
            <CrPips cr={challengeToCr(task.challenge)} unset={!task.challenge} />
            <DueChip status={due} />
            {questTitle && <QuestChip title={questTitle} color={questColor} />}
          </span>
        </span>
        <span className="briefing-leftover__actions">
          <button type="button" className="hud-btn" onClick={onKeep} disabled={busy} aria-label={`Keep ${task.title}`}>
            Keep
          </button>
          <button
            type="button"
            className="hud-btn briefing-leftover__return"
            onClick={onReturn}
            disabled={busy}
            aria-label={`Back to Cache: ${task.title}`}
          >
            Back to Cache
          </button>
        </span>
      </div>
    </li>
  );
}
