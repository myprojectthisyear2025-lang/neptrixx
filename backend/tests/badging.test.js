/** Real Mongo checks for global unread totals and recipient-specific push badge counts. */
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import webpush from 'web-push';
import { setup, Client } from './helpers.js';
import { User, Conversation, Message, Preference, Subscription, PushJob } from '../support/models.js';
import { processJobs } from '../support/jobs.js';
let env, owner, customer, other, users; const password = 'A badge test password 123!';
before(async () => {
  env = await setup(); const passwordHash = await bcrypt.hash(password, 4);
  users = await User.create(['owner', 'customer', 'other'].map((name, i) => ({ name, email: `${name}@example.com`, passwordHash, role: i ? 'customer' : 'admin' })));
  [owner, customer, other] = await Promise.all(users.map(async u => {
    const c = new Client(env.app); await c.initialize(); assert.equal((await c.call('post', '/auth/login', { email: u.email, password })).status, 200); return c;
  }));
});
after(async () => { if (env) await env.close(); });
beforeEach(async () => { await Promise.all([Conversation, Message, Preference, Subscription, PushJob].map(m => m.deleteMany({}))); });
async function send(c, id, text) { const r = await c.call('post', `/conversations/${id}/messages`, { text, clientId: randomUUID() }); assert.equal(r.status, 201); return r.body.message; }
async function open(c) { return (await c.call('post', '/conversation', {})).body.conversation.id; }
test('badge count ignores inbox filters, remains private, and clears after reading or unsend', async () => {
  const one = await open(customer); const two = await open(other);
  const first = await send(customer, one, 'First'); const second = await send(other, two, 'Second');
  for (const filter of ['all', 'unread', 'muted', 'pinned', 'blocked']) {
    const r = await owner.call('get', `/conversations?filter=${filter}`); assert.equal(r.body.unreadTotal, 2);
    if (filter === 'pinned') assert.equal(r.body.conversations.length, 0);
  }
  assert.equal((await customer.call('get', '/conversations')).body.unreadTotal, 0);
  await owner.call('post', `/conversations/${one}/read`, { messageId: first.id });
  assert.equal((await owner.call('get', '/conversations?filter=pinned')).body.unreadTotal, 1);
  await other.call('patch', `/conversations/${two}/messages/${second.id}`, { action: 'unsend' });
  assert.equal((await owner.call('get', '/conversations')).body.unreadTotal, 0);
  const reply = await send(owner, one, 'Reply'); assert.equal((await customer.call('get', '/conversations')).body.unreadTotal, 1);
  assert.equal((await other.call('get', '/conversations')).body.unreadTotal, 0);
  await customer.call('post', `/conversations/${one}/read`, { messageId: reply.id });
  assert.equal((await customer.call('get', '/conversations')).body.unreadTotal, 0);
});
test('each background push carries the current unread total for its recipient', async () => {
  const id = await open(customer);
  for (const u of users.slice(0, 2)) await Subscription.create({ userId: u._id, endpoint: `https://fcm.googleapis.com/${u._id}`, keys: { p256dh: 'test', auth: 'test' } });
  const sent = []; const original = webpush.sendNotification;
  webpush.sendNotification = async (s, body) => { sent.push({ endpoint: s.endpoint, data: JSON.parse(body) }); };
  try {
    await send(customer, id, 'One'); const latest = await send(customer, id, 'Two'); await processJobs();
    assert.equal(sent.length, 2); assert.ok(sent.every(s => s.data.unreadCount === 2 && s.endpoint.endsWith(String(users[0]._id))));
    sent.length = 0; await owner.call('post', `/conversations/${id}/read`, { messageId: latest.id }); await send(owner, id, 'Reply'); await processJobs();
    assert.equal(sent.length, 1); assert.equal(sent[0].data.unreadCount, 1); assert.ok(sent[0].endpoint.endsWith(String(users[1]._id)));
  } finally { webpush.sendNotification = original; }
});
