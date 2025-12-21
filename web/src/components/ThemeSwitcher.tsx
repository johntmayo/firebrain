import React from 'react';
import { useTheme, type ThemeName } from '../context/ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="theme-switcher">
      {themes.map((t) => (
        <button
          key={t.id}
          className={`theme-btn ${theme === t.id ? 'active' : ''}`}
          data-theme={t.id}
          onClick={() => setTheme(t.id)}
          title={t.name}
          aria-label={`Switch to ${t.name} theme`}
        />
      ))}
    </div>
  );
}
