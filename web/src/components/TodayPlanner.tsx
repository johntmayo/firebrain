import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { LoadFromMissionsModal } from './LoadFromMissionsModal';
import { ENERGY_POINTS_LIMIT, type EnergyLevel, type Task } from '../types';
import { describeOperator } from '../utils/operators';
import { moveItem, packCase, type CaseItem } from '../utils/casePacking';
import { caseCellWidth, caseShapeFor } from '../utils/caseShape';
import { TODAY_PANE_WIDTH, TODAY_PANE_WIDTH_KEY, parseStoredPaneWidth, resizedPaneWidth } from '../utils/paneWidth';
import {
  PanelFrame,
  HudBar,
  HudGroup,
  SegmentedControl,
  CapacityBar,
  CaseGrid,
  CaseTray,
  CaseTrayItem,
  EmptyState,
  Icon,
  challengeToCr,
  titleFallback,
  useTooltip,
  type CaseGridActions,
  type CaseRenderItem,
  type SegmentOption,
} from './primitives';

type LoadoutFormat = 'case' | 'list';

const FORMAT_STORAGE_KEY = 'firebrain_loadout_format';
/** Mirrors App.tsx's MOBILE_BREAKPOINT_PX: below this the shell is the handheld layout. */
const HANDHELD_QUERY = '(max-width: 900px)';

const ENERGY_OPTIONS: SegmentOption<EnergyLevel>[] = [
  { value: 'light', label: 'Light', title: `Light day — ${ENERGY_POINTS_LIMIT.light} cells`, hint: `Light — ${ENERGY_POINTS_LIMIT.light} cells live` },
  { value: 'medium', label: 'Medium', title: `Medium day — ${ENERGY_POINTS_LIMIT.medium} cells`, hint: `Medium — ${ENERGY_POINTS_LIMIT.medium} cells live` },
  { value: 'heavy', label: 'Heavy', title: `Heavy day — ${ENERGY_POINTS_LIMIT.heavy} cells`, hint: `Heavy — ${ENERGY_POINTS_LIMIT.heavy} cells live` },
];

// Icon-only like the Missions pane's View control: a user-shrunk or laptop
// (340px) Loadout pane can't hold a labelled Case · List next to the operator
// control without a third header row.
const FORMAT_OPTIONS: SegmentOption<LoadoutFormat>[] = [
  { value: 'case', glyph: <Icon name="grid" />, title: 'Case', hint: 'Case — missions occupy CR cells in a fixed grid' },
  { value: 'list', glyph: <Icon name="list" />, title: 'List', hint: 'List — the same loadout as a plain ordered list' },
];

const LOAD_HINT = 'Pick missions from the cache to load without dragging';

function readStoredFormat(): LoadoutFormat {
  try {
    const v = localStorage.getItem(FORMAT_STORAGE_KEY);
    return v === 'list' ? 'list' : 'case';
  } catch {
    return 'case';
  }
}

/** `null` = no user choice yet; the pane keeps its CSS default width. */
function readStoredPaneWidth(): number | null {
  try {
    return parseStoredPaneWidth(localStorage.getItem(TODAY_PANE_WIDTH_KEY), TODAY_PANE_WIDTH);
  } catch {
    return null;
  }
}

/**
 * Drag-resize for the Loadout pane, mirroring the Quests pane's grip: a
 * full-height strip on the right edge; width persists under
 * `firebrain_today_panel_width`. Until the user drags, the width is left to
 * CSS (`.pane-today`, clamp(480px, 40vw, 640px)) so it stays responsive.
 */
function usePaneResize(): [number | null, (e: React.MouseEvent<HTMLButtonElement>) => void] {
  const [paneWidth, setPaneWidth] = useState<number | null>(readStoredPaneWidth);

  useEffect(() => {
    if (paneWidth === null) return;
    try { localStorage.setItem(TODAY_PANE_WIDTH_KEY, String(paneWidth)); } catch { /* storage unavailable */ }
  }, [paneWidth]);

  const startResize = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    // The grip is a child of the .panel-frame; measure it so a CSS-default
    // width becomes the drag's starting point.
    const frame = e.currentTarget.parentElement;
    const startWidth = paneWidth ?? (frame ? frame.getBoundingClientRect().width : TODAY_PANE_WIDTH.min);

    const onMove = (moveEvent: MouseEvent) => {
      setPaneWidth(resizedPaneWidth(startWidth, moveEvent.clientX - startX, TODAY_PANE_WIDTH));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [paneWidth]);

  return [paneWidth, startResize];
}

