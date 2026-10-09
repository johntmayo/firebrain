// Mock Apps Script backend for the smoke harness.
// Every request to the real API host is answered from this in-memory state, so a
// smoke run can click, drag, complete and delete freely without touching the Sheet.
// Mutations update the in-memory state so the UI reflects them like the real thing.

const today = new Date();
const iso = d => d.toISOString();
const ymd = d => d.toISOString().slice(0, 10);
const daysFromNow = n => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

export function createMockApi() {
  // Read at call time: ESM imports are hoisted, so module-level reads would run
  // before the harness has loaded web/.env into process.env.
  const JOHN = process.env.VITE_JOHN_EMAIL;
  const STEF = process.env.VITE_STEPH_EMAIL;
  const MEGAN = process.env.VITE_MEGAN_EMAIL;
  if (!JOHN || !STEF || !MEGAN) throw new Error('mockApi: VITE_JOHN_EMAIL / VITE_STEPH_EMAIL / VITE_MEGAN_EMAIL must be set');

  let n = 0;
  const task = (title, o = {}) => ({
    task_id: `t${++n}`, created_at: iso(daysFromNow(-3)), created_by: JOHN, updated_at: iso(today), updated_by: JOHN,
    title, notes: o.notes || '', priority: o.priority || 'medium', challenge: o.challenge ?? 'medium', assignee: o.assignee || JOHN,
    status: o.status || 'open', due_date: o.due || '', today_slot: o.slot || '', today_set_at: o.slot ? iso(today) : '',
    completed_at: o.completed_at || '', today_user: o.slot ? (o.assignee || JOHN) : (o.today_user || ''), quest_id: o.quest || '',
  });

  const quests = [
    { quest_id: 'q1', title: 'Ship the chassis', notes: 'Graphite baseline first', is_tracked: true, tracked_at: iso(today), assignee: JOHN, leader_email: JOHN, status: 'open', completed_at: '', color: '#7b68ee', sort_order: 1, created_at: iso(today), created_by: JOHN, updated_at: iso(today), updated_by: JOHN },
    { quest_id: 'q2', title: 'Zone 153 data cleanup and the very long quest title that needs clamping', notes: '', is_tracked: true, tracked_at: iso(today), assignee: STEF, leader_email: STEF, status: 'open', completed_at: '', color: '#00d4aa', sort_order: 2, created_at: iso(today), created_by: STEF, updated_at: iso(today), updated_by: STEF },
    { quest_id: 'q3', title: 'Garden overhaul', notes: '', is_tracked: false, tracked_at: '', assignee: JOHN, leader_email: JOHN, status: 'open', completed_at: '', color: '#d4a84b', sort_order: '', created_at: iso(today), created_by: JOHN, updated_at: iso(today), updated_by: JOHN },
  ];

  // Loadout: CR 1 + 2 + 2 + 2 + 3 = 10 points (under Medium 14, exact Light 10).
  // Mock still returns the backend's 7/10/12 so the frontend's client-side
  // remap (ENERGY_POINTS_LIMIT) is what the UI actually uses.
  const tasks = [
    task('Write spec for the Case grid', { priority: 'low', challenge: 'low', slot: '1', quest: 'q1', due: ymd(daysFromNow(3)) }),
    task('Call dentist about the thing with the very long description that will clamp', { priority: 'medium', challenge: 'medium', slot: '2', due: ymd(daysFromNow(2)), notes: 'Bring insurance card' }),
    task('Fix login bug', { priority: 'high', challenge: 'medium', slot: '3', due: ymd(today) }),
    task('Zone 153 redo data', { priority: 'medium', challenge: 'medium', slot: '4', quest: 'q2', due: ymd(daysFromNow(1)) }),
    task('Harassment prevention training', { priority: 'medium', challenge: 'high', slot: '5' }),
    task('Overdue in a quest', { priority: 'high', challenge: 'low', quest: 'q1', due: ymd(daysFromNow(-4)) }),
    task('Overdue in cache', { priority: 'urgent', challenge: '', due: ymd(daysFromNow(-1)) }),
    task('Buy compost', { priority: 'low', challenge: 'low', quest: 'q3' }),
    task('Review pull requests', { priority: 'medium', challenge: 'low', due: ymd(daysFromNow(5)) }),
    task('Plan Q4 roadmap offsite agenda and send invites to everyone involved', { priority: 'high', challenge: 'high', due: ymd(daysFromNow(12)), notes: 'Agenda still in draft.\n- [ ] Book the offsite room\n- [ ] Draft the Q4 agenda\n- [ ] Send invites to everyone involved\nConfirm the guest list with Stef.' }),
    task('Renew passport', { priority: 'low', challenge: 'medium' }),
    task('Stef thing', { priority: 'medium', challenge: 'low', assignee: STEF, due: ymd(daysFromNow(1)) }),
    task('Megan thing', { priority: 'low', challenge: 'medium', assignee: MEGAN }),
    task('Quest mission for Stef', { priority: 'medium', challenge: 'medium', quest: 'q2', assignee: STEF }),
    task('Cleared from loadout', { status: 'done', completed_at: iso(today), today_user: JOHN, challenge: 'low', quest: 'q1' }),
    task('Cleared straight from cache', { status: 'done', completed_at: iso(today), challenge: 'medium' }),
    task('Cleared yesterday', { status: 'done', completed_at: iso(daysFromNow(-1)), today_user: JOHN }),
  ];
  // Briefing leftover: still loaded, but today_set_at is yesterday (slot 5).
  const leftover = tasks.find(t => t.title === 'Harassment prevention training');
  if (leftover) leftover.today_set_at = iso(daysFromNow(-1));

  const config = { [JOHN]: 'medium', [STEF]: 'light', [MEGAN]: 'heavy' };
  const LIMIT = { light: 7, medium: 10, heavy: 12 };
  const POINTS = { low: 1, medium: 2, high: 3, '': 2 };

  const find = id => tasks.find(t => t.task_id === id);
  const pointsUsed = user => tasks.filter(t => t.status === 'open' && t.today_slot && t.today_user === user).reduce((s, t) => s + POINTS[t.challenge], 0);
  const loadoutConfig = user => ({ energy_level: config[user], points_used: pointsUsed(user), points_limit: LIMIT[config[user]] });

  /** @param {string} action @param {Record<string, any>} body merged query + JSON body @param {string} user session email */
  function respond(action, body, user) {
    switch (action) {
      case 'login': return { success: true, token: 'mock-token', userEmail: body.email, expiresAt: Date.now() + 30 * 864e5 };
      case 'getTasks': {
        let list = tasks;
        if (body.status) list = list.filter(t => t.status === body.status);
        if (body.assignee) list = list.filter(t => t.assignee === body.assignee);
        return { success: true, tasks: list };
      }
      case 'createTask': {
        const t = task(body.title, { priority: body.priority, challenge: body.challenge, assignee: body.assignee, due: body.due_date, quest: body.quest_id, notes: body.notes });
        tasks.push(t);
        return { success: true, task: t };
      }
      case 'bulkCreateTasks': {
        const created = (body.tasks || []).map(x => { const t = task(x.title, { ...x, due: x.due_date, quest: x.quest_id }); tasks.push(t); return t; });
        return { success: true, tasks: created, total: created.length, success_count: created.length, error_count: 0, errors: [] };
      }
      case 'updateTask': { const t = find(body.task_id); Object.assign(t, body); return { success: true, task: t }; }
      case 'completeTask': { const t = find(body.task_id); t.status = 'done'; t.completed_at = iso(new Date()); t.today_user = t.today_user || t.today_slot ? (t.today_user || user) : ''; t.today_slot = ''; return { success: true, task: t }; }
      case 'cancelTask': { const t = find(body.task_id); t.status = 'canceled'; t.today_slot = ''; return { success: true, task: t }; }
      case 'assignToday': {
        const t = find(body.task_id);
        t.today_slot = String(body.today_slot ?? '1'); t.today_user = user; t.today_set_at = iso(new Date());
        return { success: true, task: t };
      }
      case 'clearToday': { const t = find(body.task_id); t.today_slot = ''; t.today_user = ''; return { success: true, task: t }; }
      case 'getLoadoutConfig': return { success: true, ...loadoutConfig(user) };
      case 'setEnergyLevel': config[user] = body.energy_level; return { success: true, ...loadoutConfig(user) };
      case 'getQuests': return { success: true, quests: body.status ? quests.filter(q => q.status === body.status) : quests };
      case 'createQuest': {
        const q = { quest_id: `q${quests.length + 1}`, title: body.title, notes: body.notes || '', is_tracked: false, tracked_at: '', assignee: body.assignee || user, leader_email: body.leader_email || user, status: 'open', completed_at: '', color: body.color || '#7b68ee', sort_order: '', created_at: iso(new Date()), created_by: user, updated_at: iso(new Date()), updated_by: user };
        quests.push(q);
        return { success: true, quest: q };
      }
      case 'updateQuest': { const q = quests.find(x => x.quest_id === body.quest_id); Object.assign(q, body); return { success: true, quest: q }; }
      case 'toggleQuestTracked': { const q = quests.find(x => x.quest_id === body.quest_id); q.is_tracked = !q.is_tracked; return { success: true, quest: q }; }
      case 'reorderQuests': { (body.quest_ids || []).forEach((id, i) => { const q = quests.find(x => x.quest_id === id); if (q) q.sort_order = i + 1; }); return { success: true }; }
      case 'completeQuest': { const q = quests.find(x => x.quest_id === body.quest_id); q.status = 'done'; q.completed_at = iso(new Date()); return { success: true, quest: q }; }
      default: return { success: false, error: `mock: unhandled action ${action}` };
    }
  }

  return { respond, state: { tasks, quests, config }, users: { JOHN, STEF, MEGAN } };
}
