/** Integration-test helpers: isolated Mongo replica set and HTTPS-style cookie/CSRF requests. */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createServer } from 'node:http';
import { createApp, finalizeApp } from '../app.js';
import { sessionMiddleware } from '../support/security.js';
import { installSupportRoutes } from '../support/routes.js';
import { attachRealtime } from '../support/realtime.js';
import * as models from '../support/models.js';
export async function setup(overrides = {}) {
  process.env.SESSION_SECRET = 'test-secret-at-least-thirty-two-characters-long';
  process.env.RESEND_API_KEY = 'test-only'; process.env.EMAIL_FROM = 'test@example.com';
  const replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ args: ['--nounixsocket'] }] });
  const settings = { mongo: replica.getUri(), dbName: 'support_test', secret: process.env.SESSION_SECRET,
    origins: ['https://neptrixx.com'], supportEnabled: true, ...overrides };
  await mongoose.connect(settings.mongo, { dbName: settings.dbName });
  await Promise.all(Object.values(models).map(m => m.init()));
  const sessions = sessionMiddleware(settings); const app = createApp(settings);
  installSupportRoutes(app, sessions, settings); finalizeApp(app);
  const server = createServer(app); const io = attachRealtime(server, app, sessions, settings.origins);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { app, io, server, url: `http://127.0.0.1:${server.address().port}`,
    async close() { await new Promise(resolve => io.close(resolve)); await sessions.store.close(); await mongoose.disconnect(); await replica.stop(); } };
}
export class Client {
  constructor(app) { this.app = app; this.cookie = ''; this.csrf = ''; }
  async call(method, path, body, headers = {}) {
    let req = request(this.app)[method](`/api/support${path}`).set('Origin', 'https://neptrixx.com')
      .set('X-Forwarded-Proto', 'https').set('Cookie', this.cookie).set('X-CSRF-Token', this.csrf).set(headers);
    if (body !== undefined) req = req.send(body);
    const res = await req;
    if (res.headers['set-cookie']) this.cookie = res.headers['set-cookie'][0].split(';')[0];
    if (res.body.csrf) this.csrf = res.body.csrf;
    return res;
  }
  async initialize() { return this.call('get', '/auth/session'); }
}
