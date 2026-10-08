import React, { useMemo, useRef, useState } from 'react';
import { getPriorityLevel } from '../../types';
import { useApp } from '../../context/AppContext';
import { parseMissionLine } from '../../utils/parseMission';
import { getDueDateStatus } from '../../utils/dueDate';
import { CrPips, DueChip, PriorityChip, StatChip, Tooltip, challengeToCr } from '../primitives';
import { Gadget } from './Gadget';

const PLACEHOLDER = 'Fix login bug -p1 ~high @tomorrow #notes';

/**
 * Quick add gadget — one line of bulk-import grammar, Enter creates the
 * mission in the Cache. The parsed preview under the input shows exactly
 * what will be sent (P · CR · due · note) so the grammar teaches itself.
 */
export function QuickAdd() {
  const { createTask, showToast } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (text.trim() ? parseMissionLine(text.trim()) : null), [text]);
  const canSubmit = Boolean(parsed?.title) && !busy;

  const submit = async () => {
    if (!parsed || !parsed.title || busy) return;
    setBusy(true);
    try {
      await createTask({
        title: parsed.title,
        priority: parsed.priority,
        challenge: parsed.challenge,
        due_date: parsed.due_date,
        notes: parsed.notes,
      });
      setText('');
    } catch {
      // createTask already raised an error notice; keep the text so it can be retried.
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) void submit();
      else if (parsed && !parsed.title) showToast('Give the mission a title', 'error');
    } else if (e.key === 'Escape' && text) {
      // First Esc clears the line; a second one collapses the belt.
      e.stopPropagation();
      setText('');
    }
  };

  const due = parsed?.due_date ? getDueDateStatus(parsed.due_date) : null;

  return (
    <Gadget
      id="quickadd"
      name="Quick add"
      icon="plus"
      teach="Quick add — type a mission in one line and press Enter; it lands in the Cache. Tokens: -p1 priority · ~high CR · @tomorrow due · #note."
    >
      <div className="quick-add">
        <Tooltip content="One mission per Enter. -p1/-p2/-p3 · ~low/~medium/~high · @today/@tomorrow/@nextweek/@2026-05-20 · #note. Esc clears." block>
          <input
            ref={inputRef}
            type="text"
            className="quick-add__input num"
            value={text}
            placeholder={PLACEHOLDER}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            aria-label="Quick add mission"
            autoComplete="off"
            spellCheck={false}
          />
        </Tooltip>
        {parsed ? (
          <div className="quick-add__preview" aria-live="polite">
            <span className={`quick-add__title clamp-1 ${parsed.title ? '' : 'is-empty'}`.trim()}>
              {parsed.title || 'Needs a title'}
            </span>
            <span className="quick-add__chips">
              <PriorityChip level={getPriorityLevel(parsed.priority)} />
              <CrPips cr={challengeToCr(parsed.challenge ?? '')} unset={!parsed.challenge} />
              {due && <DueChip status={due} />}
              {parsed.notes && <StatChip title={parsed.notes}>note</StatChip>}
            </span>
          </div>
        ) : (
          <div className="quick-add__hint t-2xs">
            <span className="num">-p1</span> priority · <span className="num">~high</span> CR · <span className="num">@tomorrow</span> due · <span className="num">#</span>note
          </div>
        )}
      </div>
    </Gadget>
  );
}
