import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface DialogProps {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Sticky footer; put the primary action last (right). */
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  /** When set, body + footer are wrapped in a <form> with these props. */
  formProps?: React.FormHTMLAttributes<HTMLFormElement>;
  /** Block closing (Esc / backdrop / close button) while work is in flight. */
  busy?: boolean;
  className?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog / Sheet — create, edit, confirm (brief §4.9).
 * Dialog ≥ 600px, bottom sheet below (CSS). Header (title + close) · scrolling
 * body · sticky footer. Esc closes; focus is trapped; focus returns on close.
 */
export function Dialog({ open, title, onClose, children, footer, size = 'md', formProps, busy, className = '' }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the first field, or the panel itself.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const autofocus = panel.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
      const first = autofocus ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (busy) return;
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  const body = (
    <>
      <div className="dialog__body">{children}</div>
      {footer && <div className="dialog__foot">{footer}</div>}
    </>
  );

  return createPortal(
    <div
      className="dialog-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        tabIndex={-1}
        className={`dialog dialog--${size} ${className}`.trim()}
      >
        <div className="dialog__head">
          <h3 id={titleId} className="dialog__title t-display">{title}</h3>
          <button type="button" className="dialog__close hit" onClick={onClose} disabled={busy} aria-label="Close" title="Close">
            <Icon name="close" />
          </button>
        </div>
        {formProps ? (
          <form className="dialog__form" {...formProps}>
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>,
    document.body,
  );
}
