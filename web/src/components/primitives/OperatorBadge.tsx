import React from 'react';
import type { OperatorInfo } from '../../utils/operators';

interface OperatorBadgeProps {
  operator: OperatorInfo;
  /** Show the name next to the initial. */
  withName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

/**
 * OperatorBadge — a user's avatar initial in their tone (brief §4.10).
 */
export function OperatorBadge({ operator, withName, size = 'md', className = '', title }: OperatorBadgeProps) {
  return (
    <span className={`op-badge op-badge--${size} op-badge--${operator.tone} ${className}`.trim()} title={title ?? operator.name}>
      <span className="op-badge__initial num" aria-hidden={withName ? 'true' : undefined}>{operator.initial}</span>
      {withName && <span className="op-badge__name">{operator.name}</span>}
      {!withName && <span className="sr-only">{operator.name}</span>}
    </span>
  );
}
