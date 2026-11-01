/** Expiring hashed email codes with database-enforced resend and attempt limits. */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Code } from './models.js';
import { fail } from './errors.js';
import { sendCode } from './email.js';
const digest = (email, purpose, value) => createHmac('sha256', process.env.SESSION_SECRET)
  .update(`${email}:${purpose}:${value}`).digest('hex');
export async function issueCode(email, purpose, pending = {}) {
  const now = new Date();
  const value = String(randomInt(100000, 1000000));
  // Conditional upsert + unique index prevents concurrent resends bypassing cooldown.
  let record;
  try {
    record = await Code.findOneAndUpdate({ email, purpose, $or: [
      { sentAt: { $lte: new Date(Date.now() - 60000) } }, { sentAt: { $exists: false } },
    ] }, { $set: { hash: digest(email, purpose, value), sentAt: now,
      expiresAt: new Date(Date.now() + 600000), attempts: 0, pending } }, { upsert: true, new: true });
  } catch (e) { if (e.code === 11000) fail(429, 'Wait 60 seconds before requesting another code.'); throw e; }
  try { await sendCode(email, value, purpose); }
  catch (e) { await Code.deleteOne({ _id: record._id, hash: record.hash }); throw e; }
}
export async function consumeCode(email, purpose, value) {
  if (!/^\d{6}$/.test(String(value || ''))) fail(400, 'Enter the six-digit email code.');
  const record = await Code.findOneAndUpdate({ email, purpose, attempts: { $lt: 5 },
    expiresAt: { $gt: new Date() } }, { $inc: { attempts: 1 } }, { new: true });
  if (!record) fail(400, 'Code expired or too many attempts. Request a new code.');
  const actual = Buffer.from(digest(email, purpose, value), 'hex');
  if (!timingSafeEqual(actual, Buffer.from(record.hash, 'hex'))) fail(400, 'The code is incorrect.');
  const claimed = await Code.findOneAndDelete({ _id: record._id, hash: record.hash });
  if (!claimed) fail(400, 'This code has already been used.');
  return record.pending;
}
