/** Message notifications and supported app-icon badges; no private-page caching or offline interception. */
function safePath(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || !['/messages', '/admin/messages'].includes(url.pathname)) return '/messages';
    const id = url.searchParams.get('conversation');
    return url.pathname + (/^[a-f\d]{24}$/i.test(id || '') ? `?conversation=${id}` : '');
  } catch { return '/messages'; }
}
self.addEventListener('push', event => {
  let data = {}; try { data = event.data?.json() || {}; } catch { /* malformed push */ }
  const path = safePath(data.path);
  const badge = Number.isSafeInteger(data.unreadCount) && data.unreadCount >= 0 ? data.unreadCount : null;
  event.waitUntil((async () => {
    await self.registration.showNotification('Neptrixx', {
      body: 'You have a new message.', icon: '/support-icon-192.png', badge: '/support-badge.png',
      tag: typeof data.tag === 'string' ? data.tag : 'neptrixx-message', renotify: true, data: { path },
    });
    try { if (badge === 0) await navigator.clearAppBadge?.(); else if (badge !== null) await navigator.setAppBadge?.(badge); } catch { /* optional OS capability */ }
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach(client => client.postMessage({ type: 'neptrixx:push' }));
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'neptrixx:read-all') return;
  try { if (new URL(event.source.url).origin !== self.location.origin) return; } catch { return; }
  event.waitUntil(self.registration.getNotifications().then(notifications => {
    notifications.filter(n => n.tag?.startsWith('chat-') || n.tag === 'neptrixx-message').forEach(n => n.close());
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = safePath(event.notification.data?.path);
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.navigate(url); return client.focus();
      }
    }
    return clients.openWindow(url);
  }));
});
