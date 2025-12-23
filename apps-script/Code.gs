/**
 * Fire Brain - Google Apps Script Backend
 * Task tracker with 1-3-5 Today planner
 * 
 * Deploy as Web App with "Execute as: Me" and "Who has access: Anyone"
 */

// ============== CONFIGURATION ==============
const JOHN_EMAIL = 'john@altagether.org';
const STEPH_EMAIL = 'stefanie.lynch@gmail.com';
const ALLOWED_EMAILS = [JOHN_EMAIL, STEPH_EMAIL];
const SHEET_NAME = 'Tasks';

// Column indices (0-based)
const COLS = {
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

const HEADERS = [
  'task_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
  'title', 'notes', 'priority', 'assignee', 'status', 'due_date',
  'today_slot', 'today_set_at', 'completed_at', 'today_user'
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
  // Set CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Get caller email from query parameter (for web app without Google Sign-In)
    // Falls back to Session for direct authenticated access
    let callerEmail = e.parameter.userEmail || '';
    if (!callerEmail) {
      callerEmail = Session.getActiveUser().getEmail();
    }
    
    // Check authorization
    if (!ALLOWED_EMAILS.includes(callerEmail)) {
      return jsonResponse({ error: 'Unauthorized: Email not in allowlist. Got: ' + callerEmail }, 403);
    }
    
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
    
    // Route the request
    switch (path) {
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

      default:
        return jsonResponse({ error: 'Unknown action: ' + path }, 404);
    }
    
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ============== API ENDPOINTS ==============

/**
 * GET /tasks - Get tasks with optional filters
 */
function getTasks(params, callerEmail) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return jsonResponse({ tasks: [] });
  }
  
  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const task = rowToTask(row);
    
    // Apply filters
    if (params.status && task.status !== params.status) continue;
    if (params.assignee && task.assignee !== params.assignee) continue;
    
    tasks.push(task);
  }
  
  return jsonResponse({ tasks: tasks });
}

/**
 * POST /tasks - Create a new task
 */
function createTask(body, callerEmail) {
  if (!body.title || !body.title.trim()) {
    return jsonResponse({ error: 'Title is required' }, 400);
  }
  
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return jsonResponse({ error: 'Invalid priority' }, 400);
  }
  
  const sheet = getSheet();
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
 * PATCH /tasks/:task_id - Update a task
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
  
  const sheet = getSheet();
  const rowIndex = findTaskRow(sheet, body.task_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  // Update fields if provided
  if (body.title !== undefined) row[COLS.TITLE] = body.title.trim();
  if (body.notes !== undefined) row[COLS.NOTES] = body.notes;
  if (body.priority !== undefined) row[COLS.PRIORITY] = body.priority;
  if (body.assignee !== undefined) row[COLS.ASSIGNEE] = body.assignee;
  if (body.status !== undefined) row[COLS.STATUS] = body.status;
  if (body.due_date !== undefined) row[COLS.DUE_DATE] = body.due_date;
  
  // Update timestamps
  row[COLS.UPDATED_AT] = now;
  row[COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(row) 
  });
}

/**
 * POST /tasks/:task_id/complete - Mark task as done
 */
function completeTask(body, callerEmail) {
  if (!body.task_id) {
    return jsonResponse({ error: 'task_id is required' }, 400);
  }
  
  const sheet = getSheet();
  const rowIndex = findTaskRow(sheet, body.task_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  row[COLS.STATUS] = 'done';
  row[COLS.COMPLETED_AT] = now;
  // Preserve today_slot and today_user for accomplished tracking (frontend will handle display)
  // Don't clear them here - let frontend filter by completed_at date
  row[COLS.UPDATED_AT] = now;
  row[COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(row) 
  });
}

/**
 * POST /today/assign - Assign task to Today slot (per-user slots)
 */
