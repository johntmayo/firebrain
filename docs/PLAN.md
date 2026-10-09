# Fire Brain — Frontend Plan v2

Companion document: [`CHASSIS_BRIEF.md`](./CHASSIS_BRIEF.md) defines the structural design
system this plan builds on. Read both before starting Phase 1.

## Context & direction
Fire Brain is a planner whose game concepts are the planning method, not decoration:
- **Quest** = a goal you can pin to your HUD (tracked) or leave in the log (untracked).
- **Mission** = an atomic task, optionally nested in a quest, with a priority and a
  challenge rating (CR 1–3 = energy cost).
- **Loadout** = today's kit, limited by an energy budget (Light 10 / Medium 14 / Heavy 18). The frontend owns those numbers (`ENERGY_POINTS_LIMIT`); the backend still returns 7 / 10 / 12 and `client.ts` overwrites `points_limit` from the energy level. Deliberate deviation — see 1.5.

Product ambition: a to-do app that feels like a video game inventory / loadout screen,
with swappable skins (sci-fi, fantasy, military, …) for gamers who use productivity software.

Architecture principle: **structure is the game; skin is the surface.** Build a neutral
*chassis* whose layout and components already feel like a game UI, then let skins change
color, type, frames, textures, icons, sounds, motion, and vocabulary — never layout,
information order, or hit areas.

Constraints: no changes to `apps-script/Code.gs`, the Sheet schema, or the API contract.
All work is in `web/`. Keep Sheet-isms (legacy slot codes, row assumptions) confined to
`api/client.ts` so the backend can be swapped later with a one-file change.

Density stance: small, dense type is intentional and stays. Legibility comes from contrast,
alignment, iconography, fixed heights, mono numerals, hover detail, and a UI-scale setting —
not from bigger fonts. Visual size and hit area are separate; targets stay ≥ 32px desktop /
44px touch via invisible padding. *(Oct 2026: the default step of that scale was loosened
once after use — root 16px, tokens one step up; the 85 % preset is the original. The stance
itself stands.)*

---

## Phase 0 — Fix what's broken (half a day)
**Status: ✅ done (Oct 2026).** Notes per item: (1) `BulkImportModal` state lives in
`AppContext` and all dialogs portal to `document.body`; `paneFadeIn` was dropped entirely.
(2) The pane title is the drag handle via `PaneDragHandleContext`. (3) `overdueTasks` now
spans every open mission matching the operator filter, *excluding loaded ones* so the
Loadout isn't duplicated; quest chip shown. (4) Done missions are fetched on mount so
Accomplished Today survives reload; `todayKey` refreshes on `visibilitychange` + 60s.
(5) Notices stack (max 4), each with its own timer and ✕. (6) The whole Field Notes
stylesheet was replaced by the Graphite chassis, so no dead tokens/classes remain.
(7) Footer removed outright; a real sync indicator is Phase 3.

1. **Bulk Import modal clipping.** Render `BulkImportModal` at App level (lift state into
   `AppContext` or `createPortal` to `document.body`). Remove `transform` from
   `@keyframes paneFadeIn` (opacity only) so no pane can become a containing block for
   `position: fixed` children.
2. **Pane drag-handle overlap.** Remove the floating "⋮⋮ Loadout" pill from the header's hit
   area; make the pane title the drag handle on desktop.
3. **Overdue section misses quest missions.** Compute `overdueTasks` from all open missions
   matching the assignee filter, not just `inboxBase`; show a quest chip on those cards.
4. **Accomplished Today.** Include missions completed today where `today_user === viewer`
   OR (`!today_user && assignee === viewer`). Recompute `todayKey` on `visibilitychange`
   and every minute.
5. **Toast.** Clear the previous timer; add a dismiss button; don't drop rapid successive
   toasts.
6. **Dead CSS/tokens.** Define or remove `--border-subtle`, `--surface-raised`,
   `--accent-primary`. Delete `.slot*`, `.bucket*`, `.small-slots-grid`, `.btn-clear-slot`.
7. **Footer placeholders.** Remove Streak / Rank / XP and the fake Sync scanner. Replace
   with real state only (see Phase 3 sync indicator) or nothing. No fake stats, ever.

---

