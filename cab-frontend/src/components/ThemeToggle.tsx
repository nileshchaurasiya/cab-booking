import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    // Default to dark mode for sleek modern UI
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm focus:outline-none"
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform duration-500 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-500 hover:-rotate-12" />
      )}
    </button>
  );
}
