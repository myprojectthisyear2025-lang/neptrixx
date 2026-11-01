/** Email changes require both a current login/password and verification of the new address. */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { ensureSnapshot } from './registration.js';
import { User } from './models.js';
import { issueCode, consumeCode } from './codes.js';
import { emailOf, validEmail, fail, wrap } from './errors.js';
import { establish, csrfToken } from './security.js';
import { publicUser } from './presentation.js';
export const emailChange = Router();
emailChange.use('/profile/email', rateLimit({ windowMs: 15 * 60000, limit: 10,
  message: { message: 'Too many email-change attempts. Try again later.' } }));
emailChange.post('/profile/email/code', wrap(async (req, res) => {
  const email = emailOf(req.body.email); validEmail(email);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) fail(400, 'Password is incorrect.');
  if (await User.exists({ email })) fail(409, 'This email address is already in use.');
  await issueCode(email, 'email', { userId: String(user._id) }); res.json({ message: 'A verification code was sent to the new email.' });
}));
emailChange.post('/profile/email/confirm', wrap(async (req, res) => {
  const email = emailOf(req.body.email); validEmail(email);
  const pending = await consumeCode(email, 'email', req.body.code);
  if (pending.userId !== String(req.user._id)) fail(403, 'This verification does not belong to your account.');
  await ensureSnapshot(req.user._id);
  req.user.email = email; req.user.emailVerifiedAt = new Date(); req.user.sessionVersion += 1; await req.user.save();
  req.app.get('io').in(`user:${req.user._id}`).disconnectSockets(true);
  await establish(req, req.user); res.json({ user: await publicUser(req.user), csrf: csrfToken(req) });
}));
