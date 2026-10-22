import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'night' | 'day';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isNight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'gardner_auction_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'day' || stored === 'night') {
        return stored;
      }
    } catch {
      // LocalStorage unavailable fallback
    }
    // Default is Night Mode matching the authoritative Stitch reference
    return 'night';
  });

  const applyThemeToDocument = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    if (mode === 'night') {
      root.classList.add('dark');
      root.classList.add('theme-night');
      root.classList.remove('theme-day');
    } else {
      root.classList.remove('dark');
      root.classList.remove('theme-night');
      root.classList.add('theme-day');
    }
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // LocalStorage write failed
    }
  }, [theme, applyThemeToDocument]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'night' ? 'day' : 'night'));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isNight: theme === 'night',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
