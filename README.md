# Fire Brain

> **Note to AI agents:** This README is the canonical reference for the current state of the app. Keep it updated whenever you add, remove, or change features, data models, API endpoints, or setup steps.

An ADHD-friendly mission tracker with a **1-3-5 Loadout planner**, quest system, and timer — built for two users (John & Stef), backed by Google Sheets.

## Overview

Fire Brain is a task management system with a gaming-inspired UI. It organizes work into **missions** (atomic tasks) and **quests** (long-term goals), with a daily **loadout** based on the 1-3-5 method.

**Two users:**
- **John** and **Stef** each have their own loadout, quests, and missions
- Authentication via email + password with 30-day session tokens

### The 1-3-5 Loadout

Each user's daily loadout is limited to 9 missions:
- **1** Big mission (B1)
- **3** Medium missions (M1-M3)
- **5** Small missions (S1-S5)

### Quests

Quests are long-term goals that group related missions. Users can track as many quests as they want, with a focus warning shown when more than 4 are tracked. Quests have custom colors that visually tag their nested missions.

## Tech Stack

- **Backend**: Google Apps Script + Google Sheets (2 sheets: Tasks, Quests)
- **Frontend**: React 18 + TypeScript 5 + Vite 5
- **Drag & Drop**: @dnd-kit (core, sortable, utilities)
- **State Management**: React Context (AppContext, ThemeContext, TimerContext)
- **Styling**: Single CSS file with CSS variables, 3 themes
- **Audio**: Web Audio API for procedural sound effects
- **Auth**: Session tokens stored in Google Apps Script PropertiesService

## Features

- **Loadout planner** — drag missions from the cache into 1-3-5 slots; swap between slots; view either user's loadout
- **Mission cache** — create, edit, filter (by assignee), sort (by priority or challenge), and bulk import missions
- **Quest panel** — create quests, resize the panel width, flow quests into multiple columns when wide, track any number of quests (warning after 4), and nest missions via drag & drop with custom quest colors
- **Timer widget** — start a timer on any loadout mission; progress bar overlay; persists across page refresh
- **Accomplished today** — completed missions from today shown below the loadout
- **Bulk import** — paste multiple missions with syntax: `-priority`, `@date`, `#notes`
- **Themes** — Arcane Void (default), Ancient Grimoire, Studio; persisted to localStorage
- **View modes** — list or grid view for the mission cache

## Data Models

### Mission

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | UUID |
| `created_at` | string | ISO timestamp |
| `created_by` | string | Email |
| `updated_at` | string | ISO timestamp |
| `updated_by` | string | Email |
| `title` | string | Mission title |
| `notes` | string | Optional notes |
| `priority` | `low` \| `medium` \| `high` \| `urgent` | Urgency level |
| `challenge` | `low` \| `medium` \| `high` \| `''` | Difficulty level |
| `assignee` | string | Email |
| `status` | `open` \| `done` \| `archived` | Current status |
| `due_date` | string | `YYYY-MM-DD` |
| `today_slot` | `B1` \| `M1-M3` \| `S1-S5` \| `''` | Loadout slot |
| `today_set_at` | string | When added to loadout |
| `completed_at` | string | When completed |
| `today_user` | string | Email of loadout owner |
| `quest_id` | string | Parent quest ID (empty if unassigned) |

### Quest

| Field | Type | Description |
|-------|------|-------------|
| `quest_id` | string | UUID |
| `created_at` | string | ISO timestamp |
| `created_by` | string | Email |
| `updated_at` | string | ISO timestamp |
| `updated_by` | string | Email |
| `title` | string | Quest title |
| `notes` | string | Optional notes |
| `is_tracked` | boolean | Whether actively tracked |
| `tracked_at` | string | When tracking started |
| `assignee` | string | Email |
| `status` | `open` \| `done` \| `archived` | Current status |
| `completed_at` | string | When completed |
| `color` | string | Hex color for visual grouping |

## API Endpoints

All endpoints are accessed via the `action` query parameter on the Apps Script Web App URL.

| Action | Method | Description |
|--------|--------|-------------|
| `login` | POST | Authenticate with email + password, returns session token |
| `getTasks` | GET | List missions (filter by `status`, `assignee`) |
| `createTask` | POST | Create a mission |
| `updateTask` | POST | Update mission fields |
| `completeTask` | POST | Mark mission as done |
| `assignToday` | POST | Add mission to a loadout slot (supports slot swapping) |
| `clearToday` | POST | Remove mission from loadout |
| `bulkCreateTasks` | POST | Import multiple missions at once |
| `getQuests` | GET | List quests |
| `createQuest` | POST | Create a quest |
| `updateQuest` | POST | Update quest fields |
| `toggleQuestTracked` | POST | Track or untrack a quest |
| `completeQuest` | POST | Mark quest as done |

## Project Structure

```
Firebrain v1/
├── apps-script/
│   └── Code.gs              # Backend: auth, CRUD, all API endpoints
├── web/
│   ├── src/
│   │   ├── api/client.ts     # API wrapper, session management
│   │   ├── components/       # React components (~14 files)
│   │   ├── context/          # AppContext, ThemeContext, TimerContext
│   │   ├── styles/index.css  # All styles, themes, CSS variables
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Sound effects (Web Audio API)
│   │   ├── App.tsx           # Root component, drag & drop context
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
└── README.md
```

## Setup

### 1. Google Sheet

1. Create a new spreadsheet at [Google Sheets](https://sheets.google.com)
2. Create two tabs: **Tasks** and **Quests**
3. Add headers matching the data models above (row 1)

### 2. Google Apps Script

1. In the spreadsheet: **Extensions > Apps Script**
2. Paste the contents of `apps-script/Code.gs`
3. Update the constants at the top: `JOHN_EMAIL`, `STEPH_EMAIL`, `USER_PASSWORDS`
4. Run `setupSheet` once to initialize
5. Deploy as Web App: Execute as **Me**, Access **Anyone**
6. Copy the Web App URL

### 3. Frontend

```bash
cd web
cp env.example.txt .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=<your Apps Script Web App URL>
VITE_JOHN_EMAIL=john@example.com
VITE_STEPH_EMAIL=stef@example.com
```

```bash
npm install
npm run dev       # Dev server at localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
```

## License

MIT
