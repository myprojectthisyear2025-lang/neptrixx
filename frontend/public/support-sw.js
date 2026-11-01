/** Website message notifications only; deliberately no page caching or offline interception. */
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
  event.waitUntil(self.registration.showNotification('Neptrixx', {
    body: 'You have a new message.', icon: '/support-icon-192.png', badge: '/support-badge.png',
    tag: typeof data.tag === 'string' ? data.tag : 'neptrixx-message', data: { path },
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
