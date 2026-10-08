import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { insertIndexForCell, type CaseLayout, type CaseCell, type PlacedItem } from '../../utils/casePacking';
import { isTightCell } from '../../utils/caseShape';
import { Icon } from './Icon';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';

export const CASE_CELL_DROP_PREFIX = 'case-cell-';

export interface CaseGridActions {
  onUnload?: (item: PlacedItem) => void;
  onShiftEarlier?: (item: PlacedItem) => void;
  onShiftLater?: (item: PlacedItem) => void;
  /** Mark the mission complete (UI verb "Complete"; the resulting state is "Cleared"). */
  onClear?: (item: PlacedItem) => void;
}

export interface CaseGridProps {
  /** From `packCase(items, capacity, shape)`. */
  layout: CaseLayout;
  /** Renders the mission inside its item cell. `tight` = a 1-wide cell too narrow for the full stat row. */
  renderItem: (item: PlacedItem, info: { tight: boolean }) => React.ReactNode;
  /** Own loadout: free cells and items are drop targets, hover actions render. */
  editable?: boolean;
  actions?: CaseGridActions;
  /** Total ordered items (placed + overflow) so shift ←/→ can disable at the ends. */
  itemCount?: number;
  /** Measured cell width (px); decides the tight treatment for CR1 cells. */
  cellWidth?: number | null;
  className?: string;
  ariaLabel?: string;
}

/**
 * CaseGrid — the loadout as an inventory (brief §4.5, §6).
 *
 * DOM contract:
 *   .case-grid[data-cols][data-rows][data-capacity]          CSS grid, fixed cell height --h-cell
 *     .case-cell.case-cell--{free|locked|occupied}[data-cell=n]  one per grid cell, always cols×rows of them
 *       (free cells are dnd-kit droppables `case-cell-<n>`; locked cells carry aria-disabled)
 *     .case-item[data-item-id][data-cell=n][data-span=cr]     one per placed item, overlaid on its cells
 *       (droppable `case-cell-<n>` for the item's first cell; drop data = { insertIndex })
 *       > renderItem(...)                                        the TaskCard / ItemCard
 *       .case-item__actions                                      hover strip (fine pointer) + ⋯ menu (coarse)
 *
 * Every droppable carries `data.insertIndex` = `insertIndexForCell(layout, n)` so the
 * drag handler never has to know the layout: free cell → after everything that starts
 * before it; item cell → before that item.
 */
export function CaseGrid({
  layout,
  renderItem,
  editable = false,
  actions,
  itemCount,
  cellWidth = null,
  className = '',
  ariaLabel = 'Case',
}: CaseGridProps) {
  const total = itemCount ?? layout.placed.length + layout.overflow.length;
  const tight = isTightCell(cellWidth);

  return (
    <div
      className={`case-grid ${editable ? 'is-editable' : 'is-readonly'} ${className}`.trim()}
      data-cols={layout.cols}
      data-rows={layout.rows}
      data-capacity={layout.capacity}
      style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
      role="group"
      aria-label={ariaLabel}
    >
      {layout.cells.map(cell => (
        <CaseCellView key={cell.n} cell={cell} layout={layout} editable={editable} />
      ))}
      {layout.placed.map(item => (
        <CaseItemView
          key={item.id}
          item={item}
          layout={layout}
          editable={editable}
          actions={actions}
          isFirst={item.index === 0}
          isLast={item.index >= total - 1}
          tight={tight && item.span === 1}
        >
          {renderItem(item, { tight: tight && item.span === 1 })}
        </CaseItemView>
      ))}
    </div>
  );
}

function CaseCellView({ cell, layout, editable }: { cell: CaseCell; layout: CaseLayout; editable: boolean }) {
  const droppable = editable && cell.state === 'free';
  const { isOver, setNodeRef } = useDroppable({
    id: `${CASE_CELL_DROP_PREFIX}${cell.n}`,
    disabled: !droppable,
    data: { type: 'case-cell', n: cell.n, insertIndex: insertIndexForCell(layout, cell.n) },
  });

  const state = cell.state === 'item' ? 'occupied' : cell.state;
  return (
    <div
      ref={droppable ? setNodeRef : undefined}
      className={`case-cell case-cell--${state} ${isOver && droppable ? 'is-over' : ''}`.trim()}
      data-cell={cell.n}
      data-state={state}
      style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1 }}
      aria-disabled={cell.state === 'locked' || undefined}
      aria-label={cell.state === 'locked' ? 'Locked cell' : cell.state === 'free' ? 'Free cell' : undefined}
      title={
        cell.state === 'locked'
          ? 'Locked — raise Energy to open this cell'
          : cell.state === 'free' && editable
            ? 'Drop a mission here'
            : undefined
      }
    >
      {cell.state === 'locked' && <Icon name="lock" size={12} className="case-cell__lock" />}
    </div>
  );
}

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

