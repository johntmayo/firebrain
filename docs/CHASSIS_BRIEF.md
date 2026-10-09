# Fire Brain Chassis — Design Brief

Companion document: [`PLAN.md`](./PLAN.md) sequences the work that builds this.

## 1. Purpose
Define the skin-independent structure of Fire Brain: the components, their anatomy, the
information each one carries, the density rules, and the contract a skin must honor.
The chassis should feel like a game UI *with no skin applied*. Skins make it feel like a
*particular* game.

Test for every decision: "If I strip all color, texture, and type choices, does this still
read as an inventory / loadout / quest log?" If not, the game-feel is in the skin, which is
the wrong place.

## 2. Principles
1. **Structure is the game; skin is the surface.** Layout, information order, hit areas,
   and interactions are fixed. Everything visual on top is skinnable.
2. **Dense, not small.** Terse resting state, complete hover state. Contrast, alignment,
   fixed heights, and iconography carry legibility; font size does not.
3. **Every stat is honest.** Nothing on screen represents data that doesn't exist.
4. **Every drag has a click.** Drag-and-drop is an accelerator, never the only path.
5. **One accent per object.** A mission shows its priority on its bar; its quest is a chip.
   Two colored bars on one card is a bug.
6. **Numbers are mono and tabular.** Always.

## 3. Vocabulary
The chassis (and Graphite) uses the game vocabulary in the first column. These are the
canonical names in code and in the default UI. Skins may remap display strings only.

| Chassis term     | Meaning                                  | Sci-fi      | Military    | Fantasy      |
|------------------|-------------------------------------------|-------------|-------------|--------------|
| Operator         | A user                                    | Operator    | Operator    | Adventurer   |
| Quest            | Goal container; tracked or untracked      | Directive   | Operation   | Quest        |
| Mission          | Atomic task                               | Task        | Objective   | Mission      |
| Loadout / Case   | Today's set, within capacity              | Loadout     | Kit         | Pack         |
| Energy           | Capacity level (Light/Medium/Heavy)       | Power       | Readiness   | Stamina      |
| CR               | Challenge rating, 1–3 = cells / cost      | Load        | Weight      | CR           |
| Priority         | P1–P3 importance                          | Priority    | Precedence  | Priority     |
| Tracked          | Pinned to the HUD                         | Active      | Active      | Tracked      |
| Log              | Untracked quests                          | Archive     | Standby     | Journal      |
| Cache            | Unassigned mission backlog                | Cache       | Depot       | Stash        |
| Complete (verb)  | Finish a mission / quest (buttons, menus) | Complete    | Complete    | Complete     |
| Cleared (state)  | Mission/quest finished (labels, toggles)  | Complete    | Complete    | Cleared      |
| Delete (verb)    | Erase a mission — never "Clear"           | Delete      | Delete      | Delete       |
| Load / Unload    | Put into / take out of the Loadout        | Load        | Issue       | Pack         |

(Skin columns are starting suggestions, not decisions.)

**"Clear" is reserved** (decided Oct 2026): it was doing three jobs — finish, erase and
"empty". The verb for finishing is *Complete*, the past-tense state is *Cleared*, the verb for
erasing is *Delete*, and an empty matrix cell says *Empty*. `clearToday` survives only as the
API name for unloading; "Clear" as a stopwatch reset is also fine.

## 4. Structural elements
Each element lists: role · anatomy (fixed) · what a skin may change.

### 4.1 PanelFrame
Role: container for a pane or sheet.
Anatomy: 1px border, header strip (HudBar), scrolling body, optional footer. Corner
treatment is a skin hook (square, chamfered, rounded, nine-slice).
Skin: border color/width/texture, corner/frame artwork, background, header fill.

### 4.2 HudBar (pane header)
Role: title + controls, sticky within its panel.
Anatomy: left: glyph + title (`--t-lg`, display font) + count; right: controls grouped as
SegmentedControls / buttons. Max one row on desktop, horizontally scrollable on touch.
Skin: fill, divider, glyph set, title typeface.

