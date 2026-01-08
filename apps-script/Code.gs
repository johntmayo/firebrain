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

// User passwords - CHANGE THESE to your desired passwords
const USER_PASSWORDS = {
  [JOHN_EMAIL]: 'poppyfields',
  [STEPH_EMAIL]: 'poppyfields'
};

// Session token storage (using PropertiesService)
const TOKEN_PROPERTY_PREFIX = 'session_token_';
const TOKEN_USER_PREFIX = 'token_user_';
const TOKEN_EXPIRY_HOURS = 24 * 30; // 30 days

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
  TODAY_USER: 14,
  TIMER_START: 15,
  TIMER_DURATION: 16,
  TIMER_ACTIVE: 17
};

const HEADERS = [
  'task_id', 'created_at', 'created_by', 'updated_at', 'updated_by',
  'title', 'notes', 'priority', 'assignee', 'status', 'due_date',
  'today_slot', 'today_set_at', 'completed_at', 'today_user',
  'timer_start', 'timer_duration', 'timer_active'
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
      // Use already-parsed body for POST, or URL parameters for GET
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
    
    // Get caller email from session token (who is logged in)
    const callerEmail = getTokenUser(providedToken);
    if (!callerEmail || !ALLOWED_EMAILS.includes(callerEmail)) {
      return jsonResponse({ error: 'Unauthorized: Invalid session' }, 403);
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
    let row = data[i];
    
    // Pad row to HEADERS.length to ensure all columns exist
    while (row.length < HEADERS.length) {
      row.push('');
    }
    
    try {
      const task = rowToTask(row);
      
      // Apply filters
      if (params.status && task.status !== params.status) continue;
      if (params.assignee && task.assignee !== params.assignee) continue;
      
      tasks.push(task);
    } catch (err) {
      // Log error but continue processing other rows
      Logger.log('Error processing row ' + (i + 1) + ': ' + err.toString());
      continue;
    }
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
    '',                                  // today_user
    '',                                  // timer_start
    body.timer_duration || 0,            // timer_duration
    false                                // timer_active
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
  
  let row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  // Ensure row is padded to HEADERS.length
  while (row.length < HEADERS.length) {
    row.push('');
  }
  
  // Update fields if provided
  if (body.title !== undefined) row[COLS.TITLE] = body.title.trim();
  if (body.notes !== undefined) row[COLS.NOTES] = body.notes;
  if (body.priority !== undefined) row[COLS.PRIORITY] = body.priority;
  if (body.assignee !== undefined) row[COLS.ASSIGNEE] = body.assignee;
  if (body.status !== undefined) row[COLS.STATUS] = body.status;
  if (body.due_date !== undefined) row[COLS.DUE_DATE] = body.due_date;
  if (body.timer_start !== undefined) row[COLS.TIMER_START] = body.timer_start;
  if (body.timer_duration !== undefined) row[COLS.TIMER_DURATION] = body.timer_duration;
  if (body.timer_active !== undefined) row[COLS.TIMER_ACTIVE] = body.timer_active;
  
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
  
  let row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  const now = new Date().toISOString();
  
  // Ensure row is padded to HEADERS.length
  while (row.length < HEADERS.length) {
    row.push('');
  }
  
  row[COLS.STATUS] = 'done';
  row[COLS.COMPLETED_AT] = now;
  // Clear today_slot and today_set_at to free up the slot for new tasks
  // Keep today_user so accomplished section can still filter by user
  row[COLS.TODAY_SLOT] = '';
  row[COLS.TODAY_SET_AT] = '';
  // today_user is preserved so accomplished section knows which user's loadout it belonged to
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
    // Handle rows that might not have today_user column yet
    const rowTodayUser = row.length > COLS.TODAY_USER ? (row[COLS.TODAY_USER] || '') : '';
    if (row[COLS.TODAY_SLOT] === body.today_slot && 
        rowTodayUser === callerEmail && 
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
      
      // Ensure rows have all columns
      while (taskRow.length < HEADERS.length) taskRow.push('');
      while (occupyingRow.length < HEADERS.length) occupyingRow.push('');
      
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
  
  // Ensure row has all columns
  while (taskRow.length < HEADERS.length) taskRow.push('');
  
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
  
  // Ensure row has all columns
  while (row.length < HEADERS.length) row.push('');
  
  // Only allow clearing own slots
  const rowTodayUser = row[COLS.TODAY_USER] || '';
  if (rowTodayUser && rowTodayUser !== callerEmail) {
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
  // Handle rows that might not have all columns (backward compatibility)
  // Ensure we can safely access all columns
  const safeRow = row || [];
  
  return {
    task_id: safeRow[COLS.TASK_ID] || '',
    created_at: safeRow[COLS.CREATED_AT] || '',
    created_by: safeRow[COLS.CREATED_BY] || '',
    updated_at: safeRow[COLS.UPDATED_AT] || '',
    updated_by: safeRow[COLS.UPDATED_BY] || '',
    title: safeRow[COLS.TITLE] || '',
    notes: safeRow[COLS.NOTES] || '',
    priority: safeRow[COLS.PRIORITY] || 'medium',
    assignee: safeRow[COLS.ASSIGNEE] || '',
    status: safeRow[COLS.STATUS] || 'open',
    due_date: safeRow[COLS.DUE_DATE] || '',
    today_slot: safeRow[COLS.TODAY_SLOT] || '',
    today_set_at: safeRow[COLS.TODAY_SET_AT] || '',
    completed_at: safeRow[COLS.COMPLETED_AT] || '',
    today_user: safeRow.length > COLS.TODAY_USER ? (safeRow[COLS.TODAY_USER] || '') : '',
    timer_start: safeRow.length > COLS.TIMER_START ? (safeRow[COLS.TIMER_START] || '') : '',
    timer_duration: safeRow.length > COLS.TIMER_DURATION ? (safeRow[COLS.TIMER_DURATION] || 0) : 0,
    timer_active: safeRow.length > COLS.TIMER_ACTIVE ? Boolean(safeRow[COLS.TIMER_ACTIVE]) : false
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

/**
 * Handle login request - validate email and password, issue session token
 */
function handleLogin(body) {
  // Debug logging
  Logger.log('handleLogin called with body: ' + JSON.stringify(body));
  Logger.log('body.email: ' + (body.email || 'MISSING'));
  Logger.log('body.password: ' + (body.password ? '***' : 'MISSING'));
  
  if (!body.email || !body.password) {
    Logger.log('Missing email or password');
    return jsonResponse({ error: 'Email and password are required' }, 400);
  }
  
  const emailInput = body.email.toLowerCase().trim();
  Logger.log('emailInput (lowercased): ' + emailInput);
  Logger.log('ALLOWED_EMAILS: ' + JSON.stringify(ALLOWED_EMAILS));
  
  // Find matching email from ALLOWED_EMAILS (case-insensitive)
  const matchedEmail = ALLOWED_EMAILS.find(e => e.toLowerCase() === emailInput);
  Logger.log('matchedEmail: ' + (matchedEmail || 'NOT FOUND'));
  
  if (!matchedEmail) {
    Logger.log('Email not found in ALLOWED_EMAILS');
    return jsonResponse({ error: 'Invalid email. Allowed: ' + ALLOWED_EMAILS.join(', ') + '. Got: ' + emailInput }, 401);
  }
  
  // Check password (use matched email for lookup)
  const expectedPassword = USER_PASSWORDS[matchedEmail];
  Logger.log('Checking password for: ' + matchedEmail);
  if (body.password !== expectedPassword) {
    Logger.log('Password mismatch');
    return jsonResponse({ error: 'Invalid password' }, 401);
  }
  
  // Generate session token
  const token = generateSessionToken();
  const expiryTime = new Date().getTime() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  // Store token with expiry and user email (use original case from ALLOWED_EMAILS)
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

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

/**
 * Validate session token - check if it exists and hasn't expired
 */
function isValidSessionToken(token) {
  if (!token) return false;
  
  const properties = PropertiesService.getScriptProperties();
  const expiryStr = properties.getProperty(TOKEN_PROPERTY_PREFIX + token);
  
  if (!expiryStr) return false;
  
  const expiryTime = parseInt(expiryStr, 10);
  const now = new Date().getTime();
  
  if (now > expiryTime) {
    // Token expired, clean it up
    properties.deleteProperty(TOKEN_PROPERTY_PREFIX + token);
    properties.deleteProperty(TOKEN_USER_PREFIX + token);
    return false;
  }
  
  return true;
}

/**
 * Get user email from session token
 */
function getTokenUser(token) {
  if (!token) return null;
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty(TOKEN_USER_PREFIX + token);
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

/**
 * TEST FUNCTION - Run this to verify the code is correct
 * This will show you what error messages exist in the code
 */
function testErrorMessages() {
  Logger.log('=== TESTING ERROR MESSAGES ===');
  Logger.log('Checking if old error message exists...');
  
  // Test the constants
  Logger.log('ALLOWED_EMAILS: ' + JSON.stringify(ALLOWED_EMAILS));
  Logger.log('USER_PASSWORDS keys: ' + Object.keys(USER_PASSWORDS).join(', '));
  
  // Test the handleLogin function logic
  const testBody = { email: 'john@altagether.org', password: 'poppyfields' };
  const emailInput = testBody.email.toLowerCase().trim();
  const matchedEmail = ALLOWED_EMAILS.find(e => e.toLowerCase() === emailInput);
  
  Logger.log('Test email input: ' + emailInput);
  Logger.log('Matched email: ' + (matchedEmail || 'NOT FOUND'));
  
  if (matchedEmail) {
    Logger.log('✅ Email matching works correctly');
    Logger.log('Expected password: ' + USER_PASSWORDS[matchedEmail]);
  } else {
    Logger.log('❌ Email matching FAILED');
  }
  
  // Check what error message would be returned
  if (!matchedEmail) {
    const errorMsg = 'Invalid email. Allowed: ' + ALLOWED_EMAILS.join(', ') + '. Got: ' + emailInput;
    Logger.log('Error message would be: ' + errorMsg);
    if (errorMsg.includes('allowlist')) {
      Logger.log('❌ OLD ERROR MESSAGE FOUND!');
    } else {
      Logger.log('✅ Error message is correct (no "allowlist" found)');
    }
  }
}
