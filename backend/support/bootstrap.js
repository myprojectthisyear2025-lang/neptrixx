/** One-time admin enrollment: only an email-verified allowlisted account can claim the setup slot. */
import mongoose from 'mongoose';
import { User, Bootstrap } from './models.js';
export async function bootstrapAdmin(user, allowedEmail) {
  const email = String(allowedEmail || '').trim().toLowerCase();
  if (!email || user.email !== email || !user.emailVerifiedAt || user.blocked || user.role === 'admin') return user;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // This latch is never removed by disable/re-enable or an admin's email change.
      if (await Bootstrap.exists({ _id: 'initial-admin' }).session(session)) return;
      const existing = await User.findOne({ role: 'admin' }).session(session);
      if (existing) {
        await Bootstrap.create([{ _id: 'initial-admin', userId: existing._id, reason: 'admin-exists' }], { session });
        return;
      }
      const promoted = await User.findOneAndUpdate({ _id: user._id, email, role: 'customer', blocked: false },
        { $set: { role: 'admin' }, $inc: { sessionVersion: 1 } }, { new: true, session });
      if (promoted) await Bootstrap.create([{ _id: 'initial-admin', userId: promoted._id, reason: 'verified-owner' }], { session });
    });
  } catch (error) {
    // A parallel verified login can already have claimed the unique setup slot.
    if (error.code !== 11000) throw error;
  } finally { await session.endSession(); }
  return User.findById(user._id);
}

export async function sealExistingAdmin() {
  if (await Bootstrap.exists({ _id: 'initial-admin' })) return;
  const user = await User.findOne({ role: 'admin' });
  if (!user) return;
  try { await Bootstrap.create({ _id: 'initial-admin', userId: user._id, reason: 'admin-exists' }); }
  catch (error) { if (error.code !== 11000) throw error; }
}
