import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { titleFallback, useTooltip } from './Tooltip';

export type ActionMenuItem =
  | {
      id: string;
      label: React.ReactNode;
      /** Leading icon, e.g. `<Icon name="edit" />`. */
      glyph?: React.ReactNode;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      hint?: string;
    }
  | { id: string; separator: true }
  | { id: string; custom: React.ReactNode };

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible name for the trigger. */
  label: string;
  /** Trigger contents; defaults to the "more" (ellipsis) icon. */
  trigger?: React.ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
  className?: string;
  /**
   * One teaching sentence shown as a hover tooltip on the trigger. Leave unset
   * inside ItemCard, which already owns a card-level tooltip.
   */
  hint?: string;
}

const EDGE_PX = 8;

/**
 * ActionMenu — the overflow ("more") menu (brief §4.10). Portaled popover anchored
 * to its trigger; Esc / outside click / selection closes it; arrow keys move.
 */
export function ActionMenu({ items, label, trigger, triggerClassName = '', align = 'end', className = '', hint }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { anchorProps: hintProps, tooltip: hintTip } = useTooltip(hint, Boolean(hint) && !open);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  const place = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const w = menu?.offsetWidth ?? 200;
    const h = menu?.offsetHeight ?? 160;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(EDGE_PX, Math.min(left, window.innerWidth - w - EDGE_PX));
    let top = r.bottom + 4;
    if (top + h > window.innerHeight - EDGE_PX) top = Math.max(EDGE_PX, r.top - 4 - h);
    setPos({ left, top });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btnRef.current?.focus();
      }
    };
    const onScroll = () => close();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    const next = nodes[(idx + (e.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length];
    next?.focus();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`action-menu__trigger hit ${triggerClassName}`.trim()}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={hint ? titleFallback(hint) : label}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        {...hintProps}
      >
        {trigger ?? <Icon name="more" />}
      </button>
      {hintTip}
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className={`action-menu ${className}`.trim()}
          style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
          onKeyDown={onMenuKeyDown}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {items.map(item => {
            if ('separator' in item) return <div key={item.id} className="action-menu__sep" role="separator" />;
            if ('custom' in item) return <div key={item.id} className="action-menu__custom">{item.custom}</div>;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`action-menu__item ${item.danger ? 'is-danger' : ''}`.trim()}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
              >
                {item.glyph && <span className="action-menu__glyph" aria-hidden="true">{item.glyph}</span>}
                <span className="action-menu__label">{item.label}</span>
                {item.hint && <span className="action-menu__hint t-2xs">{item.hint}</span>}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
