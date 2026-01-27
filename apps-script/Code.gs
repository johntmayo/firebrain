/**
 * Fire Brain - Google Apps Script Backend
 * Task tracker with 1-3-5 Today planner + Quests
 * 
 * Deploy as Web App with "Execute as: Me" and "Who has access: Anyone"
 */

// ============== CONFIGURATION ==============
const JOHN_EMAIL = 'john@altagether.org';
const STEPH_EMAIL = 'stefanie.lynch@gmail.com';
const ALLOWED_EMAILS = [JOHN_EMAIL, STEPH_EMAIL];
const TASKS_SHEET_NAME = 'Tasks';
const QUESTS_SHEET_NAME = 'Quests';
const MAX_TRACKED_QUESTS = 3;

// User passwords - CHANGE THESE to your desired passwords
const USER_PASSWORDS = {
  [JOHN_EMAIL]: 'poppyfields',
  [STEPH_EMAIL]: 'poppyfields'
};

// Session token storage (using PropertiesService)
const TOKEN_PROPERTY_PREFIX = 'session_token_';
const TOKEN_USER_PREFIX = 'token_user_';
const TOKEN_EXPIRY_HOURS = 24 * 30; // 30 days

// Column indices for Tasks sheet (0-based)
const TASK_COLS = {
  TASK_ID: 0,
  CREATED_AT: 1,
  CREATED_BY: 2,
  UPDATED_AT: 3,
  UPDATED_BY: 4,
  TITLE: 5,
  NOTES: 6,
  PRIORITY: 7,
  ASSIGNEE: 8,
  STATUS: 9,
  DUE_DATE: 10,
  TODAY_SLOT: 11,
  TODAY_SET_AT: 12,
  COMPLETED_AT: 13,
  TODAY_USER: 14
};

const TASK_HEADERS = [
  'task_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
  'title', 'notes', 'priority', 'assignee', 'status', 'due_date',
  'today_slot', 'today_set_at', 'completed_at', 'today_user'
];

// Column indices for Quests sheet (0-based)
const QUEST_COLS = {
  QUEST_ID: 0,
  CREATED_AT: 1,
  CREATED_BY: 2,
  UPDATED_AT: 3,
  UPDATED_BY: 4,
  TITLE: 5,
  NOTES: 6,
  IS_TRACKED: 7,
  TRACKED_AT: 8,
  ASSIGNEE: 9,
  STATUS: 10,
  COMPLETED_AT: 11
};

const QUEST_HEADERS = [
  'quest_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
  'title', 'notes', 'is_tracked', 'tracked_at', 'assignee', 'status', 'completed_at'
];

const VALID_SLOTS = ['B1', 'M1', 'M2', 'M3', 'S1', 'S2', 'S3', 'S4', 'S5'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['open', 'done', 'archived'];

// ============== MAIN HANDLERS ==============

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    const path = e.parameter.action || '';
    const params = e.parameter;
    let body = {};
    
    if (method === 'POST' && e.postData) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }
    }
    
    // Login endpoint doesn't require authentication
    if (path === 'login') {
      const loginBody = method === 'POST' ? body : {
        email: e.parameter.email || '',
        password: e.parameter.password || ''
      };
      Logger.log('Login request - method: ' + method + ', body keys: ' + Object.keys(loginBody).join(', '));
      return handleLogin(loginBody);
    }
    
    // All other endpoints require session token
    const providedToken = e.parameter.token || body.token || null;
    if (!providedToken || !isValidSessionToken(providedToken)) {
      return jsonResponse({ error: 'Unauthorized: Invalid or expired session' }, 401);
    }
    
    // Get caller email from session token
    const callerEmail = getTokenUser(providedToken);
    if (!callerEmail || !ALLOWED_EMAILS.includes(callerEmail)) {
      return jsonResponse({ error: 'Unauthorized: Invalid session' }, 403);
    }
    
    // Route the request
    switch (path) {
      // Mission (Task) endpoints
      case 'getTasks':
        return getTasks(params, callerEmail);
      case 'createTask':
        return createTask(body, callerEmail);
      case 'updateTask':
        return updateTask(body, callerEmail);
      case 'completeTask':
        return completeTask(body, callerEmail);
      case 'assignToday':
        return assignToday(body, callerEmail);
      case 'clearToday':
        return clearToday(body, callerEmail);
      case 'bulkCreateTasks':
        return bulkCreateTasks(body, callerEmail);
      
      // Quest endpoints
      case 'getQuests':
        return getQuests(params, callerEmail);
      case 'createQuest':
        return createQuest(body, callerEmail);
      case 'updateQuest':
        return updateQuest(body, callerEmail);
      case 'toggleQuestTracked':
        return toggleQuestTracked(body, callerEmail);
      case 'completeQuest':
        return completeQuest(body, callerEmail);

      default:
        return jsonResponse({ error: 'Unknown action: ' + path }, 404);
    }
    
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ============== QUEST API ENDPOINTS ==============

