/** Integration checks for new message actions, private inbox choices, pagination, presence, and mute delivery. */
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { io as connect } from 'socket.io-client';
import { S3Client } from '@aws-sdk/client-s3';
import webpush from 'web-push';
import { setup, Client } from './helpers.js';
import { User, Conversation, Message, Preference, PushJob, Subscription } from '../support/models.js';
import { processJobs } from '../support/jobs.js';
let env, a, b, admin, second, users; const sockets = []; const password = 'Isolated test password 123!';
before(async () => {
  env = await setup(); const passwordHash = await bcrypt.hash(password, 4);
  users = await User.create(['alice', 'bob', 'admin', 'second'].map((name, i) => ({ name, email: `${name}@example.com`, passwordHash,
    emailVerifiedAt: new Date(), role: i < 2 ? 'customer' : 'admin' })));
  [a, b, admin, second] = await Promise.all(users.map(async user => {
    const c = new Client(env.app); await c.initialize(); assert.equal((await c.call('post', '/auth/login', { email: user.email, password })).status, 200); return c;
  }));
});
after(async () => { sockets.forEach(s => s.disconnect()); if (env) await env.close(); });
beforeEach(async () => { await Promise.all([Conversation, Message, Preference, PushJob, Subscription].map(model => model.deleteMany({}))); });
async function conversation(c = a) { return (await c.call('post', '/conversation', {})).body.conversation.id; }
async function send(c, id, text = 'Hello') {
  const res = await c.call('post', `/conversations/${id}/messages`, { text, clientId: randomUUID() }); assert.equal(res.status, 201); return res.body.message;
}
const act = (c, id, m, action, extra = {}) => c.call('patch', `/conversations/${id}/messages/${m.id}`, { action, ...extra });
const pref = (c, id, body) => c.call('patch', `/admin/conversations/${id}/preferences`, body);
test('edit/unsend enforce sender ownership and leave safe tombstones', async () => {
  const id = await conversation(); const m = await send(a, id);
  assert.equal((await act(b, id, m, 'edit', { text: 'attack' })).status, 404);
  assert.equal((await act(admin, id, m, 'unsend')).status, 403);
  assert.equal((await pref(a, id, { pinned: true })).status, 403);
  for (const text of ['   ', 'x'.repeat(4001)]) assert.equal((await act(a, id, m, 'edit', { text })).status, 400);
  const changed = await act(a, id, m, 'edit', { text: 'Updated question' }); assert.equal(changed.status, 200); assert.ok(changed.body.message.editedAt);
  assert.equal((await admin.call('get', '/conversations')).body.conversations[0].preview, 'Updated question');
  assert.equal((await act(a, id, m, 'unsend')).body.message.deletedForAll, true);
  assert.equal((await act(a, id, m, 'edit', { text: 'revive' })).status, 409);
  assert.equal((await Message.findById(m.id)).text, '');
  assert.equal((await admin.call('get', `/conversations/${id}/messages`)).body.messages[0].text, '');
});
test('delete for me persists and leaves the other person history and unread intact', async () => {
  const id = await conversation(); const m = await send(a, id); assert.equal((await act(admin, id, m, 'delete-me')).status, 200);
  assert.equal((await admin.call('get', `/conversations/${id}/messages`)).body.messages.length, 0);
  assert.equal((await a.call('get', `/conversations/${id}/messages`)).body.messages.length, 1);
  const row = (await admin.call('get', '/conversations')).body.conversations[0]; assert.equal(row.unread, 0); assert.equal(row.preview, '');
});
test('concurrent reactions preserve one reaction per person and allow removal', async () => {
  const id = await conversation(); const m = await send(a, id);
  assert.equal((await act(a, id, m, 'react', { emoji: 'bad' })).status, 400);
  const results = await Promise.all([act(a, id, m, 'react', { emoji: '❤️' }), act(admin, id, m, 'react', { emoji: '👍' })]);
  results.forEach(r => assert.equal(r.status, 200)); await act(a, id, m, 'react', { emoji: '😂' });
  let stored = await Message.findById(m.id); assert.equal(stored.reactions.length, 2);
  assert.equal(stored.reactions.find(r => String(r.userId) === String(users[0]._id)).emoji, '😂');
  await act(a, id, m, 'react', { emoji: null }); stored = await Message.findById(m.id); assert.deepEqual(stored.reactions.map(r => r.emoji), ['👍']);
});
test('recency, pins, mutes, and unread filtering remain private to each admin', async () => {
  const one = await conversation(a); const two = await conversation(b); await send(a, one); await send(b, two);
  assert.equal((await admin.call('get', '/conversations')).body.conversations[0].id, two);
  await send(a, one); assert.equal((await admin.call('get', '/conversations')).body.conversations[0].id, one);
  await pref(admin, two, { pinned: true, muted: true });
  const inbox = (await admin.call('get', '/conversations')).body; assert.equal(inbox.conversations[0].id, two); assert.equal(inbox.conversations[0].muted, true);
  assert.deepEqual(inbox.mutedConversationIds, [two]);
  assert.equal((await second.call('get', '/conversations')).body.conversations[0].id, one);
  const history = (await admin.call('get', `/conversations/${one}/messages`)).body.messages;
  await admin.call('post', `/conversations/${one}/read`, { messageId: history.at(-1).id });
  assert.deepEqual((await admin.call('get', '/conversations?filter=unread')).body.conversations.map(c => c.id), [two]);
  for (const before of ['bad', 'bnVsbA']) assert.equal((await admin.call('get', `/conversations?before=${before}`)).status, 400);
});
test('delete chat hides only one admin history and new messages bring it back', async () => {
  const id = await conversation(); await send(a, id, 'Old message'); await pref(admin, id, { deleteForMe: true });
  assert.equal((await admin.call('get', '/conversations')).body.conversations.length, 0);
  assert.equal((await second.call('get', '/conversations')).body.conversations.length, 1);
  assert.equal((await admin.call('get', `/conversations/${id}/messages`)).body.messages.length, 0);
  await send(a, id, 'New message'); assert.equal((await admin.call('get', '/conversations')).body.conversations.length, 1);
  assert.deepEqual((await admin.call('get', `/conversations/${id}/messages`)).body.messages.map(m => m.text), ['New message']);
  assert.equal((await a.call('get', `/conversations/${id}/messages`)).body.messages.length, 2);
});
test('filter unread before pagination finds unread messages older than the newest 100 chats', async () => {
  const docs = await User.insertMany(Array.from({ length: 102 }, (_, i) => ({ name: `Bulk ${i}`, email: `bulk${i}@example.com`, passwordHash: 'unused' })));
  const rows = await Conversation.insertMany(docs.map((u, i) => ({ customerId: u._id, lastMessageAt: new Date(Date.now() + i * 1000), adminReadAt: i ? new Date(Date.now() + 1000000) : new Date(0) })));
  await Message.insertMany(rows.map(c => ({ conversationId: c._id, senderId: c.customerId, senderRole: 'customer', clientId: randomUUID(), text: 'Hi' })));
  const all = (await admin.call('get', '/conversations')).body; assert.equal(all.conversations.length, 100); assert.ok(all.next);
  assert.equal((await admin.call('get', `/conversations?before=${all.next}`)).body.conversations.length, 2);
  assert.deepEqual((await admin.call('get', '/conversations?filter=unread')).body.conversations.map(c => c.id), [String(rows[0]._id)]);
  await User.deleteMany({ _id: { $in: docs.map(u => u._id) } });
});
test('muted admin push is skipped; other admins receive it; unsent messages do not push', async () => {
  const id = await conversation(); await send(a, id); await pref(admin, id, { muted: true });
  for (const u of users.slice(2)) await Subscription.create({ userId: u._id, endpoint: `https://fcm.googleapis.com/${u._id}`, keys: { p256dh: 'test', auth: 'test' } });
  const sent = []; const original = webpush.sendNotification; webpush.sendNotification = async sub => { sent.push(sub.endpoint); };
  try {
    await processJobs(); assert.equal(sent.length, 1); assert.ok(sent[0].endsWith(String(users[3]._id)));
    sent.length = 0; const m = await send(a, id); await act(a, id, m, 'unsend'); await processJobs(); assert.equal(sent.length, 0);
  } finally { webpush.sendNotification = original; }
});
async function socketFor(c) {
  const s = connect(env.url, { transports: ['websocket'], extraHeaders: { Origin: 'https://neptrixx.com', Cookie: c.cookie }, auth: { csrf: c.csrf }, reconnection: false });
  sockets.push(s); await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); }); return s;
}
function event(s, name, check) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { s.off(name, receive); reject(new Error(`Timeout: ${name}`)); }, 5000);
    function receive(data) { if (check(data)) { clearTimeout(timer); s.off(name, receive); resolve(data); } } s.on(name, receive);
  });
}
test('presence counts visible tabs separately and persists last-seen when all become inactive', async () => {
  const owner = await socketFor(admin); const one = await socketFor(a); const two = await socketFor(a);
  const isAlice = p => p.userId === String(users[0]._id);
  for (const [s, visible, expected] of [[one, true, true], [two, true, true], [one, false, true], [two, false, false]]) {
    const update = event(owner, 'chat:presence', p => isAlice(p) && p.online === expected); s.emit('presence:activity', { visible });
    const data = await update; assert.ok(data.lastSeenAt);
  }
  assert.ok((await User.findById(users[0]._id)).lastSeenAt); one.disconnect(); two.disconnect(); owner.disconnect();
});
test('photo actions forbid editing, preserve other copies on delete-me, and revoke unsent photo access', async () => {
  Object.assign(process.env, { R2_ACCOUNT_ID: 'testaccount', R2_ACCESS_KEY_ID: 'test-access', R2_SECRET_ACCESS_KEY: 'test-secret', R2_BUCKET_NAME: 'test-bucket' });
  const { Asset } = await import('../support/models.js'); const id = await conversation(); const key = 'support/test/photo.webp';
  await Asset.create({ key, ownerId: users[0]._id, purpose: 'chat', conversationId: id });
  const res = await a.call('post', `/conversations/${id}/messages`, { text: '', imageKey: key, clientId: randomUUID() });
  assert.equal(res.status, 201); const m = res.body.message; assert.ok(m.imageUrl);
  assert.equal((await act(a, id, m, 'edit', { text: 'caption' })).status, 400);
  await act(admin, id, m, 'delete-me');
  assert.equal((await admin.call('get', `/conversations/${id}/messages/${m.id}/photo`)).status, 404);
  assert.equal((await second.call('get', `/conversations/${id}/messages/${m.id}/photo`)).status, 200);
  const original = S3Client.prototype.send; const removed = [];
  S3Client.prototype.send = async command => { removed.push(command.input.Key); return {}; };
  try {
    const unsent = await act(a, id, m, 'unsend'); assert.equal(unsent.status, 200); assert.equal(unsent.body.message.imageUrl, '');
    assert.deepEqual(removed, [key]); assert.equal(await Asset.countDocuments({ key }), 0);
    assert.equal((await second.call('get', `/conversations/${id}/messages/${m.id}/photo`)).status, 404);
  } finally { S3Client.prototype.send = original; }
});
test('reconnect history sync repairs older edits, unsend, and delete-for-me outside the newest page', async () => {
  const id = await conversation();
  const records = await Message.insertMany(Array.from({ length: 60 }, (_, i) => ({ conversationId: id, senderId: users[0]._id,
    senderRole: 'customer', clientId: randomUUID(), text: `Message ${i}` })));
  const initial = (await a.call('get', `/conversations/${id}/messages`)).body;
  assert.equal(initial.messages.length, 50); assert.ok(initial.syncAt);
  const ref = row => ({ id: String(row._id) });
  await act(a, id, ref(records[0]), 'edit', { text: 'Old message edited while offline' });
  await act(a, id, ref(records[1]), 'delete-me'); await act(a, id, ref(records[2]), 'unsend');
  const synced = await a.call('get', `/conversations/${id}/messages?loadedFrom=${records[0]._id}&changedSince=${encodeURIComponent(initial.syncAt)}`);
  assert.equal(synced.status, 200); assert.equal(synced.body.reset, false);
  assert.ok(synced.body.updates.some(m => m.id === String(records[0]._id) && m.text === 'Old message edited while offline'));
  assert.ok(synced.body.updates.some(m => m.id === String(records[2]._id) && m.deletedForAll));
  assert.deepEqual(synced.body.hiddenIds, [String(records[1]._id)]);
});
test('notification configuration reveals only the public key to authenticated users', async () => {
  process.env.WEB_PUSH_PUBLIC_KEY = 'test-public'; process.env.WEB_PUSH_PRIVATE_KEY = 'private-do-not-expose';
  assert.deepEqual((await admin.call('get', '/push/config')).body, { publicKey: 'test-public' });
  assert.equal((await new Client(env.app).call('get', '/push/config')).status, 401);
});
