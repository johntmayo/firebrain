import React from 'react';
import type { PriorityLevel } from '../../types';
import type { OperatorInfo } from '../../utils/operators';
import type { DueDateStatus } from '../../utils/dueDate';
import { CrPips, DueChip, LoadedChip, OperatorChip, PriorityChip, QuestChip } from './StatChip';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';
import { useTooltip } from './Tooltip';
import { Icon } from './Icon';

export type ItemCardTier = 'row' | 'cell' | 'compact';

export interface ItemCardProps {
  title: string;
  notes?: string;
  createdAt?: string;
  priorityLevel: PriorityLevel;
  cr: 1 | 2 | 3;
  /** CR was never set; shown dimmed and counted as the default. */
  crUnset?: boolean;
  due: DueDateStatus;
  /** Omit to hide (e.g. under a single-operator filter). */
  operator?: OperatorInfo;
  /** Omit to hide (e.g. inside its own quest). */
  quest?: { title: string; color?: string };
  /** Show the "Loaded" chip (matrix view, where loadout missions mix in). */
  loaded?: boolean;
  /** Hide priority / CR when the surrounding layout already encodes them (matrix). */
  hidePriority?: boolean;
  hideCr?: boolean;
  tier?: ItemCardTier;
  completed?: boolean;
  completedLabel?: string;
  dragging?: boolean;

  onOpen?: () => void;
  onDone?: () => void;
  onEdit?: () => void;
  /** Click equivalent of drag-to-loadout / drag-out. */
  loadAction?: { kind: 'load' | 'unload'; onSelect: () => void };
  menuItems?: ActionMenuItem[];

  /** dnd-kit wiring from the connected wrapper. */
  rootRef?: (el: HTMLElement | null) => void;
  rootProps?: React.HTMLAttributes<HTMLElement>;
  className?: string;
  style?: React.CSSProperties;
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/**
 * ItemCard — the mission, everywhere it appears (brief §4.3).
 *
 *   ┌─┬──────────────────────────────────────┬────┐
 *   │▌│ Title (1 line, ellipsis)      [quest] │ ✓  │
 *   │▌│ P2 ●●○  Fri  J                        │    │
 *   └─┴──────────────────────────────────────┴────┘
 *    priority bar     stat row                action zone
 *
 * Fixed height per tier. Stat order is fixed: priority · CR · due · operator ·
 * quest. Hover reveals load/unload · edit · more next to the done check. The tooltip carries the full
 * title, notes excerpt, created date and exact due.
 */
export function ItemCard({
  title,
  notes,
  createdAt,
  priorityLevel,
  cr,
  crUnset,
  due,
  operator,
  quest,
  loaded,
  hidePriority,
  hideCr,
  tier = 'row',
  completed,
  completedLabel,
  dragging,
  onOpen,
  onDone,
  onEdit,
  loadAction,
  menuItems,
  rootRef,
  rootProps,
  className = '',
  style,
}: ItemCardProps) {
  const created = createdAt ? new Date(createdAt) : null;
  const tooltipContent = (
    <div className="tooltip__body">
      <strong>{title}</strong>
      {notes && <div className="tooltip__notes">{notes.length > 160 ? `${notes.slice(0, 160)}…` : notes}</div>}
      <div className="tooltip__meta num">
        {due.exact && <span>Due {due.exact}</span>}
        {created && !Number.isNaN(created.getTime()) && (
          <span>Created {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        )}
      </div>
    </div>
  );
  const { anchorProps, tooltip } = useTooltip(tooltipContent, !dragging);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' && onOpen) {
      e.preventDefault();
      onOpen();
    } else if (e.key === ' ' && onDone && !completed) {
      e.preventDefault();
      onDone();
    }
  };

  const hasHoverActions = Boolean(loadAction || onEdit || (menuItems && menuItems.length > 0));

  return (
    <>
      <article
        ref={rootRef as React.Ref<HTMLElement>}
        {...rootProps}
        {...anchorProps}
        className={[
          'item-card',
          `item-card--${tier}`,
          `item-card--p${priorityLevel}`,
          completed ? 'is-completed' : '',
          dragging ? 'is-dragging' : '',
          rootProps?.className ?? '',
          className,
        ].filter(Boolean).join(' ')}
        style={style}
        tabIndex={rootProps?.tabIndex ?? 0}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
      >
        <span className="item-card__bar" aria-hidden="true" />

        <div className="item-card__main">
          <div className="item-card__title clamp-1">{title}</div>
          <div className="item-card__stats">
            {completed && completedLabel ? (
              <span className="item-card__completed t-xs num">{completedLabel}</span>
            ) : (
              <>
                {!hidePriority && <PriorityChip level={priorityLevel} />}
                {!hideCr && <CrPips cr={cr} unset={crUnset} />}
                <DueChip status={due} />
                {operator && <OperatorChip initial={operator.initial} name={`Assigned to ${operator.name}`} tone={operator.tone} />}
                {loaded && <LoadedChip />}
                {quest && <QuestChip title={quest.title} color={quest.color} />}
              </>
            )}
          </div>
        </div>

        {!completed && (onDone || hasHoverActions) && (
          <div className="item-card__actions" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
            {hasHoverActions && (
              <div className="item-card__hover-actions">
                {loadAction && (
                  <button
                    type="button"
                    className="icon-btn hit"
                    onClick={loadAction.onSelect}
                    title={loadAction.kind === 'load' ? 'Load into today' : 'Unload from today'}
                    aria-label={loadAction.kind === 'load' ? 'Load into today' : 'Unload from today'}
                  >
                    <Icon name={loadAction.kind === 'load' ? 'load' : 'unload'} />
                  </button>
                )}
                {onEdit && (
                  <button type="button" className="icon-btn hit" onClick={onEdit} title="Edit" aria-label="Edit mission">
                    <Icon name="edit" />
                  </button>
                )}
                {menuItems && menuItems.length > 0 && (
                  <ActionMenu items={menuItems} label="More actions" triggerClassName="icon-btn" />
                )}
              </div>
            )}
            {onDone && (
              <button type="button" className="item-card__done hit" onClick={onDone} title="Mark complete" aria-label="Mark complete">
                <Icon name="check" size={12} className="item-card__done-icon" />
              </button>
            )}
          </div>
        )}
      </article>
      {tooltip}
    </>
  );
}
