import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'default' | 'sakura' | 'cyberpunk' | 'grimoire' | 'studio' | 'retro' | 'vaporwave';

interface ThemeInfo {
  id: ThemeName;
  name: string;
  icon: string;
}

export const THEMES: ThemeInfo[] = [
  { id: 'default', name: 'Arcane Void', icon: '🔮' },
  { id: 'sakura', name: 'Sakura Shrine', icon: '🌸' },
  { id: 'cyberpunk', name: 'Cyberpunk Terminal', icon: '⚡' },
  { id: 'grimoire', name: 'Ancient Grimoire', icon: '📜' },
  { id: 'studio', name: 'Clean Studio', icon: '☀️' },
  { id: 'retro', name: 'Retro Terminal', icon: '💾' },
  { id: 'vaporwave', name: 'Vaporwave Dream', icon: '🌈' },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeInfo[];
  currentThemeInfo: ThemeInfo;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'firebrain-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.some(t => t.id === saved)) {
      return saved as ThemeName;
    }
    return 'default';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  const currentThemeInfo = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, currentThemeInfo }}>
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
