/** Only offer notification setup when this device is known not to have an active subscription. */
import { useState } from 'react';
import { useSupport } from './SupportContext';
import { enableNotifications } from './notifications';
export default function NotificationBanner() {
  const { notificationStatus, checkNotifications, setError } = useSupport(); const [busy, setBusy] = useState(false);
  if (!['disabled', 'blocked'].includes(notificationStatus)) return null;
  async function enable() {
    setBusy(true); setError('');
    try { await enableNotifications(); await checkNotifications(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="sp-notification-bar"><span>{notificationStatus === 'blocked' ? 'Notifications are blocked in your browser settings.' : 'Keep up with replies, even when you leave this page.'}</span>
    <button disabled={busy} onClick={enable}>{busy ? 'Enabling…' : 'Enable notifications'}</button></div>;
}
