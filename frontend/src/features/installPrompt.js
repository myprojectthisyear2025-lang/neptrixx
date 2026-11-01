/** Capture the one-use native install prompt early; never attempt installation without a user click. */
let deferred = null; let accepted = false;
const changed = () => window.dispatchEvent(new Event('neptrixx:install-state'));
export function installState() {
  return { installed: accepted || matchMedia('(display-mode: standalone)').matches || !!navigator.standalone, available: !!deferred };
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferred = event; changed(); });
window.addEventListener('appinstalled', () => { accepted = true; deferred = null; changed(); });
matchMedia('(display-mode: standalone)').addEventListener?.('change', changed);
export async function requestNativeInstall() {
  if (!deferred) return 'manual';
  const prompt = deferred; deferred = null; changed();
  const result = await prompt.prompt();
  const choice = result?.outcome ? result : await prompt.userChoice;
  if (choice?.outcome === 'accepted') { accepted = true; changed(); }
  return choice?.outcome || 'dismissed';
}
