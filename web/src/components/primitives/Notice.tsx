import React from 'react';
import { Icon } from './Icon';

interface NoticeProps {
  type: 'success' | 'error';
  message: React.ReactNode;
  onDismiss: () => void;
  /** Optional single action (e.g. Undo). */
  action?: { label: string; onClick: () => void };
}

/**
 * Notice — one toast (brief §4.10). Notices stack, are dismissible, and may
 * carry one action. The stack lives in <Toast>.
 */
export function Notice({ type, message, onDismiss, action }: NoticeProps) {
  return (
    <div className={`notice notice--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span className="notice__glyph" aria-hidden="true">
        <Icon name={type === 'error' ? 'alert' : 'check'} size={12} />
      </span>
      <span className="notice__message">{message}</span>
      {action && (
        <button type="button" className="notice__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      <button type="button" className="notice__dismiss hit" onClick={onDismiss} aria-label="Dismiss" title="Dismiss">
        <Icon name="close" />
      </button>
    </div>
  );
}
