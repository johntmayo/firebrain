# Fire Brain App Guide

## One-Page Overview (Share With Users)

### What Fire Brain Is
Fire Brain is a mission tracker built to help a small team stay focused. It uses a game-style workflow:

- **Missions** = individual tasks
- **Quests** = grouped goals made of related missions
- **Loadout** = your selected missions for today

### Core Daily Flow
1. Add or import missions into the **Mission Cache**.
2. Move your highest-value work into your **Today Loadout**.
3. Track ongoing initiatives as **Quests**.
4. Complete missions throughout the day and review **Accomplished Today**.

### Key Rules
- Missions can live in the cache, in a quest, or in your loadout.
- Quest missions inherit quest context and can be managed together.
- Completing a quest always asks what to do with open missions:
  - **Complete quest + move open missions to Inbox** (default)
  - **Complete quest + complete all open missions**
- Tracking focus guidance warns when more than **5** quests are tracked.

### Why Teams Use It
- Reduces overwhelm by narrowing attention to today’s work.
- Keeps long-term initiatives visible through quests.
- Makes work triage fast with priorities, due dates, challenge level, and sorting/filtering.
- Supports shared visibility while keeping each operator’s loadout clear.

### Main Areas of the App
- **Today Planner**: your active missions now
- **Quests Panel**: tracked and inactive quests with nested missions
- **Mission Cache**: backlog + sorting/filtering + bulk import

---

## Full Guide

## 1) Product Model

### Missions
Missions are atomic units of work. They support:
- title + notes
- priority (`low`, `medium`, `high`, `urgent`)
- challenge (`low`, `medium`, `high`)
- assignee
- optional due date
- optional quest assignment
- optional loadout slot assignment

### Quests
Quests are grouping containers for related missions. They support:
- title + notes
- leader/assignee
- tracked state
- custom color for visual grouping
- done state with explicit mission-handling policy

### Loadout
Loadout is the operator’s “today” stack. Missions can be dragged in/out, reordered by slot semantics, and completed from there.

## 2) Main UX Patterns

### Mission Creation
- Open mission modal from Mission Cache.
- Form now resets reliably each time in create mode.
- You can assign a mission to a quest at creation time from the `QUEST` dropdown.

### Bulk Import
- Paste one mission per line.
- Supports inline parsing for:
  - priority marker
  - due-date token
  - notes suffix

### Quest Completion Flow
When completing a quest with open missions, the app asks the user to choose:
- **Detach open missions to Inbox** (`detach_open`) — default
- **Cascade completion to all open missions** (`cascade_done`)

This prevents hidden or orphaned mission states.

### Drag and Drop
- Mission → Quest: assigns mission to that quest
- Mission → Mission Cache drop zone: clears quest assignment
- Mission → Loadout: assigns to next available slot semantics

## 3) Architecture

### Frontend
- **Framework**: React + TypeScript (Vite)
- **State**: `AppContext` (mission, quest, loadout, UI state)
- **D&D**: `@dnd-kit/core`
- **Styling**: centralized CSS in `web/src/styles/index.css`

### Backend
- **Runtime**: Google Apps Script
- **Storage**: Google Sheets (`Tasks`, `Quests`)
- **Auth**: session token stored in Apps Script `PropertiesService`
- **Transport**: action-routed web app endpoint (`action=getTasks`, etc.)

## 4) Data Storage Model

### Tasks sheet
Stores mission records including:
- IDs, created/updated metadata
- mission content fields
- status / completion metadata
- loadout assignment fields
- `quest_id` linkage

### Quests sheet
Stores quest records including:
- IDs, created/updated metadata
- quest content fields
- tracking metadata
- completion metadata
- quest color

No additional spreadsheet columns are required for quest completion mode handling.

## 5) API Actions (Apps Script)

High-level actions include:
- `login`
- `getTasks`, `createTask`, `updateTask`, `completeTask`, `cancelTask`
- `assignToday`, `clearToday`, `bulkCreateTasks`
- `getQuests`, `createQuest`, `updateQuest`, `toggleQuestTracked`, `completeQuest`

### `completeQuest` mode contract
`completeQuest` accepts:
- `quest_id`
- `mode` (`detach_open` | `cascade_done`)

Returns:
- updated quest
- `completion_mode`
- `affected_open_missions`

## 6) Operational Notes

### Session/Auth
- Login provides a session token.
- Token is attached to API requests.
- Invalid/expired token clears client session and forces relogin.

### Error Handling
- Frontend uses optimistic updates for key mission/quest actions.
- On failure, state rolls back and shows toast feedback.

### Performance
- Task/quest fetches happen at app load and on key mutations.
- Quest completion mission updates are currently row-based sheet writes (simple and reliable).

## 7) Current UX Decisions

- Quest completion confirmation is always explicit.
- Default completion behavior prioritizes preserving unfinished work in Inbox.
- Mission action cards in Mission Cache are card-sized (not full-width).
- Tracked quest guidance threshold is **5**.
- Loadout list no longer uses a short nested scroll box.

## 8) Suggested Future Improvements

- Add lightweight analytics: mission throughput, completion aging, quest cycle time.
- Add optional “remember my quest completion choice” user preference.
- Add one-click “Convert mission to quest” and “Split quest mission” helpers.
- Add admin panel for team/member configuration instead of hardcoded constants.

## 9) Quick Setup Summary (for new maintainers)

1. Create Google Sheet with `Tasks` and `Quests`.
2. Deploy `apps-script/Code.gs` as web app (execute as owner).
3. Set frontend `.env` API base URL and operator emails.
4. Run web app via Vite.
5. Validate login, mission CRUD, quest CRUD, drag/drop, and quest completion flow.

---

If you are sharing just one section with end users, use the **One-Page Overview** at the top.
