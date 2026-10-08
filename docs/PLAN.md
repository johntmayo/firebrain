# Fire Brain — Frontend Plan v2

Companion document: [`CHASSIS_BRIEF.md`](./CHASSIS_BRIEF.md) defines the structural design
system this plan builds on. Read both before starting Phase 1.

## Context & direction
Fire Brain is a planner whose game concepts are the planning method, not decoration:
- **Quest** = a goal you can pin to your HUD (tracked) or leave in the log (untracked).
- **Mission** = an atomic task, optionally nested in a quest, with a priority and a
  challenge rating (CR 1–3 = energy cost).
- **Loadout** = today's kit, limited by an energy budget (Light 7 / Medium 10 / Heavy 12).

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
44px touch via invisible padding.

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
default, game vocabulary as-is, P and CR both shown at rest, fixed 6×2 / 4×3 case with
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
- Root stays `15px`. Add `--ui-scale` (presets 0.85 / 1 / 1.15 / 1.3) applied as
  `html { font-size: calc(15px * var(--ui-scale)) }`; expose in a settings menu; persist.
- Type scale tokens: `--t-2xs: 0.6rem; --t-xs: 0.68rem; --t-sm: 0.78rem; --t-md: 0.88rem;
  --t-lg: 1rem; --t-xl: 1.2rem`. Every `font-size` in the stylesheet maps to one of these.
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
fixed 6×2 / 4×3, locked cells from the bottom-right, CR-wide items, wrap-with-gap, never
over locked cells, overflow flagged `overBudget` vs. merely squeezed out, drop-cell → insert
index). `primitives/CaseGrid.tsx` + `CaseTray` render it; `TodayPlanner` owns Case · List,
the picker (`LoadFromMissionsModal`) and the empty state; `App.tsx` maps `case-cell-<n>`
drops through `insertIndexForCell` to one `reorderLoadoutTasks` call. Decisions: shape is
chosen by the handheld breakpoint (≤ 900px) plus a < 320px pane-width floor rather than a
container query (the phone pane is wider than the desktop pane); Case · List is icon-only to
keep the HUD to two rows; another operator's case renders read-only with all 12 cells live
because their energy level isn't known client-side; the Loadout pane widened to
`clamp(360px, 30vw, 480px)` so cells are ≥ 64px on common desktops. Overflow items that fit
the budget but not the free cells show a neutral "reorder to pack tighter" hint, which is
the brief's intended fix (two Shift-earlier clicks pack the fixture loadout).

- Loadout *formats* are presentation modes over the same data (`today_slot` order + CR):
  - **Case** (default): a fixed 6×2 cell grid (4×3 on mobile); energy level sets how many
    cells are unlocked (7 / 10 / 12), locked cells stay visible; each mission occupies CR
    cells.
  - **List**: the current simple ordered list, for people who want it plain.
  - Future: **Template** formats (e.g. 1-3-5 as a pre-shaped case).
- Single capacity indicator (`CapacityBar`: `7 / 10`, red segment when over). Remove the
  dot meter and the footer bar. Energy selector becomes a 3-way `SegmentedControl` with a
  `?` tooltip explaining CR → cells.
- Overloaded missions render in an **overflow tray** below the case (visibly outside it);
  the tray only appears when overloaded.
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
4. Phase 2 (handheld). **← next**
5. Phase 1.4, 1.6, 1.7 polish; Phase 3 as capacity allows.
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
