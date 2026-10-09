#!/usr/bin/env node
// Fire Brain smoke harness.
//
//   npm run smoke                 # all scenarios, screenshots in test/smoke/out/
//   npm run smoke -- desktop case # only scenarios whose name contains a filter
//   FB_BROWSER="C:/path/chrome.exe" npm run smoke
//
// Starts Vite on a spare port, opens a headless Chromium (Edge/Chrome found on
// the machine), intercepts every call to the Apps Script host and answers from
// test/smoke/mockApi.mjs. Nothing here can reach the live Sheet.
//
// Each scenario gets a page already "logged in" as John with mock data, takes
// screenshots, and may assert. After every scenario the harness checks the
// chassis invariants from docs/CHASSIS_BRIEF.md §5:
//   - the shell is pinned (no document scroll)
//   - no console errors / page errors
//   - no italic text
//   - every visible control has a hit area >= 32px (44px on coarse pointers)
//     unless it opts out with data-hit-exempt
import puppeteer from 'puppeteer-core';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockApi } from './mockApi.mjs';
import { scenarios } from './scenarios.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../..');
const outDir = path.join(here, 'out');
const PORT = Number(process.env.FB_SMOKE_PORT || 3777);
const filters = process.argv.slice(2).filter(a => !a.startsWith('-'));

// ---- env -------------------------------------------------------------------
const envFile = path.join(webRoot, '.env');
if (!fs.existsSync(envFile)) {
  console.error('web/.env is required (see env.example.txt). The API URL is only used as an intercept pattern.');
  process.exit(2);
}
for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.trim().match(/^(VITE_\w+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const API_HOST = new URL(process.env.VITE_API_BASE_URL).host;

// ---- browser ---------------------------------------------------------------
function findBrowser() {
  const candidates = [
    process.env.FB_BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    console.error('No Chromium found. Set FB_BROWSER to a Chrome/Edge executable.');
    process.exit(2);
  }
  return found;
}

// ---- vite ------------------------------------------------------------------
async function portInUse(port) {
  try { await fetch(`http://localhost:${port}/`); return true; } catch { return false; }
}

function startVite() {
  return new Promise((resolve, reject) => {
    // Run vite's JS entry directly with the current node, so there is no
    // npx/cmd wrapper between us and the server process (makes kill reliable).
    const viteBin = path.join(webRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    const child = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort', '--logLevel', 'warn'], {
      cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const t = setTimeout(() => reject(new Error('vite did not start in 20s')), 20000);
    const poll = async () => {
      try {
        const r = await fetch(`http://localhost:${PORT}/`);
        if (r.ok) { clearTimeout(t); resolve(child); return; }
      } catch {}
      setTimeout(poll, 250);
    };
    child.stderr.on('data', d => process.stderr.write(d));
    child.on('exit', code => { clearTimeout(t); reject(new Error(`vite exited (${code})`)); });
    poll();
  });
}

// ---- page factory ----------------------------------------------------------
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1024, height: 768 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function openPage(browser, viewport, api, log) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on('console', m => { if (m.type() === 'error') log.consoleErrors.push(m.text()); });
  page.on('pageerror', e => log.consoleErrors.push(`pageerror: ${e.message}`));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = new URL(req.url());
    if (u.host !== API_HOST) { req.continue(); return; }
    const action = u.searchParams.get('action');
    let body = Object.fromEntries(u.searchParams.entries());
    if (req.postData()) { try { body = { ...body, ...JSON.parse(req.postData()) }; } catch {} }
    log.apiCalls.push({ action, body });
    const user = process.env.VITE_JOHN_EMAIL;
    const payload = api.respond(action, body, user);
    req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(payload) });
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(email => {
    localStorage.clear();
    localStorage.setItem('firebrain_session_token', 'mock-token');
    localStorage.setItem('firebrain_user_email', email);
    // Seed seen-today so existing scenarios are not blocked by the once-a-day
    // Briefing. desktop-briefing / phone-briefing clear this key and reload.
    // A truly empty store (no firebrain_briefing_seen) opens the briefing on load.
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    localStorage.setItem('firebrain_briefing_seen', `${y}-${m}-${day}`);
  }, process.env.VITE_JOHN_EMAIL);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.app', { timeout: 10000 });
  await sleep(400);
  return page;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- invariants ------------------------------------------------------------
async function checkInvariants(page, coarse) {
  return page.evaluate((coarse) => {
    const min = coarse ? 44 : 32;
    const problems = [];
    const doc = document.documentElement;
    if (doc.scrollHeight > window.innerHeight + 1 || doc.scrollWidth > window.innerWidth + 1) {
      problems.push(`document scrolls (${doc.scrollWidth}x${doc.scrollHeight} vs ${window.innerWidth}x${window.innerHeight})`);
    }
    const italics = [...document.querySelectorAll('body *')].filter(el => el.children.length === 0 && el.textContent.trim() && getComputedStyle(el).fontStyle === 'italic');
    if (italics.length) problems.push(`${italics.length} italic text node(s), e.g. "${italics[0].textContent.trim().slice(0, 30)}"`);
    const tiny = [];
    document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="menuitem"], [role="tab"]').forEach(el => {
      if (el.hasAttribute('data-hit-exempt') || el.closest('[data-hit-exempt]')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') return;
      // Account for ::after hit expansion (.hit, .seg__btn, or any absolutely positioned ::after with negative insets).
      const after = getComputedStyle(el, '::after');
      let w = r.width, h = r.height;
      if (after.content !== 'none' && after.position === 'absolute') {
        const top = parseFloat(after.top) || 0, bottom = parseFloat(after.bottom) || 0;
        const left = parseFloat(after.left) || 0, right = parseFloat(after.right) || 0;
        h = r.height - top - bottom; w = r.width - left - right;
      }
      if (h < min - 0.5 || w < min - 0.5) tiny.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')} ${Math.round(w)}x${Math.round(h)}`);
    });
    if (tiny.length) problems.push(`${tiny.length} control(s) under ${min}px: ${tiny.slice(0, 6).join(', ')}${tiny.length > 6 ? ', …' : ''}`);
    return problems;
  }, coarse);
}

