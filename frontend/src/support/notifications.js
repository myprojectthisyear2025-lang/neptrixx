/** Push setup uses the server public key, repairs key rotation, and explains browser failures. */
import { request } from './api';
export function iosNeedsInstall() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return ios && !matchMedia('(display-mode: standalone)').matches && !navigator.standalone;
}
export function decodeKey(value) {
  try {
    const key = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
    if (key.length !== 65 || key[0] !== 4) throw new Error(); return key;
  } catch { throw new Error('The notification public key is invalid. Ask the site owner to check notification configuration.'); }
}
export function sameKey(left, right) { return !!left && new Uint8Array(left).length === right.length && new Uint8Array(left).every((b, i) => b === right[i]); }
export async function pushFailure(error) {
  const brave = typeof navigator.brave?.isBrave === 'function' && await navigator.brave.isBrave().catch(() => false);
  if (error.name === 'NotAllowedError') return new Error('Notifications are blocked. Allow notifications for this website in browser settings, then try again.');
  if (/push service|registration failed|AbortError/i.test(`${error.name} ${error.message}`)) {
    return new Error(brave ? 'Brave could not connect to its push service. In Brave Settings → Privacy and security, enable “Use Google services for push messaging”, restart Brave, then try again.' :
      'Your browser could not connect to its push service. Check your connection and browser notification settings, restart the browser, then try again.');
  }
  return error;
}
let enabling = null;
export function enableNotifications() { if (!enabling) enabling = enable().finally(() => { enabling = null; }); return enabling; }
async function enable() {
  if (iosNeedsInstall()) throw new Error('On iPhone/iPad: tap Share → Add to Home Screen. Open Neptrixx from that icon, then enable notifications. Requires iOS/iPadOS 16.4 or later.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('This browser does not support message notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are disabled. You can enable them in browser settings.');
  const { publicKey } = await request('/push/config'); const key = decodeKey(publicKey);
  try {
    await navigator.serviceWorker.register('/support-sw.js', { scope: '/' });
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Notification setup timed out. Reload this page and try again.')), 15000))]);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      await request('/push', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
      if (!await subscription.unsubscribe()) throw new Error('Could not refresh notifications. Restart your browser and try again.');
      subscription = null;
    }
    subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await request('/push', { method: 'POST', body: subscription.toJSON() });
    await request('/profile', { method: 'PATCH', body: { pushEnabled: true } });
    window.dispatchEvent(new Event('neptrixx:notifications-changed'));
  } catch (e) { throw await pushFailure(e); }
}
export async function disableNotifications() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await request('/push', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
  }
  window.dispatchEvent(new Event('neptrixx:notifications-changed'));
}
