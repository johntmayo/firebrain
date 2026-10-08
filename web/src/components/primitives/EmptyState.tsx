import React from 'react';

interface EmptyStateProps {
  glyph?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  /** Always offer a next action (brief §4.10). */
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ glyph, title, hint, actions, compact, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''} ${className}`.trim()}>
      {glyph && <div className="empty-state__glyph" aria-hidden="true">{glyph}</div>}
      <div className="empty-state__title">{title}</div>
      {hint && <div className="empty-state__hint t-xs">{hint}</div>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  );
}
