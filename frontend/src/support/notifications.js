/** User-triggered Web Push setup, including the iPhone Home Screen prerequisite. */
import { request } from './api';
export function iosNeedsInstall() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return ios && !matchMedia('(display-mode: standalone)').matches && !navigator.standalone;
}
function decodeKey(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
export async function enableNotifications() {
  if (iosNeedsInstall()) throw new Error('On iPhone/iPad: tap Share → Add to Home Screen. Open Neptrixx from that icon, then enable notifications. Requires iOS/iPadOS 16.4 or later.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('This browser does not support message notifications.');
  const key = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
  if (!key || /REPLACE/.test(key)) throw new Error('Message notifications are not configured yet.');
  // Invoke permission directly from the user's click, before network requests.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are disabled. You can enable them in browser settings.');
  const registration = await navigator.serviceWorker.register('/support-sw.js');
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: decodeKey(key),
  });
  await request('/push', { method: 'POST', body: subscription.toJSON() });
  await request('/profile', { method: 'PATCH', body: { pushEnabled: true } });
}
export async function disableNotifications() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await request('/push', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
  }
}
