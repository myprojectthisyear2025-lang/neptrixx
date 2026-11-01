/** Offer a shortcut after verified signup, retain manual access, and register the worker without requesting permission. */
import { useEffect, useState } from 'react';
import { installState } from '../features/installPrompt';
export function useInstallShortcut(user) {
  const [state, setState] = useState(installState); const [offerFor, setOfferFor] = useState(null);
  useEffect(() => {
    const update = () => { const next = installState(); setState(next); if (next.installed) setOfferFor(null); };
    window.addEventListener('neptrixx:install-state', update); update();
    return () => window.removeEventListener('neptrixx:install-state', update);
  }, []);
  useEffect(() => {
    if (user && 'serviceWorker' in navigator) navigator.serviceWorker.register('/support-sw.js', { scope: '/' }).catch(() => {});
  }, [user?.id]);
  function offerInstall(id = user?.id) { if (!installState().installed && id) setOfferFor(id); }
  return { ...state, offerInstall, closeInstall: () => setOfferFor(null), showInstall: !!user && offerFor === user.id && !state.installed };
}
