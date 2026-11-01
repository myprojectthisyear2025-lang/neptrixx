/** Standards-based browser push subscriptions; only known push providers can receive requests. */
import { Router } from 'express';
import webpush from 'web-push';
import { Subscription } from './models.js';
import { fail, wrap } from './errors.js';
export const push = Router();
export function validEndpoint(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com',
        'wns2-db5p.notify.windows.com'].some(host => u.hostname === host) ||
      u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      (u.hostname.endsWith('.push.apple.com') || u.hostname.endsWith('.notify.windows.com'));
  } catch { return false; }
}
export function configurePush() {
  webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT, process.env.WEB_PUSH_PUBLIC_KEY, process.env.WEB_PUSH_PRIVATE_KEY);
}
push.post('/push/status', wrap(async (req, res) => {
  const exists = typeof req.body.endpoint === 'string' && await Subscription.exists({ userId: req.user._id, endpoint: req.body.endpoint });
  res.json({ enabled: req.user.pushEnabled && !!exists, publicKey: process.env.WEB_PUSH_PUBLIC_KEY });
}));
push.get('/push/config', (_req, res) => res.json({ publicKey: process.env.WEB_PUSH_PUBLIC_KEY }));
push.post('/push', wrap(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (typeof endpoint !== 'string' || endpoint.length > 3000 || !validEndpoint(endpoint) ||
    !/^[\w-]{80,100}$/.test(keys?.p256dh || '') || !/^[\w-]{20,30}$/.test(keys?.auth || '')) fail(400, 'Invalid notification subscription.');
  await Subscription.findOneAndUpdate({ endpoint }, { $set: { userId: req.user._id, keys } }, { upsert: true });
  res.json({ ok: true });
}));
push.delete('/push', wrap(async (req, res) => {
  await Subscription.deleteOne({ userId: req.user._id, endpoint: req.body.endpoint }); res.json({ ok: true });
}));
export async function deliver(subscription, payload) {
  try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys.toObject() },
      JSON.stringify(payload), { TTL: 3600, urgency: 'high', timeout: 15000 });
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) { await subscription.deleteOne(); return; }
    throw error;
  }
}
