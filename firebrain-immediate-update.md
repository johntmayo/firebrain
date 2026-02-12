# Fire Brain - IMMEDIATE UPDATE Checklist
## Focus: Due Date Surfacing + Sorting + Visual Clarity

**Goal:** Make overdue/urgent missions impossible to miss, improve mission organization.  
**Timeline:** 1 week sprint  
**Priority:** CRITICAL - This is blocking daily effectiveness

---

## ✅ Must-Have for This Update

### Backend Changes (Google Apps Script)
- [ ] Verify `due_date` field is populated and formatted correctly (YYYY-MM-DD)
- [ ] Add helper function to calculate days until due:
  ```javascript
  function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  ```
- [ ] Modify `getTasks` endpoint to include computed field: `days_until_due`

### Frontend - Due Date Visibility

#### Mission Card Visual Updates
- [ ] Add `getDueDateStatus()` utility function:
  ```typescript
  type DueDateStatus = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'later' | 'none';
  
  function getDueDateStatus(mission: Mission): {
    status: DueDateStatus;
    label: string;
    color: string;
  }
  ```

- [ ] Update mission card CSS classes:
  ```css
  .mission-card.overdue {
    border: 2px solid var(--danger-red);
    animation: pulse-danger 2s ease-in-out infinite;
  }
  
  .mission-card.due-today {
    border: 2px solid var(--warning-orange);
    box-shadow: 0 0 10px rgba(255, 140, 0, 0.3);
  }
  
  .mission-card.due-soon {
    border-left: 4px solid var(--warning-yellow);
  }
  
  @keyframes pulse-danger {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
  }
  ```

- [ ] Add due date badge to mission card (prominently visible)

- [ ] Ensure due date badge styling for each status (overdue, today, tomorrow, etc.)

### Frontend - Sorting System

#### Enhanced Sort Dropdown
- [ ] Update sort dropdown component with new options:
  - Due Date (urgent first)
  - Priority (urgent first)
  - Challenge Rating (hardest first)
  - Quest (grouped)
  - Recently Added
  - Alphabetical

- [ ] Implement sorting logic for each option

- [ ] Add visual grouping separators when sorted by quest

#### Overdue Section (Optional but Recommended)
- [ ] Add "Overdue Missions" section at top of cache

### Testing Checklist
- [ ] Create test missions with various due dates
- [ ] Verify each sort option works correctly
- [ ] Verify visual styling for each due date status
- [ ] Test on mobile (mission cards still readable)
- [ ] Verify performance with 50+ missions

---

## 🎨 Visual Design Polish

### Mission Card Layout Refinement
- [ ] Audit current mission card HTML structure
- [ ] Define exact layout with explicit heights
- [ ] Set spacing variables in CSS
- [ ] Fix any text overflow with ellipsis
- [ ] Ensure badges don't overlap

### Theme Compatibility
- [ ] Test all due date colors in each theme
- [ ] Ensure contrast ratios meet accessibility
- [ ] Verify pulsing animation isn't too aggressive

---

## 📦 Deployment Plan

### Pre-Deploy
- [ ] Update README.md
- [ ] Take screenshots of before/after
- [ ] Prepare changelog message

### Deploy Steps
1. [ ] Update Apps Script backend
2. [ ] Deploy new Apps Script version
3. [ ] Update frontend code
4. [ ] Test locally with production API
5. [ ] Build production bundle
6. [ ] Deploy to hosting
7. [ ] Test in production

### Post-Deploy
- [ ] Verify both users can see changes
- [ ] Create test missions
- [ ] Send "what's new" message
- [ ] Monitor for bugs

---

## Success Criteria

✅ **This update is successful if:**
1. You can immediately spot overdue missions when opening the app
2. Sorting by due date surfaces urgent work first
3. No confusion about when things are due
4. Mission cards look clean and professional
5. Both users say "this helps me stay on top of deadlines"

**Estimated time:** 6-8 hours focused work
