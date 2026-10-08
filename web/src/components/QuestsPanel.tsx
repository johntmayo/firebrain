import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { QuestCard } from './QuestCard';
import { TaskCard } from './TaskCard';
import { compareQuestSortOrder } from '../types';
import type { Task, Quest } from '../types';
import { groupOpenMissionsByQuest, isLoadedMission, orderQuestMissions } from '../utils/questMissions';
import { PanelFrame, HudBar, EmptyState, Icon, titleFallback, useTooltip } from './primitives';

const MOBILE_BREAKPOINT_PX = 900;
const TRACK_FOCUS_LIMIT = 5;
const NEW_QUEST_HINT = 'Start a new quest — a container for related missions';
const NEW_QUEST_MISSION_HINT = 'New mission inside this quest';

export function QuestsPanel() {
  const { quests, tasks, openQuestModal } = useApp();

  // Quest drag-to-reorder is desktop-only; on mobile the long-press
  // handle would fight with scrolling.
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT_PX;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const onChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    setIsMobileViewport(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Quests are shared containers: every operator can see all open quests.
  const openQuests = useMemo(() => quests.filter(q => q.status !== 'done'), [quests]);
  const trackedQuests = useMemo(
    () => openQuests.filter(q => q.is_tracked).slice().sort(compareQuestSortOrder),
    [openQuests],
  );
  const logQuests = useMemo(() => openQuests.filter(q => !q.is_tracked), [openQuests]);

  const [collapsedQuestIds, setCollapsedQuestIds] = useState<Record<string, boolean>>({});
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const fallback = 360;
    if (typeof window === 'undefined') return fallback;
    const saved = Number(localStorage.getItem('firebrain_quests_panel_width') || '');
    if (Number.isFinite(saved) && saved > 0) return Math.max(280, Math.min(900, saved));
    return fallback;
  });

  // Every open mission nested in a quest — loaded ones included (shown muted
  // with a Loaded chip) so the list, the progress count and the Complete
  // quest dialog always agree. Shared helper: utils/questMissions.ts.
  const missionsByQuestId = useMemo(() => {
    const groups = groupOpenMissionsByQuest(tasks);
    for (const id of Object.keys(groups)) groups[id] = orderQuestMissions(groups[id]);
    return groups;
  }, [tasks]);

  const isQuestExpanded = useCallback((quest: Quest, defaultExpanded: boolean) => {
    const collapsed = collapsedQuestIds[quest.quest_id];
    return collapsed === undefined ? defaultExpanded : !collapsed;
  }, [collapsedQuestIds]);

  const toggleQuest = useCallback((questId: string) => {
    setCollapsedQuestIds(prev => {
      const current = prev[questId];
      // Tracked quests default expanded, log quests default collapsed; flip relative to that.
      const quest = quests.find(q => q.quest_id === questId);
      const defaultCollapsed = quest ? !quest.is_tracked : false;
      const isCollapsed = current === undefined ? defaultCollapsed : current;
      return { ...prev, [questId]: !isCollapsed };
    });
  }, [quests]);

  useEffect(() => {
    localStorage.setItem('firebrain_quests_panel_width', String(panelWidth));
  }, [panelWidth]);

  const startResize = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setPanelWidth(Math.max(280, Math.min(900, startWidth + delta)));
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
  }, [panelWidth]);

  const { anchorProps: newQuestTipProps, tooltip: newQuestTip } = useTooltip(NEW_QUEST_HINT);

  const header = (
    <HudBar glyph={<Icon name="quest" />} title="Quests" count={trackedQuests.length}>
      <button
        type="button"
        className="hud-btn hud-btn--primary"
        onClick={() => openQuestModal(null, true)}
        title={titleFallback(NEW_QUEST_HINT)}
        {...newQuestTipProps}
      >
        <Icon name="plus" size={14} />
        Quest
      </button>
      {newQuestTip}
    </HudBar>
  );

  return (
    <PanelFrame
      className="pane pane-quests"
      style={{ width: `${panelWidth}px` }}
      header={header}
      overlay={(
        <button
          type="button"
          className="pane-resizer"
          data-hit-exempt="resizer: a full-height 10px strip, mouse only"
          onMouseDown={startResize}
          aria-label="Resize quests pane"
          title="Drag to resize"
        />
      )}
    >
      <section className="quests-section" aria-label="Tracked quests">
        <div className="section-header">
          <span>Tracked</span>
          <span className="num">{trackedQuests.length}</span>
        </div>
        {trackedQuests.length > TRACK_FOCUS_LIMIT && (
          <div className="inline-notice inline-notice--warning t-xs">
            Tracking {trackedQuests.length} quests. Focus holds best at {TRACK_FOCUS_LIMIT} or fewer.
          </div>
        )}
        {trackedQuests.length > 0 ? (
          <div className="quest-list">
            {trackedQuests.map(quest => (
              <QuestWithMissions
                key={quest.quest_id}
                quest={quest}
                missions={missionsByQuestId[quest.quest_id] || []}
                expanded={isQuestExpanded(quest, true)}
                onToggle={toggleQuest}
                dragDisabled={isMobileViewport}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            glyph={<Icon name="quest" size={20} />}
            title="No tracked quests"
            hint="Track a quest to pin it here."
            actions={(
              <button type="button" className="btn btn--secondary" onClick={() => openQuestModal(null, true)}>
                <Icon name="plus" />
                New quest
              </button>
            )}
          />
        )}
      </section>

      {logQuests.length > 0 && (
        <section className="quests-section" aria-label="Quest log">
          <div className="section-header">
            <span>Log</span>
            <span className="num">{logQuests.length}</span>
          </div>
          <div className="quest-list">
            {logQuests.map(quest => (
              <QuestWithMissions
                key={quest.quest_id}
                quest={quest}
                missions={missionsByQuestId[quest.quest_id] || []}
                expanded={isQuestExpanded(quest, false)}
                onToggle={toggleQuest}
                dragDisabled={isMobileViewport}
              />
            ))}
          </div>
        </section>
      )}
    </PanelFrame>
  );
}

interface QuestWithMissionsProps {
  quest: Quest;
  missions: Task[];
  expanded: boolean;
  onToggle: (questId: string) => void;
  dragDisabled?: boolean;
}

function QuestWithMissions({ quest, missions, expanded, onToggle, dragDisabled = false }: QuestWithMissionsProps) {
  const { viewingLoadoutUser, openTaskModal } = useApp();
  const { setNodeRef, isOver } = useDroppable({
    id: `quest-drop-${quest.quest_id}`,
    data: { questId: quest.quest_id },
  });
  const { anchorProps: addTipProps, tooltip: addTip } = useTooltip(NEW_QUEST_MISSION_HINT, expanded);

  return (
    <div
      ref={setNodeRef}
      className={`quest-block ${isOver ? 'is-drop-target' : ''} ${expanded ? 'is-expanded' : ''}`}
      style={quest.color ? ({ '--quest-color': quest.color } as React.CSSProperties) : undefined}
    >
      <QuestCard quest={quest} expanded={expanded} onToggle={onToggle} dragDisabled={dragDisabled} />
      {expanded && (
        <div className="quest-block__missions">
          {missions.length > 0 ? (
            <div className="task-list">
              {missions.map(task => {
                // Loaded missions are already placed in a Loadout: muted, marked
                // Loaded, and not a drag source (unload from the Loadout instead).
                const loaded = isLoadedMission(task);
                const muted = loaded || task.assignee !== viewingLoadoutUser;
                return (
                  <div
                    key={task.task_id}
                    className={`quest-block__row ${muted ? 'is-deemphasized' : ''} ${loaded ? 'is-loaded' : ''}`.trim()}
                  >
                    <TaskCard task={task} hideQuest showLoaded draggable={!loaded} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="quest-block__empty t-xs">No open missions — drop one here</div>
          )}
          <button
            type="button"
            className="action-card action-card--slim"
            onClick={() => openTaskModal(null, true, quest.quest_id)}
            title={titleFallback(NEW_QUEST_MISSION_HINT)}
            {...addTipProps}
          >
            <span className="action-card__glyph" aria-hidden="true"><Icon name="plus" /></span>
            <span>Mission</span>
          </button>
          {addTip}
        </div>
      )}
    </div>
  );
}