function assignToday(body, callerEmail) {
  if (!body.task_id || !body.today_slot) {
    return jsonResponse({ error: 'task_id and today_slot are required' }, 400);
  }
  
  if (!VALID_SLOTS.includes(body.today_slot)) {
    return jsonResponse({ error: 'Invalid today_slot' }, 400);
  }
  
  const sheet = getSheet();
  const taskRowIndex = findTaskRow(sheet, body.task_id);
  
  if (taskRowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  
  // Check if slot is occupied BY THIS USER (per-user slots)
  let occupyingRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Check if slot is occupied by the same user (callerEmail)
    if (row[COLS.TODAY_SLOT] === body.today_slot && 
        row[COLS.TODAY_USER] === callerEmail && 
        row[COLS.TASK_ID] !== body.task_id) {
      occupyingRowIndex = i + 1; // Sheet rows are 1-indexed
      break;
    }
  }
  
  // If slot is occupied and swap_with_task_id is provided, perform swap
  if (occupyingRowIndex !== -1) {
    if (body.swap_with_task_id) {
      // Swap logic
      const taskRow = sheet.getRange(taskRowIndex, 1, 1, HEADERS.length).getValues()[0];
      const occupyingRow = sheet.getRange(occupyingRowIndex, 1, 1, HEADERS.length).getValues()[0];
      
      const taskOldSlot = taskRow[COLS.TODAY_SLOT];
      
      // Swap slots (both tasks belong to callerEmail)
      taskRow[COLS.TODAY_SLOT] = body.today_slot;
      taskRow[COLS.TODAY_SET_AT] = now;
      taskRow[COLS.TODAY_USER] = callerEmail;
      taskRow[COLS.UPDATED_AT] = now;
      taskRow[COLS.UPDATED_BY] = callerEmail;
      
      occupyingRow[COLS.TODAY_SLOT] = taskOldSlot || '';
      occupyingRow[COLS.TODAY_SET_AT] = taskOldSlot ? now : '';
      occupyingRow[COLS.TODAY_USER] = taskOldSlot ? callerEmail : '';
      occupyingRow[COLS.UPDATED_AT] = now;
      occupyingRow[COLS.UPDATED_BY] = callerEmail;
      
      sheet.getRange(taskRowIndex, 1, 1, HEADERS.length).setValues([taskRow]);
      sheet.getRange(occupyingRowIndex, 1, 1, HEADERS.length).setValues([occupyingRow]);
      
      return jsonResponse({ 
        success: true, 
        task: rowToTask(taskRow),
        swapped_task: rowToTask(occupyingRow)
      });
    } else {
      return jsonResponse({ error: 'Slot is occupied. Provide swap_with_task_id to swap.' }, 409);
    }
  }
  
  // Assign to slot
  const taskRow = sheet.getRange(taskRowIndex, 1, 1, HEADERS.length).getValues()[0];
  
  // Assign to slot and set today_user to callerEmail
  taskRow[COLS.TODAY_SLOT] = body.today_slot;
  taskRow[COLS.TODAY_SET_AT] = now;
  taskRow[COLS.TODAY_USER] = callerEmail;
  taskRow[COLS.UPDATED_AT] = now;
  taskRow[COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(taskRowIndex, 1, 1, HEADERS.length).setValues([taskRow]);
  
  return jsonResponse({ 
    success: true, 
    task: rowToTask(taskRow) 
  });
}

/**
 * POST /today/clear - Remove task from Today (only own slots)
 */
function clearToday(body, callerEmail) {
  if (!body.task_id) {
    return jsonResponse({ error: 'task_id is required' }, 400);
  }
  
  const sheet = getSheet();
  const rowIndex = findTaskRow(sheet, body.task_id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Task not found' }, 404);
  }
  
  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  
  // Only allow clearing own slots
  if (row[COLS.TODAY_USER] && row[COLS.TODAY_USER] !== callerEmail) {
    return jsonResponse({ error: 'You can only clear your own Today slots' }, 403);
  }
  
  const now = new Date().toISOString();
  
  row[COLS.TODAY_SLOT] = '';
  row[COLS.TODAY_SET_AT] = '';
  row[COLS.TODAY_USER] = '';
  row[COLS.UPDATED_AT] = now;
  row[COLS.UPDATED_BY] = callerEmail;
  
  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
  
  return jsonResponse({
    success: true,
    task: rowToTask(row)
  });
}

/**
 * POST /tasks/bulk - Create multiple tasks at once
 */
function bulkCreateTasks(body, callerEmail) {
  if (!body.tasks || !Array.isArray(body.tasks)) {
    return jsonResponse({ error: 'tasks array is required' }, 400);
  }

  if (body.tasks.length > 50) {
    return jsonResponse({ error: 'Maximum 50 tasks per request' }, 400);
  }

  const sheet = getSheet();
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
        ''                                   // completed_at
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

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  
  return sheet;
}

function findTaskRow(sheet, taskId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLS.TASK_ID] === taskId) {
      return i + 1; // Sheet rows are 1-indexed
    }
  }
  return -1;
}

function rowToTask(row) {
  return {
    task_id: row[COLS.TASK_ID],
    created_at: row[COLS.CREATED_AT],
    created_by: row[COLS.CREATED_BY],
    updated_at: row[COLS.UPDATED_AT],
    updated_by: row[COLS.UPDATED_BY],
    title: row[COLS.TITLE],
    notes: row[COLS.NOTES],
    priority: row[COLS.PRIORITY],
    assignee: row[COLS.ASSIGNEE],
    status: row[COLS.STATUS],
    due_date: row[COLS.DUE_DATE],
    today_slot: row[COLS.TODAY_SLOT],
    today_set_at: row[COLS.TODAY_SET_AT],
    completed_at: row[COLS.COMPLETED_AT],
    today_user: row[COLS.TODAY_USER] || ''
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

// ============== SETUP HELPER ==============

/**
 * Run this function once to set up the sheet headers
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Clear and set headers
  sheet.clear();
  sheet.appendRow(HEADERS);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a4a4a');
  headerRange.setFontColor('#ffffff');
  
  // Auto-resize columns
  for (let i = 1; i <= HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  Logger.log('Sheet setup complete!');
}