/**
 * GET /quests - Get quests with optional filters
 */
function getQuests(params, callerEmail) {
  const sheet = getQuestsSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return jsonResponse({ quests: [] });
  }
  
  const quests = [];
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    
    // Pad row to QUEST_HEADERS.length
    while (row.length < QUEST_HEADERS.length) {
      row.push('');
    }
    
    try {
      const quest = rowToQuest(row);
      
      // Apply filters
      if (params.status && quest.status !== params.status) continue;
      if (params.assignee && quest.assignee !== params.assignee) continue;
      
      quests.push(quest);
    } catch (err) {
      Logger.log('Error processing quest row ' + (i + 1) + ': ' + err.toString());
      continue;
    }
  }
  
  return jsonResponse({ quests: quests });
}

/**
 * POST /quests - Create a new quest
 */
function createQuest(body, callerEmail) {
  if (!body.title || !body.title.trim()) {
    return jsonResponse({ error: 'Title is required' }, 400);
  }
  
  const sheet = getQuestsSheet();
  const now = new Date().toISOString();
  const questId = generateUUID();
  
  const newRow = [
    questId,                              // quest_id
    now,                                  // created_at
    callerEmail,                          // created_by
    now,                                  // updated_at
    callerEmail,                          // updated_by
    body.title.trim(),                    // title
    body.notes || '',                     // notes
    false,                                // is_tracked (default false)
    '',                                   // tracked_at
    body.assignee || JOHN_EMAIL,          // assignee
    'open',                               // status
    ''                                    // completed_at
  ];
  
  sheet.appendRow(newRow);
  
  return jsonResponse({ 
    success: true, 
    quest: rowToQuest(newRow) 
  });
}

/**
 * PATCH /quests/:quest_id - Update a quest
 */
function updateQuest(body, callerEmail) {
  if (!body.quest_id) {
    return jsonResponse({ error: 'quest_id is required' }, 400);
  }
  
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return jsonResponse({ error: 'Invalid status' }, 400);
  }
  
  const sheet = getQuestsSheet();
  const rowIndex = findQuestRow(sheet, body.quest_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Quest not found' }, 404);
  }
  
  let row = sheet.getRange(rowIndex, 1, 1, QUEST_HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  // Ensure row is padded
  while (row.length < QUEST_HEADERS.length) {
    row.push('');
  }
  
  // Update fields if provided
  if (body.title !== undefined) row[QUEST_COLS.TITLE] = body.title.trim();
  if (body.notes !== undefined) row[QUEST_COLS.NOTES] = body.notes;
  if (body.assignee !== undefined) row[QUEST_COLS.ASSIGNEE] = body.assignee;
  if (body.status !== undefined) row[QUEST_COLS.STATUS] = body.status;
  
  // Update timestamps
  row[QUEST_COLS.UPDATED_AT] = now;
  row[QUEST_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, QUEST_HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    quest: rowToQuest(row) 
  });
}

/**
 * POST /quests/:quest_id/toggleTracked - Toggle quest tracked status
 */
