/** Feature-off isolation and one-time email-verified admin enrollment without hosted shell access. */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setup, Client } from './helpers.js';
import { createApp, finalizeApp } from '../app.js';
import { config } from '../config.js';
import { User, Message, Bootstrap, Conversation, Subscription } from '../support/models.js';
import { sealExistingAdmin } from '../support/bootstrap.js';
let runtime; const email = 'owner@example.com'; const password = 'A long owner password 2026!';
const mail = new Map(); const originalFetch = global.fetch;
before(async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails'); const body = JSON.parse(options.body);
    mail.set(body.to[0], body.text.match(/\b\d{6}\b/)[0]); return { ok: true };
  };
  runtime = await setup({ initialAdminEmail: email });
});
after(async () => { global.fetch = originalFetch; if (runtime) await runtime.close(); });
async function pending(client, address) {
  await client.initialize();
  const response = await client.call('post', '/auth/signup', { email: address, name: 'Verified Owner', password, role: 'admin' });
  assert.equal(response.status, 200); return { email: address, code: mail.get(address) };
}
test('support defaults off and does not require support secrets when disabled', () => {
  const settings = config({ CLIENT_ORIGIN: 'https://neptrixx.com', MONGODB_URI: 'mongodb://example.test/neptrixx' });
  assert.equal(settings.supportEnabled, false);
  assert.throws(() => config({ CLIENT_ORIGIN: 'https://neptrixx.com', MONGODB_URI: 'mongodb://example.test', SUPPORT_ENABLED: 'yes' }), /true or false/);
  assert.throws(() => config({ CLIENT_ORIGIN: 'https://neptrixx.com', MONGODB_URI: 'mongodb://example.test', SUPPORT_ENABLED: 'true' }), /SESSION_SECRET/);
});
test('disabled support exposes its switch but blocks auth/chat/admin/uploads/socket requests without a session', async () => {
  const app = finalizeApp(createApp({ origins: ['https://neptrixx.com'], supportEnabled: false }));
  const status = await request(app).get('/api/support/status'); assert.deepEqual(status.body, { enabled: false });
  assert.equal(status.headers['cache-control'], 'no-store'); assert.equal(status.headers['set-cookie'], undefined);
  for (const path of ['/api/support/auth/session', '/api/support/conversations', '/api/support/admin/customers', '/socket.io/?EIO=4&transport=polling']) {
    const res = await request(app).get(path); assert.equal(res.status, 503); assert.equal(res.body.code, 'support_disabled');
    assert.equal(res.headers['set-cookie'], undefined);
  }
  const upload = await request(app).post('/api/support/uploads').set('Origin', 'https://neptrixx.com');
  assert.equal(upload.status, 503);
  assert.equal((await request(app).get('/api/company')).status, 200);
  assert.equal((await request(app).get('/api/health')).body.supportEnabled, false);
});
test('ordinary signup and claiming the owner email without its code never grant admin', async () => {
  const ordinary = new Client(runtime.app); const data = await pending(ordinary, 'customer@example.com');
  const response = await ordinary.call('post', '/auth/verify', data); assert.equal(response.body.user.role, 'customer');
  const owner = new Client(runtime.app); const code = await pending(owner, email);
  const wrong = code.code === '111111' ? '222222' : '111111';
  assert.equal((await owner.call('post', '/auth/verify', { email, code: wrong })).status, 400);
  assert.equal(await User.countDocuments({ email }), 0); assert.equal(await Bootstrap.countDocuments(), 0);
});
test('verification of the configured email enrolls the first admin and records a permanent setup latch', async () => {
  const client = new Client(runtime.app); await client.initialize();
  const response = await client.call('post', '/auth/verify', { email, code: mail.get(email) });
  assert.equal(response.status, 201); assert.equal(response.body.user.role, 'admin');
  const latch = await Bootstrap.findById('initial-admin'); assert.equal(String(latch.userId), response.body.user.id);
  assert.equal(latch.reason, 'verified-owner');
  assert.equal((await client.call('get', '/admin/customers')).status, 200);
});
test('changing INITIAL_ADMIN_EMAIL or demoting an account cannot re-open enrollment', async () => {
  runtime.app.set('initialAdminEmail', 'customer@example.com'); const customer = new Client(runtime.app); await customer.initialize();
  let response = await customer.call('post', '/auth/login', { email: 'customer@example.com', password });
  assert.equal(response.body.user.role, 'customer');
  await User.updateOne({ email }, { $set: { role: 'customer' } }); runtime.app.set('initialAdminEmail', email);
  const owner = new Client(runtime.app); await owner.initialize();
  response = await owner.call('post', '/auth/login', { email, password }); assert.equal(response.body.user.role, 'customer');
  assert.equal(await Bootstrap.countDocuments(), 1);
});
test('feature-off website contact requests still work and preserve support data', async () => {
  const user = await User.findOne({ email: 'customer@example.com' });
  const c = await Conversation.create({ customerId: user._id });
  await Message.create({ conversationId: c._id, senderId: user._id, senderRole: 'customer', clientId: 'preserve-message', text: 'Keep this' });
  await Subscription.create({ userId: user._id, endpoint: 'https://fcm.googleapis.com/preserve', keys: { p256dh: 'x', auth: 'x' } });
  const before = { users: await User.countDocuments(), messages: await Message.countDocuments(), subscriptions: await Subscription.countDocuments() };
  process.env.INQUIRY_FROM_EMAIL = 'test@example.com';
  const priorFetch = global.fetch; global.fetch = async () => ({ ok: true, json: async () => ({ id: 'inquiry-mail' }) });
  try {
    const app = finalizeApp(createApp({ origins: ['https://neptrixx.com'], supportEnabled: false }));
    const res = await request(app).post('/api/inquiries').set('Origin', 'https://neptrixx.com')
      .send({ name: 'Website Visitor', email: 'visitor@example.com', message: 'A project inquiry' });
    assert.equal(res.status, 201);
    assert.equal(await User.countDocuments(), before.users); assert.equal(await Message.countDocuments(), before.messages);
    assert.equal(await Subscription.countDocuments(), before.subscriptions);
    assert.equal((await request(runtime.app).get('/api/support/status')).body.enabled, true);
    const client = new Client(runtime.app); await client.initialize();
    await client.call('post', '/auth/login', { email: user.email, password });
    const history = await client.call('get', `/conversations/${c._id}/messages`);
    assert.equal(history.body.messages[0].text, 'Keep this');
  } finally { global.fetch = priorFetch; }
});
test('an existing verified customer can enroll on password login after email is allowlisted', async () => {
  await Bootstrap.deleteMany({}); await User.deleteMany({ role: 'admin' });
  // Isolated simulation of the pre-setup state; a deployed app never deletes its latch.
  const hash = await bcrypt.hash(password, 12);
  await User.create({ name: 'Late Owner', email: 'late-owner@example.com', passwordHash: hash, emailVerifiedAt: new Date() });
  runtime.app.set('initialAdminEmail', 'late-owner@example.com');
  const client = new Client(runtime.app); await client.initialize();
  assert.equal((await client.call('post', '/auth/login', { email: 'late-owner@example.com', password })).body.user.role, 'admin');
  assert.equal(await Bootstrap.countDocuments(), 1);
});
test('already existing admins seal setup instead of granting another account', async () => {
  await Bootstrap.deleteMany({}); await sealExistingAdmin();
  const latch = await Bootstrap.findById('initial-admin'); assert.equal(latch.reason, 'admin-exists');
  runtime.app.set('initialAdminEmail', 'customer@example.com');
  const client = new Client(runtime.app); await client.initialize();
  assert.equal((await client.call('post', '/auth/login', { email: 'customer@example.com', password })).body.user.role, 'customer');
});
