import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Tooltip } from './primitives';
import { Launchpad, QuickAdd, Shortcuts, Stopwatch, type StopwatchSnapshot } from './gadgets';

const OPEN_KEY = 'firebrain_gadgets_open';

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * GadgetDrawer — the operator's gadget belt. Desktop only. A 24px pull tab
 * pinned to the bottom edge; pulling it reveals one fixed-height tray of
 * gadget tiles (`--h-drawer`), overlaid on the panes so the shell never
 * reflows and the page never scrolls. Open state persists across reloads.
 */
export function GadgetDrawer() {
  const [open, setOpen] = useState<boolean>(readOpen);
  const [watch, setWatch] = useState<StopwatchSnapshot | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  const toggle = useCallback(() => setOpen(o => !o), []);

  // Esc collapses the belt when focus is inside it, and hands focus back to the tab.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !open) return;
    e.stopPropagation();
    setOpen(false);
    tabRef.current?.focus();
  };

  const onSnapshot = useCallback((snap: StopwatchSnapshot) => {
    setWatch(prev => (prev && prev.display === snap.display && prev.running === snap.running ? prev : snap));
  }, []);

  const tabTeach = open
    ? 'Collapse the gadget belt (Esc also works while a gadget has focus). A running stopwatch keeps going.'
    : 'Gadgets — a belt of small tools for working the planner: stopwatch, quick add, launchpad, shortcuts.';

  return (
    <div
      ref={rootRef}
      className={`gadget-drawer ${open ? 'is-open' : ''}`.trim()}
      onKeyDown={onKeyDown}
    >
      <Tooltip content={tabTeach} block className="gadget-drawer__tab-anchor">
        <button
          ref={tabRef}
          type="button"
          className="gadget-drawer__tab"
          data-hit-exempt="full-width 24px pull tab"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="gadget-tray"
        >
          <Icon name="tools" size={12} />
          <span className="gadget-drawer__label t-2xs">Gadgets</span>
          {watch?.running && !open && (
            <span className="gadget-drawer__readout num t-2xs" aria-label="Stopwatch running">{watch.display}</span>
          )}
          <Icon name={open ? 'chevron-down' : 'chevron-up'} size={12} className="gadget-drawer__chevron" />
        </button>
      </Tooltip>

      <div id="gadget-tray" className="gadget-drawer__tray" role="region" aria-label="Gadgets" aria-hidden={!open}>
        <div className="gadget-drawer__row">
          <Stopwatch onSnapshot={onSnapshot} />
          <QuickAdd />
          <Launchpad />
          <Shortcuts />
        </div>
      </div>
    </div>
  );
}
