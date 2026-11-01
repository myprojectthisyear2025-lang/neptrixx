/** Customer/admin profile settings and password-confirmed customer account deletion. */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User, Asset, Conversation, Message, Subscription, Code, PushJob, Preference } from './models.js';
import { publicUser } from './presentation.js';
import { removePhoto } from './storage.js';
import { text, fail, wrap } from './errors.js';
export const profile = Router();
profile.patch('/profile', wrap(async (req, res) => {
  const changes = {};
  if (req.body.name !== undefined) { changes.name = text(req.body.name, 100); if (changes.name.length < 2) fail(400, 'Enter your full name.'); }
  if (req.body.phone !== undefined) {
    changes.phone = text(req.body.phone, 25);
    if (changes.phone && !/^\+[1-9]\d{6,14}$/.test(changes.phone)) fail(400, 'Use an international phone number with country code.');
  }
  if (req.body.pushEnabled !== undefined) changes.pushEnabled = req.body.pushEnabled === true;
  if (req.body.avatarKey !== undefined) {
    const key = text(req.body.avatarKey, 300);
    if (key && !await Asset.exists({ key, ownerId: req.user._id, purpose: 'avatar' })) fail(403, 'Profile photo not found.');
    changes.avatarKey = key;
  }
  const old = req.user.avatarKey;
  Object.assign(req.user, changes); await req.user.save();
  if (changes.avatarKey !== undefined && old && old !== changes.avatarKey) {
    await removePhoto(old).then(() => Asset.deleteOne({ key: old })).catch(() => console.warn('Old avatar cleanup will retry.'));
  }
  res.json({ user: await publicUser(req.user) });
}));
profile.delete('/profile', wrap(async (req, res) => {
  if (req.user.role === 'admin') fail(403, 'Admin accounts must be managed by the site owner.');
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) fail(400, 'Password is incorrect.');
  // Keep the account available for a retry if cloud storage cannot be cleaned up.
  const conversations = await Conversation.find({ customerId: user._id }).select('_id');
  const ids = conversations.map(c => c._id);
  const assets = await Asset.find({ $or: [{ ownerId: user._id }, { conversationId: { $in: ids } }] });
  for (const asset of assets) { await removePhoto(asset.key); await asset.deleteOne(); }
  await Message.deleteMany({ conversationId: { $in: ids } });
  await PushJob.deleteMany({ conversationId: { $in: ids } });
  await Conversation.deleteMany({ customerId: user._id });
  await Preference.deleteMany({ $or: [{ userId: user._id }, { conversationId: { $in: ids } }] });
  await Subscription.deleteMany({ userId: user._id }); await Code.deleteMany({ email: user.email });
  await user.deleteOne(); req.app.get('io').in(`user:${user._id}`).disconnectSockets(true);
  await new Promise(resolve => req.session.destroy(resolve));
  res.clearCookie('neptrixx.sid', { secure: true, httpOnly: true, sameSite: 'lax' }); res.json({ ok: true });
}));