### 4.3 ItemCard (mission)
Role: the mission everywhere it appears (cache, quest log, case, matrix).
Anatomy (fixed, left→right, fixed height per tier):
```
┌─┬──────────────────────────────────────────────┬────┐
│▌│ Title (1 line, ellipsis)            [quest]  │ ✓  │
│▌│ P2 ●●○ CR   Fri   J                          │    │
└─┴──────────────────────────────────────────────┴────┘
 ^ priority bar                 ^ stat row       ^ action zone
```
Tiers: **row** (cache, quest log, list loadout) 48px; **cell** (Case) 84px tall, `CR` cells
wide — a CR1 cell carries title + P chip + CR pips (due/quest live in the tooltip), narrower
than 80px it drops to P only; **compact** (matrix) 40px, stat row collapses to glyphs only.
Stat row order is fixed: priority · CR pips · due · operator · quest chip. Items hide when
redundant (operator hidden under a single-user filter; quest chip hidden inside its quest).
Hover/long-press: Tooltip with full title, notes excerpt, created date, exact due.
Hover action zone: ✓ · ⇧/⇩ · ✎ · ⋯.
Skin: card fill/border, bar shape, glyph set for P and CR, chip styling, hover treatment.

### 4.4 StatChip
Role: a labeled value (P2, CR pips, "2d", "J", quest name, "3 / 10").
Anatomy: optional glyph + mono value; fixed height 20px (22px inside a Case cell); min hit
area via parent.
Skin: shape (pill/square/hex), fill, glyphs.

### 4.5 Slot & Case
Role: the loadout grid. See §6.
Anatomy: grid of equal cells; each mission spans `CR` cells in a row; locked cells
(beyond capacity) render as disabled; overflow tray below.
Skin: cell artwork, locked-cell treatment, tray styling, item-in-slot framing.

### 4.6 CapacityBar
Role: single source of truth for budget.
Anatomy: label (`10 / 14`, mono) + segmented bar with one segment per live cell; over-capacity
segments appended in the overflow color (never danger). Tooltip explains CR → cells and
energy levels.
Skin: segment shape, colors, glow.

### 4.7 QuestLogEntry
Role: a quest in the Quests pane, tracked or untracked.
Anatomy: color dot · title (CSS 1-line clamp) · leader initial · progress (`3/8` mono +
thin bar when done-count known; `5 open` otherwise) · overdue chip · chevron (≥ 32px).
Expanded: nested ItemCards (row tier) + "+ Mission". Hover: Track/Untrack. The nested list
is *every* open mission of the quest; a mission that is loaded into a Loadout stays listed,
muted, with a Loaded chip and no drag handle, so the list, the progress count and the
Complete quest dialog can never disagree.
Skin: entry fill, dot/progress styling, chevron glyph.

### 4.8 SegmentedControl
Role: all mutually-exclusive choices (operator filter, view, energy, P, CR, loadout format).
Anatomy: equal-width segments, one selected; ≥ 32px tall desktop / 44px touch.
Skin: shape, selected treatment.

### 4.9 Dialog / Sheet
Role: create/edit/confirm. Dialog ≥ 600px, Sheet below.
Anatomy: header (title + ✕), scrolling body, sticky footer with primary right.
Esc closes; focus trapped; focus returns on close.
Skin: frame, backdrop, motion.

### 4.10 Notice (toast), Tooltip, EmptyState, OperatorBadge, ActionMenu
Standard; all fixed in behavior, skinnable in surface. Notices stack, dismissible, may
carry one action (Undo). EmptyStates always offer a next action.

## 5. Density rules (chassis-wide)
- Root 16px × `--ui-scale` (0.85 / 1 / 1.15 / 1.3). Type tokens `--t-2xs … --t-xl` only
  (0.68 / 0.75 / 0.85 / 0.95 / 1.08 / 1.3 rem). *Oct 2026: the defaults were deliberately
  loosened one step after daily use (root 15 → 16px, every token up one step); the 85 %
  preset reproduces the original density.*
- Fixed heights: HudBar 48, ItemCard row 48 / compact 40 / cell 84, QuestLogEntry 48,
  StatChip 20, form controls and `.seg--md` 40 (`--h-control`; 44 on touch).
- Text ≤ `--t-xs`: upright, weight ≥ 500, contrast ≥ 4.5:1.
- Display typeface only for pane titles, dialog titles, and the logotype.
- Mono + tabular numerals for all numbers.
- Fixed heights for ItemCard tiers, QuestLogEntry, StatChip, SegmentedControl, HudBar.
- Hit areas ≥ 32px desktop, ≥ 44px touch; glyphs may be smaller than their hit area.
- Borders 1px hard at rest; shadows only for lifted/floating states.
- Motion ≤ 200ms for state changes; spring only on drop; honor `prefers-reduced-motion`.

