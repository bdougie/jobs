import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
  // Initialize theme from localStorage or default to light
  const initialTheme: Theme = browser 
    ? (localStorage.getItem('theme') as Theme) || 'light'
    : 'light';

  const { subscribe, set, update } = writable<Theme>(initialTheme);

  return {
    subscribe,
    setTheme: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
      set(theme);
    },
    toggle: () => {
      update(currentTheme => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        if (browser) {
          localStorage.setItem('theme', newTheme);
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
        }
        return newTheme;
      });
    },
    init: () => {
      if (browser) {
        const stored = localStorage.getItem('theme') as Theme;
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = stored || systemPreference;
        
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set(theme);
      }
    }
  };
}

export const theme = createThemeStore();