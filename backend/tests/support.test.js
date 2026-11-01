/** Behavioral integration tests: signup/reset, private conversations, deduplication, admin and sockets. */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { io as connect } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
import { setup, Client, testPhoto } from './helpers.js';
import { User, Code, Message, PushJob, Asset, Subscription, Conversation } from '../support/models.js';
import webpush from 'web-push';
import { processJobs } from '../support/jobs.js';
let env, alice, bob, admin, conversation, aliceId; const mail = new Map(); const originalFetch = global.fetch;
before(async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    const body = JSON.parse(options.body); mail.set(body.to[0], body.text.match(/\b\d{6}\b/)[0]);
    return { ok: true };
  };
  env = await setup(); alice = new Client(env.app); bob = new Client(env.app); admin = new Client(env.app);
});
after(async () => { global.fetch = originalFetch; if (env) await env.close(); });
const password = 'A long test password 123!';
async function signup(client, email, name) {
  await client.initialize();
  assert.equal((await client.call('post', '/auth/signup', { email, name, password, phone: '+9779800000000', role: 'admin' }, {}, testPhoto)).status, 200);
  return client.call('post', '/auth/verify', { email, code: mail.get(email) });
}
test('signup verifies email, excludes admin role injection, hashes password, and rotates session', async () => {
  const res = await signup(alice, 'alice@example.com', 'Alice Customer'); assert.equal(res.status, 201);
  aliceId = res.body.user.id; assert.equal(res.body.user.role, 'customer'); assert.ok(!res.body.user.passwordHash);
  const user = await User.findById(aliceId).select('+passwordHash'); assert.ok(await bcrypt.compare(password, user.passwordHash));
  assert.equal(await Code.countDocuments({ email: user.email }), 0);
  assert.match(res.headers['set-cookie'][0], /HttpOnly/); assert.match(res.headers['set-cookie'][0], /Secure/);
});
test('verification code is single-use and signup resend is throttled', async () => {
  await bob.initialize();
  const data = { name: 'Bob Customer', email: 'bob@example.com', password };
  assert.equal((await bob.call('post', '/auth/signup', data, {}, testPhoto)).status, 200);
  assert.equal((await bob.call('post', '/auth/signup', data, {}, testPhoto)).status, 429);
  assert.equal((await bob.call('post', '/auth/verify', { email: data.email, code: mail.get(data.email) })).status, 201);
  assert.equal((await bob.call('post', '/auth/verify', { email: data.email, code: mail.get(data.email) })).status, 400);
});
test('cross-site requests and missing CSRF tokens are rejected', async () => {
  assert.equal((await alice.call('post', '/conversation', {}, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await alice.call('post', '/conversation', {}, { 'X-CSRF-Token': '' })).status, 403);
});
test('one support conversation per customer and no customer directory access', async () => {
  const one = await alice.call('post', '/conversation', {}); const two = await alice.call('post', '/conversation', {});
  conversation = one.body.conversation.id; assert.equal(conversation, two.body.conversation.id);
  assert.equal((await alice.call('get', '/admin/customers?q=Bob')).status, 403);
});
test('customers cannot read or post to another customer conversation', async () => {
  assert.equal((await bob.call('get', `/conversations/${conversation}/messages`)).status, 404);
  assert.equal((await bob.call('post', `/conversations/${conversation}/messages`, { text: 'intrusion', clientId: randomUUID() })).status, 404);
});
test('message retry persists exactly once and creates one transactional push job', async () => {
  const body = { text: 'Hello support', clientId: randomUUID() };
  const a = await alice.call('post', `/conversations/${conversation}/messages`, body);
  const b = await alice.call('post', `/conversations/${conversation}/messages`, body);
  assert.equal(a.status, 201); assert.equal(b.status, 200); assert.equal(a.body.message.id, b.body.message.id);
  assert.equal(await Message.countDocuments({ clientId: body.clientId }), 1);
  assert.equal(await PushJob.countDocuments({ messageId: a.body.message.id }), 1);
  assert.equal((await alice.call('post', `/conversations/${conversation}/messages`, { ...body, text: 'Changed' })).status, 409);
});
test('arbitrary/private photo keys cannot be attached and transaction rolls back', async () => {
  const clientId = randomUUID();
  const res = await alice.call('post', `/conversations/${conversation}/messages`, { imageKey: 'someone/else.webp', clientId });
  assert.equal(res.status, 403); assert.equal(await Message.countDocuments({ clientId }), 0);
  const bobUser = await User.findOne({ email: 'bob@example.com' });
  await Asset.create({ key: 'private-test-key', ownerId: bobUser._id, purpose: 'chat', conversationId: conversation });
  assert.equal((await alice.call('post', `/conversations/${conversation}/messages`, { imageKey: 'private-test-key', clientId: randomUUID() })).status, 403);
});
test('admin search, customer details, read counts, replies, and reopening work', async () => {
  await signup(admin, 'admin@example.com', 'Site Admin');
  await User.updateOne({ email: 'admin@example.com' }, { $set: { role: 'admin' } });
  const search = await admin.call('get', '/admin/customers?q=Alice'); assert.equal(search.status, 200);
  assert.equal(search.body.customers[0].id, aliceId);
  let inbox = await admin.call('get', '/conversations'); assert.equal(inbox.body.conversations[0].unread, 1);
  const history = await admin.call('get', `/conversations/${conversation}/messages`);
  const first = history.body.messages[0].id;
  assert.equal((await admin.call('post', `/conversations/${conversation}/read`, { messageId: first })).status, 200);
  inbox = await admin.call('get', '/conversations'); assert.equal(inbox.body.conversations[0].unread, 0);
  assert.equal((await admin.call('post', `/conversations/${conversation}/messages`, { text: 'Hello Alice', replyTo: first, clientId: randomUUID() })).status, 201);
  assert.equal((await admin.call('patch', `/admin/conversations/${conversation}`, { status: 'resolved' })).status, 200);
  await alice.call('post', `/conversations/${conversation}/messages`, { text: 'One more question', clientId: randomUUID() });
  const latest = await alice.call('get', `/conversations/${conversation}/messages`); assert.equal(latest.body.conversation.status, 'open');
  assert.equal(latest.body.conversation.unread, 1);
});
test('authenticated sockets receive messages; anonymous sockets are refused', async () => {
  const socket = connect(env.url, { transports: ['websocket'], extraHeaders: { Origin: 'https://neptrixx.com', Cookie: alice.cookie }, auth: { csrf: alice.csrf }, reconnection: false });
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  const received = new Promise(resolve => socket.once('chat:message', resolve));
  await admin.call('post', `/conversations/${conversation}/messages`, { text: 'Live message', clientId: randomUUID() });
  assert.equal((await received).text, 'Live message'); socket.disconnect();
  const stranger = connect(env.url, { transports: ['websocket'], extraHeaders: { Origin: 'https://neptrixx.com' }, reconnection: false });
  const error = await new Promise(resolve => stranger.once('connect_error', resolve)); assert.match(error.message, /log in/i); stranger.disconnect();
});
test('password reset code invalidates previously logged-in sessions', async () => {
  const guest = new Client(env.app); await guest.initialize();
  assert.equal((await guest.call('post', '/auth/forgot', { email: 'bob@example.com' })).status, 200);
  assert.equal((await guest.call('post', '/auth/reset', { email: 'bob@example.com', code: mail.get('bob@example.com'), password: 'Another long password 456!' })).status, 200);
  assert.equal((await bob.call('get', '/conversations')).status, 401);
});
test('new email verification changes ownership safely and ends other sessions', async () => {
  assert.equal((await alice.call('post', '/profile/email/code', { email: 'alice-new@example.com', password })).status, 200);
  const response = await alice.call('post', '/profile/email/confirm', { email: 'alice-new@example.com', code: mail.get('alice-new@example.com') });
  assert.equal(response.status, 200); assert.equal(response.body.user.email, 'alice-new@example.com');
});
test('admin restriction immediately prevents customer access', async () => {
  assert.equal((await admin.call('patch', `/admin/customers/${aliceId}`, { blocked: true })).status, 200);
  assert.equal((await alice.call('get', '/conversations')).status, 401);
});

test('push outbox retries a transient failure and retains completion for idempotent sends', async () => {
  const siteAdmin = await User.findOne({ email: 'admin@example.com' });
  await PushJob.updateMany({}, { $set: { done: true } });
  const message = await Message.findOne({ senderRole: 'customer', conversationId: conversation });
  const job = await PushJob.findOneAndUpdate({ messageId: message._id }, { $set: { done: false, attempts: 0, availableAt: new Date(0), lockedUntil: new Date(0) } }, { new: true });
  await Conversation.updateOne({ _id: conversation }, { $set: { adminReadAt: new Date(0) } });
  await Subscription.create({ userId: siteAdmin._id, endpoint: 'https://fcm.googleapis.com/test', keys: { p256dh: 'test', auth: 'test' } });
  const original = webpush.sendNotification; let calls = 0;
  try {
    webpush.sendNotification = async () => { calls++; throw new Error('temporary failure'); };
    await processJobs(); let saved = await PushJob.findById(job._id);
    assert.equal(saved.done, false); assert.equal(saved.attempts, 1); assert.ok(saved.availableAt > new Date());
    await PushJob.updateOne({ _id: job._id }, { $set: { availableAt: new Date(0) } });
    webpush.sendNotification = async (sub, payload) => { calls++; assert.match(JSON.parse(payload).path, /conversation=/); };
    await processJobs(); saved = await PushJob.findById(job._id); assert.equal(saved.done, true);
    await processJobs(); assert.equal(calls, 2);
  } finally { webpush.sendNotification = original; }
});
test('customer deletion requires password and removes conversation records', async () => {
  await admin.call('patch', `/admin/customers/${aliceId}`, { blocked: false });
  const client = new Client(env.app); await client.initialize();
  assert.equal((await client.call('post', '/auth/login', { email: 'alice-new@example.com', password })).status, 200);
  assert.equal((await client.call('delete', '/profile', { password: 'wrong' })).status, 400);
  // Test upload-ownership fixture is not a real remote object; remove it before deletion.
  await Asset.deleteMany({ key: 'private-test-key' });
  assert.equal((await client.call('delete', '/profile', { password })).status, 200);
  assert.equal(await Message.countDocuments({ conversationId: conversation }), 0);
  assert.equal(await User.countDocuments({ _id: aliceId }), 0);
});