## 6. The Case (loadout format)
Model: `today_slot` already stores an ordered position; CR already stores cost. The Case
is a pure presentation of that: items flow left→right, top→bottom; each item is 1 row
tall and `CR` cells wide; the grid has `capacity` live cells.

Grid dimensions: the case is a **fixed grid**; energy level changes how many cells are
unlocked, not the grid's shape. Locked cells are always visible (disabled treatment), so
switching to a heavier day visibly opens up the case.
- Desktop: 6 × 3 = 18 cells. Light → 10 live / 8 locked. Medium → 14 / 4. Heavy → 18 / 0.
- Mobile: 3 × 6 = 18 cells. Same lock counts (a CR3 spans a phone row).
- The Loadout is the primary pane: on desktop it defaults to `clamp(480px, 40vw, 640px)`
  (576px → 87px cells at 1440) and is drag-resizable 400–900px (persisted as
  `firebrain_today_panel_width`); Missions takes the remainder. Below 1100px the pane is
  340px and the case falls back to 3 × 6 (~99px cells).
- Capacity is owned by the frontend (`ENERGY_POINTS_LIMIT` 10 / 14 / 18). The backend
  still returns 7 / 10 / 12; `client.ts` overwrites `points_limit` from `energy_level`.
- Locked cells fill from the bottom-right so live cells are always a contiguous
  left-to-right, top-to-bottom run.

Packing: no auto-reflow. If an item doesn't fit in the remaining cells of a row it wraps to
the next row and leaves a gap, exactly like a real inventory. Reordering (drag or ↑/↓)
lets the operator pack it tighter. The CapacityBar counts cells used, not cells occupied
visually, so a gap never costs you.

Overflow: items beyond capacity render in a tray under the case, visibly outside it (behind
a hairline). The tray **shares the case's columns**: a tray item is exactly `CR` cells wide
and one cell tall, same as in the case — overflowing never costs a mission more room than
its CR. Over-budget items, the tray header's `+N` and the CapacityBar's appended segments
use the **overflow tone** (`--overflow`, turquoise): surplus drive, not a fault — never
`--danger`. Items that fit the budget but are squeezed out by gaps stay neutral (dashed);
the tray header's `?` explains the reorder fix. The tray is **only rendered when
overloaded**. Overload is allowed (current behavior) but never hidden.

Desktop mock, Medium (14 live of 18), 7 used, with a gap; `▒` = locked:
```
 CASE · Medium                                 7 / 14
┌─────┬───────────┬───────────┬─────┐
│Write│ Call dent │ Fix login │free │   row 0: CR1 · CR2 · CR2 · free
├─────┴───────────┼─────┬─────┼─────┤
│ Zone 153 (CR2)  │free │free │free │   row 1
├─────┬─────┬─────┼─────┼─────┼─────┤
│free │free │▒▒▒▒ │▒▒▒▒ │▒▒▒▒ │▒▒▒▒ │   row 2: 2 live · 4 locked
└─────┴─────┴─────┴─────┴─────┴─────┘
```
Same case switched to Heavy (all 18 live), then overloaded by a CR3 after the grid fills:
```
 CASE · Heavy                               18 / 18 +3
┌───────────────────────────────────────────┐
│  …all 18 cells occupied…                  │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ OVERFLOW                               +3 │   overflow tone, not danger
├─────────────────────────┬                 │
│ Harassment prevention   │                 │   CR3 = three cells, same columns
└─────────────────────────┴─────────────────┘
```
Handheld mock, Medium (14 live of 18); a CR3 spans a phone row:
```
 CASE · Medium          10 / 14
┌─────┬───────────┐
│Write│ Call dent │   CR1 · CR2
├─────┴─────┬─────┤
│ Fix login │free │   CR2 · free
├───────────┼─────┤
│ Zone 153  │free │   CR2 · free
├───────────┴─────┤
│ Harassment (CR3)│   CR3 spans the row
├─────┬─────┬─────┤
│free │free │▒▒▒▒ │   2 live · 1 locked
├─────┼─────┼─────┤
│▒▒▒▒ │▒▒▒▒ │▒▒▒▒ │
└─────┴─────┴─────┘
```
Interactions: drop onto any free cell to insert at that position; drop onto an occupied
cell to insert before it; ✕ on hover to unload; ↑/↓ to shift; click a card to open it;
✓ to complete it (it moves to Accomplished and its cells free up — the satisfying moment).

Loadout format toggle (HudBar, right side): **Case · List**. Both share the same data;
switching is instant. Future template formats (e.g. 1-3-5: one CR3 + three CR2 + five
CR1 pre-shaped slots) are additional entries in this toggle.

