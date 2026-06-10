import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Theme architecture
 * ------------------
 * Every visual decision in the app flows through the CSS design tokens defined
 * on `:root` in styles/index.css. A theme is a `[data-theme="<id>"]` block that
 * overrides those tokens (colors, fonts, radii, shadows, textures).
 *
 * To add a new theme:
 *  1. Add an entry to THEMES below with `available: true`.
 *  2. Add a `[data-theme="<id>"] { ... }` token-override block in styles/index.css
 *     (see the THEME OVERRIDES section there for a scaffold).
 * The provider persists the choice to localStorage and applies it via the
 * `data-theme` attribute on <html>.
 */
export type ThemeName = 'default' | 'fantasy' | 'scifi' | 'military';

export interface ThemeDefinition {
  id: ThemeName;
  label: string;
  description: string;
  /** Themes are registered ahead of time but hidden until their CSS exists */
  available: boolean;
}

export const THEMES: ThemeDefinition[] = [
  { id: 'default', label: 'Field Notes', description: 'Warm, editorial, illustration-forward', available: true },
  { id: 'fantasy', label: 'Fantasy', description: 'Parchment, runes, and arcane glow', available: false },
  { id: 'scifi', label: 'Sci-Fi', description: 'Holographic HUD over deep space', available: false },
  { id: 'military', label: 'Military', description: 'Olive drab, stencils, and field gear', available: false },
];

const THEME_STORAGE_KEY = 'firebrain_theme';

function isAvailableTheme(id: string | null): id is ThemeName {
  return THEMES.some(t => t.id === id && t.available);
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  /** Themes that can currently be selected */
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isAvailableTheme(saved) ? saved : 'default';
  });

  const setTheme = useCallback((next: ThemeName) => {
    if (isAvailableTheme(next)) {
      setThemeState(next);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: THEMES.filter(t => t.available) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
