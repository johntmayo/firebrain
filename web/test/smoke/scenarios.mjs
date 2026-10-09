// Smoke scenarios. Each: { name, viewport?: 'desktop'|'laptop'|'phone', run(ctx) }.
// ctx: { page, api, log, sleep, shot(label), expect(cond, msg), click(sel), clickText(sel, text), count(sel), text(sel) }
// Keep scenarios short and visual; put logic assertions in vitest unit tests.

export const scenarios = [
  {
    name: 'desktop-overview',
    run: async ({ shot, count, expect, text }) => {
      await shot();
      expect((await count('.pane-today .item-card')) >= 5, 'loadout shows the 5 loaded missions');
      expect((await count('.overdue-section .item-card')) === 2, 'overdue section lists quest + cache overdue missions');
      expect((await count('.accomplished__list .item-card')) === 2, 'accomplished today shows 2 cleared missions');
      const cap = await text('.cap-bar__label');
      expect(cap && /10\s*\/\s*14/.test(cap), `capacity label reads 10 / 14 (got "${cap}")`);
    },
  },
  {
    name: 'desktop-hover-and-tooltip',
    run: async ({ page, sleep, shot, count, expect }) => {
      await page.hover('.pane-inbox .item-card');
      await sleep(600);
      expect((await count('.tooltip')) === 1, 'tooltip shows on hover');
      await shot('hover');
      // Moving the pointer away must dismiss it even without a synthetic mouseleave.
      await page.mouse.move(5, 5);
      await sleep(150);
      expect((await count('.tooltip')) === 0, 'tooltip dismissed after pointer leaves');
      // Opening the dialog from a hovered card must not leave a tooltip behind.
      await page.hover('.pane-inbox .item-card');
      await sleep(600);
      await page.click('.pane-inbox .item-card');
      await sleep(300);
      expect((await count('.tooltip')) === 0, 'tooltip dismissed when the card is clicked');
      await shot('dialog');
      await page.keyboard.press('Escape');
      await sleep(200);
      expect((await count('.dialog')) === 0, 'Escape closes the dialog');
    },
  },
  {
    name: 'desktop-menus-and-bulk',
    run: async ({ page, sleep, shot, click, clickText, count, expect }) => {
      await click('.operator-menu-trigger');
      expect((await count('.action-menu')) === 1, 'operator menu opens');
      await shot('operator-menu');
      await page.keyboard.press('Escape');
      await clickText('.action-card', 'Bulk');
      expect((await count('.dialog')) === 1, 'bulk import opens as a dialog');
      await shot('bulk');
      await page.keyboard.press('Escape');
      await sleep(200);
    },
  },
  {
    name: 'desktop-views',
    run: async ({ page, sleep, shot, click }) => {
      await click('.seg__btn[data-value="buckets"]');
      await shot('grid');
      await click('.seg__btn[data-value="matrix"]');
      await shot('matrix');
      await click('.seg__btn[data-value="list"]');
    },
  },
  {
    name: 'desktop-notices-stack',
    run: async ({ page, sleep, shot, click, count, expect }) => {
      await click('.seg__btn[data-value="heavy"]');
      await click('.seg__btn[data-value="light"]');
      await sleep(200);
      expect((await count('.notice')) >= 2, 'rapid toasts stack instead of replacing each other');
      await shot();
    },
  },
  {
    name: 'desktop-complete-mission',
    run: async ({ page, sleep, shot, count, expect, log }) => {
      const before = await count('.pane-inbox .item-card');
      await page.hover('.pane-inbox .item-card');
      await sleep(200);
      await page.click('.pane-inbox .item-card .item-card__done');
      await sleep(500);
      expect((await count('.pane-inbox .item-card')) === before - 1, 'completing a mission removes it from the cache');
      expect(log.apiCalls.some(c => c.action === 'completeTask'), 'completeTask was called on the (mock) API');
      await shot();
    },
  },
  {
    name: 'laptop-overview',
    viewport: 'laptop',
    run: async ({ shot }) => { await shot(); },
  },
  {
    name: 'phone-tabs',
    viewport: 'phone',
    run: async ({ shot, clickText, count, expect, page, sleep }) => {
      await shot('default');
      await clickText('.mobile-tab', 'Loadout');
      await shot('loadout');
      await clickText('.mobile-tab', 'Missions');
      await shot('missions');
      await page.click('.pane-inbox .item-card');
      await sleep(400);
      expect((await count('.dialog')) === 1, 'tapping a mission opens the sheet');
      await shot('sheet');
    },
  },

  // ---- Settings & skins ------------------------------------------------------
  {
    name: 'desktop-settings',
    run: async ({ page, sleep, shot, click, clickText, count, expect }) => {
      await click('.operator-menu-trigger');
      expect((await count('.action-menu')) === 1, 'operator menu opens');
      expect((await count('.action-menu .menu-setting')) === 0, 'UI scale no longer lives inline in the menu');
      await clickText('.action-menu__item', 'Settings');
      await sleep(250);
      expect((await count('.dialog')) === 1, 'Settings opens as a dialog');
      expect((await count('.skin-card')) >= 2, 'skin picker lists at least Graphite and Sci-fi');
      expect((await count('.dialog .seg__btn[data-value="1"]')) === 1, 'UI scale control moved into Settings');
      expect((await count('.dialog .settings-account__logout')) === 1, 'Account section has Log out');
      await shot();
      await page.keyboard.press('Escape');
      await sleep(200);
      expect((await count('.dialog')) === 0, 'Escape closes Settings');
    },
  },
  {
    name: 'desktop-skin-scifi',
    run: async ({ page, sleep, shot, click, clickText, count, expect }) => {
      await click('.operator-menu-trigger');
      await clickText('.action-menu__item', 'Settings');
      await sleep(250);
      await click('.skin-card[data-skin-id="scifi"]');
      const skin = await page.evaluate(() => document.documentElement.dataset.skin);
      expect(skin === 'scifi', `data-skin is scifi after clicking the card (got "${skin}")`);
      const motion = await page.evaluate(() => document.documentElement.dataset.motion);
      expect(motion === 'snappy', `data-motion follows the skin (got "${motion}")`);
      await shot('settings');
      await page.keyboard.press('Escape');
      await sleep(300);
      await page.evaluate(() => document.fonts.ready);
      await shot();
      // Mission dialog in the skin
      await page.click('.pane-inbox .item-card');
      await sleep(300);
      expect((await count('.dialog')) === 1, 'mission dialog opens in the Sci-fi skin');
      await shot('dialog');
      await page.keyboard.press('Escape');
      await sleep(200);
      // Operator menu in the skin
      await click('.operator-menu-trigger');
      expect((await count('.action-menu')) === 1, 'operator menu opens in the Sci-fi skin');
      await shot('menu');
      await page.keyboard.press('Escape');
      await sleep(150);
      // Tooltip + views in the skin
      await page.hover('.pane-inbox .item-card');
      await sleep(600);
      await shot('tooltip');
      await page.mouse.move(5, 5);
      await click('.seg__btn[data-value="matrix"]');
      await shot('matrix');
      await click('.seg__btn[data-value="list"]');
    },
  },
  {
    name: 'desktop-skin-persists',
    run: async ({ page, sleep, click, clickText, expect }) => {
      await click('.operator-menu-trigger');
      await clickText('.action-menu__item', 'Settings');
      await sleep(250);
      await click('.skin-card[data-skin-id="scifi"]');
      await page.keyboard.press('Escape');
      const stored = await page.evaluate(() => localStorage.getItem('firebrain_skin'));
      expect(stored === 'scifi', `skin persisted to localStorage (got "${stored}")`);
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.app', { timeout: 10000 });
      await sleep(300);
      const skin = await page.evaluate(() => document.documentElement.dataset.skin);
      expect(skin === 'scifi', `skin survives a reload (got "${skin}")`);
    },
  },
  {
    name: 'phone-skin-scifi',
    viewport: 'phone',
    run: async ({ page, sleep, shot, clickText, count, expect }) => {
      await page.evaluate(() => localStorage.setItem('firebrain_skin', 'scifi'));
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.app', { timeout: 10000 });
      await sleep(400);
      await page.evaluate(() => document.fonts.ready);
      const skin = await page.evaluate(() => document.documentElement.dataset.skin);
      expect(skin === 'scifi', `phone boots into the stored skin (got "${skin}")`);
      await shot('quests');
      await clickText('.mobile-tab', 'Loadout');
      await shot('loadout');
      await clickText('.mobile-tab', 'Missions');
      await shot('missions');
      await page.click('.pane-inbox .item-card');
      await sleep(400);
      expect((await count('.dialog')) === 1, 'mission sheet opens in the Sci-fi skin');
      await shot('sheet');
      await page.keyboard.press('Escape');
      await sleep(200);
    },
  },

  // ---- Gadget drawer (bottom tool belt) -----------------------------------
  {
    name: 'desktop-gadgets-open',
    run: async ({ page, sleep, shot, click, count, expect }) => {
      expect((await count('.gadget-drawer.is-open')) === 0, 'belt starts collapsed');
      await click('.gadget-drawer__tab');
      expect((await count('.gadget-drawer.is-open')) === 1, 'pull tab opens the belt');
      expect((await count('.gadget')) === 4, 'four gadget tiles on the belt');
      const tray = await page.$eval('.gadget-drawer__tray', el => el.getBoundingClientRect().height);
      expect(Math.round(tray) === 168, `tray is exactly --h-drawer 168px (got ${tray})`);
      const tile = await page.$eval('.gadget', el => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      expect(tile[0] === 240 && tile[1] === 136, `tile is 240×136 (got ${tile.join('×')})`);
      await page.hover('.gadget--stopwatch .gadget__title');
      await sleep(600);
      expect((await count('.tooltip')) === 1, 'gadget title shows its teaching tooltip');
      const file = await shot();
      // 1:1 crop of the belt so the tile detail (1px borders, mono numerals) is reviewable.
      const vp = page.viewport();
      await page.screenshot({ path: file.replace(/\.png$/, '-belt.png'), clip: { x: 0, y: vp.height - 200, width: vp.width, height: 200 } });
      await page.mouse.move(5, 5);
      // Esc from inside the belt collapses it.
      await page.focus('.quick-add__input');
      await page.keyboard.press('Escape');
      await sleep(250);
      expect((await count('.gadget-drawer.is-open')) === 0, 'Esc inside the belt collapses it');
    },
  },
  {
    name: 'desktop-gadgets-stopwatch',
    run: async ({ page, sleep, shot, click, text, expect }) => {
      await click('.gadget-drawer__tab');
      expect((await text('.stopwatch__display')) === '00:00', 'stopwatch starts at 00:00');
      await click('.gadget--stopwatch [data-action="start"]');
      await sleep(1200);
      const running = await text('.stopwatch__display');
      expect(running !== '00:00', `display advanced while running (got "${running}")`);
      await click('.gadget--stopwatch [data-action="pause"]');
      const paused = await text('.stopwatch__display');
      await sleep(1100);
      expect((await text('.stopwatch__display')) === paused, 'display holds while paused');
      await shot();
      // Countdown presets show the full preset time and the belt tab echoes a running watch.
      await click('.stopwatch__modes .seg__btn[data-value="25"]');
      expect((await text('.stopwatch__display')) === '25:00', 'selecting 25 min shows 25:00');
      await click('.gadget--stopwatch [data-action="start"]');
      await click('.gadget-drawer__tab');
      await sleep(300);
      const readout = await text('.gadget-drawer__readout');
      expect(readout && /^\d\d:\d\d$/.test(readout), `collapsed tab shows the running readout (got "${readout}")`);
      await shot('collapsed-running');
    },
  },
  {
    name: 'desktop-gadgets-quickadd',
    run: async ({ page, sleep, shot, click, count, text, expect, log }) => {
      await click('.gadget-drawer__tab');
      const before = await count('.pane-inbox .item-card');
      await page.focus('.quick-add__input');
      await page.keyboard.type('Smoke mission -p1 ~low @tomorrow');
      await sleep(150);
      expect((await text('.quick-add__title')) === 'Smoke mission', 'preview strips tokens from the title');
      expect((await count('.quick-add__preview .stat-chip')) >= 3, 'preview shows P · CR · due chips');
      await shot('preview');
      await page.keyboard.press('Enter');
      await sleep(600);
      const call = log.apiCalls.find(c => c.action === 'createTask');
      expect(Boolean(call), 'Enter calls createTask on the (mock) API');
      const d = new Date(); d.setDate(d.getDate() + 1);
      const tomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(call && call.body.title === 'Smoke mission', `title sent (got "${call && call.body.title}")`);
      expect(call && (call.body.priority === 'high' || call.body.priority === 'urgent'), `-p1 → priority high (got "${call && call.body.priority}")`);
      expect(call && call.body.challenge === 'low', `~low → challenge low (got "${call && call.body.challenge}")`);
      expect(call && call.body.due_date === tomorrow, `@tomorrow → ${tomorrow} (got "${call && call.body.due_date}")`);
      expect((await count('.pane-inbox .item-card')) === before + 1, 'cache count increased by one');
      expect((await page.$eval('.quick-add__input', el => el.value)) === '', 'input clears after creating');
      await shot();
    },
  },
  {
    name: 'desktop-gadgets-persist',
    run: async ({ page, sleep, click, count, expect }) => {
      await click('.gadget-drawer__tab');
      expect((await count('.gadget-drawer.is-open')) === 1, 'belt open before reload');
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.app', { timeout: 10000 });
      await sleep(400);
      expect((await count('.gadget-drawer.is-open')) === 1, 'belt still open after reload');
      expect((await page.evaluate(() => localStorage.getItem('firebrain_gadgets_open'))) === '1', 'open state persisted under firebrain_gadgets_open');
    },
  },

  // ---- The Case (CHASSIS_BRIEF §6) -----------------------------------------
  // John's loadout is CR 1+2+2+2+3 = 10. At Medium (14 live of 6×3) the packing
  // contract places all five: row 0 = CR1·CR2·CR2·gap, row 1 = CR2·CR3·gap,
  // row 2 = 2 live + 4 locked. The tray is empty. Light (10 live) is what
  // squeezes the CR3 — see desktop-case-overflow.
  {
    name: 'desktop-case',
    run: async ({ page, sleep, shot, count, expect, text }) => {
      expect((await count('.pane-today .case-grid[data-cols="6"][data-rows="3"]')) === 1, 'desktop case is a 6×3 grid');
      expect((await count('.case-cell')) === 18, '18 cells are always rendered');
      expect((await count('.case-cell--locked')) === 4, '4 cells locked at Medium');
      expect((await count('.case-cell--free')) === 4, '4 free cells (row-0 gap, row-1 gap, two live on row 2)');
      expect((await count('.case-item')) === 5, 'all 5 missions placed in the case at Medium');
      expect((await count('.case-tray')) === 0, 'nothing overflows at Medium 14');
      const spans = await page.$$eval('.case-item', els => els.map(e => e.dataset.span).join(''));
      expect(spans === '12223', `items span their CR (got ${spans})`);
      const cap = await text('.cap-bar__label');
      expect(cap && /10\s*\/\s*14/.test(cap), `capacity reads 10 / 14 (got "${cap}")`);
      expect((await count('.cap-bar__seg')) === 14, 'one capacity segment per live cell');
      await shot();
      // Hover toolbar: ← → ✕ ✓ appear on the item and are ≥ 32px targets.
      await page.hover('.case-item[data-span="2"]');
      await sleep(200);
      expect((await count('.case-item:hover .case-slot__strip .case-slot__btn')) === 4, 'hover shows shift/unload/clear actions');
      await shot('hover');
      await page.mouse.move(5, 5);
    },
  },
  {
    name: 'desktop-case-overflow',
    run: async ({ page, sleep, shot, click, count, expect, text }) => {
      await click('.seg__btn[data-value="light"]');
      await sleep(300);
      expect((await count('.case-cell--locked')) === 8, '8 cells locked at Light');
      expect((await count('.case-item')) === 4, '4 missions fit in 10 live cells');
      expect((await count('.case-tray')) === 1, 'overflow tray renders when an item cannot place');
      expect((await count('.case-tray__item.is-squeezed')) === 1, 'the CR3 is squeezed out (within budget) at exact Light 10');
      expect((await count('.case-tray__item.is-over-budget')) === 0, 'nothing is over budget at exactly 10 / 10');
      const cap0 = await text('.cap-bar__label');
      expect(cap0 && /10\s*\/\s*10/.test(cap0) && !/\+/.test(cap0), `capacity reads 10 / 10 (got "${cap0}")`);
      // The tray shares the case's columns: an overflow mission is exactly its CR wide.
      const tray = await page.evaluate(() => {
        const grid = document.querySelector('.case-tray__grid');
        const item = document.querySelector('.case-tray__item');
        const cell = document.querySelector('.case-cell[data-cell="0"]');
        const gridR = grid?.getBoundingClientRect();
        const caseR = document.querySelector('.case-grid')?.getBoundingClientRect();
        return {
          cols: grid?.dataset.cols,
          span: item?.dataset.span,
          itemW: item?.getBoundingClientRect().width,
          itemH: item?.getBoundingClientRect().height,
          cellW: cell?.getBoundingClientRect().width,
          gap: parseFloat(getComputedStyle(grid).columnGap),
          alignedLeft: gridR && caseR ? Math.abs(gridR.left - caseR.left) : null,
          alignedRight: gridR && caseR ? Math.abs(gridR.right - caseR.right) : null,
          cellTier: Boolean(item?.querySelector('.item-card--cell')),
        };
      });
      expect(tray.cols === '6', `tray grid has the case's 6 columns (got ${tray.cols})`);
      expect(tray.span === '3', `the tray item spans its CR3 (got ${tray.span})`);
      const expectW = tray.cellW * 3 + tray.gap * 2;
      expect(Math.abs(tray.itemW - expectW) <= 1.5, `CR3 tray item is 3 cells wide (${tray.itemW?.toFixed(1)} vs ${expectW.toFixed(1)})`);
      expect(Math.round(tray.itemH) === 84, `tray item is --h-cell tall (got ${tray.itemH})`);
      expect(tray.alignedLeft <= 0.5 && tray.alignedRight <= 0.5, `tray columns line up with the case (Δleft ${tray.alignedLeft}, Δright ${tray.alignedRight})`);
      expect(tray.cellTier, 'tray item renders the cell-tier card like the case does');
      await page.hover('.case-tray__item');
      await sleep(200);
      expect((await count('.case-tray__item:hover .case-slot__strip .case-slot__btn')) === 4, 'tray item hover shows the same shift/unload/clear actions');
      await shot('tray-hover');
      await page.mouse.move(5, 5);
      // Push over budget: load the overdue CR1 so used becomes 11.
      await page.hover('.pane-inbox .overdue-section .item-card');
      await sleep(200);
      await page.click('.pane-inbox .overdue-section .item-card [aria-label="Load into today"]');
      await sleep(500);
      expect((await count('.case-tray__item.is-over-budget')) === 1, 'the extra CR1 is over budget (overflow tone)');
      expect((await count('.case-tray__item.is-squeezed')) === 1, 'the squeezed CR3 stays neutral');
      const spans = await page.$$eval('.case-tray__item', els => els.map(e => e.dataset.span).join(''));
      expect(spans === '31', `tray items span their CR, in loadout order (got ${spans})`);
      const over = await text('.case-tray__over');
      expect(over === '+1', `tray header shows +1 (got "${over}")`);
      const cap = await text('.cap-bar__label');
      expect(cap && /11\s*\/\s*10/.test(cap) && /\+1/.test(cap), `capacity reads 11 / 10 +1 (got "${cap}")`);
      expect((await count('.cap-bar__seg.is-over')) === 1, '1 overflow segment appended');
      // Overflow is energy, not alarm: nothing in the overload path uses --danger.
      const tones = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const norm = s => s.replace(/\s+/g, '').toLowerCase();
        const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`; };
        const danger = norm(hexToRgb(root.getPropertyValue('--danger').trim()));
        const overflow = norm(hexToRgb(root.getPropertyValue('--overflow').trim()));
        const color = sel => norm(getComputedStyle(document.querySelector(sel)).color);
        const bg = sel => norm(getComputedStyle(document.querySelector(sel)).backgroundColor);
        return {
          danger, overflow,
          segBg: bg('.cap-bar__seg.is-over'),
          capLabel: color('.cap-bar.is-over .cap-bar__label'),
          trayHead: color('.case-tray.is-over-budget .case-tray__head'),
          trayOver: color('.case-tray__over'),
        };
      });
      expect(tones.danger !== tones.overflow, 'the overflow token is its own colour, not an alias of danger');
      expect(tones.segBg === tones.overflow, `over-capacity segments use --overflow (got ${tones.segBg}, overflow ${tones.overflow})`);
      expect(tones.capLabel === tones.overflow && tones.trayHead === tones.overflow && tones.trayOver === tones.overflow, `capacity label and tray header read in --overflow (${tones.capLabel} / ${tones.trayHead} / ${tones.trayOver})`);
      expect(![tones.segBg, tones.capLabel, tones.trayHead, tones.trayOver].includes(tones.danger), 'no overload surface uses --danger');
      await shot();
    },
  },
  {
    name: 'desktop-case-heavy',
    run: async ({ sleep, shot, click, count, expect }) => {
      await click('.seg__btn[data-value="heavy"]');
      await sleep(300);
      expect((await count('.case-cell--locked')) === 0, 'no locked cells at Heavy');
      expect((await count('.case-item')) === 5, 'all 5 missions fit in 18 live cells');
      expect((await count('.case-tray')) === 0, 'tray is not rendered when nothing overflows');
      await shot();
    },
  },
  {
    name: 'desktop-case-actions',
    run: async ({ page, sleep, shot, click, count, expect, log }) => {
      // Medium places all five; Light (10 live) squeezes the CR3 into the tray.
      // Click equivalents of drag: shift the squeezed CR3 earlier until everything packs.
      // a b c d E → (↑ from the tray) a b c E d: E lands in row 1, d is squeezed out instead.
      await click('.seg__btn[data-value="light"]');
      await sleep(300);
      const before = await count('.case-item');
      expect(before === 4, 'Light starts with the CR3 in the tray');
      await page.hover('.case-tray__item');
      await sleep(200);
      await page.click('.case-tray__item .case-slot__btn[aria-label="Shift earlier"]');
      await sleep(400);
      expect((await count('.case-item')) === before, 'one shift swaps which mission is squeezed out');
      expect((await count('.case-item[data-index="3"][data-span="3"]')) === 1, 'the CR3 is now placed at index 3');
      expect(log.apiCalls.filter(c => c.action === 'assignToday').length >= 2, 'reorder renumbers slots via assignToday');
      // ← on the placed CR3: a b E c d → row 1 = a E E E b b, row 2 = c c d d. All five fit.
      await page.hover('.case-item[data-index="3"]');
      await sleep(200);
      await page.click('.case-item[data-index="3"] .case-slot__btn[aria-label="Shift earlier"]');
      await sleep(400);
      const after = await count('.case-item');
      expect(after === before + 1, `second shift packs all missions into the case (${before} → ${after})`);
      expect((await count('.case-tray')) === 0, 'tray disappears once everything fits');
      await page.mouse.move(5, 5);
      await shot('packed');
      // ✕ on hover unloads.
      await page.hover('.case-item[data-index="0"]');
      await sleep(200);
      await page.click('.case-item[data-index="0"] .case-slot__btn[aria-label="Unload from today"]');
      await sleep(400);
      expect(log.apiCalls.some(c => c.action === 'clearToday'), 'unload calls clearToday');
      expect((await count('.case-item')) === after - 1, 'unloaded mission leaves the case');
      await page.mouse.move(5, 5);
      await shot('unloaded');
    },
  },
  {
    name: 'desktop-case-drop',
    run: async ({ page, sleep, shot, count, expect, log }) => {
      // Drag a CR1 from the cache onto the free cell at the end of row 1 (n=5).
      // insertIndexForCell(5) = 3 → it lands before "Zone 153" and fills the gap.
      const src = await page.$('.pane-inbox .overdue-section .item-card'); // "Overdue in a quest", CR1
      const cell = await page.$('.case-cell--free[data-cell="5"]');
      expect(Boolean(src && cell), 'source card and free cell 5 exist');
      const s = await src.boundingBox();
      const c = await cell.boundingBox();
      await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
      await page.mouse.down();
      await page.mouse.move(s.x + s.width / 2 + 16, s.y + s.height / 2 + 4, { steps: 4 });
      await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 20 });
      await sleep(150);
      expect((await count('.case-cell--free[data-cell="5"].is-over')) === 1, 'hovered free cell highlights as the drop target');
      await shot('dragging');
      await page.mouse.up();
      await sleep(600);
      expect((await count('.case-item[data-cell="5"][data-span="1"][data-index="3"]')) === 1, 'dropped mission occupies cell 5 at index 3');
      expect((await count('.case-item')) === 6, 'six missions placed (the CR1 filled the gap; CR3 still fits at Medium 14)');
      expect((await count('.case-tray')) === 0, 'nothing overflows after the drop at Medium');
      const assigns = log.apiCalls.filter(c => c.action === 'assignToday');
      expect(assigns.length === 6, `insert renumbers every slot via assignToday (got ${assigns.length})`);
      const slots = assigns.map(a => `${a.body.task_id}:${a.body.today_slot}`).join(' ');
      expect(/t6:4\b/.test(slots) && /t4:5\b/.test(slots) && /t5:6\b/.test(slots), `new order is 1..6 with t6 at slot 4 (got ${slots})`);
      await shot();
    },
  },
  {
    name: 'desktop-load-picker',
    run: async ({ page, sleep, shot, clickText, count, expect, log, text }) => {
      const itemsBefore = (await count('.case-item')) + (await count('.case-tray__item'));
      await clickText('.pane-today .hud-btn', 'Load');
      expect((await count('.dialog')) === 1, 'Load from Missions opens as a dialog');
      const rows = await count('.pick-row');
      expect(rows >= 2, `picker lists John's unloaded missions (got ${rows})`);
      await page.click('.pick-row:nth-child(1)');
      await page.click('.pick-row:nth-child(2)');
      await sleep(150);
      expect((await count('.pick-row.is-checked')) === 2, 'two rows checked');
      const total = await text('.pick-total');
      expect(total && /^\+\d+ CR/.test(total), `running total shows +N CR (got "${total}")`);
      await shot('picker');
      await clickText('.dialog__foot .btn--primary', 'Load');
      await sleep(900);
      const assigns = log.apiCalls.filter(c => c.action === 'assignToday');
      expect(assigns.length === 2, `confirm assigns each selected mission (got ${assigns.length})`);
      const slots = assigns.map(c => c.body.today_slot).join(',');
      expect(slots === '6,7', `new missions take the next slots in order (got ${slots})`);
      expect((await count('.dialog')) === 0, 'picker closes after loading');
      const itemsAfter = (await count('.case-item')) + (await count('.case-tray__item'));
      expect(itemsAfter === itemsBefore + 2, `case gains two missions (${itemsBefore} → ${itemsAfter})`);
      await shot();
    },
  },
  {
    name: 'desktop-case-list-toggle',
    run: async ({ page, sleep, shot, click, count, expect }) => {
      await click('.pane-today .seg__btn[data-value="list"]');
      expect((await count('.pane-today .loadout-list')) === 1, 'List format shows the ordered list');
      expect((await count('.case-grid')) === 0, 'Case grid is gone in List format');
      expect((await count('.pane-today .loadout-row')) === 5, 'list shows all 5 loaded missions');
      const stored = await page.evaluate(() => localStorage.getItem('firebrain_loadout_format'));
      expect(stored === 'list', `format persisted to localStorage (got ${stored})`);
      await shot('list');
      await click('.pane-today .seg__btn[data-value="case"]');
      expect((await count('.case-grid')) === 1, 'switching back restores the Case');
      await sleep(100);
    },
  },
  {
    name: 'phone-case',
    viewport: 'phone',
    run: async ({ shot, clickText, count, expect }) => {
      await clickText('.mobile-tab', 'Loadout');
      expect((await count('.case-grid[data-cols="3"][data-rows="6"]')) === 1, 'handheld case is 3×6');
      expect((await count('.case-cell')) === 18, '18 cells on the phone too');
      expect((await count('.case-cell--locked')) === 4, '4 locked at Medium');
      expect((await count('.case-slot__menu')) >= 1, 'touch gets a ⋯ menu per item (click path for every drag action)');
      await shot();
    },
  },

  // ---- Teaching tooltips ----------------------------------------------------
  // Every control teaches itself on hover: one sentence, what it does + how to
  // use it. Exactly one tooltip at a time; icon-only buttons are always labelled.
  {
    name: 'desktop-teaching-tooltips',
    run: async ({ page, sleep, shot, count, expect }) => {
      const targets = [
        ['Who segment', '.pane-inbox .seg__btn[data-value="john"]'],
        ['View segment', '.pane-inbox .seg__btn[data-value="matrix"]'],
        ['Energy segment', '.pane-today .seg__btn[data-value="medium"]'],
        ['Case/List toggle', '.pane-today .seg__btn[data-value="list"]'],
        ['Load button', '.pane-today .hud-bar .hud-btn'],
        ['quest chevron', '.quest-entry__chevron'],
        ['operator menu trigger', '.operator-menu-trigger'],
      ];
      for (const [label, selector] of targets) {
        await page.hover(selector);
        await sleep(600);
        const tips = await count('.tooltip');
        expect(tips === 1, `${label}: exactly one tooltip while hovered (got ${tips})`);
        const text = (await page.$$eval('.tooltip', els => els.map(e => e.textContent.trim()).join(' | '))) || '';
        expect(text.length > 0, `${label}: tooltip text is non-empty`);
        expect(text.length <= 140, `${label}: tooltip is one sentence, ≤ 140 chars (got ${text.length}: "${text}")`);
        if (label === 'Energy segment') await shot('energy');
        await page.mouse.move(5, 5);
        await sleep(150);
        expect((await count('.tooltip')) === 0, `${label}: tooltip dismissed after pointer leaves`);
      }
      // Tooltips are hidden on touch, so meaning can never live in them alone:
      // every icon-only button carries an aria-label or title.
      const offenders = await page.evaluate(() => (
        [...document.querySelectorAll('button:not([aria-label]):not([title])')]
          .filter(b => !b.textContent.trim())
          .map(b => `button.${[...b.classList].slice(0, 2).join('.')}`)
      ));
      expect(offenders.length === 0, `icon-only buttons without aria-label/title: ${offenders.join(', ')}`);
      // The one first-use teaching surface: the own-loadout empty state explains
      // the loop. Empty the loadout through the List format's hover ✕ (click path).
      await page.click('.pane-today .seg__btn[data-value="list"]');
      await sleep(200);
      for (let i = 0; i < 8; i++) {
        const row = await page.$('.pane-today .loadout-row .item-card');
        if (!row) break;
        await row.hover();
        await sleep(150);
        const unload = await row.$('.item-card__hover-actions [aria-label="Unload from today"]');
        if (!unload) break;
        await unload.click();
        await sleep(350);
      }
      await page.mouse.move(5, 5);
      await sleep(150);
      expect((await count('.pane-today .loadout-row')) === 0, 'own loadout emptied via the ✕ click path');
      await page.click('.pane-today .seg__btn[data-value="case"]');
      await page.mouse.move(5, 5);
      await sleep(200);
      const hint = await page.$eval('.pane-today .empty-state__hint', el => el.textContent).catch(() => '');
      expect(/Load missions from the cache/.test(hint) && /Energy sets how many cells are live/.test(hint) && /Accomplished Today/.test(hint), `empty loadout teaches the loop (got "${hint}")`);
      await shot('empty-loadout');
    },
  },

  // ---- Quests: loaded missions stay visible; every count agrees ------------
  // q1 "Ship the chassis" has two open missions — "Write spec for the Case grid"
  // (loaded, slot 1) and "Overdue in a quest" — plus one cleared, so progress
  // reads 1/3. Completing the unloaded one leaves a quest whose only open
  // mission is loaded: the pane, the Quest dialog and the Complete-quest dialog
  // must all still show / count that mission (utils/questMissions.ts).
  {
    name: 'desktop-quest-loaded-mission',
    run: async ({ page, sleep, shot, count, expect, text, clickText }) => {
      const q1 = '.quests-section[aria-label="Tracked quests"] .quest-block:nth-child(1)';
      expect((await count(`${q1} .quest-block__row`)) === 2, 'quest block lists both open missions, the loaded one included');
      expect((await count(`${q1} .quest-block__row.is-loaded .stat-chip--accent`)) === 1, 'the loaded mission carries a Loaded chip');
      expect((await count(`${q1} .quest-block__row.is-loaded.is-deemphasized`)) === 1, 'the loaded mission is muted');
      expect((await count(`${q1} .quest-block__row.is-loaded .item-card.is-draggable`)) === 0, 'a loaded mission is not a drag source (it is already placed)');
      expect((await count(`${q1} .quest-block__row:not(.is-loaded) .item-card.is-draggable`)) === 1, 'the unloaded mission still drags');
      let progress = await text(`${q1} .quest-entry__progress .num`);
      expect(progress === '1/3', `progress counts every open mission (got "${progress}")`);
      await shot('both');

      // Complete the unloaded mission via the hover ✓ (the "Complete" verb).
      const row = await page.$(`${q1} .quest-block__row:not(.is-loaded) .item-card`);
      await row.hover();
      await sleep(200);
      const done = await row.$('.item-card__done[aria-label="Mark complete"]');
      expect(Boolean(done), 'the hover check is labelled "Mark complete"');
      await done.click();
      await sleep(500);
      await page.mouse.move(5, 5);
      expect((await count(`${q1} .quest-block__row`)) === 1, 'the quest still lists its (loaded) open mission');
      expect((await count(`${q1} .quest-block__empty`)) === 0, 'no "No open missions" while an open mission is loaded');
      progress = await text(`${q1} .quest-entry__progress .num`);
      expect(progress === '2/3', `progress agrees with the list (got "${progress}")`);
      await shot('only-loaded');

      // The Quest dialog shows and counts the same mission.
      await page.click(`${q1} .quest-entry__title`);
      await sleep(300);
      expect((await count('.dialog')) === 1, 'quest dialog opens');
      const dialogCount = await text('.dialog .dialog-section .section-header .num');
      expect(dialogCount === '1', `dialog Missions count is 1 (got "${dialogCount}")`);
      expect((await count('.dialog .quest-block__row.is-loaded .stat-chip--accent')) === 1, 'dialog lists the loaded mission with its Loaded chip');
      expect((await count('.dialog .quest-block__empty')) === 0, 'dialog has no empty-state while a mission is loaded');
      await shot('dialog');

      // Complete quest → the confirm dialog agrees: 1 open mission.
      await clickText('.dialog__foot .btn--danger', 'Complete quest');
      await sleep(300);
      expect((await count('.dialog')) === 1, 'confirm dialog replaces the quest dialog');
      const title = await text('.dialog .dialog__title');
      expect(/Complete quest/i.test(title || ''), `confirm dialog is titled "Complete quest" (got "${title}")`);
      const copy = await text('.dialog .dialog-copy');
      expect(/has 1 open mission\./.test(copy || '') && /What should happen to it\?/.test(copy || ''), `copy names the one open mission (got "${copy}")`);
      const cascade = await text('.dialog__foot .btn--danger[data-mode="cascade_done"]');
      const detach = await text('.dialog__foot .btn--primary[data-mode="detach_open"]');
      expect(cascade === 'Complete missions too', `cascade button reads "Complete missions too" (got "${cascade}")`);
      expect(detach === 'Keep missions — move to Cache', `detach button reads "Keep missions — move to Cache" (got "${detach}")`);
      await shot('complete');
      await clickText('.dialog__foot .btn--secondary', 'Cancel');
      await sleep(200);
      expect((await count('.dialog')) === 0, 'Cancel closes the confirm dialog without completing');
    },
  },

  // ---- Vocabulary: Complete (verb) · Cleared (state) · Delete (erase) --------
  {
    name: 'desktop-vocabulary-complete',
    run: async ({ page, sleep, shot, click, count, expect, text }) => {
      await page.hover('.pane-inbox .item-card');
      await sleep(200);
      expect((await count('.pane-inbox .item-card:hover [aria-label="Mark complete"]')) === 1, 'mission hover check says "Mark complete"');
      await page.hover('.case-item[data-span="2"]');
      await sleep(200);
      expect((await count('.case-item:hover .case-slot__strip [aria-label="Mark complete"]')) === 1, 'case hover check says "Mark complete"');
      await page.mouse.move(5, 5);
      expect((await count('[aria-label="Mark cleared"], [title="Mark cleared"]')) === 0, 'no control still uses "Clear" as the finishing verb');
      // "Cleared" survives only as the state: the Missions toggle and the done cards.
      const toggle = await page.$$eval('.pane-inbox .hud-btn', els => els.map(e => e.textContent.trim()));
      expect(toggle.includes('Cleared'), `Missions pane keeps its "Cleared" state toggle (got ${JSON.stringify(toggle)})`);
      const doneLabel = await text('.accomplished__list .item-card__completed');
      expect(/^Cleared /.test(doneLabel || ''), `done cards read "Cleared <date>" (got "${doneLabel}")`);
      // "Delete" is the only erasing verb; it lives in the ⋯ menu.
      await page.hover('.pane-inbox .item-card');
      await sleep(150);
      await page.click('.pane-inbox .item-card:hover .item-card__hover-actions [aria-label="More actions"]');
      await sleep(200);
      const items = await page.$$eval('.action-menu__item', els => els.map(e => e.textContent.trim()));
      expect(items.some(t => /^Delete mission$/.test(t)), `⋯ menu offers "Delete mission" (got ${JSON.stringify(items)})`);
      expect(!items.some(t => /\bclear\b/i.test(t)), `⋯ menu never says "Clear" (got ${JSON.stringify(items)})`);
      await shot('menu');
      await page.keyboard.press('Escape');
      await sleep(150);
      // Matrix: empty cells say "Empty", not "Clear".
      await click('.seg__btn[data-value="matrix"]');
      const empties = await page.$$eval('.matrix__empty', els => [...new Set(els.map(e => e.textContent.trim()))]);
      expect(empties.length === 0 || (empties.length === 1 && empties[0] === 'Empty'), `matrix empty cells read "Empty" (got ${JSON.stringify(empties)})`);
      await click('.seg__btn[data-value="list"]');
    },
  },

  // ---- Density pass (Oct 2026): defaults loosened, Loadout is the primary pane ----
  // Root 16px × --ui-scale; --t-* one step up; --h-cell 84; Loadout pane
  // clamp(480px, 40vw, 640px) = 576px at 1440 → 87px cells, so CR1 cells carry
  // title + P + CR pips. The pane is drag-resizable (firebrain_today_panel_width).
  {
    name: 'desktop-density',
    run: async ({ page, shot, count, expect }) => {
      const m = await page.evaluate(() => {
        const rect = sel => document.querySelector(sel)?.getBoundingClientRect();
        const root = getComputedStyle(document.documentElement);
        const cells = [...document.querySelectorAll('.case-cell')].map(c => c.getBoundingClientRect());
        const cr1 = document.querySelector('.case-item[data-span="1"]');
        const cap = rect('.pane-today .cap-bar');
        const energy = rect('.pane-today .loadout-hud .seg');
        return {
          rootFont: root.fontSize,
          uiScale: root.getPropertyValue('--ui-scale').trim(),
          hCell: parseFloat(root.getPropertyValue('--h-cell')),
          hRow: parseFloat(root.getPropertyValue('--h-row')),
          hChip: parseFloat(root.getPropertyValue('--h-chip')),
          today: rect('.pane-today')?.width,
          quests: rect('.pane-quests')?.width,
          inbox: rect('.pane-inbox')?.width,
          cellMinW: Math.min(...cells.map(c => c.width)),
          cellMaxW: Math.max(...cells.map(c => c.width)),
          cellMinH: Math.min(...cells.map(c => c.height)),
          cellMaxH: Math.max(...cells.map(c => c.height)),
          cr1Tight: cr1 ? cr1.classList.contains('case-slot--tight') : null,
          cr1Pips: cr1 ? cr1.querySelectorAll('.cr-pip.is-on').length : null,
          cr1Priority: cr1 ? cr1.querySelectorAll('.stat-chip--p1, .stat-chip--p2, .stat-chip--p3').length : null,
          capTop: cap ? Math.round(cap.top + cap.height / 2) : null,
          energyTop: energy ? Math.round(energy.top + energy.height / 2) : null,
          hudRows: (() => { const h = rect('.pane-today .loadout-hud'); return h ? h.height : null; })(),
          headerRows: (() => { const h = rect('.pane-today .hud-bar'); return h ? h.height : null; })(),
          rowCard: rect('.pane-inbox .item-card')?.height,
          // Any chip whose box pokes outside its stat row (clipped by overflow: hidden)?
          clipped: [...document.querySelectorAll('.case-item .item-card__stats')].flatMap(row => {
            const r = row.getBoundingClientRect();
            return [...row.children].filter(ch => {
              const cs = getComputedStyle(ch);
              if (cs.display === 'none') return false;
              const b = ch.getBoundingClientRect();
              return b.right > r.right + 0.5;
            }).map(ch => `${ch.className.split(' ').slice(0, 2).join('.')} in "${row.closest('.case-item')?.querySelector('.item-card__title')?.textContent.trim().slice(0, 18)}"`);
          }),
        };
      });
      expect(m.rootFont === '16px', `root font-size is 16px at ui-scale ${m.uiScale} (got ${m.rootFont})`);
      expect(m.hCell === 84 && m.hRow === 48 && m.hChip === 20, `heights re-tuned: --h-cell 84 / --h-row 48 / --h-chip 20 (got ${m.hCell}/${m.hRow}/${m.hChip})`);
      expect(m.today > m.quests && m.today > m.inbox, `Loadout is the widest pane at 1440 (today ${Math.round(m.today)}, quests ${Math.round(m.quests)}, missions ${Math.round(m.inbox)})`);
      expect(m.today >= 560 && m.today <= 592, `Loadout pane is clamp(480px, 40vw, 640px) ≈ 576 at 1440 (got ${Math.round(m.today)})`);
      expect(m.cellMinW >= 80, `every case cell is ≥ 80px wide (min ${m.cellMinW.toFixed(1)}, max ${m.cellMaxW.toFixed(1)})`);
      expect(Math.round(m.cellMinH) === 84 && Math.round(m.cellMaxH) === 84, `every case cell is --h-cell (84) tall (got ${m.cellMinH}–${m.cellMaxH})`);
      expect(m.cr1Tight === false, 'the CR1 case item is not tight at the default width');
      expect(m.cr1Pips === 1 && m.cr1Priority === 1, `CR1 cell shows its P chip and CR pips (pips on: ${m.cr1Pips}, P chips: ${m.cr1Priority})`);
      expect(m.capTop !== null && m.energyTop !== null && Math.abs(m.capTop - m.energyTop) <= 3, `capacity bar and Energy control share one HUD row (centres ${m.capTop} vs ${m.energyTop})`);
      expect(m.hudRows !== null && m.hudRows <= 56, `loadout HUD is a single row (height ${m.hudRows})`);
      expect(m.headerRows !== null && m.headerRows <= 56, `Loadout header is a single row at 1440 (height ${m.headerRows})`);
      expect(Math.round(m.rowCard) === 48, `row-tier ItemCard is --h-row 48 (got ${m.rowCard})`);
      expect(m.clipped.length === 0, `no stat chip is clipped inside a case cell: ${m.clipped.join('; ')}`);
      expect((await count('.pane-today .pane-resizer')) === 1, 'Loadout pane has a resize grip');
      const file = await shot();
      // 1:1 crop of the Loadout pane so cell detail is reviewable without downscaling.
      const pane = await page.$eval('.pane-today', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 420) }; });
      await page.screenshot({ path: file.replace(/\.png$/, '-loadout.png'), clip: pane });
    },
  },
  {
    name: 'desktop-loadout-resize',
    run: async ({ page, sleep, shot, expect }) => {
      const before = await page.$eval('.pane-today', el => el.getBoundingClientRect().width);
      const stored0 = await page.evaluate(() => localStorage.getItem('firebrain_today_panel_width'));
      expect(stored0 === null, `no width stored until the user drags (got ${stored0})`);
      const grip = await page.$('.pane-today .pane-resizer');
      expect(Boolean(grip), 'resize grip exists');
      const g = await grip.boundingBox();
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await page.mouse.down();
      await page.mouse.move(g.x + g.width / 2 + 60, g.y + g.height / 2, { steps: 6 });
      await page.mouse.move(g.x + g.width / 2 + 120, g.y + g.height / 2, { steps: 6 });
      await sleep(100);
      await shot('dragging');
      await page.mouse.up();
      await sleep(200);
      const after = await page.$eval('.pane-today', el => el.getBoundingClientRect().width);
      expect(Math.abs(after - (before + 120)) <= 2, `pane grew by the drag distance (${Math.round(before)} → ${Math.round(after)})`);
      const stored = await page.evaluate(() => localStorage.getItem('firebrain_today_panel_width'));
      expect(stored !== null && Math.abs(Number(stored) - after) <= 1, `width persisted under firebrain_today_panel_width (got ${stored})`);
      const cols = await page.$eval('.case-grid', el => el.dataset.cols);
      expect(cols === '6', `case stays 6 wide when the pane grows (got ${cols})`);
      await shot('wider');
      // Shrink well below the minimum: the width clamps and the Case falls back.
      const g2 = await (await page.$('.pane-today .pane-resizer')).boundingBox();
      await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2);
      await page.mouse.down();
      await page.mouse.move(g2.x + g2.width / 2 - 600, g2.y + g2.height / 2, { steps: 12 });
      await page.mouse.up();
      await sleep(200);
      const minW = await page.$eval('.pane-today', el => el.getBoundingClientRect().width);
      expect(Math.round(minW) === 400, `pane width clamps at the 400px minimum (got ${Math.round(minW)})`);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('.case-item .item-card__stats')].flatMap(row => {
        const r = row.getBoundingClientRect();
        return [...row.children].filter(ch => getComputedStyle(ch).display !== 'none' && ch.getBoundingClientRect().right > r.right + 0.5)
          .map(ch => ch.className.split(' ').slice(0, 2).join('.'));
      }));
      expect(clipped.length === 0, `shrunk cells drop chips instead of clipping them: ${clipped.join('; ')}`);
      await shot('narrowest');
      // Reload: the stored width survives.
      await page.evaluate(() => localStorage.setItem('firebrain_today_panel_width', '700'));
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.app', { timeout: 10000 });
      await sleep(300);
      const reloaded = await page.$eval('.pane-today', el => el.getBoundingClientRect().width);
      expect(Math.round(reloaded) === 700, `stored width survives a reload (got ${Math.round(reloaded)})`);
      await shot('reloaded');
    },
  },
  {
    name: 'laptop-case',
    viewport: 'laptop',
    run: async ({ page, shot, count, expect }) => {
      const m = await page.evaluate(() => {
        const rect = sel => document.querySelector(sel)?.getBoundingClientRect();
        const cells = [...document.querySelectorAll('.case-cell')].map(c => c.getBoundingClientRect().width);
        return {
          today: rect('.pane-today')?.width,
          quests: rect('.pane-quests')?.width,
          inbox: rect('.pane-inbox')?.width,
          cellMinW: Math.min(...cells),
          cols: document.querySelector('.case-grid')?.dataset.cols,
          resizerShown: [...document.querySelectorAll('.pane-resizer')].some(el => getComputedStyle(el).display !== 'none'),
          clipped: [...document.querySelectorAll('.case-item .item-card__stats')].flatMap(row => {
            const r = row.getBoundingClientRect();
            return [...row.children].filter(ch => getComputedStyle(ch).display !== 'none' && ch.getBoundingClientRect().right > r.right + 0.5)
              .map(ch => ch.className.split(' ').slice(0, 2).join('.'));
          }),
        };
      });
      expect(Math.round(m.today) === 340, `Loadout pane is 340px at ≤ 1100 (got ${Math.round(m.today)})`);
      expect(m.cols === '3', `laptop Loadout falls back to the 3-wide case (got ${m.cols})`);
      expect(m.cellMinW >= 90, `3×6 cells are legible (min ${m.cellMinW.toFixed(1)}px)`);
      expect(m.inbox >= 280 && m.quests >= 280, `Quests / Missions aren't starved (quests ${Math.round(m.quests)}, missions ${Math.round(m.inbox)})`);
      expect(!m.resizerShown, 'pane resizers are hidden at laptop width');
      expect(m.clipped.length === 0, `no stat chip is clipped inside a case cell: ${m.clipped.join('; ')}`);
      expect((await count('.case-item')) >= 3, 'case items render');
      await shot();
    },
  },

  // ---- Briefing (once-a-day morning check-in) --------------------------------
  // The harness seeds firebrain_briefing_seen so other scenarios stay unblocked.
  // Clear that key and reload to simulate a first visit today (empty store).
  {
    name: 'desktop-briefing',
    run: async ({ page, api, log, sleep, shot, click, count, expect }) => {
      await page.evaluate(() => localStorage.removeItem('firebrain_briefing_seen'));
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.briefing-dialog', { timeout: 10000 });
      await sleep(400);
      expect((await count('.briefing-dialog')) === 1, 'briefing opens on load when unseen today');
      expect((await count('.briefing-leftover')) === 1, 'one leftover from yesterday');
      const leftoverTitle = await page.$eval('.briefing-leftover .pick-row__title', el => el.textContent.trim());
      expect(leftoverTitle === 'Harassment prevention training', `leftover is Harassment prevention training (got "${leftoverTitle}")`);
      expect((await count('.briefing-suggest .pick-row')) >= 2, 'suggested load lists at least two missions');
      await shot('open');

      await click('.briefing-leftover__return');
      await sleep(300);
      expect(log.apiCalls.some(c => c.action === 'clearToday'), 'Back to Cache calls clearToday');
      const leftoverId = api.state.tasks.find(t => t.title === 'Harassment prevention training')?.task_id;
      expect(log.apiCalls.some(c => c.action === 'clearToday' && c.body.task_id === leftoverId), 'clearToday targets the leftover');
      expect((await count('.briefing-leftover')) === 0, 'returned leftover leaves the leftovers list');

      const boxes = await page.$$('.briefing-suggest .pick-row__input');
      expect(boxes.length >= 2, 'two suggestions to check');
      await boxes[0].click();
      await boxes[1].click();
      await sleep(150);
      const assignsBefore = log.apiCalls.filter(c => c.action === 'assignToday').length;
      await click('.briefing-dialog .btn--primary');
      await sleep(500);
      const assigns = log.apiCalls.filter(c => c.action === 'assignToday');
      expect(assigns.length === assignsBefore + 2, `Start the day assigns 2 missions (got ${assigns.length - assignsBefore})`);
      expect((await count('.briefing-dialog')) === 0, 'Start the day closes the briefing');
      expect((await count('.pane-today .case-item')) === 6, 'Case is 4 kept + 2 newly loaded');
      await shot('started');

      const seen = await page.evaluate(() => localStorage.getItem('firebrain_briefing_seen'));
      const today = await page.evaluate(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });
      expect(seen === today, `closing writes firebrain_briefing_seen = today (got "${seen}")`);
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.app', { timeout: 10000 });
      await sleep(400);
      expect((await count('.briefing-dialog')) === 0, 'briefing does not reopen after being seen today');
    },
  },
  {
    name: 'phone-briefing',
    viewport: 'phone',
    run: async ({ page, sleep, shot, count, expect }) => {
      await page.evaluate(() => localStorage.removeItem('firebrain_briefing_seen'));
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.briefing-dialog', { timeout: 10000 });
      await sleep(400);
      expect((await count('.briefing-dialog')) === 1, 'briefing opens as a sheet on phone');
      await shot();
    },
  },
];