## 7. Skin contract
A skin is two files and may touch nothing else.

`skins/<id>.css` — may override:
- Color tokens (ground, surface, text, border, accent, priority-1/2/3, danger, success,
  overflow — the over-capacity tone; keep it energetic and distinct from danger and accent).
- Typography tokens (`--font-display`, `--font-body`, `--font-mono`), letter-spacing, and
  text-transform for titles.
- Shape tokens (radii, border widths, frame artwork via `border-image` or `::before`
  pseudo-elements on PanelFrame / Slot / ItemCard).
- Surface tokens (textures, gradients, glows, shadows).
- Motion tokens (durations, easings) within the chassis caps.

`skins/<id>.ts` — provides:
- `vocabulary`: display strings for the §3 terms.
- `glyphs`: icon set for priority, CR pips, due, operator, quest, done, load/unload, menu.
- `sounds`: handlers for dragStart, dropSuccess, dropCancel, clear, questComplete (reuse
  the Web Audio approach in `utils/sounds.ts`; skins supply parameters or samples).
- `motion`: profile name consumed by the CSS (`snappy` | `soft` | `heavy`).

A skin may **not**: change layout, grid dimensions, information order, which stats appear,
hit areas, component behavior, or add/remove UI. If a skin needs that, it's a chassis change.

Acceptance test for the contract: build **Sci-fi** with zero component edits. If it needs
a component change, that change belongs in the chassis, and the skin is rebuilt against it.
A second skin (Military) later confirms that two skins can diverge from the same chassis.

## 8. Default chassis look — Graphite (decided)
The chassis ships with a plain default appearance called **Graphite**: a mid-dark neutral.
Near-black ground, graphite panels, off-white text, 1px borders a step lighter than the
panel, one restrained accent, P1/P2/P3 as rose / amber / slate. Reasons: dense
light-on-dark type reads well at small sizes; the first product skins (sci-fi, military)
are dark; and it is visibly "unskinned," which keeps pressure on the structure to carry
the game-feel.

Graphite is not scaffolding. It is the daily-use look until skins exist, and it remains
a first-class selectable skin afterward: it is the option for users who want the planning
model without the game styling (colleagues who aren't gamers, for example). Which skin is
the *marketing* default is a later product decision (likely Sci-fi).

The existing "Field Notes" look (warm cream, Fraunces italic) is retired; it is not ported
as a skin.

### How chassis and skins relate
```
chassis  = structure (§4–§6) + density rules (§5) + Graphite default tokens
skin     = token overrides + glyphs + vocabulary + sounds + motion (§7)

Build order:  chassis (Graphite) → Sci-fi → Military → Fantasy …
```
The chassis is never "replaced" by a skin. Every skin, including Sci-fi, sits on top of it.
If the baseline were Sci-fi itself, every structural decision would be entangled with
Sci-fi styling and every later skin would have to fight it; a neutral baseline is what
makes the §7 acceptance test (a skin built with zero component edits) meaningful.

## 9. Handheld layout
Same components, rearranged: Today tab is the HUD (CapacityBar + Case at 3 columns);
Missions and Quests are lists of row-tier ItemCards / QuestLogEntries; dialogs become
sheets. Density is unchanged; hit areas grow to 44px by padding. Nothing requires drag.

## 10. Decisions (resolved 2026-10-07)
1. **Polarity (light vs. dark default): Graphite (dark).** See §8.
2. **Default vocabulary: the game terms** — Mission, Quest, Loadout / Case, CR, Energy,
   Tracked, Cache, Operator. Plain-language alternatives (Task / Project / Today / Effort)
   are not used anywhere in the default UI.
3. **Stat block at rest: show both P and CR.** The ItemCard stat row always carries the
   priority glyph and the CR pips; neither is hover-only.
4. **Grid: fixed 6 × 3 desktop / 3 × 6 mobile; energy unlocks cells; locked cells visible.**
   See §6.
5. **Overflow tray: rendered only when overloaded.**
6. **First skin: Sci-fi.** Field Notes is retired, not ported.

## 11. Build order
1. Tokens + density rules (`styles/tokens.css`, `--ui-scale` setting).
2. Primitives: PanelFrame, HudBar, StatChip, SegmentedControl, ItemCard, Tooltip,
   CapacityBar.
3. The Case (desktop, then 4-column mobile).
4. QuestLogEntry; Dialog/Sheet.
5. Sci-fi skin (the contract's acceptance test).