function toggleQuestTracked(body, callerEmail) {
  if (!body.quest_id) {
    return jsonResponse({ error: 'quest_id is required' }, 400);
  }
  
  const sheet = getQuestsSheet();
  const rowIndex = findQuestRow(sheet, body.quest_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Quest not found' }, 404);
  }
  
  let row = sheet.getRange(rowIndex, 1, 1, QUEST_HEADERS.length).getValues()[0];
  
  // Ensure row is padded
  while (row.length < QUEST_HEADERS.length) {
    row.push('');
  }
  
  const currentlyTracked = row[QUEST_COLS.IS_TRACKED] === true || row[QUEST_COLS.IS_TRACKED] === 'TRUE' || row[QUEST_COLS.IS_TRACKED] === 'true';
  const newTrackedStatus = !currentlyTracked;
  
  // If trying to track, check limit
  if (newTrackedStatus) {
    const trackedCount = countTrackedQuests(sheet, callerEmail);
    if (trackedCount >= MAX_TRACKED_QUESTS) {
      return jsonResponse({ 
        error: 'Maximum ' + MAX_TRACKED_QUESTS + ' tracked quests allowed. Untrack another quest first.' 
      }, 409);
    }
  }
  
  const now = new Date().toISOString();
  
  row[QUEST_COLS.IS_TRACKED] = newTrackedStatus;
  row[QUEST_COLS.TRACKED_AT] = newTrackedStatus ? now : '';
  row[QUEST_COLS.UPDATED_AT] = now;
  row[QUEST_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, QUEST_HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    quest: rowToQuest(row) 
  });
}

/**
 * POST /quests/:quest_id/complete - Mark quest as done
 */
function completeQuest(body, callerEmail) {
  if (!body.quest_id) {
    return jsonResponse({ error: 'quest_id is required' }, 400);
  }
  
  const sheet = getQuestsSheet();
  const rowIndex = findQuestRow(sheet, body.quest_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Quest not found' }, 404);
  }
  
  let row = sheet.getRange(rowIndex, 1, 1, QUEST_HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  // Ensure row is padded
  while (row.length < QUEST_HEADERS.length) {
    row.push('');
  }
  
  row[QUEST_COLS.STATUS] = 'done';
  row[QUEST_COLS.COMPLETED_AT] = now;
  // Untrack when completed
  row[QUEST_COLS.IS_TRACKED] = false;
  row[QUEST_COLS.TRACKED_AT] = '';
  row[QUEST_COLS.UPDATED_AT] = now;
  row[QUEST_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, QUEST_HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    quest: rowToQuest(row) 
  });
}

// ============== TASK (MISSION) API ENDPOINTS ==============

/**
 * GET /tasks - Get tasks (missions) with optional filters
 */
function getTasks(params, callerEmail) {
  const sheet = getTasksSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return jsonResponse({ tasks: [] });
  }
  
  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    
    while (row.length < TASK_HEADERS.length) {
      row.push('');
    }
    
    try {
      const task = rowToTask(row);
      
      if (params.status && task.status !== params.status) continue;
      if (params.assignee && task.assignee !== params.assignee) continue;
      
      tasks.push(task);
    } catch (err) {
      Logger.log('Error processing row ' + (i + 1) + ': ' + err.toString());
      continue;
    }
  }
  
  return jsonResponse({ tasks: tasks });
}

/**
 * POST /tasks - Create a new task (mission)
 */
function createTask(body, callerEmail) {
  if (!body.title || !body.title.trim()) {
    return jsonResponse({ error: 'Title is required' }, 400);
  }
  
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return jsonResponse({ error: 'Invalid priority' }, 400);
  }
  
  const sheet = getTasksSheet();
  const now = new Date().toISOString();
  const taskId = generateUUID();
  
  const newRow = [
    taskId,                              // task_id
    now,                                 // created_at
    callerEmail,                         // created_by
    now,                                 // updated_at
    callerEmail,                         // updated_by
    body.title.trim(),                   // title
    body.notes || '',                    // notes
    body.priority || 'medium',           // priority
    body.assignee || JOHN_EMAIL,         // assignee
    'open',                              // status
    body.due_date || '',                 // due_date
    '',                                  // today_slot
    '',                                  // today_set_at
    '',                                  // completed_at
    ''                                   // today_user
  ];
  
  sheet.appendRow(newRow);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(newRow) 
  });
}

/**
 * PATCH /tasks/:task_id - Update a task (mission)
 */
