import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { groupOpenMissionsByQuest, isLoadedMission, openMissionsOfQuest, orderQuestMissions } from './questMissions';

function task(id: string, o: Partial<Task> = {}): Task {
  return {
    task_id: id,
    created_at: '2026-10-01T00:00:00.000Z',
    created_by: 'john@x.test',
    updated_at: '2026-10-01T00:00:00.000Z',
    updated_by: 'john@x.test',
    title: id,
    notes: '',
    priority: 'medium',
    challenge: 'medium',
    assignee: 'john@x.test',
    status: 'open',
    due_date: '',
    today_slot: '',
    today_set_at: '',
    completed_at: '',
    today_user: '',
    quest_id: '',
    ...o,
  } as Task;
}

const tasks: Task[] = [
  task('loaded-q1', { quest_id: 'q1', today_slot: '1', priority: 'low' }),
  task('open-q1', { quest_id: 'q1', priority: 'high' }),
  task('done-q1', { quest_id: 'q1', status: 'done' }),
  task('canceled-q1', { quest_id: 'q1', status: 'canceled' }),
  task('open-q2', { quest_id: 'q2' }),
  task('loaded-no-quest', { today_slot: '2' }),
  task('open-no-quest'),
];

describe('isLoadedMission', () => {
  it('is true only when today_slot is set', () => {
    expect(isLoadedMission({ today_slot: '1' })).toBe(true);
    expect(isLoadedMission({ today_slot: '' })).toBe(false);
  });
});

describe('openMissionsOfQuest', () => {
  it('includes loaded missions — a loaded mission is still an open mission of its quest', () => {
    const ids = openMissionsOfQuest(tasks, 'q1').map(t => t.task_id);
    expect(ids).toEqual(['loaded-q1', 'open-q1']);
  });
  it('excludes done and canceled missions and other quests', () => {
    expect(openMissionsOfQuest(tasks, 'q2').map(t => t.task_id)).toEqual(['open-q2']);
    expect(openMissionsOfQuest(tasks, 'nope')).toEqual([]);
    expect(openMissionsOfQuest(tasks, '')).toEqual([]);
  });
  it('agrees with the grouped view (one definition for pane, dialog, progress and complete dialog)', () => {
    const groups = groupOpenMissionsByQuest(tasks);
    expect(groups.q1.map(t => t.task_id)).toEqual(openMissionsOfQuest(tasks, 'q1').map(t => t.task_id));
    expect(groups.q2.map(t => t.task_id)).toEqual(openMissionsOfQuest(tasks, 'q2').map(t => t.task_id));
    expect(Object.keys(groups).sort()).toEqual(['q1', 'q2']);
  });
});

describe('orderQuestMissions', () => {
  it('puts unloaded missions first, loaded after, keeping input order within each group', () => {
    const list = [
      task('a', { today_slot: '1' }),
      task('b'),
      task('c', { today_slot: '2' }),
      task('d'),
    ];
    expect(orderQuestMissions(list).map(t => t.task_id)).toEqual(['b', 'd', 'a', 'c']);
  });
  it('sorts by priority first when asked, then still floats loaded missions to the end', () => {
    const list = [
      task('low', { priority: 'low' }),
      task('urgent-loaded', { priority: 'urgent', today_slot: '1' }),
      task('high', { priority: 'high' }),
      task('medium', { priority: 'medium' }),
    ];
    expect(orderQuestMissions(list, { byPriority: true }).map(t => t.task_id)).toEqual(['high', 'medium', 'low', 'urgent-loaded']);
  });
  it('does not mutate its input', () => {
    const list = [task('b'), task('a', { today_slot: '1' })];
    orderQuestMissions(list, { byPriority: true });
    expect(list.map(t => t.task_id)).toEqual(['b', 'a']);
  });
});
