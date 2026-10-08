import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SKIN_LIST, DEFAULT_SKIN, isSkinId, getSkinMeta, type SkinId, type SkinMeta, type SkinMotion } from '../skins';
import { setSoundsEnabled, SOUND_STORAGE_KEY } from '../utils/sounds';

/**
 * Skin, scale, motion & sound preferences
 * ---------------------------------------
 * The chassis ships with one look, Graphite, defined by the tokens in
 * styles/tokens.css. A skin is `skins/<id>.css` (token overrides under
 * `html[data-skin="<id>"]`) plus its entry in `skins/index.ts` (name, blurb,
 * preview swatches, motion profile). See docs/CHASSIS_BRIEF.md §7–§8.
 *
 * This provider:
 *  - applies the active skin via `data-skin` on <html> and persists it;
 *  - applies the skin's motion profile via `data-motion` on <html>;
 *  - applies the UI scale (`--ui-scale` on <html>) and persists it;
 *  - persists the sound on/off preference and feeds it to utils/sounds.
 *
 * To add a skin: ship `skins/<id>.css`, add it to `skins/skins.css`, and add
 * its metadata to SKIN_LIST. Nothing here needs to change.
 */
export type { SkinId, SkinMeta, SkinMotion };

export const UI_SCALE_PRESETS = [0.85, 1, 1.15, 1.3] as const;
export type UiScale = (typeof UI_SCALE_PRESETS)[number];

const SKIN_STORAGE_KEY = 'firebrain_skin';
const LEGACY_THEME_STORAGE_KEY = 'firebrain_theme';
const UI_SCALE_STORAGE_KEY = 'firebrain_ui_scale';

function isUiScale(value: number): value is UiScale {
  return (UI_SCALE_PRESETS as readonly number[]).includes(value);
}

function readStoredSkin(): SkinId {
  const saved = localStorage.getItem(SKIN_STORAGE_KEY);
  if (isSkinId(saved)) return saved;
  // Field Notes ('default') is retired; anything unknown falls back to Graphite.
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  return DEFAULT_SKIN;
}

function readStoredUiScale(): UiScale {
  const saved = Number(localStorage.getItem(UI_SCALE_STORAGE_KEY));
  return isUiScale(saved) ? saved : 1;
}

function readStoredSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
}

interface ThemeContextType {
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
  availableSkins: SkinMeta[];
  /** Motion profile of the active skin; mirrored to `data-motion` on <html>. */
  motion: SkinMotion;
  uiScale: UiScale;
  setUiScale: (scale: UiScale) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(readStoredSkin);
  const [uiScale, setUiScaleState] = useState<UiScale>(readStoredUiScale);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(readStoredSoundEnabled);

  const motion = useMemo(() => getSkinMeta(skin).motion, [skin]);

  const setSkin = useCallback((next: SkinId) => {
    if (isSkinId(next)) setSkinState(next);
  }, []);

  const setUiScale = useCallback((next: UiScale) => {
    if (isUiScale(next)) setUiScaleState(next);
  }, []);

  const setSoundEnabled = useCallback((next: boolean) => {
    setSoundEnabledState(Boolean(next));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin);
    document.documentElement.setAttribute('data-motion', motion);
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  }, [skin, motion]);

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
    localStorage.setItem(UI_SCALE_STORAGE_KEY, String(uiScale));
  }, [uiScale]);

  useEffect(() => {
    setSoundsEnabled(soundEnabled);
    localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? 'on' : 'off');
  }, [soundEnabled]);

  const value = useMemo<ThemeContextType>(
    () => ({
      skin,
      setSkin,
      availableSkins: SKIN_LIST,
      motion,
      uiScale,
      setUiScale,
      soundEnabled,
      setSoundEnabled,
    }),
    [skin, setSkin, motion, uiScale, setUiScale, soundEnabled, setSoundEnabled],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