function updateTask(body, callerEmail) {
  if (!body.task_id) {
    return jsonResponse({ error: 'task_id is required' }, 400);
  }
  
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return jsonResponse({ error: 'Invalid priority' }, 400);
  }
  
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return jsonResponse({ error: 'Invalid status' }, 400);
  }
  
  const sheet = getTasksSheet();
  const rowIndex = findTaskRow(sheet, body.task_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  let row = sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  while (row.length < TASK_HEADERS.length) {
    row.push('');
  }
  
  if (body.title !== undefined) row[TASK_COLS.TITLE] = body.title.trim();
  if (body.notes !== undefined) row[TASK_COLS.NOTES] = body.notes;
  if (body.priority !== undefined) row[TASK_COLS.PRIORITY] = body.priority;
  if (body.assignee !== undefined) row[TASK_COLS.ASSIGNEE] = body.assignee;
  if (body.status !== undefined) row[TASK_COLS.STATUS] = body.status;
  if (body.due_date !== undefined) row[TASK_COLS.DUE_DATE] = body.due_date;
  
  row[TASK_COLS.UPDATED_AT] = now;
  row[TASK_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(row) 
  });
}

/**
 * POST /tasks/:task_id/complete - Mark task (mission) as done
 */
function completeTask(body, callerEmail) {
  if (!body.task_id) {
    return jsonResponse({ error: 'task_id is required' }, 400);
  }
  
  const sheet = getTasksSheet();
  const rowIndex = findTaskRow(sheet, body.task_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  let row = sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  while (row.length < TASK_HEADERS.length) {
    row.push('');
  }
  
  row[TASK_COLS.STATUS] = 'done';
  row[TASK_COLS.COMPLETED_AT] = now;
  row[TASK_COLS.TODAY_SLOT] = '';
  row[TASK_COLS.TODAY_SET_AT] = '';
  row[TASK_COLS.UPDATED_AT] = now;
  row[TASK_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(row) 
  });
}

/**
 * POST /today/assign - Assign task (mission) to Today slot
 */