// ---- main ------------------------------------------------------------------
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

if (await portInUse(PORT)) {
  console.error(`Port ${PORT} is already in use (a stale dev server?). Stop it or set FB_SMOKE_PORT.`);
  process.exit(2);
}
const vite = await startVite();
const stopVite = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' });
  else vite.kill('SIGTERM');
};
process.on('SIGINT', () => { stopVite(); process.exit(130); });
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--no-sandbox', '--disable-gpu'] });

let failed = 0;
const selected = scenarios.filter(s => filters.length === 0 || filters.some(f => s.name.includes(f)));
console.log(`Running ${selected.length} scenario(s) against http://localhost:${PORT}\n`);

for (const scenario of selected) {
  const log = { consoleErrors: [], apiCalls: [] };
  const api = createMockApi();
  const viewport = VIEWPORTS[scenario.viewport || 'desktop'];
  const t0 = Date.now();
  const failures = [];
  let page;
  try {
    page = await openPage(browser, viewport, api, log);
    let shotIndex = 0;
    const ctx = {
      page, api, log, sleep,
      shot: async (label) => {
        const file = path.join(outDir, `${scenario.name}${label ? `-${label}` : ''}.png`);
        shotIndex++;
        await page.screenshot({ path: file });
        return file;
      },
      expect: (cond, msg) => { if (!cond) failures.push(msg); },
      click: async (selector) => { await page.waitForSelector(selector, { visible: true, timeout: 5000 }); await page.click(selector); await sleep(250); },
      clickText: async (selector, text) => {
        const ok = await page.evaluate((sel, txt) => {
          const el = [...document.querySelectorAll(sel)].find(e => e.textContent.trim().includes(txt));
          if (el) { el.click(); return true; }
          return false;
        }, selector, text);
        if (!ok) failures.push(`clickText: no "${selector}" containing "${text}"`);
        await sleep(250);
      },
      count: (selector) => page.$$eval(selector, els => els.length),
      text: (selector) => page.$eval(selector, el => el.textContent.trim()).catch(() => null),
    };
    await scenario.run(ctx);
    const inv = await checkInvariants(page, Boolean(viewport.hasTouch));
    failures.push(...inv);
    if (!scenario.allowConsoleErrors && log.consoleErrors.length) failures.push(`console errors: ${log.consoleErrors.slice(0, 3).join(' | ')}`);
  } catch (err) {
    failures.push(`threw: ${err.message}`);
    if (page) await page.screenshot({ path: path.join(outDir, `${scenario.name}-ERROR.png`) }).catch(() => {});
  } finally {
    if (page) await page.close().catch(() => {});
  }
  const ms = Date.now() - t0;
  if (failures.length) {
    failed++;
    console.log(`✗ ${scenario.name} (${ms}ms)`);
    for (const f of failures) console.log(`    - ${f}`);
  } else {
    console.log(`✓ ${scenario.name} (${ms}ms)`);
  }
}

await browser.close();
stopVite();

console.log(`\n${selected.length - failed}/${selected.length} passed. Screenshots: ${path.relative(process.cwd(), outDir)}`);
process.exit(failed ? 1 : 0);
