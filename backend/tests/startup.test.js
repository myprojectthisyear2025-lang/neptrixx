/** Smoke-test the actual hosted entry point with support off/on and no external provider calls. */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import webpush from 'web-push';
let replica; let uri;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ args: ['--nounixsocket'] }] });
  uri = replica.getUri(); await mongoose.connect(uri, { dbName: 'startup_test' });
});
after(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });
async function launch(enabled) {
  const reservation = createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const keys = webpush.generateVAPIDKeys();
  const env = { ...process.env, NODE_ENV: 'production', CLIENT_ORIGIN: 'https://neptrixx.com',
    MONGODB_URI: uri, MONGODB_DB_NAME: 'startup_test', SUPPORT_ENABLED: String(enabled), PORT: String(port), INITIAL_ADMIN_EMAIL: '' };
  for (const name of ['SESSION_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY', 'WEB_PUSH_SUBJECT']) delete env[name];
  if (enabled) Object.assign(env, { SESSION_SECRET: 'test-session-secret-over-thirty-two-characters',
    RESEND_API_KEY: 'test-only', EMAIL_FROM: 'test@example.com', R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-id', R2_SECRET_ACCESS_KEY: 'test-secret', R2_BUCKET_NAME: 'test-bucket',
    WEB_PUSH_PUBLIC_KEY: keys.publicKey, WEB_PUSH_PRIVATE_KEY: keys.privateKey, WEB_PUSH_SUBJECT: 'mailto:test@example.com' });
  const child = spawn(process.execPath, ['server.js'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env });
  let logs = ''; const exited = new Promise(resolve => child.once('exit', resolve));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Startup timed out: ${logs}`)); }, 15000);
    child.stdout.on('data', data => { logs += data; if (logs.includes('Neptrixx API listening;')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', data => { logs += data; });
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('exit', code => { clearTimeout(timer); if (code) reject(new Error(`Startup failed: ${logs}`)); });
  });
  return { url: `http://127.0.0.1:${port}`, async close() { child.kill('SIGTERM'); assert.equal(await exited, 0); } };
}
test('disabled entry point starts without support secrets or collections', async () => {
  const server = await launch(false);
  try {
    assert.equal((await request(server.url).get('/api/health')).body.supportEnabled, false);
    assert.equal((await request(server.url).get('/api/support/auth/session')).status, 503);
    const collections = await mongoose.connection.db.listCollections().toArray();
    assert.ok(collections.some(c => c.name === 'websiteinquiries'));
    assert.ok(!collections.some(c => c.name.startsWith('support')));
  } finally { await server.close(); }
});
test('enabled entry point installs the module and serves secure sessions', async () => {
  const server = await launch(true);
  try {
    assert.deepEqual((await request(server.url).get('/api/support/status')).body, { enabled: true });
    const session = await request(server.url).get('/api/support/auth/session').set('Origin', 'https://neptrixx.com').set('X-Forwarded-Proto', 'https');
    assert.equal(session.status, 200); assert.equal(session.body.user, null); assert.equal(session.body.csrf.length, 64);
    assert.match(session.headers['set-cookie'][0], /Secure/);
    assert.equal((await request(server.url).get('/api/support/conversations')).status, 401);
  } finally { await server.close(); }
});
