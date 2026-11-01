/** Check this device's permission, native subscription, server ownership, and current public key without prompting. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from './api';
import { sameKey, decodeKey } from './notifications';
export function useNotificationStatus(user) {
  const [notificationStatus, setStatus] = useState('checking'); const generation = useRef(0);
  const checkNotifications = useCallback(async () => {
    const turn = ++generation.current;
    const finish = value => { if (generation.current === turn) setStatus(value); return value; };
    if (!user) return finish('idle');
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return finish('unsupported');
    if (Notification.permission === 'denied') return finish('blocked');
    if (Notification.permission !== 'granted') return finish('disabled');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const sub = await registration?.pushManager.getSubscription();
      if (!sub) return finish('disabled');
      const data = await request('/push/status', { method: 'POST', body: { endpoint: sub.endpoint } });
      return finish(data.enabled && sameKey(sub.options.applicationServerKey, decodeKey(data.publicKey)) ? 'enabled' : 'disabled');
    } catch { return finish('unknown'); }
  }, [user?.id, user?.pushEnabled]);
  useEffect(() => {
    let permission; let disposed = false; checkNotifications();
    const visible = () => { if (!document.hidden) checkNotifications(); };
    window.addEventListener('focus', visible); window.addEventListener('neptrixx:notifications-changed', visible);
    document.addEventListener('visibilitychange', visible);
    navigator.permissions?.query({ name: 'notifications' }).then(result => { if (!disposed) { permission = result; permission.addEventListener('change', visible); } }).catch(() => {});
    return () => { disposed = true; generation.current++; permission?.removeEventListener('change', visible);
      window.removeEventListener('focus', visible); window.removeEventListener('neptrixx:notifications-changed', visible); document.removeEventListener('visibilitychange', visible); };
  }, [checkNotifications]);
  return { notificationStatus, checkNotifications };
}
