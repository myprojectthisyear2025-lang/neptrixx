/** Signup-photo enforcement, immutable admin-only cards, media retention, inbox categories, and device subscription state. */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { S3Client } from '@aws-sdk/client-s3';
import { setup, Client, testPhoto } from './helpers.js';
import { User, Code, Asset, Conversation, Subscription } from '../support/models.js';
import { cleanupUploads } from '../support/jobs.js';
let env, customer, admin, outsider, id, conversation, originalPhoto;
const password = 'A registration test password 123!'; const email = 'tom@example.com'; const mail = new Map(); const originalFetch = global.fetch;
before(async () => {
  global.fetch = async (url, options) => { assert.equal(url, 'https://api.resend.com/emails'); const body = JSON.parse(options.body);
    mail.set(body.to[0], body.text.match(/\b\d{6}\b/)[0]); return { ok: true }; };
  env = await setup(); customer = new Client(env.app); outsider = new Client(env.app); admin = new Client(env.app);
  await customer.initialize(); await outsider.initialize(); await admin.initialize();
  await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: await bcrypt.hash(password, 4), role: 'admin' });
  assert.equal((await admin.call('post', '/auth/login', { email: 'admin@example.com', password })).status, 200);
});
after(async () => { global.fetch = originalFetch; if (env) await env.close(); });
const details = { name: 'Tom Original', email, phone: '+9779800000000', password, role: 'admin', avatarKey: 'stolen/key.webp' };
test('signup rejects missing photos and disguised files before creating an account or code', async () => {
  assert.equal((await customer.call('post', '/auth/signup', details)).status, 400);
  assert.equal((await customer.call('post', '/auth/signup', details, {}, Buffer.from('not an image'))).status, 400);
  assert.equal(await User.countDocuments({ email }), 0); assert.equal(await Code.countDocuments({ email }), 0);
  assert.equal((await customer.call('post', '/auth/signup', details, {}, Buffer.alloc(8 * 1024 * 1024 + 1))).status, 400);
});
test('signup saves one validated pending photo; a code must be verified before appearing in the admin inbox', async () => {
  assert.equal((await customer.call('post', '/auth/signup', details, {}, testPhoto)).status, 200);
  const pending = await Code.findOne({ email, purpose: 'signup' }); originalPhoto = pending.pending.avatarKey;
  assert.ok(originalPhoto.endsWith('.webp')); assert.notEqual(originalPhoto, details.avatarKey);
  assert.equal(await Asset.countDocuments({ key: originalPhoto }), 1); assert.equal(await User.countDocuments({ email }), 0);
  assert.equal((await admin.call('get', '/conversations')).body.conversations.length, 0);
});
test('code resend preserves the same photo and cannot be hijacked from another session', async () => {
  await Code.updateOne({ email }, { $set: { sentAt: new Date(Date.now() - 61000) } });
  assert.equal((await outsider.call('post', '/auth/resend-signup', { email })).status, 400);
  assert.equal((await customer.call('post', '/auth/resend-signup', { email, avatarKey: 'evil' })).status, 200);
  assert.equal((await Code.findOne({ email })).pending.avatarKey, originalPhoto); assert.equal(await Asset.countDocuments(), 1);
});
test('verified signup immediately creates a private original profile card and customer conversation', async () => {
  const verified = await customer.call('post', '/auth/verify', { email, code: mail.get(email), name: 'Forged', role: 'admin' });
  assert.equal(verified.status, 201); id = verified.body.user.id; assert.equal(verified.body.user.role, 'customer');
  assert.equal(verified.body.user.signupSnapshot, undefined); assert.ok(verified.body.user.avatarUrl);
  const inbox = (await admin.call('get', '/conversations')).body.conversations; assert.equal(inbox.length, 1);
  conversation = inbox[0].id; assert.equal(inbox[0].preview, 'Customer profile'); assert.ok(inbox[0].lastMessageAt);
  const owner = await customer.call('get', `/conversations/${conversation}/messages`); assert.equal('profileCard' in owner.body, false);
  const record = (await admin.call('get', `/conversations/${conversation}/messages`)).body.profileCard;
  assert.equal(record.name, 'Tom Original'); assert.equal(record.email, email); assert.equal(record.phone, details.phone); assert.equal(record.source, 'signup'); assert.ok(record.photoUrl);
  assert.equal((await customer.call('get', `/admin/customers/${id}/profile-card`)).status, 403);
  assert.equal((await new Client(env.app).call('get', `/admin/customers/${id}/profile-card`)).status, 401);
});
test('profile and verified email changes do not rewrite the card or delete its original photo', async () => {
  const originalSend = S3Client.prototype.send; const deleted = [];
  S3Client.prototype.send = async command => { if (command.constructor.name === 'DeleteObjectCommand') deleted.push(command.input.Key); return {}; };
  try {
    const changed = await customer.call('patch', '/profile', { name: 'Tom New Name', phone: '+9779811111111', avatarKey: '', signupSnapshot: { name: 'Forged' } });
    assert.equal(changed.status, 200); assert.equal(changed.body.user.name, 'Tom New Name'); assert.equal(changed.body.user.signupSnapshot, undefined);
    assert.equal((await customer.call('post', '/profile/email/code', { email: 'newtom@example.com', password })).status, 200);
    assert.equal((await customer.call('post', '/profile/email/confirm', { email: 'newtom@example.com', code: mail.get('newtom@example.com') })).status, 200);
    const card = (await admin.call('get', `/admin/customers/${id}/profile-card`)).body.profileCard;
    assert.equal(card.name, details.name); assert.equal(card.email, email); assert.equal(card.phone, details.phone); assert.ok(card.photoUrl);
    assert.equal((await customer.call('delete', '/uploads', { key: originalPhoto })).status, 404);
    await Asset.collection.updateOne({ key: originalPhoto }, { $set: { createdAt: new Date(Date.now() - 2 * 86400000) } });
    await cleanupUploads(); assert.equal(deleted.includes(originalPhoto), false); assert.equal(await Asset.countDocuments({ key: originalPhoto }), 1);
  } finally { S3Client.prototype.send = originalSend; }
});
test('chat deletion cannot erase the account record and its card cannot be unsent as a message', async () => {
  assert.equal((await admin.call('patch', `/admin/conversations/${conversation}/preferences`, { deleteForMe: true })).status, 200);
  const history = await admin.call('get', `/conversations/${conversation}/messages`); assert.equal(history.body.profileCard.name, details.name);
  assert.equal((await customer.call('patch', `/conversations/${conversation}/messages/registration-${id}`, { action: 'unsend' })).status, 400);
});
test('legacy users stay usable and their card is labeled as a later capture rather than original signup', async () => {
  const legacy = await User.create({ name: 'Legacy Name', email: 'legacy@example.com', passwordHash: await bcrypt.hash(password, 4) });
  const client = new Client(env.app); await client.initialize(); assert.equal((await client.call('post', '/auth/login', { email: legacy.email, password })).status, 200);
  await client.call('patch', '/profile', { name: 'Later Name' });
  const record = (await admin.call('get', `/admin/customers/${legacy._id}/profile-card`)).body.profileCard;
  assert.equal(record.source, 'existing'); assert.equal(record.name, 'Legacy Name'); assert.equal(record.photoUrl, ''); assert.ok(record.capturedAt);
});
test('muted, blocked, and pinned categories are selected on the server', async () => {
  const c = await Conversation.findOne({ customerId: id });
  await admin.call('patch', `/admin/conversations/${c._id}/preferences`, { pinned: true, muted: true });
  await User.updateOne({ _id: id }, { $set: { blocked: true } });
  assert.deepEqual((await admin.call('get', '/conversations?filter=blocked')).body.conversations.map(c => c.id), [String(c._id)]);
  await User.updateOne({ _id: id }, { $set: { blocked: false } });
  // Restore visibility after the prior private deletion with a newer message timestamp.
  await Conversation.updateOne({ _id: c._id }, { $set: { lastMessageAt: new Date(Date.now() + 1000) } });
  for (const filter of ['muted', 'pinned']) assert.deepEqual((await admin.call('get', `/conversations?filter=${filter}`)).body.conversations.map(c => c.id), [String(c._id)]);
  await User.updateOne({ _id: id }, { $set: { blocked: true } });
  assert.deepEqual((await admin.call('get', '/conversations?filter=blocked')).body.conversations.map(c => c.id), [String(c._id)]);
  await User.updateOne({ _id: id }, { $set: { blocked: false } });
});
test('device status requires the subscription to belong to this account and notifications to be enabled', async () => {
  const endpoint = 'https://fcm.googleapis.com/registration-test'; await Subscription.create({ userId: id, endpoint, keys: { p256dh: 'test', auth: 'test' } });
  process.env.WEB_PUSH_PUBLIC_KEY = 'test-public-key';
  assert.equal((await customer.call('post', '/push/status', { endpoint })).body.enabled, true);
  assert.equal((await admin.call('post', '/push/status', { endpoint })).body.enabled, false);
  await customer.call('patch', '/profile', { pushEnabled: false });
  assert.equal((await customer.call('post', '/push/status', { endpoint })).body.enabled, false);
});
test('explicit account deletion still removes the original card and retained photo under the existing policy', async () => {
  assert.equal((await customer.call('delete', '/profile', { password })).status, 200);
  assert.equal(await User.countDocuments({ _id: id }), 0); assert.equal(await Asset.countDocuments({ key: originalPhoto }), 0);
  assert.equal((await admin.call('get', `/admin/customers/${id}/profile-card`)).status, 404);
});