function assignToday(body, callerEmail) {
  if (!body.task_id || !body.today_slot) {
    return jsonResponse({ error: 'task_id and today_slot are required' }, 400);
  }
  
  if (!VALID_SLOTS.includes(body.today_slot)) {
    return jsonResponse({ error: 'Invalid today_slot' }, 400);
  }
  
  const sheet = getTasksSheet();
  const taskRowIndex = findTaskRow(sheet, body.task_id);
  
  if (taskRowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  
  let occupyingRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowTodayUser = row.length > TASK_COLS.TODAY_USER ? (row[TASK_COLS.TODAY_USER] || '') : '';
    if (row[TASK_COLS.TODAY_SLOT] === body.today_slot && 
        rowTodayUser === callerEmail && 
        row[TASK_COLS.TASK_ID] !== body.task_id) {
      occupyingRowIndex = i + 1;
      break;
    }
  }
  
  if (occupyingRowIndex !== -1) {
    if (body.swap_with_task_id) {
      const taskRow = sheet.getRange(taskRowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
      const occupyingRow = sheet.getRange(occupyingRowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
      
      while (taskRow.length < TASK_HEADERS.length) taskRow.push('');
      while (occupyingRow.length < TASK_HEADERS.length) occupyingRow.push('');
      
      const taskOldSlot = taskRow[TASK_COLS.TODAY_SLOT];
      
      taskRow[TASK_COLS.TODAY_SLOT] = body.today_slot;
      taskRow[TASK_COLS.TODAY_SET_AT] = now;
      taskRow[TASK_COLS.TODAY_USER] = callerEmail;
      taskRow[TASK_COLS.UPDATED_AT] = now;
      taskRow[TASK_COLS.UPDATED_BY] = callerEmail;
      
      occupyingRow[TASK_COLS.TODAY_SLOT] = taskOldSlot || '';
      occupyingRow[TASK_COLS.TODAY_SET_AT] = taskOldSlot ? now : '';
      occupyingRow[TASK_COLS.TODAY_USER] = taskOldSlot ? callerEmail : '';
      occupyingRow[TASK_COLS.UPDATED_AT] = now;
      occupyingRow[TASK_COLS.UPDATED_BY] = callerEmail;
      
      sheet.getRange(taskRowIndex, 1, 1, TASK_HEADERS.length).setValues([taskRow]);
      sheet.getRange(occupyingRowIndex, 1, 1, TASK_HEADERS.length).setValues([occupyingRow]);
      
      return jsonResponse({ 
        success: true, 
        task: rowToTask(taskRow),
        swapped_task: rowToTask(occupyingRow)
      });
    } else {
      return jsonResponse({ error: 'Slot is occupied. Provide swap_with_task_id to swap.' }, 409);
    }
  }
  
  const taskRow = sheet.getRange(taskRowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
  
  while (taskRow.length < TASK_HEADERS.length) taskRow.push('');
  
  taskRow[TASK_COLS.TODAY_SLOT] = body.today_slot;
  taskRow[TASK_COLS.TODAY_SET_AT] = now;
  taskRow[TASK_COLS.TODAY_USER] = callerEmail;
  taskRow[TASK_COLS.UPDATED_AT] = now;
  taskRow[TASK_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(taskRowIndex, 1, 1, TASK_HEADERS.length).setValues([taskRow]);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(taskRow) 
  });
}

/**
 * POST /today/clear - Remove task (mission) from Today
 */
function clearToday(body, callerEmail) {
  if (!body.task_id) {
    return jsonResponse({ error: 'task_id is required' }, 400);
  }
  
  const sheet = getTasksSheet();
  const rowIndex = findTaskRow(sheet, body.task_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  const row = sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
  
  while (row.length < TASK_HEADERS.length) row.push('');
  
  const rowTodayUser = row[TASK_COLS.TODAY_USER] || '';
  if (rowTodayUser && rowTodayUser !== callerEmail) {
    return jsonResponse({ error: 'You can only clear your own Today slots' }, 403);
  }
  
  const now = new Date().toISOString();
  
  row[TASK_COLS.TODAY_SLOT] = '';
  row[TASK_COLS.TODAY_SET_AT] = '';
  row[TASK_COLS.TODAY_USER] = '';
  row[TASK_COLS.UPDATED_AT] = now;
  row[TASK_COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).setValues([row]);
  
  return jsonResponse({
    success: true,
    task: rowToTask(row)
  });
}

/**
 * POST /tasks/bulk - Create multiple tasks (missions) at once
 */
function bulkCreateTasks(body, callerEmail) {
  if (!body.tasks || !Array.isArray(body.tasks)) {
    return jsonResponse({ error: 'tasks array is required' }, 400);
  }

  if (body.tasks.length > 50) {
    return jsonResponse({ error: 'Maximum 50 tasks per request' }, 400);
  }

  const sheet = getTasksSheet();
  const now = new Date().toISOString();
  const results = [];

  for (let i = 0; i < body.tasks.length; i++) {
    const taskData = body.tasks[i];

    if (!taskData.title || !taskData.title.trim()) {
      results.push({
        index: i,
        success: false,
        error: 'Title is required',
        task: taskData
      });
      continue;
    }

    if (taskData.priority && !VALID_PRIORITIES.includes(taskData.priority)) {
      results.push({
        index: i,
        success: false,
        error: 'Invalid priority: ' + taskData.priority,
        task: taskData
      });
      continue;
    }

    try {
      const taskId = generateUUID();
      const newRow = [
        taskId,                              // task_id
        now,                                 // created_at
        callerEmail,                         // created_by
        now,                                 // updated_at
        callerEmail,                         // updated_by
        taskData.title.trim(),               // title
        taskData.notes || '',                // notes
        taskData.priority || 'medium',       // priority
        taskData.assignee || JOHN_EMAIL,     // assignee
        'open',                              // status
        taskData.due_date || '',             // due_date
        '',                                  // today_slot
        '',                                  // today_set_at
        '',                                  // completed_at
        ''                                   // today_user
      ];

      sheet.appendRow(newRow);

      results.push({
        index: i,
        success: true,
        task: rowToTask(newRow)
      });

    } catch (err) {
      results.push({
        index: i,
        success: false,
        error: err.toString(),
        task: taskData
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return jsonResponse({
    success: true,
    total: body.tasks.length,
    success_count: successCount,
    error_count: errorCount,
    results: results
  });
}

// ============== HELPER FUNCTIONS ==============

function getTasksSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TASKS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(TASKS_SHEET_NAME);
    sheet.appendRow(TASK_HEADERS);
  }
  
  return sheet;
}

function getQuestsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(QUESTS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(QUESTS_SHEET_NAME);
    sheet.appendRow(QUEST_HEADERS);
  }
  
  return sheet;
}

function findTaskRow(sheet, taskId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][TASK_COLS.TASK_ID] === taskId) {
      return i + 1; // Sheet rows are 1-indexed
    }
  }
  return -1;
}

function findQuestRow(sheet, questId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][QUEST_COLS.QUEST_ID] === questId) {
      return i + 1;
    }
  }
  return -1;
}

