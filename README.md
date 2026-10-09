# Fire Brain

> **Note to AI agents:** This README is the canonical reference for the current state of the app. Keep it updated whenever you add, remove, or change features, data models, API endpoints, or setup steps.

An ADHD-friendly mission tracker with an energy-budgeted **Loadout**, a quest system, and a dense "mission control" UI — built for a small crew of operators, backed by Google Sheets.

## Overview

Fire Brain organizes work into **missions** (atomic tasks) and **quests** (long-term goals). Each day an operator builds a **Loadout** — the short list of missions they intend to clear — from the mission **Cache**.

**Operators:**
- **John**, **Stef** and **Megan** each have their own loadout, quests and missions
- Authentication via email + password with 30-day session tokens
- You can *view* anyone's loadout; you can only *edit* your own

### Vocabulary

| Term | Meaning |
|------|---------|
| **Mission** | An atomic task |
| **Quest** | A long-term goal that groups missions |
| **Cache** | Open missions that are not loaded (the "inbox") |
| **Loadout** | Today's ordered list of missions for one operator |
| **CR** (1–3) | Challenge rating / energy cost of a mission (low / medium / high) |
| **Energy** | Daily capacity: Light = 10, Medium = 14, Heavy = 18 live cells. Owned by the frontend (`ENERGY_POINTS_LIMIT`); the backend still returns 7 / 10 / 12 and is ignored. |
| **P1 / P2 / P3** | Priority (high+urgent / medium / low) |
| **Complete** (verb) | Finish a mission or quest — "Complete mission", "Complete quest", "Mark complete" |
| **Cleared** (state) | Finished — the "Cleared" toggle, "Cleared Oct 8" on done cards, "Accomplished Today" |
| **Delete** (verb) | Erase a mission (never "Clear"; quests can't be deleted from the UI) |
| **Load / Unload** | Put a mission into / take it out of a Loadout (`assignToday` / `clearToday` in the API) |

### The Loadout

A loadout is an ordered list (slot `1`, `2`, `3`, …) with no hard slot count. Instead, each mission's **CR** is summed against the operator's chosen **Energy** level and shown as a capacity bar. Going over is allowed but visibly flagged.

### Quests

Quests group related missions and carry a colour that tags their nested missions everywhere. Any number of quests can be tracked; tracked quests pin to the top of the Quests pane, the rest live in the Log. A quest's nested list shows **every** open mission, including ones currently loaded into a Loadout (muted, with a **Loaded** chip, not draggable) — `utils/questMissions.ts` is the single definition of "open missions of a quest" used by the pane, the Quest dialog, the progress count and the Complete quest dialog, so the counts always agree. **Complete quest** asks what to do with open missions: *Keep missions — move to Cache* (`detach_open`, default) or *Complete missions too* (`cascade_done`).

## Tech Stack

- **Backend**: Google Apps Script + Google Sheets (2 sheets: Tasks, Quests)
- **Frontend**: React 18 + TypeScript 5 + Vite 5
- **Drag & Drop**: @dnd-kit (core, sortable, utilities)
- **State Management**: React Context (`AppContext`, `ThemeContext`)
- **Styling**: CSS custom properties. `styles/tokens.css` holds the design tokens (root 16 px × `--ui-scale`, type scale `--t-2xs … --t-xl`, colours, spacing, fixed heights `--h-row 48 / --h-compact 40 / --h-cell 84 / --h-chip 20 / --h-hud 48 / --h-control 40`, hit areas, motion, `--ground-texture`); `styles/index.css` holds the structural "chassis" and imports the feature sheets (`case.css`, `settings.css`, `gadgets.css`). **Skins** (`src/skins/<id>.css`) override tokens only, scoped under `html[data-skin="<id>"]`; the registry is `src/skins/index.ts`. Shipped skins: **Graphite** (default, neutral) and **Sci-fi**. A unit test enforces the skin contract (every rule scoped, no font-size/italic changes, motion ≤ 200 ms).
- **Icons**: hand-drawn inline SVG set in `primitives/Icon.tsx` (`<Icon name="load" size={16} />`), no icon library.
- **Audio**: Web Audio API for procedural sound effects (mutable in Settings)
- **Testing**: Vitest unit tests + a headless-browser smoke harness with a mocked backend (see [Testing](#testing))
- **Auth**: Session tokens stored in Google Apps Script PropertiesService

## Features

- **Loadout / the Case** — two formats over the same data, toggled in the pane header: **Case** (default) is a fixed inventory grid (6 × 3 on desktop, 3 × 6 on handheld and on laptops ≤ 1100 px) where each mission occupies `CR` cells; the Loadout is the primary pane — widest by default (`clamp(480px, 40vw, 640px)`, so CR1 cells show title + P + CR pips) and drag-resizable from its right edge (400–900 px, persisted as `firebrain_today_panel_width`); Energy decides how many cells are live (Light 10 / Medium 14 / Heavy 18 — frontend-owned; the backend's 7 / 10 / 12 is ignored) and locked cells stay visible; items flow in `today_slot` order and wrap without reflowing, leaving gaps you can pack by reordering. Missions that don't fit render in an **Overflow** tray below the case, on the same columns, each still exactly its CR wide (turquoise "overflow" tone when over budget — surplus energy, not an alarm). **List** is the plain ordered list. Load by dragging onto a cell, pressing Load on a card, or via **Load from Missions** (checkbox picker — the tap-first path); hover a case item for shift ‹ ›, unload and complete. Capacity bar shows `used / live` (+N when over) with a `?` explainer. You can view any operator's loadout but only edit your own.
- **Missions (Cache)** — create, edit, filter by operator, sort by priority or CR; **List**, **Grid** (grouped by priority) and **Matrix** (P × CR) views; an **Overdue** section at the top gathers every open, unloaded mission past its due date (including quest missions); **Cleared** toggle shows completed missions
- **Quests** — create, colour, track/untrack, reorder (drag), resize the pane; nested missions (loaded ones included, marked **Loaded**) with inline "+ Mission"; progress `done / total` and a late count per quest; **Complete quest** with a keep-or-complete choice for open missions
- **Accomplished today** — missions cleared today for the operator being viewed, collapsible under the loadout
- **Bulk import** — paste multiple missions with syntax: `-p1/-p2/-p3`, `~low/~medium/~high`, `@today/@tomorrow/@nextweek/@YYYY-MM-DD`, `#notes`
- **Mission card** — one `ItemCard` primitive in three tiers (row / cell / compact); hover reveals Load/Unload · Edit · More · Complete; keyboard: Enter opens, Space completes; tooltip carries full title, notes, created and due dates
- **Bulk import / quick add grammar** — `Title -p1 ~high @tomorrow #notes` (`-p1/-p2/-p3` priority, `~low/~medium/~high` CR, `@today/@tomorrow/@nextweek/@YYYY-MM-DD` due, `#` notes). Parser lives in `utils/parseMission.ts`.
- **Settings** (operator menu → Settings…) — skin picker with live previews, UI scale 85 / 100 / 115 / 130 % (85 % reproduces the pre-Oct-2026 density), click sounds on/off, account + log out. All persisted to localStorage (`firebrain_skin`, `firebrain_ui_scale`, `firebrain_sound`; pane widths in `firebrain_quests_panel_width` / `firebrain_today_panel_width`, loadout format in `firebrain_loadout_format`).
- **Gadget drawer** (desktop; pull tab at the bottom) — a tool belt of small gadgets: **Stopwatch** (count-up or 5/15/25-min countdown with chime; survives reload), **Quick add** (one-line mission creation with live parse preview), **Launchpad** (external tools), **Shortcuts** (only shortcuts that actually exist: Enter opens, Space completes, Esc closes).
- **Teaching tooltips** — every control explains itself on hover/focus (one sentence, game vocabulary); every icon-only control also has an `aria-label` for touch and screen readers.
- **Handheld** — below 768 px the panes become tabs (Quests / Missions / Loadout); dialogs become bottom sheets; hit targets grow to 44 px on coarse pointers; the Case switches to 3 × 6

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
| `priority` | `low` \| `medium` \| `high` \| `urgent` | Urgency level (shown as P3 / P2 / P1 / P1) |
| `challenge` | `low` \| `medium` \| `high` \| `''` | CR / energy cost (1 / 2 / 3 points; `''` counts as medium) |
| `assignee` | string | Email |
| `status` | `open` \| `done` \| `archived` \| `canceled` | Current status |
| `due_date` | string | `YYYY-MM-DD` |
| `today_slot` | string \| `''` | Loadout position (`'1'`, `'2'`, …); empty when not loaded |
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
| `leader_email` | string | Email of the quest leader |
| `status` | `open` \| `done` \| `archived` \| `canceled` | Current status |
| `completed_at` | string | When completed |
| `color` | string | Hex color for visual grouping |
| `sort_order` | number \| `''` | Manual ordering on the Quests pane (`''` sorts last) |

### Loadout config (per operator)

| Field | Type | Description |
|-------|------|-------------|
| `energy_level` | `light` \| `medium` \| `heavy` | Today's energy budget |
| `points_used` | number | Sum of CR of loaded missions |
| `points_limit` | number | 10 / 14 / 18 (derived client-side from `energy_level`; backend 7 / 10 / 12 is discarded) |

## API Endpoints

All endpoints are accessed via the `action` query parameter on the Apps Script Web App URL.

| Action | Method | Description |
|--------|--------|-------------|
| `login` | POST | Authenticate with email + password, returns session token |
| `getTasks` | GET | List missions (filter by `status`, `assignee`) |
| `createTask` | POST | Create a mission |
| `updateTask` | POST | Update mission fields |
| `completeTask` | POST | Mark mission as done |
| `cancelTask` | POST | Cancel (soft-delete) a mission |
| `assignToday` | POST | Load a mission into a loadout position (supports reordering) |
| `clearToday` | POST | Unload a mission |
| `bulkCreateTasks` | POST | Import multiple missions at once |
| `getLoadoutConfig` | GET | Energy level and points used / limit for the current operator |
| `setEnergyLevel` | POST | Change today's energy level |
| `getQuests` | GET | List quests |
| `createQuest` | POST | Create a quest |
| `updateQuest` | POST | Update quest fields |
| `toggleQuestTracked` | POST | Track or untrack a quest |
| `reorderQuests` | POST | Persist manual quest order |
| `completeQuest` | POST | Mark quest as done (`detach_open` or `cascade_done`) |

The frontend talks to the API only through `web/src/api/client.ts`; all Sheet-isms (string booleans, legacy slot names, etc.) are normalised there.

## Project Structure

```
Firebrain v1/
├── apps-script/
│   └── Code.gs              # Backend: auth, CRUD, all API endpoints
├── web/
│   ├── src/
│   │   ├── api/client.ts     # API wrapper, session management (only place that knows Sheet quirks)
│   │   ├── components/
│   │   │   ├── primitives/   # Chassis primitives: PanelFrame, HudBar, ItemCard, QuestLogEntry,
│   │   │   │                 #   StatChip, SegmentedControl, CapacityBar, Slot, CaseGrid, Dialog,
│   │   │   │                 #   ActionMenu, Tooltip, Notice, OperatorBadge, EmptyState, Icon
│   │   │   ├── gadgets/      # Gadget drawer tiles: Stopwatch, QuickAdd, Launchpad, Shortcuts
│   │   │   ├── TaskCard.tsx  # Mission → ItemCard (context + dnd wiring)
│   │   │   ├── QuestCard.tsx # Quest → QuestLogEntry
│   │   │   ├── TodayPlanner.tsx / Inbox.tsx / QuestsPanel.tsx   # the three panes
│   │   │   ├── LoadFromMissionsModal.tsx, SettingsModal.tsx, GadgetDrawer.tsx
│   │   │   └── *Modal.tsx, Toast.tsx, PasswordScreen.tsx
│   │   ├── context/          # AppContext (data + actions), ThemeContext (skin, UI scale, sound, motion)
│   │   ├── skins/            # index.ts registry + <id>.css token overrides (graphite, scifi)
│   │   ├── styles/
│   │   │   ├── tokens.css    # Design tokens, reset, utilities (.num, .t-*, .clamp-*, .hit)
│   │   │   ├── index.css     # Structural chassis styles (imports the files below + skins)
│   │   │   └── case.css / settings.css / gadgets.css
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # casePacking, caseShape, paneWidth, questMissions, parseMission, stopwatch, dueDate, operators, sounds
│   │   ├── App.tsx           # Root component, drag & drop context, desktop/mobile shell
│   │   └── main.tsx          # Entry point
│   ├── test/smoke/           # Headless smoke harness: run.mjs, scenarios.mjs, mockApi.mjs
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
├── docs/                     # PLAN.md, CHASSIS_BRIEF.md
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
3. Update the constants at the top: `JOHN_EMAIL`, `STEPH_EMAIL`, `MEGAN_EMAIL`, `USER_PASSWORDS`
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
VITE_MEGAN_EMAIL=megan@example.com
```

```bash
npm install
npm run dev       # Dev server at localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
```

## Testing

**Never test against live data** by completing, deleting or dragging real missions. The test
tooling below never reaches the Sheet.

```bash
cd web
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit tests (87: casePacking, caseShape, paneWidth, questMissions, parseMission, stopwatch, dueDate, skins contract…)
npm run smoke       # Headless browser run against a MOCKED backend (30 scenarios; screenshots in test/smoke/out/)
npm run check       # all of the above + build — run before handing work off
```

The smoke harness (`test/smoke/run.mjs`) starts Vite on a spare port, launches a local
Chromium (Edge/Chrome; override with `FB_BROWSER=<path>`), intercepts every call to the Apps
Script host and answers from the in-memory mock in `mockApi.mjs` (mutations work, so flows
like load → clear → reload can be exercised). Each scenario in `scenarios.mjs` gets a
logged-in page with fixture data, takes screenshots and may assert. After every scenario the
harness checks the chassis invariants from `docs/CHASSIS_BRIEF.md` §5: no document scroll,
no console errors, no italic text, and every visible control ≥ 32 px (44 px on touch
viewports) unless marked `data-hit-exempt="reason"`.

Protocol for new work: add a unit test for any pure helper, append a smoke scenario for any
new surface (filter with `npm run smoke -- <name>`), read the screenshots, and finish with
`npm run check` green. Use `FB_SMOKE_PORT=<port>` if two runs must overlap.

## Roadmap & Design Docs

- [`docs/PLAN.md`](docs/PLAN.md) — phased frontend improvement plan (bug fixes, chassis
  foundation, handheld layout, QoL, ratings, progression, skins) plus the audit findings
  that motivated it.
- [`docs/CHASSIS_BRIEF.md`](docs/CHASSIS_BRIEF.md) — design brief for the skin-independent
  "chassis": structural components, density rules, the Case loadout format, and the skin
  contract.

## License

MIT
