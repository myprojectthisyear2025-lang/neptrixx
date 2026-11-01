/** Execute the actual worker for badge support, visible notifications, safe navigation, and read-all cleanup. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../../frontend/public/support-sw.js', import.meta.url), 'utf8');
function worker(support = true) {
  const events = {}, shown = [], badges = [], posted = [], closed = [];
  const navigator = support ? { setAppBadge: async n => badges.push(n), clearAppBadge: async () => badges.push(0) } : {};
  const self = { location: { origin: 'https://www.neptrixx.com' }, addEventListener: (name, fn) => { events[name] = fn; },
    registration: { showNotification: async (...args) => shown.push(args), getNotifications: async () => [
      { tag: 'chat-example', close: () => closed.push('chat') }, { tag: 'unrelated', close: () => closed.push('unrelated') },
    ] } };
  runInNewContext(source, { self, navigator, URL, clients: { matchAll: async () => [{ postMessage: data => posted.push(data) }] } });
  return { events, shown, badges, posted, closed };
}
async function push(w, data) { let pending; w.events.push({ data: { json: () => data }, waitUntil: p => { pending = p; } }); await pending; }
test('worker shows notifications and updates supported unread badges with safe same-origin navigation', async () => {
  const w = worker(); await push(w, { unreadCount: 7, path: 'https://evil.example/login' });
  assert.deepEqual(w.badges, [7]); assert.equal(w.shown.length, 1); assert.equal(w.shown[0][1].data.path, '/messages'); assert.equal(w.posted[0].type, 'neptrixx:push');
  await push(w, { unreadCount: 0 }); assert.deepEqual(w.badges, [7, 0]);
  await push(w, { unreadCount: -1 }); assert.deepEqual(w.badges, [7, 0]);
});
test('lack of app badging never prevents a visible push notification', async () => {
  const w = worker(false); await push(w, { unreadCount: 2 }); assert.equal(w.shown.length, 1); assert.deepEqual(w.badges, []);
});
test('read-all only accepts same-origin pages and closes Neptrixx message notifications', async () => {
  const w = worker(); let pending;
  w.events.message({ data: { type: 'neptrixx:read-all' }, source: { url: 'https://evil.example/' }, waitUntil: p => { pending = p; } }); assert.equal(pending, undefined);
  w.events.message({ data: { type: 'neptrixx:read-all' }, source: { url: 'https://www.neptrixx.com/messages' }, waitUntil: p => { pending = p; } }); await pending; assert.deepEqual(w.closed, ['chat']);
});
