import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { insertIndexForCell, type CaseLayout, type CaseCell, type OrderedItem, type OverflowItem, type PlacedItem } from '../../utils/casePacking';
import { isTightCell } from '../../utils/caseShape';
import { Icon } from './Icon';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';
import { Tooltip } from './Tooltip';

export const CASE_CELL_DROP_PREFIX = 'case-cell-';
/** Droppable id prefix shared with the List format: dropping on a mission inserts before it. */
export const LOADOUT_TASK_DROP_PREFIX = 'loadout-task-';

export interface CaseGridActions {
  onUnload?: (item: OrderedItem) => void;
  onShiftEarlier?: (item: OrderedItem) => void;
  onShiftLater?: (item: OrderedItem) => void;
  /** Mark the mission complete (UI verb "Complete"; the resulting state is "Cleared"). */
  onClear?: (item: OrderedItem) => void;
}

/** Renders the mission inside its slot. `tight` = a 1-wide cell too narrow for the full stat row. */
export type CaseRenderItem = (item: OrderedItem, info: { tight: boolean }) => React.ReactNode;

export interface CaseGridProps {
  /** From `packCase(items, capacity, shape)`. */
  layout: CaseLayout;
  renderItem: CaseRenderItem;
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
 *     .case-slot.case-item[data-item-id][data-cell=n][data-span=cr]  one per placed item, overlaid on its cells
 *       (droppable `case-cell-<n>` for the item's first cell; drop data = { insertIndex })
 *       > renderItem(...)                                        the TaskCard / ItemCard
 *       .case-slot__actions                                      hover strip (fine pointer) + ⋯ menu (coarse)
 *
 * `.case-slot` is the shared "mission at cell tier" frame; the tray below the
 * case (`CaseTray` / `CaseTrayItem`) renders `.case-slot.case-tray__item` with
 * the same columns, so an overflow mission is never wider than its CR.
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
      {layout.placed.map(item => {
        const startN = item.row * layout.cols + item.col;
        const isTight = tight && item.span === 1;
        return (
          <CaseSlot
            key={item.id}
            item={item}
            span={item.span}
            className="case-item"
            style={{ gridColumn: `${item.col + 1} / span ${item.span}`, gridRow: item.row + 1 }}
            dataAttrs={{ 'data-cell': startN }}
            droppable={{ id: `${CASE_CELL_DROP_PREFIX}${startN}`, data: { type: 'case-cell', n: startN, insertIndex: item.index } }}
            editable={editable}
            actions={actions}
            isFirst={item.index === 0}
            isLast={item.index >= total - 1}
            tight={isTight}
          >
            {renderItem(item, { tight: isTight })}
          </CaseSlot>
        );
      })}
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

/* ---- Slot: a mission at cell tier, in the case or in the tray ------------- */

interface CaseSlotProps {
  item: OrderedItem;
  /** Cells spanned (== cr). */
  span: number;
  /** `case-item` (placed) or `case-tray__item …` (overflow). */
  className: string;
  style: React.CSSProperties;
  dataAttrs?: Record<string, string | number>;
  droppable: { id: string; data?: Record<string, unknown> };
  editable: boolean;
  actions?: CaseGridActions;
  isFirst: boolean;
  isLast: boolean;
  tight: boolean;
  children: React.ReactNode;
}

function CaseSlot({ item, span, className, style, dataAttrs, droppable, editable, actions, isFirst, isLast, tight, children }: CaseSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: droppable.id,
    disabled: !editable,
    data: droppable.data,
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
        'case-slot',
        `case-slot--cr${span}`,
        tight ? 'case-slot--tight' : '',
        className,
        isOver && editable ? 'is-over' : '',
      ].filter(Boolean).join(' ')}
      data-item-id={item.id}
      data-span={span}
      data-index={item.index}
      {...dataAttrs}
      style={style}
    >
      {children}
      {hasActions && (
        <div className="case-slot__actions" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
          <div className="case-slot__strip" role="toolbar" aria-label="Mission actions">
            {actions?.onShiftEarlier && (
              <button type="button" className="case-slot__btn hit" onClick={() => actions.onShiftEarlier?.(item)} disabled={isFirst} title="Shift earlier" aria-label="Shift earlier">
                <Icon name="chevron-left" size={14} />
              </button>
            )}
            {actions?.onShiftLater && (
              <button type="button" className="case-slot__btn hit" onClick={() => actions.onShiftLater?.(item)} disabled={isLast} title="Shift later" aria-label="Shift later">
                <Icon name="chevron-right" size={14} />
              </button>
            )}
            {actions?.onUnload && (
              <button type="button" className="case-slot__btn hit" onClick={() => actions.onUnload?.(item)} title="Unload from today" aria-label="Unload from today">
                <Icon name="unload" size={14} />
              </button>
            )}
            {actions?.onClear && (
              <button type="button" className="case-slot__btn case-slot__btn--clear hit" onClick={() => actions.onClear?.(item)} title="Mark complete" aria-label="Mark complete">
                <Icon name="check" size={12} className="case-slot__check" />
              </button>
            )}
          </div>
          <div className="case-slot__menu">
            <ActionMenu items={menuItems} label="Mission actions" triggerClassName="case-slot__btn" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Overflow tray -------------------------------------------------------- */

const SQUEEZED_HINT = 'Fits your energy but not the free cells — reorder to pack tighter';

export interface CaseTrayProps {
  /** CR points over capacity (0 when every tray item is merely squeezed out). */
  over: number;
  /** Column count of the case above, so tray cells line up with case cells. */
  cols: number;
  /** Tray items that are within budget but blocked by gaps; > 0 shows the reorder hint. */
  squeezed?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * CaseTray — items that did not make it into the case (brief §6). Rendered by
 * the caller only when `layout.overflow.length > 0`; sits under the grid,
 * separated by a hairline, and uses the *same columns* as the case so each
 * tray item spans exactly its CR. Header: OVERFLOW · +N (mono). The overflow
 * tone is energetic, not alarming — overloading is allowed, never hidden.
 */
export function CaseTray({ over, cols, squeezed = 0, children, className = '' }: CaseTrayProps) {
  return (
    <section className={`case-tray ${over > 0 ? 'is-over-budget' : ''} ${className}`.trim()} aria-label="Overflow">
      <header className="case-tray__head t-2xs">
        <span className="case-tray__title">Overflow</span>
        {squeezed > 0 && (
          <Tooltip content={<div className="tooltip__body">{SQUEEZED_HINT}</div>}>
            <button type="button" className="case-tray__hint icon-btn hit" aria-label={SQUEEZED_HINT}>
              <Icon name="info" size={12} />
            </button>
          </Tooltip>
        )}
        {over > 0 && <span className="case-tray__over num">+{over}</span>}
      </header>
      <div
        className="case-tray__grid"
        data-cols={cols}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Overflow missions"
      >
        {children}
      </div>
    </section>
  );
}

export interface CaseTrayItemProps {
  item: OverflowItem;
  renderItem: CaseRenderItem;
  editable?: boolean;
  actions?: CaseGridActions;
  /** Total ordered items (placed + overflow) so shift ←/→ can disable at the ends. */
  itemCount: number;
  /** Measured cell width (px); decides the tight treatment for CR1 slots. */
  cellWidth?: number | null;
}

/**
 * CaseTrayItem — one overflow mission, `cr` columns wide inside `CaseTray`'s
 * grid (CSS auto-placement wraps and leaves gaps exactly like `packCase`).
 * Over-budget items get the overflow treatment; a squeezed-out item (within
 * budget, blocked by gaps) stays neutral — the tray header explains it.
 * Dropping on it inserts before it (same `loadout-task-` id the List format
 * uses).
 */
export function CaseTrayItem({ item, renderItem, editable = false, actions, itemCount, cellWidth = null }: CaseTrayItemProps) {
  const tight = isTightCell(cellWidth) && item.cr === 1;

  return (
    <CaseSlot
      item={item}
      span={item.cr}
      className={`case-tray__item ${item.overBudget ? 'is-over-budget' : 'is-squeezed'}`}
      style={{ gridColumn: `span ${item.cr}` }}
      droppable={{ id: `${LOADOUT_TASK_DROP_PREFIX}${item.id}`, data: { type: 'loadout-task', taskId: item.id } }}
      editable={editable}
      actions={actions}
      isFirst={item.index === 0}
      isLast={item.index >= itemCount - 1}
      tight={tight}
    >
      {renderItem(item, { tight })}
    </CaseSlot>
  );
}