/** True under the handheld shell (same breakpoint App.tsx uses for mobile-mode). */
function useHandheld(): boolean {
  const [handheld, setHandheld] = useState<boolean>(() => (
    typeof window !== 'undefined' && window.matchMedia(HANDHELD_QUERY).matches
  ));
  useEffect(() => {
    const q = window.matchMedia(HANDHELD_QUERY);
    const onChange = (e: MediaQueryListEvent) => setHandheld(e.matches);
    setHandheld(q.matches);
    q.addEventListener('change', onChange);
    return () => q.removeEventListener('change', onChange);
  }, []);
  return handheld;
}

/**
 * Measures an element's content width with a ResizeObserver so the JS layout
 * (`packCase` shape, tight cells) is computed from the same width the CSS
 * grid renders at. Returns a callback ref and the latest width (null until
 * measured).
 */
function useContainerWidth(): [(el: HTMLElement | null) => void, number | null] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setWidth(Math.round(w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);
  return [ref, width];
}

export function TodayPlanner({ onOpenBriefing }: { onOpenBriefing?: () => void } = {}) {
  const {
    loadoutTasks,
    accomplishedToday,
    currentUser,
    johnEmail,
    stephEmail,
    meganEmail,
    viewingLoadoutUser,
    setViewingLoadoutUser,
    loadoutConfig,
    setEnergyLevel,
    openTaskModal,
    clearToday,
    completeTask,
    reorderLoadoutTasks,
  } = useApp();

  const [accomplishedOpen, setAccomplishedOpen] = useState(true);
  const [format, setFormat] = useState<LoadoutFormat>(readStoredFormat);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paneWidth, startResize] = usePaneResize();

  useEffect(() => {
    try { localStorage.setItem(FORMAT_STORAGE_KEY, format); } catch { /* storage unavailable */ }
  }, [format]);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dir = { johnEmail, stephEmail, meganEmail };
  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  const viewer = describeOperator(viewingLoadoutUser, dir);

  const viewerOptions: SegmentOption<string>[] = [johnEmail, stephEmail, meganEmail].map(email => {
    const op = describeOperator(email, dir);
    return {
      value: email,
      label: op.name,
      title: `View ${op.name}'s loadout`,
      hint: email === currentUser
        ? 'Your loadout — the one you can edit'
        : `View ${op.name}'s loadout — you can look, only ${op.name} can edit`,
    };
  });

  const { anchorProps: loadTipProps, tooltip: loadTip } = useTooltip(LOAD_HINT, isViewingOwnLoadout);
  const accomplishedHint = `Missions you cleared today — click to ${accomplishedOpen ? 'collapse' : 'expand'}`;
  const { anchorProps: accomplishedTipProps, tooltip: accomplishedTip } = useTooltip(accomplishedHint);

  const energyLimit = loadoutConfig?.points_limit ?? ENERGY_POINTS_LIMIT.medium;
  const usedPoints = loadoutConfig?.points_used ?? 0;
  const isOverloaded = usedPoints > energyLimit;

  // ---- Case layout: one shape decision feeds both packCase and the CSS grid.
  const handheld = useHandheld();
  const [measureRef, caseWidth] = useContainerWidth();
  const shape = caseShapeFor(caseWidth, handheld);
  // Another operator's energy level isn't known to this client; show their
  // missions in a fully open case rather than inventing a budget.
  const caseCapacity = isViewingOwnLoadout ? energyLimit : shape.cols * shape.rows;
  const caseItems = useMemo<CaseItem[]>(
    () => loadoutTasks.map(t => ({ id: t.task_id, cr: challengeToCr(t.challenge) })),
    [loadoutTasks],
  );
  const layout = useMemo(() => packCase(caseItems, caseCapacity, shape), [caseItems, caseCapacity, shape]);
  const cellWidth = caseCellWidth(caseWidth, shape.cols);
  const taskById = useMemo(() => new Map(loadoutTasks.map(t => [t.task_id, t])), [loadoutTasks]);
  const orderedIds = useMemo(() => loadoutTasks.map(t => t.task_id), [loadoutTasks]);

  const shift = useCallback((index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= orderedIds.length) return;
    void reorderLoadoutTasks(moveItem(orderedIds, index, to)).catch(() => {});
  }, [orderedIds, reorderLoadoutTasks]);

  const caseActions = useMemo<CaseGridActions>(() => ({
    onUnload: item => { void clearToday(item.id); },
    onShiftEarlier: item => shift(item.index, -1),
    onShiftLater: item => shift(item.index, 1),
    onClear: item => { void completeTask(item.id); },
  }), [clearToday, completeTask, shift]);

  const { isOver: isOverLoadout, setNodeRef: setLoadoutDropRef } = useDroppable({
    id: 'loadout-drop-zone',
    disabled: !isViewingOwnLoadout,
  });

  const caseRootRef = useCallback((el: HTMLDivElement | null) => {
    setLoadoutDropRef(el);
    measureRef(el);
  }, [setLoadoutDropRef, measureRef]);

  // Shared by the case and its overflow tray: both render missions at cell tier.
  const renderCaseItem = useCallback<CaseRenderItem>((item, info) => {
    const task = taskById.get(item.id);
    if (!task) return null;
    return (
      <TaskCard
        task={task}
        tier="cell"
        inSlot
        hideOperator
        hideCr={info.tight}
        hideQuest={info.tight}
        draggable={isViewingOwnLoadout}
      />
    );
  }, [taskById, isViewingOwnLoadout]);

  const header = (
    <HudBar glyph={<Icon name="loadout" />} title="Loadout" count={loadoutTasks.length}>
      <span className="hud-date num t-xs">{dateStr}</span>
      {isViewingOwnLoadout && (
        <button type="button" className="hud-btn" onClick={() => setPickerOpen(true)} title={titleFallback(LOAD_HINT)} {...loadTipProps}>
          <Icon name="import" size={14} />
          Load
        </button>
      )}
      {loadTip}
      <HudGroup label="Operator">
        <SegmentedControl ariaLabel="Whose loadout" options={viewerOptions} value={viewingLoadoutUser} onChange={setViewingLoadoutUser} />
      </HudGroup>
      <HudGroup label="Format">
        <SegmentedControl ariaLabel="Loadout format" options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
      </HudGroup>
    </HudBar>
  );

  const subheader = isViewingOwnLoadout && loadoutConfig ? (
    <div className="loadout-hud">
      <CapacityBar used={usedPoints} limit={energyLimit} energyLabel={loadoutConfig.energy_level} />
      <HudGroup label="Energy">
        <SegmentedControl
          ariaLabel="Energy level"
          options={ENERGY_OPTIONS}
          value={loadoutConfig.energy_level}
          onChange={level => { void setEnergyLevel(level).catch(() => {}); }}
        />
      </HudGroup>
      {onOpenBriefing && (
        <button type="button" className="hud-btn" onClick={onOpenBriefing} title="Morning check-in" aria-label="Open briefing">
          <Icon name="calendar" size={14} />
          Briefing
        </button>
      )}
    </div>
  ) : !isViewingOwnLoadout ? (
    <div className="loadout-hud loadout-hud--readonly t-xs">
      Viewing {viewer.name}'s loadout — read only
    </div>
  ) : null;

  const emptyState = (
    <EmptyState
      compact={format === 'case'}
      glyph={<Icon name="loadout" size={20} />}
      title="Nothing loaded"
      hint={isViewingOwnLoadout
        ? (
          <>
            Load missions from the cache (drag, or press Load).
            <br />
            Each costs its CR in cells; Energy sets how many cells are live (Light 10 · Medium 14 · Heavy 18).
            <br />
            Complete them as you go — cleared missions drop into Accomplished Today.
          </>
        )
        : `${viewer.name} hasn't loaded anything yet.`}
      actions={isViewingOwnLoadout ? (
        <>
          <button type="button" className="btn btn--primary" onClick={() => setPickerOpen(true)}>
            <Icon name="import" />
            Load from Missions
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => openTaskModal(null, true)}>
            <Icon name="plus" />
            New mission
          </button>
        </>
      ) : undefined}
    />
  );

  const overBy = Math.max(0, layout.used - layout.capacity);

  return (
    <PanelFrame
      className="pane pane-today"
      style={paneWidth !== null ? { width: `${paneWidth}px` } : undefined}
      header={header}
      subheader={subheader}
      overlay={(
        <button
          type="button"
          className="pane-resizer"
          data-hit-exempt="resizer: a full-height 10px strip, mouse only"
          onMouseDown={startResize}
          aria-label="Resize loadout pane"
          title="Drag to resize"
        />
      )}
    >
      {format === 'case' ? (
        <div
          ref={caseRootRef}
          className={[
            'case',
            isOverLoadout && isViewingOwnLoadout ? 'is-drop-target' : '',
            layout.overflow.length > 0 ? 'is-overloaded' : '',
            isViewingOwnLoadout ? '' : 'is-readonly',
          ].filter(Boolean).join(' ')}
          data-format="case"
        >
          <CaseGrid
            layout={layout}
            cellWidth={cellWidth}
            editable={isViewingOwnLoadout}
            actions={caseActions}
            itemCount={loadoutTasks.length}
            renderItem={renderCaseItem}
            ariaLabel={`${viewer.name}'s case`}
          />
          {layout.overflow.length > 0 && (
            <CaseTray over={overBy} cols={layout.cols} squeezed={layout.overflow.filter(o => !o.overBudget).length}>
              {layout.overflow.map(o => (
                <CaseTrayItem
                  key={o.id}
                  item={o}
                  renderItem={renderCaseItem}
                  editable={isViewingOwnLoadout}
                  actions={caseActions}
                  itemCount={loadoutTasks.length}
                  cellWidth={cellWidth}
                />
              ))}
            </CaseTray>
          )}
          {loadoutTasks.length === 0 && emptyState}
        </div>
      ) : (
        <div
          ref={setLoadoutDropRef}
          className={[
            'loadout-list',
            isOverLoadout && isViewingOwnLoadout ? 'is-drop-target' : '',
            isOverloaded ? 'is-overloaded' : '',
          ].filter(Boolean).join(' ')}
          data-format="list"
        >
          {loadoutTasks.length > 0 ? (
            loadoutTasks.map((task, index) => (
              <LoadoutRow key={task.task_id} task={task} index={index} canEdit={isViewingOwnLoadout} />
            ))
          ) : emptyState}
        </div>
      )}

      {accomplishedToday.length > 0 && (
        <section className="accomplished" aria-label="Accomplished today">
          <button
            type="button"
            className="section-header section-header--button section-header--success"
            onClick={() => setAccomplishedOpen(o => !o)}
            aria-expanded={accomplishedOpen}
            title={titleFallback(accomplishedHint)}
            {...accomplishedTipProps}
          >
            <span className="section-header__glyph" aria-hidden="true"><Icon name="check" size={14} /></span>
            <span>Accomplished today</span>
            <span className="num">{accomplishedToday.length}</span>
            <span className={`section-header__chevron ${accomplishedOpen ? 'is-open' : ''}`} aria-hidden="true">
              <Icon name="chevron-down" size={14} />
            </span>
          </button>
          {accomplishedTip}
          {accomplishedOpen && (
            <div className="task-list accomplished__list">
              {accomplishedToday.map(task => (
                <TaskCard key={task.task_id} task={task} completed hideOperator draggable={false} />
              ))}
            </div>
          )}
        </section>
      )}

      {isViewingOwnLoadout && (
        <LoadFromMissionsModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          capacity={energyLimit}
          used={usedPoints}
        />
      )}
    </PanelFrame>
  );
}

function LoadoutRow({ task, index, canEdit }: { task: Task; index: number; canEdit: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `loadout-task-${task.task_id}`,
    disabled: !canEdit,
  });

  return (
    <div ref={setNodeRef} className={`loadout-row ${isOver && canEdit ? 'is-drop-target' : ''}`}>
      <span className="loadout-row__index num">{index + 1}</span>
      <TaskCard task={task} inSlot hideOperator draggable={canEdit} />
    </div>
  );
}