function countTrackedQuests(sheet, assignee) {
  const data = sheet.getDataRange().getValues();
  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length <= QUEST_COLS.IS_TRACKED) continue;
    
    const isTracked = row[QUEST_COLS.IS_TRACKED] === true || 
                     row[QUEST_COLS.IS_TRACKED] === 'TRUE' || 
                     row[QUEST_COLS.IS_TRACKED] === 'true';
    const rowAssignee = row.length > QUEST_COLS.ASSIGNEE ? (row[QUEST_COLS.ASSIGNEE] || '') : '';
    const rowStatus = row.length > QUEST_COLS.STATUS ? (row[QUEST_COLS.STATUS] || 'open') : 'open';
    
    if (isTracked && rowAssignee === assignee && rowStatus === 'open') {
      count++;
    }
  }
  
  return count;
}

function rowToTask(row) {
  const safeRow = row || [];
  
  return {
    task_id: safeRow[TASK_COLS.TASK_ID] || '',
    created_at: safeRow[TASK_COLS.CREATED_AT] || '',
    created_by: safeRow[TASK_COLS.CREATED_BY] || '',
    updated_at: safeRow[TASK_COLS.UPDATED_AT] || '',
    updated_by: safeRow[TASK_COLS.UPDATED_BY] || '',
    title: safeRow[TASK_COLS.TITLE] || '',
    notes: safeRow[TASK_COLS.NOTES] || '',
    priority: safeRow[TASK_COLS.PRIORITY] || 'medium',
    assignee: safeRow[TASK_COLS.ASSIGNEE] || '',
    status: safeRow[TASK_COLS.STATUS] || 'open',
    due_date: safeRow[TASK_COLS.DUE_DATE] || '',
    today_slot: safeRow[TASK_COLS.TODAY_SLOT] || '',
    today_set_at: safeRow[TASK_COLS.TODAY_SET_AT] || '',
    completed_at: safeRow[TASK_COLS.COMPLETED_AT] || '',
    today_user: safeRow.length > TASK_COLS.TODAY_USER ? (safeRow[TASK_COLS.TODAY_USER] || '') : ''
  };
}

function rowToQuest(row) {
  const safeRow = row || [];
  
  const isTracked = safeRow[QUEST_COLS.IS_TRACKED] === true || 
                   safeRow[QUEST_COLS.IS_TRACKED] === 'TRUE' || 
                   safeRow[QUEST_COLS.IS_TRACKED] === 'true';
  
  return {
    quest_id: safeRow[QUEST_COLS.QUEST_ID] || '',
    created_at: safeRow[QUEST_COLS.CREATED_AT] || '',
    created_by: safeRow[QUEST_COLS.CREATED_BY] || '',
    updated_at: safeRow[QUEST_COLS.UPDATED_AT] || '',
    updated_by: safeRow[QUEST_COLS.UPDATED_BY] || '',
    title: safeRow[QUEST_COLS.TITLE] || '',
    notes: safeRow[QUEST_COLS.NOTES] || '',
    is_tracked: isTracked,
    tracked_at: safeRow[QUEST_COLS.TRACKED_AT] || '',
    assignee: safeRow[QUEST_COLS.ASSIGNEE] || '',
    status: safeRow[QUEST_COLS.STATUS] || 'open',
    completed_at: safeRow[QUEST_COLS.COMPLETED_AT] || ''
  };
}

