/** Immutable private account record; legacy accounts are honestly labeled as captured later. */
import { Router } from 'express';
import { User, Conversation } from './models.js';
import { photoUrl } from './storage.js';
import { adminOnly } from './security.js';
import { objectId, fail, wrap } from './errors.js';
export async function ensureSnapshot(id) {
  const user = await User.findById(id).select('+signupSnapshot');
  if (!user || user.role !== 'customer') return null;
  if (!user.signupSnapshot) {
    const record = { name: user.name, email: user.email, phone: user.phone, photoKey: user.avatarKey,
      capturedAt: new Date(), source: 'existing' };
    // Only this first-write path bypasses Mongoose's immutable field; the missing-field match prevents overwrites.
    await User.collection.updateOne({ _id: user._id, signupSnapshot: { $exists: false } }, { $set: { signupSnapshot: record } });
    return User.findById(id).select('+signupSnapshot');
  }
  return user;
}
export async function registrationCard(customerId) {
  const user = await ensureSnapshot(customerId); if (!user) return null;
  const record = user.signupSnapshot;
  return { id: `registration-${user._id}`, customerId: String(user._id), name: record.name, email: record.email,
    phone: record.phone, photoUrl: await photoUrl(record.photoKey), registeredAt: user.createdAt,
    capturedAt: record.capturedAt, source: record.source };
}
export async function announceCustomer(user, io) {
  if (user.role !== 'customer') return;
  await ensureSnapshot(user._id);
  let result;
  try {
    result = await Conversation.updateOne({ customerId: user._id }, { $setOnInsert: {
      customerId: user._id, profileCardAt: new Date(), lastMessageAt: new Date(), preview: 'Customer profile',
    } }, { upsert: true });
  } catch (e) { if (e.code !== 11000) throw e; }
  if (result?.upsertedCount) io.to('admins').emit('chat:customer', { customerId: String(user._id) });
}
export const registration = Router(); registration.use(adminOnly);
registration.get('/customers/:id/profile-card', wrap(async (req, res) => {
  const card = await registrationCard(objectId(req.params.id)); if (!card) fail(404, 'Customer not found.');
  res.json({ profileCard: card });
}));
