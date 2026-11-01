/** iOS/Android install guidance, with a native prompt when the browser makes one available. */
import { useState } from 'react';
import Modal from './Modal';
import { useSupport } from './SupportContext';
import { requestNativeInstall } from '../features/installPrompt';
export function InstallSettings() {
  const { install, unread } = useSupport();
  return <div className="sp-settings-section sp-install-settings"><h3>Neptrixx on your home screen</h3>
    <p className="sp-muted">Open your chat directly from a Neptrixx shortcut.</p>
    {install.installed ? <p className="sp-notice">Neptrixx is installed on this device.</p> : <button onClick={() => install.offerInstall()}>Add to Home Screen</button>}
    {unread > 0 && <p className="sp-muted">{unread} unread message{unread === 1 ? '' : 's'}</p>}
  </div>;
}
export default function InstallShortcut() {
  const { install } = useSupport(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (!install.showInstall) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const android = /Android/i.test(navigator.userAgent);
  async function add() {
    setBusy(true); setError('');
    try { const outcome = await requestNativeInstall(); if (outcome !== 'manual') install.closeInstall(); }
    catch { setError('Use your browser menu to add Neptrixx instead.'); } finally { setBusy(false); }
  }
  return <Modal title="Add Neptrixx to Home Screen" onClose={install.closeInstall}>
    <div className="sp-install-content"><p>Keep Neptrixx one tap away. The shortcut opens directly to your chat.</p>
      {ios ? <><p>Tap <strong>Share → Add to Home Screen → Add</strong>.</p><p className="sp-muted">If that option is missing, open this chat in Safari first. Keep the name Neptrixx.</p><p className="sp-muted">Background notifications and number badges require iOS/iPadOS 16.4 or later, with notifications allowed.</p></> : <>
        {install.available && <button className="sp-primary" disabled={busy} onClick={add}>{busy ? 'Opening installer…' : 'Install Neptrixx'}</button>}
        <p>{android ? 'In your browser menu, choose Install app or Add to Home Screen, then confirm.' : 'Use Chrome or Edge’s browser menu to install Neptrixx. You can also bookmark this chat.'}</p>
      </>}
      <p className="sp-muted">Enable notifications after installation for background replies. Home-screen badges depend on your device: some show an unread number, others a notification dot.</p>
      {error && <p className="sp-error" role="alert">{error}</p>}
      <button onClick={install.closeInstall}>Not now</button>
    </div>
  </Modal>;
}