function generateUUID() {
  return Utilities.getUuid();
}

function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============== AUTHENTICATION ==============

function handleLogin(body) {
  Logger.log('handleLogin called with body: ' + JSON.stringify(body));
  
  if (!body.email || !body.password) {
    Logger.log('Missing email or password');
    return jsonResponse({ error: 'Email and password are required' }, 400);
  }
  
  const emailInput = body.email.toLowerCase().trim();
  Logger.log('emailInput (lowercased): ' + emailInput);
  
  const matchedEmail = ALLOWED_EMAILS.find(e => e.toLowerCase() === emailInput);
  Logger.log('matchedEmail: ' + (matchedEmail || 'NOT FOUND'));
  
  if (!matchedEmail) {
    Logger.log('Email not found in ALLOWED_EMAILS');
    return jsonResponse({ error: 'Invalid email. Allowed: ' + ALLOWED_EMAILS.join(', ') + '. Got: ' + emailInput }, 401);
  }
  
  const expectedPassword = USER_PASSWORDS[matchedEmail];
  Logger.log('Checking password for: ' + matchedEmail);
  if (body.password !== expectedPassword) {
    Logger.log('Password mismatch');
    return jsonResponse({ error: 'Invalid password' }, 401);
  }
  
  const token = generateSessionToken();
  const expiryTime = new Date().getTime() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(TOKEN_PROPERTY_PREFIX + token, expiryTime.toString());
  properties.setProperty(TOKEN_USER_PREFIX + token, matchedEmail);
  
  Logger.log('Login successful for: ' + matchedEmail);
  
  return jsonResponse({
    success: true,
    token: token,
    userEmail: matchedEmail,
    expiresAt: expiryTime
  });
}

function generateSessionToken() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

function isValidSessionToken(token) {
  if (!token) return false;
  
  const properties = PropertiesService.getScriptProperties();
  const expiryStr = properties.getProperty(TOKEN_PROPERTY_PREFIX + token);
  
  if (!expiryStr) return false;
  
  const expiryTime = parseInt(expiryStr, 10);
  const now = new Date().getTime();
  
  if (now > expiryTime) {
    properties.deleteProperty(TOKEN_PROPERTY_PREFIX + token);
    properties.deleteProperty(TOKEN_USER_PREFIX + token);
    return false;
  }
  
  return true;
}

function getTokenUser(token) {
  if (!token) return null;
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty(TOKEN_USER_PREFIX + token);
}

// ============== SETUP HELPER ==============

/**
 * Run this function once to set up both sheets
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Tasks sheet
  let tasksSheet = ss.getSheetByName(TASKS_SHEET_NAME);
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet(TASKS_SHEET_NAME);
  }
  tasksSheet.clear();
  tasksSheet.appendRow(TASK_HEADERS);
  const taskHeaderRange = tasksSheet.getRange(1, 1, 1, TASK_HEADERS.length);
  taskHeaderRange.setFontWeight('bold');
  taskHeaderRange.setBackground('#4a4a4a');
  taskHeaderRange.setFontColor('#ffffff');
  for (let i = 1; i <= TASK_HEADERS.length; i++) {
    tasksSheet.autoResizeColumn(i);
  }
  
  // Setup Quests sheet
  let questsSheet = ss.getSheetByName(QUESTS_SHEET_NAME);
  if (!questsSheet) {
    questsSheet = ss.insertSheet(QUESTS_SHEET_NAME);
  }
  questsSheet.clear();
  questsSheet.appendRow(QUEST_HEADERS);
  const questHeaderRange = questsSheet.getRange(1, 1, 1, QUEST_HEADERS.length);
  questHeaderRange.setFontWeight('bold');
  questHeaderRange.setBackground('#4a4a4a');
  questHeaderRange.setFontColor('#ffffff');
  for (let i = 1; i <= QUEST_HEADERS.length; i++) {
    questsSheet.autoResizeColumn(i);
  }
  
  Logger.log('Both sheets setup complete!');
}