interface CaseItemViewProps {
  item: PlacedItem;
  layout: CaseLayout;
  editable: boolean;
  actions?: CaseGridActions;
  isFirst: boolean;
  isLast: boolean;
  tight: boolean;
  children: React.ReactNode;
}

function CaseItemView({ item, layout, editable, actions, isFirst, isLast, tight, children }: CaseItemViewProps) {
  const startN = item.row * layout.cols + item.col;
  const { isOver, setNodeRef } = useDroppable({
    id: `${CASE_CELL_DROP_PREFIX}${startN}`,
    disabled: !editable,
    data: { type: 'case-cell', n: startN, insertIndex: item.index },
  });

  const hasActions = editable && actions && (actions.onUnload || actions.onShiftEarlier || actions.onShiftLater || actions.onClear);

  const menuItems: ActionMenuItem[] = [];
  if (hasActions) {
    if (actions?.onShiftEarlier) {
      menuItems.push({ id: 'earlier', label: 'Shift earlier', glyph: <Icon name="chevron-left" />, disabled: isFirst, onSelect: () => actions.onShiftEarlier?.(item) });
    }
    if (actions?.onShiftLater) {
      menuItems.push({ id: 'later', label: 'Shift later', glyph: <Icon name="chevron-right" />, disabled: isLast, onSelect: () => actions.onShiftLater?.(item) });
    }
    if (actions?.onUnload) {
      menuItems.push({ id: 'unload', label: 'Unload from today', glyph: <Icon name="unload" />, onSelect: () => actions.onUnload?.(item) });
    }
    if (actions?.onClear) {
      if (menuItems.length) menuItems.push({ id: 'sep', separator: true });
      menuItems.push({ id: 'complete', label: 'Mark complete', glyph: <Icon name="check" />, onSelect: () => actions.onClear?.(item) });
    }
  }

  return (
    <div
      ref={editable ? setNodeRef : undefined}
      className={[
        'case-item',
        `case-item--cr${item.span}`,
        tight ? 'case-item--tight' : '',
        isOver && editable ? 'is-over' : '',
      ].filter(Boolean).join(' ')}
      data-item-id={item.id}
      data-cell={startN}
      data-span={item.span}
      data-index={item.index}
      style={{ gridColumn: `${item.col + 1} / span ${item.span}`, gridRow: item.row + 1 }}
    >
      {children}
      {hasActions && (
        <div className="case-item__actions" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
          <div className="case-item__strip" role="toolbar" aria-label="Mission actions">
            {actions?.onShiftEarlier && (
              <button type="button" className="case-item__btn hit" onClick={() => actions.onShiftEarlier?.(item)} disabled={isFirst} title="Shift earlier" aria-label="Shift earlier">
                <Icon name="chevron-left" size={14} />
              </button>
            )}
            {actions?.onShiftLater && (
              <button type="button" className="case-item__btn hit" onClick={() => actions.onShiftLater?.(item)} disabled={isLast} title="Shift later" aria-label="Shift later">
                <Icon name="chevron-right" size={14} />
              </button>
            )}
            {actions?.onUnload && (
              <button type="button" className="case-item__btn hit" onClick={() => actions.onUnload?.(item)} title="Unload from today" aria-label="Unload from today">
                <Icon name="unload" size={14} />
              </button>
            )}
            {actions?.onClear && (
              <button type="button" className="case-item__btn case-item__btn--clear hit" onClick={() => actions.onClear?.(item)} title="Mark complete" aria-label="Mark complete">
                <Icon name="check" size={12} className="case-item__check" />
              </button>
            )}
          </div>
          <div className="case-item__menu">
            <ActionMenu items={menuItems} label="Mission actions" triggerClassName="case-item__btn" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Overflow tray -------------------------------------------------------- */

export interface CaseTrayProps {
  /** CR points over capacity (0 when every tray item is merely squeezed out). */
  over: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * CaseTray — items that did not make it into the case (brief §6). Rendered by
 * the caller only when `layout.overflow.length > 0`; sits visibly outside the
 * grid. Header: OVERFLOW · +N (mono, danger when N > 0).
 */
export function CaseTray({ over, children, className = '' }: CaseTrayProps) {
  return (
    <section className={`case-tray ${over > 0 ? 'is-over-budget' : ''} ${className}`.trim()} aria-label="Overflow">
      <header className="case-tray__head t-2xs">
        <span className="case-tray__title">Overflow</span>
        {over > 0 && <span className="case-tray__over num">+{over}</span>}
      </header>
      <div className="case-tray__items">{children}</div>
    </section>
  );
}
