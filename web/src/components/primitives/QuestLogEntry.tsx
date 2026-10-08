import React from 'react';
import type { OperatorInfo } from '../../utils/operators';
import { OperatorChip, StatChip } from './StatChip';
import { Icon } from './Icon';
import { titleFallback, useTooltip } from './Tooltip';

export interface QuestProgress {
  open: number;
  /** When done-count is known, progress renders `done/total` with a thin bar. */
  done?: number;
}

interface QuestLogEntryProps {
  title: string;
  color?: string;
  leader: OperatorInfo;
  progress: QuestProgress;
  overdueCount?: number;
  tracked: boolean;
  expanded: boolean;
  completed?: boolean;
  dragging?: boolean;

  onToggle: () => void;
  onOpen: () => void;
  onTrackToggle?: () => void;

  /** dnd-kit wiring for drag-to-reorder (desktop). */
  rootRef?: (el: HTMLElement | null) => void;
  rootProps?: React.HTMLAttributes<HTMLElement>;
  className?: string;
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/**
 * QuestLogEntry — a quest row in the Quests pane (brief §4.7).
 * color dot · title (1-line clamp) · leader · progress · overdue chip · chevron.
 * Hover: Track/Untrack. Fixed row height; nested missions render below it.
 */
export function QuestLogEntry({
  title,
  color,
  leader,
  progress,
  overdueCount = 0,
  tracked,
  expanded,
  completed,
  dragging,
  onToggle,
  onOpen,
  onTrackToggle,
  rootRef,
  rootProps,
  className = '',
}: QuestLogEntryProps) {
  const total = progress.done !== undefined ? progress.open + progress.done : undefined;
  const pct = total && total > 0 && progress.done !== undefined ? Math.round((progress.done / total) * 100) : 0;

  const trackHint = tracked
    ? 'Untrack — move this quest down to the Log'
    : 'Track — tracked quests pin to the top of the Quests pane';
  const chevronHint = expanded ? 'Collapse this quest\'s missions' : 'Expand to see this quest\'s missions';
  const { anchorProps: trackProps, tooltip: trackTip } = useTooltip(trackHint, Boolean(onTrackToggle) && !completed);
  const { anchorProps: chevronProps, tooltip: chevronTip } = useTooltip(chevronHint, !dragging);

  return (
    <>
      <div
        ref={rootRef as React.Ref<HTMLDivElement>}
        {...rootProps}
        className={[
          'quest-entry',
          tracked ? 'is-tracked' : '',
          expanded ? 'is-expanded' : '',
          completed ? 'is-completed' : '',
          dragging ? 'is-dragging' : '',
          rootProps?.className ?? '',
          className,
        ].filter(Boolean).join(' ')}
        style={color ? ({ '--quest-color': color } as React.CSSProperties) : undefined}
        onClick={onOpen}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            onOpen();
          }
        }}
        tabIndex={rootProps?.tabIndex ?? 0}
        role={rootProps?.role ?? 'button'}
      >
        <span className="quest-entry__dot" aria-hidden="true" />
        <span className="quest-entry__title clamp-1" title={title}>{title}</span>

        <span className="quest-entry__meta">
          <OperatorChip initial={leader.initial} name={`Led by ${leader.name}`} tone={leader.tone} />
          {total !== undefined ? (
            <span className="quest-entry__progress" title={`${progress.done} of ${total} missions cleared`}>
              <span className="num t-xs">{progress.done}/{total}</span>
              <span className="quest-entry__bar" aria-hidden="true">
                <span className="quest-entry__bar-fill" style={{ width: `${pct}%` }} />
              </span>
            </span>
          ) : (
            <StatChip mono title={`${progress.open} open missions`}>{progress.open} open</StatChip>
          )}
          {overdueCount > 0 && (
            <StatChip tone="danger" mono title={`${overdueCount} mission${overdueCount === 1 ? '' : 's'} past due`}>{overdueCount} late</StatChip>
          )}
        </span>

        <span className="quest-entry__actions" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
          {onTrackToggle && !completed && (
            <button
              type="button"
              className="quest-entry__track hit"
              onClick={onTrackToggle}
              title={titleFallback(trackHint)}
              {...trackProps}
            >
              <Icon name={tracked ? 'pin-off' : 'pin'} size={12} />
              {tracked ? 'Untrack' : 'Track'}
            </button>
          )}
          <button
            type="button"
            className={`quest-entry__chevron icon-btn hit ${expanded ? 'is-open' : ''}`}
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse quest' : 'Expand quest'}
            title={titleFallback(chevronHint)}
            {...chevronProps}
          >
            <Icon name="chevron-down" size={14} />
          </button>
        </span>
      </div>
      {trackTip}
      {chevronTip}
    </>
  );
}