## Phase 1 — Chassis foundation (2–3 days)
*The Design Brief decisions are resolved (see `CHASSIS_BRIEF.md` §10): Graphite dark
default, game vocabulary as-is, P and CR both shown at rest, fixed 6×3 / 3×6 case with
energy unlocking cells, overflow tray only when overloaded, Sci-fi as the first new skin.*

### 1.1 Pin the shell, scroll the panes
**Status: ✅ done.** `body { overflow: hidden }`, `.app { height: 100dvh }`, panes are
`PanelFrame`s with a sticky `__head` and a scrolling `__body` (`@container pane` enabled).
- `.app { height: 100dvh }`, `.app-main { min-height: 0 }`, `.desktop-pane-shell` and
  `.pane { min-height: 0; height: 100% }`. Pane headers sticky inside their pane.

### 1.2 Density done right
**Status: ✅ done.** Tokens live in `web/src/styles/tokens.css`; `--ui-scale` presets are in
`ThemeContext` and exposed in the operator menu (persisted as `firebrain_ui_scale`).
Verified in a headless pass: no page scroll at 1440/1024/390, zero italics, every control
≥ 32px (segments extend their hit area to the control edge via `::after`), 44px under
`pointer: coarse`. Only the 10px pane resizer and the full-width Gizmodroar tab fall
outside the rule, intentionally.
**Density pass (Oct 2026, round 3):** after daily use the owner found the defaults too
tight, so they were deliberately loosened — the *system* is unchanged, the *defaults* moved
one step: root `15px → 16px`, every `--t-*` token one step up (`0.68 / 0.75 / 0.85 / 0.95 /
1.08 / 1.3 rem`), fixed heights `--h-row 44→48`, `--h-compact 36→40`, `--h-cell 64→84`,
`--h-chip 18→20`, `--h-hud 44→48`, plus a new `--h-control: 40px` (44 touch) for form
controls. The 85 % `--ui-scale` preset reproduces the old density. The Loadout became the
primary (widest) pane — see 1.5. Smoke: `desktop-density`, `desktop-loadout-resize`,
`laptop-case`.
- ~~Root stays `15px`.~~ Root is `16px` × `--ui-scale` (presets 0.85 / 1 / 1.15 / 1.3)
  applied as `html { font-size: calc(16px * var(--ui-scale)) }`; exposed in Settings; persisted.
- Type scale tokens: `--t-2xs: 0.68rem; --t-xs: 0.75rem; --t-sm: 0.85rem; --t-md: 0.95rem;
  --t-lg: 1.08rem; --t-xl: 1.3rem`. Every `font-size` in the stylesheet maps to one of these.
- Small text (≤ `--t-xs`) must be ≥ 4.5:1 contrast, upright (no italics), weight ≥ 500.
- All numerals (points, counts, dates, CR, P) in `--font-mono` with `font-variant-numeric:
  tabular-nums`.
- Fixed heights: item cards, loadout slots, quest-log rows, and chips have fixed heights
  per density tier; titles clamp with ellipsis and show in full on hover (tooltip).
- Hit areas: every control ≥ 32×32 desktop, ≥ 44×44 under `@media (pointer: coarse)`,
  using padding or `::after` expansion — visual glyph size unchanged.
- Hard 1px borders at rest, no resting shadows; shadows only on lift/float states.
- Radii step down: panels 8px, cards 4px, chips 3px (skins may override).

### 1.3 Primitive components (build once, skin many)
Implement as small React components with BEM-ish classes, each consuming only tokens:
`PanelFrame`, `HudBar` (pane header), `ItemCard` (mission), `StatChip`, `Slot`,
`CapacityBar`, `QuestLogEntry`, `SegmentedControl`, `Dialog`/`Sheet`, `Notice` (toast),
`Tooltip`, `OperatorBadge` (user avatar initial), `ActionMenu` (⋯), `EmptyState`.
Refactor `TaskCard`, `QuestCard`, pane headers, and modals onto these.

