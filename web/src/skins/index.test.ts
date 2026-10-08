import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKIN_LIST, DEFAULT_SKIN, isSkinId, getSkinMeta } from './index';

const here = path.dirname(fileURLToPath(import.meta.url));
const HEX = /^#[0-9a-f]{6}$/i;

describe('SKIN_LIST', () => {
  it('has unique ids and includes the default', () => {
    const ids = SKIN_LIST.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_SKIN);
    expect(ids).toContain('graphite');
    expect(ids).toContain('scifi');
  });

  it('has a name, blurb, motion profile and valid hex preview colours on every entry', () => {
    for (const skin of SKIN_LIST) {
      expect(skin.name.trim().length).toBeGreaterThan(0);
      expect(skin.blurb.trim().length).toBeGreaterThan(0);
      expect(['snappy', 'soft', 'heavy']).toContain(skin.motion);
      for (const [key, value] of Object.entries(skin.preview)) {
        expect(value, `${skin.id}.preview.${key}`).toMatch(HEX);
      }
    }
  });

  it('ships a stylesheet per skin and lists each one in skins.css', () => {
    const bundle = fs.readFileSync(path.join(here, 'skins.css'), 'utf8');
    for (const skin of SKIN_LIST) {
      expect(fs.existsSync(path.join(here, `${skin.id}.css`)), `${skin.id}.css exists`).toBe(true);
      expect(bundle).toContain(`@import './${skin.id}.css';`);
    }
  });

  it('exposes isSkinId / getSkinMeta helpers', () => {
    expect(isSkinId('scifi')).toBe(true);
    expect(isSkinId('default')).toBe(false);
    expect(isSkinId(null)).toBe(false);
    expect(getSkinMeta('scifi').motion).toBe('snappy');
  });
});

describe('scifi.css honours the skin contract (brief §7)', () => {
  const css = fs.readFileSync(path.join(here, 'scifi.css'), 'utf8');

  /** Strip comments, then collect the selector text of every top-level rule block. */
  function topLevelSelectors(source: string): string[] {
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors: string[] = [];
    let depth = 0;
    let buf = '';
    for (const ch of stripped) {
      if (ch === '{') {
        if (depth === 0) selectors.push(buf.trim());
        depth++;
        buf = '';
      } else if (ch === '}') {
        depth--;
        buf = '';
      } else if (depth === 0) {
        buf += ch;
      }
    }
    return selectors.filter(Boolean);
  }

  it('scopes every rule under html[data-skin="scifi"] (or an @media / @keyframes block)', () => {
    const selectors = topLevelSelectors(css);
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) {
      if (sel.startsWith('@media') || sel.startsWith('@keyframes')) continue;
      // Every comma-separated selector in the list must carry the scope prefix.
      for (const part of sel.split(',')) {
        expect(part.trim(), `unscoped selector: "${part.trim()}"`).toMatch(/^html\[data-skin="scifi"\]/);
      }
    }
  });

  it('never changes font sizes or introduces italics', () => {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(/font-size\s*:/);
    expect(stripped).not.toMatch(/--t-(2xs|xs|sm|md|lg|xl)\s*:/);
    expect(stripped).not.toMatch(/font-style\s*:\s*italic/);
  });

  it('keeps motion within the 200ms chassis cap', () => {
    const durations = [...css.matchAll(/--dur-\w+\s*:\s*([\d.]+)(m?s)/g)].map(m => (
      m[2] === 'ms' ? Number(m[1]) : Number(m[1]) * 1000
    ));
    expect(durations.length).toBeGreaterThan(0);
    for (const ms of durations) expect(ms).toBeLessThanOrEqual(200);
  });

  it('declares color-scheme: dark', () => {
    expect(css).toMatch(/color-scheme\s*:\s*dark/);
  });
});
