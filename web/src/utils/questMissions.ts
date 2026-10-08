/**
 * "Open missions of a quest" — the single definition shared by the Quests
 * pane, the Quest dialog, the QuestLogEntry progress count and the Complete
 * quest dialog. A mission that is loaded into someone's Loadout is still an
 * open mission of its quest; it is shown (marked Loaded), never hidden, so
 * every surface agrees on the same count.
 */
import type { Task } from '../types';
import { PRIORITY_ORDER } from '../types';

/** True when the mission sits in a Loadout (`today_slot` set). */
export function isLoadedMission(task: Pick<Task, 'today_slot'>): boolean {
  return Boolean(task.today_slot);
}

/** Every open mission of `questId`, loaded or not, in the input order. */
export function openMissionsOfQuest(tasks: readonly Task[], questId: string): Task[] {
  if (!questId) return [];
  return tasks.filter(t => t.status === 'open' && t.quest_id === questId);
}

/** Open missions grouped by quest id (quest-less missions are skipped). */
export function groupOpenMissionsByQuest(tasks: readonly Task[]): Record<string, Task[]> {
  return tasks.reduce<Record<string, Task[]>>((groups, task) => {
    if (task.status !== 'open' || !task.quest_id) return groups;
    (groups[task.quest_id] ||= []).push(task);
    return groups;
  }, {});
}

/**
 * Display order inside a quest: actionable (unloaded) missions first, loaded
 * ones after — stable within each group. Pass `byPriority` to sort each group
 * by priority (P1 → P3) first.
 */
export function orderQuestMissions(missions: readonly Task[], options: { byPriority?: boolean } = {}): Task[] {
  const sorted = options.byPriority
    ? missions.slice().sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    : missions.slice();
  const unloaded = sorted.filter(t => !isLoadedMission(t));
  const loaded = sorted.filter(isLoadedMission);
  return [...unloaded, ...loaded];
}