**Status: ✅ done.** All primitives live in `web/src/components/primitives/` (barrel
`index.ts`). `TaskCard` and `QuestCard` are thin connected wrappers; the three panes use
`PanelFrame` + `HudBar`; all four modals use the portaled `Dialog` (Esc, focus trap, focus
restore, bottom sheet < 600px). Helper utils: `utils/operators.ts`, `utils/dueDate.ts`.
Decisions taken while building: the whole `ItemCard` is the drag source (no grip glyph);
the ⋯ menu repeats Load/Unload and Edit so touch has a click path for every drag action;
`HudBar` controls drop to a second row as a block when they don't fit, so the title never
floats between control lines.

Most of **1.4** landed with the primitive (fixed tiers row / cell / compact, single
priority bar, quest chip, stat order P · CR · due · operator · loaded · quest, hover row
✓ ⇧/⇩ ✎ ⋯, tooltip, Enter/Space). Still open from 1.4: "Move to quest…" in the ⋯ menu.
**1.5 is done** (see below). From **1.6**, the Who / View / Sort groups and counts are
done; Search and hiding Grid/Matrix at narrow widths are not. From **1.7**, progress
`done/total`, late chip, Track/Untrack and + Mission are done; the completed-quests toggle
is not.

**Iconography (added Oct 2026):** `primitives/Icon.tsx` — a hand-drawn inline SVG set
(39 names, 24-grid, 1.75 stroke, `currentColor`) replaced every unicode glyph in the UI.
Skins can later swap the set via the `glyphs` hook in §7 of the brief.

**Testing protocol (added Oct 2026):** Vitest unit tests for pure logic and a headless
smoke harness (`web/test/smoke/`) that runs the app against a mocked backend and asserts
the §5 invariants after every scenario. See README → Testing. Every phase item from here on
ships with a unit test (if pure) and a smoke scenario (if visible).

**Round 3 fixes (Oct 2026):**
- *Bug — quest shows "No open missions" while Complete quest counts 1.* Both nested lists
  excluded loaded missions (`today_slot` set) while the progress count and the completion
  dialog counted them. Fixed by extracting `utils/questMissions.ts`
  (`openMissionsOfQuest`, `groupOpenMissionsByQuest`, `orderQuestMissions`) and using it in
  `QuestsPanel`, `QuestModal`, `QuestCard` and `AppContext.requestCompleteQuest`. Loaded
  missions now appear in both lists, muted (`is-deemphasized is-loaded`), with the Loaded
  chip, ordered after unloaded ones, and not draggable (they're already placed — unload from
  the Loadout). Smoke: `desktop-quest-loaded-mission`.
- *Vocabulary — "Clear" was ambiguous (finish vs. erase vs. empty).* Decision: **Complete**
  is the verb for finishing (buttons, menu items, tooltips, dialog titles), **Cleared** is the
  state (Missions "Cleared" toggle, "Cleared Oct 8", Accomplished Today), **Delete** is the
  verb for erasing, and the empty matrix cell reads **Empty**. The Complete quest dialog is
  now *"Title has N open missions. What should happen to them?"* with **Cancel** ·
  **Complete missions too** (danger, `cascade_done`) · **Keep missions — move to Cache**
  (primary, `detach_open`); with zero open missions it offers a single **Complete quest**.
  `clearToday` keeps its API name; the stopwatch "Clear" reset is fine. Smoke:
  `desktop-vocabulary-complete`.

### 1.4 Item card (mission)
- Fixed height; one left accent bar = **priority** (P1 / P2 / P3 tokens). Quest identity is
  a small colored chip with the quest title, not a second bar.
- Rest state stat block (left→right): priority glyph, CR glyph (1–3 pips), due (relative,
  colored only when ≤ tomorrow / overdue), operator initial (hidden when filter is one user),
  quest chip. Hover/long-press tooltip: full title, notes excerpt, created, exact due.
- Hover action row: ✓ Done · ⇧ Load / ⇩ Unload · ✎ Edit · ⋯ (Move to quest…, Delete).
  Every drag action has a click equivalent.

