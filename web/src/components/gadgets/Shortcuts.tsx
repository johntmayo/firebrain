import React from 'react';
import { Gadget } from './Gadget';

/**
 * Only shortcuts that exist in the code are listed here:
 *   Enter → ItemCard.handleKeyDown / QuestLogEntry onKeyDown (opens the focused card)
 *   Space → ItemCard.handleKeyDown (onDone — completes the focused mission)
 *   Esc   → Dialog, ActionMenu, Tooltip, GadgetDrawer
 */
const SHORTCUTS = [
  { keys: ['Enter'], what: 'Open focused mission / quest' },
  { keys: ['Space'], what: 'Complete focused mission' },
  { keys: ['Esc'], what: 'Close dialog · menu · gadgets' },
] as const;

export function Shortcuts() {
  return (
    <Gadget
      id="shortcuts"
      name="Shortcuts"
      icon="info"
      teach="Shortcuts — keys that work right now. Tab to a mission card first; Enter opens it, Space completes it."
    >
      <dl className="shortcuts">
        {SHORTCUTS.map(s => (
          <div key={s.keys.join('+')} className="shortcuts__row">
            <dt className="shortcuts__keys">
              {s.keys.map(k => <kbd key={k} className="shortcuts__key num">{k}</kbd>)}
            </dt>
            <dd className="shortcuts__what t-xs clamp-1">{s.what}</dd>
          </div>
        ))}
      </dl>
    </Gadget>
  );
}
