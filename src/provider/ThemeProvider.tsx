import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import ThemeContext from '../context/ThemeContext';
import type { ThemeType } from '../types/Theme';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<ThemeType>(() => {
    const savedTheme = localStorage.getItem('theme');
    const preferredTheme = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    return savedTheme
      ? (savedTheme as ThemeType)
      : preferredTheme
        ? 'dark'
        : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);

    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