### 1.5 Loadout → the Case (see Design Brief §6)
**Status: ✅ done.** `utils/casePacking.ts` is the layout contract (pure, 13 unit tests:
fixed 6×3 / 3×6, locked cells from the bottom-right, CR-wide items, wrap-with-gap, never
over locked cells, overflow flagged `overBudget` vs. merely squeezed out, drop-cell → insert
index). `primitives/CaseGrid.tsx` + `CaseTray` render it; `TodayPlanner` owns Case · List,
the picker (`LoadFromMissionsModal`) and the empty state; `App.tsx` maps `case-cell-<n>`
drops through `insertIndexForCell` to one `reorderLoadoutTasks` call. Decisions: shape is
chosen by the handheld breakpoint (≤ 900px) plus a < 320px pane-width floor rather than a
container query (the phone pane is wider than the desktop pane); Case · List is icon-only to
keep the HUD to two rows; another operator's case renders read-only with all 18 cells live
because their energy level isn't known client-side; the Loadout pane widened to
`clamp(360px, 30vw, 480px)` so cells are ≥ 64px on common desktops — *superseded Oct 2026
(round 3): the Loadout is now the primary pane at `clamp(480px, 40vw, 640px)` (576px → 87px
cells at 1440) and drag-resizable like Quests (400–900px, `utils/paneWidth.ts`, persisted as
`firebrain_today_panel_width`; until the user drags, nothing is stored and the CSS clamp stays
responsive). `CASE_TIGHT_CELL_PX` rose 72 → 80 so CR1 cells carry title + P + CR pips; the
cell is an inline-size container that hides the quest chip < 220px and everything but P/CR
< 125px. At ≤ 1100px the pane is 340px and falls back to 3 × 6 (~99px cells).* Overflow items that fit
the budget but not the free cells show a neutral "reorder to pack tighter" hint, which is
the brief's intended fix (two Shift-earlier clicks pack the fixture loadout at Light).

**Round 4 (Oct 2026) — bigger Case, frontend-owned capacity.** The grid grew to 18 cells
(desktop 6 × 3, handheld 3 × 6 so a CR3 spans a phone row) and energy is now Light 10 /
Medium 14 / Heavy 18. Those numbers live in `ENERGY_POINTS_LIMIT`; `client.ts` normalises
`getLoadoutConfig` / `setEnergyLevel` so `points_limit` is derived from `energy_level` and
the backend's 7 / 10 / 12 is discarded. `points_used` is recomputed from loaded missions'
CR in `AppContext`. Deliberate API deviation — the Sheet is off limits; overload stays
visible so nothing breaks. CapacityBar segments shrank (6 × 8px) so 18 still fit one HUD
row. The fixture loadout (CR 1+2+2+2+3 = 10) now fits Medium and Heavy; Light squeezes the
CR3 (used exactly 10).

- Loadout *formats* are presentation modes over the same data (`today_slot` order + CR):
  - **Case** (default): a fixed 6×3 cell grid (3×6 on mobile); energy level sets how many
    cells are unlocked (10 / 14 / 18), locked cells stay visible; each mission occupies CR
    cells.
  - **List**: the current simple ordered list, for people who want it plain.
  - Future: **Template** formats (e.g. 1-3-5 as a pre-shaped case).
- Single capacity indicator (`CapacityBar`: `10 / 14`, overflow-tone segment when over). Remove the
  dot meter and the footer bar. Energy selector becomes a 3-way `SegmentedControl` with a
  `?` tooltip explaining CR → cells.
- Overloaded missions render in an **overflow tray** below the case (visibly outside it);
  the tray only appears when overloaded. *Oct 2026:* the tray is a grid on the case's own
  columns (`CaseTrayItem` = the same `.case-slot` frame as a placed item), so an overflow
  mission is exactly its CR wide and gets the full hover/⋯ toolbar; the over-capacity tone
  is `--overflow` (turquoise; lime in Sci-fi) everywhere — tray, CapacityBar, picker total,
  List border — never `--danger`.
- Empty state: "Nothing loaded" + **Load from Missions** (picker sheet with checkboxes →
  `assignToday` each) + **New mission**. This is the tap-first alternative to drag.
- Rows/cells get ✕ unload and ↑/↓ on hover; D&D remains for reorder on desktop.
- Accomplished Today: collapsible, count in header, compact single-line rows.

### 1.6 Missions pane header
- Three distinct groups: **Who** (operator segmented control) · **View** (List / Grid /
  Matrix icon segmented) · **Sort** (single dropdown). **Done** toggle and **Search**
  (client-side title/notes filter) on the right. Counts in headers.
