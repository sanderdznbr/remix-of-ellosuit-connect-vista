import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    localStorage.setItem('ellosuit-theme', 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    // Theme is locked to dark
  }, []);

  return { theme: 'dark' as const, toggleTheme, setTheme: setThemeState };
}
