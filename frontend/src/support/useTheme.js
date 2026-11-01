/** Persistent Light/Dark/System preference, scoped to the support interface. */
import { useEffect, useState } from 'react';
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('neptrixx-support-theme') || 'system'; } catch { return 'system'; }
  });
  const [system, setSystem] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)'); const update = e => setSystem(e.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { try { localStorage.setItem('neptrixx-support-theme', theme); } catch { /* storage disabled */ } }, [theme]);
  return { theme, setTheme, mode: theme === 'system' ? system ? 'dark' : 'light' : theme };
}