- Grid view hidden below 600px; Matrix hidden below 900px.

### 1.7 Quest log
- Entry shows: color dot, title (1-line clamp via CSS, no JS truncation), leader initial,
  **progress** (done/total when done tasks are loaded; open count otherwise), overdue chip,
  expand chevron. One colored bar on the quest; nested missions use the item card without
  a second bar.
- Hover: **Track/Untrack** and **+ Mission** (opens `openTaskModal(null, true, quest_id)`).
- "Completed quests" toggle at the bottom (fetch `getQuests('done')` on demand).

---

## Phase 2 — Handheld layout (2 days)
Principle: on a phone, Fire Brain is a **Today app**. Design it like a Switch port — same
density philosophy, different arrangement, bigger hit areas.

*Already in place from Phase 1: 2.5 (dialogs become bottom sheets < 600px; Priority and CR
are segmented controls) and the 2.6 sensor settings (TouchSensor 250ms / 10px). Default tab,
56px tab bar, manifest, swipe gestures and the rest are not started.*

**Mobile review (Oct 2026) — proposed, pending owner decisions. Do not build in this
round.** Phone is *resumed, not launched*. Recommended hybrid: Today tab as home with the
Case as hero and a visible ✓ per item on touch; capture via a **FAB → title-first capture
sheet** (P/CR segments, due presets Today/Tmrw/Next wk/Pick…, quest chips, "Load into
today", "More…" for notes/operator; 2–3 taps title-only, 5–6 full, vs 9 today); Missions
tab forced to List with ✓ + Undo, in-app Delete confirm, "Move to quest…" in ⋯; quest
Move up/down; one-row handheld HudBar with a filter sheet (Case top ≤ 170px, from 280);
refetch on `visibilitychange` + every 5 min; manifest; sheets follow `visualViewport`;
swipes deferred to Phase 3 behind Undo. ≈ 7 days, not 2. Engage's Focus row is the top of
the phone Today tab; Briefing is the phone's "assemble the day". Owner decisions
(defaults): default tab **Today**; capture lands in **Cache** (Load pre-checked only from
Today); Energy **visible L·M·H**; phone format **Case**; swipes **Phase 3**; Undo via
`updateTask({status:'open'})` **accepted** (client must re-`assignToday` and key
Accomplished on `status`, since `Code.gs updateTask` ignores `completed_at`/`today_slot`).
API gaps: no bulk complete/load, no reopen, teammate energy unknown (`getLoadoutConfig`
is caller-only), refresh is polling.

### 2.1 Shell
- Tabs: **Today · Missions · Quests**; default Today. Tab bar 56px, icons + labels,
  `position: fixed`, `padding-bottom: env(safe-area-inset-bottom)`.
- Header: logo + operator badge; logout, tools, UI scale, and skin picker inside the badge
  menu. Tools drawer strip hidden on mobile.
- `manifest.webmanifest` (name, 192/512 icons, `display: standalone`, colors) for
  installability on Android and a proper iOS splash.
- Persist active tab and per-tab scroll in `sessionStorage`.

### 2.2 Today tab
- Compact HUD: date · capacity bar · energy segmented control · viewer control.
- Case format renders as a fixed 4×3 grid; energy level unlocks 7 / 10 / 12 cells, locked
  cells visible. List format available via a toggle.
- Full-width rows with 44px done target; swipe right = done, swipe left = unload.
- Prominent **Load from Missions** button; Accomplished Today collapsed by default.

### 2.3 Missions tab
- Forced List view. Sticky single-row header that scrolls horizontally: operator filter ·
  Sort ▾ · 🔍. Row tap → bottom sheet with details + actions (Done, Load, Move to quest,
  Edit, Delete). Floating **+** for New Mission; long-press for Bulk Import.

### 2.4 Quests tab
- Collapsible quest-log entries, first expanded. Reorder via ⋯ "Move up / Move down"
  (calls `reorderQuests`).

### 2.5 Dialogs → sheets
- Below 600px, all dialogs are full-height bottom sheets: sticky footer, scrolling body,
  visible ✕. Priority and CR fields become segmented controls, not `<select>`.

### 2.6 Touch drag
- Keep dnd-kit as an accelerator: `TouchSensor` delay 250ms / tolerance 10; handle is a
  full-height 36px strip at ≥ 0.5 opacity. No action may require drag.

---

## Phase 3 — Quality of life (ongoing)
*Landed via the Gadget drawer (Oct 2026): Quick add (as a gadget, grammar in
`utils/parseMission.ts`, shared with Bulk import), an in-app Stopwatch/countdown, a
truthful Shortcuts card, and a sound on/off setting. The drawer (`GadgetDrawer`, formerly
Gizmodroar) is a fixed 168px tray of 240×136 tiles, persisted open state, Esc collapses,
hidden on handheld.*
- **Quick add** ~~input atop Missions~~ — shipped as a gadget; consider also mounting it
  atop Missions on handheld (Phase 2). Due-date presets in the form.
- **Keyboard**: `n` new mission, `q` new quest, `/` search, `Esc` close (focus trap +
  return focus), `1/2/3` panes; cards focusable, Enter opens, Space completes.
- **Undo** (5s toast) for Done and Delete via `updateTask({ status: 'open' })`.
- In-app confirm dialogs instead of `window.confirm`.
- **Sync state**: in-flight counter in `client.ts` → "Saving… / Saved / Retry" indicator in
  the HUD; skeleton cards instead of spinner; refetch on `visibilitychange` and every 5 min;
  manual refresh.
- **Batch reorder**: only send `assignToday` for missions whose slot changed.
- **Mission → quest** and **Convert to quest** from the ⋯ menu.
- `prefers-reduced-motion` respected; paper-grain texture disabled on mobile.

**Round 4 (Oct 2026) — landed:**
- **Engage** — per-device clock (`utils/engagement.ts`), FocusRow under the capacity bar,
  Case `.is-active` via `--active*` tokens, Stopwatch binding, chime = checkpoint,
  Complete → "Take 5?" cooldown. Time is not logged (Sheet cannot hold it).
- **Objectives** — `utils/objectives.ts` parses `- [ ]` lines in notes; 44px checklist in
  the mission dialog; tooltip excerpt is honest `n/m`. Focus row shows the first unchecked
  + count.
- **Briefing** — once-a-day Dialog composition (`utils/briefing.ts` + `BriefingModal`).
  Phone: this is "assemble the day". HUD button via `onOpenBriefing` on TodayPlanner.
- **Split mission** — *approved, not scheduled*: on a stuck CR3, "Split into…" creates
  2–3 CR1 missions in the same quest via `createTask` and deletes the original via
  `cancelTask`. No schema change.
- **Considered, parked:** Squad format, Reserve cell, Aging chip.

---

## Phase 4 — Rating system & matrix (design, then build)
The current ratings (P1–P3, CR 1–3, due date) are directionally right but not dialed in.
Resolve on paper before touching UI:
- Keep **Priority × CR** as the planning matrix ("biggest win for least cost"); drop the
  Eisenhower framing. Due date supplies urgency as an overlay (color/badge), not an axis.
- Decide whether every mission needs both P and CR visible at rest, or whether CR alone
  (as the cost that drives the Case) is the primary stat and P is secondary.
- Make CR ↔ energy explicit in copy: energy level is the "party level"; CR is encounter
  cost. Tooltip on the capacity bar explains it in one sentence.
- Matrix view on desktop becomes a proper 3×3 with fixed cell heights and a stacked grouped
  list as its mobile fallback.

---

## Phase 5 — Progression (gated; only when honest)
- Nothing ships until it is derived from real data: XP = CR points of completed missions;
  "Day cleared" when the case is empty at end of day; quest completion as the reward moment.
- No streak counters or ranks until there is a retention design worth defending.

---

## Phase 6 — Skins
**Status: first skin shipped (Oct 2026).** `web/src/skins/index.ts` is the registry
(`SKIN_LIST`: graphite, scifi; preview swatches, blurb, motion profile), `skins.css` imports
each skin file, and `ThemeContext` applies `data-skin` / `data-motion` on `<html>`. The
**Settings** dialog (operator menu → Settings…) holds the skin picker, UI scale, sound
on/off and account. **Sci-fi** passed the §7 acceptance test: zero component edits — token
overrides plus `::before` ornaments on `.panel-frame` / `.slot--empty` / `.item-card`. The
one chassis change it surfaced was adopted: `--ground-texture` / `--ground-texture-size`
tokens consumed by `body`, so skins can texture the ground without touching an element.
Ornaments the contract did *not* allow (chamfered cards via `clip-path`, a HudBar hairline,
a card hover glow) are noted for a future chassis decision. `skins/index.test.ts` enforces
the contract mechanically (scoping, no font-size/italics, motion ≤ 200ms). Vocabulary /
glyph / sound hooks (`skins/<id>.ts`) are still to be built — Sci-fi currently ships CSS
only.
- Skin = `skins/<id>.css` (token overrides + frame/texture rules) + `skins/<id>.ts`
  (vocabulary, icon set, sound set, motion profile). See Design Brief §7–§8.
- The chassis (Graphite) is the permanent baseline; every skin sits on top of it and
  Graphite stays selectable as a first-class skin for users who don't want game styling.
- The current Field Notes look is retired, not ported.
- Order: chassis (Graphite) → **Sci-fi** (the contract's acceptance test: zero component
  edits) → Military (proves two skins can diverge) → Fantasy.
- Skin picker in the operator menu; persisted; applied via `data-skin` on `<html>`.

---

## Order of work
1. ~~Phase 0 — same day.~~ ✅
2. ~~Design Brief decisions → Phase 1.1–1.3 (shell, density, primitives).~~ ✅
3. ~~Phase 1.5 (the Case) — the signature screen.~~ ✅ (plus icons, Settings, Sci-fi skin,
   Gadget drawer, teaching tooltips, test harness)
3b. ~~Round 3 — loaded-missions bug, Complete/Cleared/Delete vocabulary, density pass.~~ ✅
3c. ~~Round 4 — bigger Case (frontend-owned 10/14/18), Engage, Objectives, Briefing.~~ ✅
4. Phase 2 (handheld) — **proposed (pending owner decisions); do not build yet.**
5. Phase 1.4, 1.6, 1.7 polish; remaining Phase 3 (Undo, sync, Split mission).
6. Phase 4 design pass; Phase 6 skin hooks (vocabulary / glyphs / sounds) + Military;
   Phase 5 last.

---

## Appendix — Audit findings that motivated this plan (Oct 2026)

Observed by reading the full codebase and screenshotting the running app at 1440, 1024,
768, 390, and 844×390 viewports.

**Layout**
- Whole page scrolls instead of panes: `.app` uses `min-height: 100vh`, so the Loadout
  scrolls out of view when the Quests column is long.
- 161 text nodes under 11px and 107 interactive elements under 40px on the default desktop
  view; P tags 8.4px, CR pills 8.7px, done button 22px, drag handle 14px at 20% opacity.
- Loadout capacity shown three ways at once (header text, dot meter, footer bar).
- Footer shows hardcoded Streak / Rank / XP and a fake sync animation.
- Missions header: 12 identically styled pills mixing filter, view, and sort.

**Mobile**
- Default tab is Quests rather than Today.
- Grid view is 2-up at 390px; long titles wrap to six lines.
- Matrix view has `min-width: 700px` in a 390px pane.
- Loadout tab is mostly empty space with no call to action.
- Drag is the only way to load a mission or move it into a quest; no tap alternative.
- Tab bar buttons are 34px tall.

**Bugs**
- Bulk Import modal is clipped to the Missions pane (`paneFadeIn` keyframes keep a
  `transform`, making the pane the containing block for `position: fixed`).
- Pane drag-handle pill overlaps the Loadout header controls on hover.
- Overdue section excludes missions that are inside a quest.
- Accomplished Today misses missions completed directly from the cache (`today_user` empty).
- `todayKey` is computed once at mount.
- Loadout reorder sends one request per mission sequentially.
- Toast timer isn't cleared between messages.
- `window.confirm` for delete; no keyboard support; no `manifest.webmanifest`.
- Theme scaffolding exists but no picker is rendered and only one theme has CSS.
- `--border-subtle`, `--surface-raised`, `--accent-primary` are referenced but never defined.
