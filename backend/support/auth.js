/** Minimal verified signup, password login/recovery, and secure browser sessions. */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { User } from './models.js';
import { signup } from './signup.js';
import { announceCustomer } from './registration.js';
import { issueCode, consumeCode } from './codes.js';
import { authenticated, csrfToken, establish, accountFor } from './security.js';
import { emailOf, validEmail, validPassword, text, fail, wrap } from './errors.js';
import { bootstrapAdmin } from './bootstrap.js';
import { publicUser } from './presentation.js';
export const auth = Router();
auth.get('/session', wrap(async (req, res) => {
  let user = null;
  if (req.session.userId) { try { user = await accountFor(req.session); } catch { /* expired login */ } }
  res.set('Cache-Control', 'no-store').json({ user: user ? await publicUser(user) : null, csrf: csrfToken(req) });
}));
auth.use(rateLimit({ windowMs: 15 * 60000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' } }));
auth.use(signup);
auth.post('/login', wrap(async (req, res) => {
  const email = emailOf(req.body.email);
  let user = await User.findOne({ email }).select('+passwordHash');
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const valid = await bcrypt.compare(password, user?.passwordHash || '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7QKYn8uQjjEeu7fLfQIqLpi8jAq9eMi');
  if (!user || !valid || user.blocked) fail(401, 'Email or password is incorrect, or the account is unavailable.');
  const previousVersion = user.sessionVersion;
  user = await bootstrapAdmin(user, req.app.get('initialAdminEmail'));
  if (user.sessionVersion !== previousVersion) req.app.get('io').in(`user:${user._id}`).disconnectSockets(true);
  await announceCustomer(user, req.app.get('io'));
  await establish(req, user); res.json({ user: await publicUser(user), csrf: csrfToken(req) });
}));
auth.post('/forgot', wrap(async (req, res) => {
  const email = emailOf(req.body.email); validEmail(email);
  if (await User.exists({ email, blocked: false })) await issueCode(email, 'reset');
  res.json({ message: 'If this account exists, a reset code has been sent.' });
}));
auth.post('/reset', wrap(async (req, res) => {
  const email = emailOf(req.body.email); validPassword(req.body.password);
  await consumeCode(email, 'reset', req.body.code);
  const user = await User.findOneAndUpdate({ email, blocked: false }, {
    $set: { passwordHash: await bcrypt.hash(req.body.password, 12) }, $inc: { sessionVersion: 1 },
  });
  if (user) req.app.get('io').in(`user:${user._id}`).disconnectSockets(true);
  await new Promise(resolve => req.session.destroy(resolve));
  res.clearCookie('neptrixx.sid', { secure: true, httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Password changed. Please log in.' });
}));
auth.post('/logout', authenticated, wrap(async (req, res) => {
  req.app.get('io').in(`session:${req.sessionID}`).disconnectSockets(true);
  await new Promise((resolve, reject) => req.session.destroy(e => e ? reject(e) : resolve()));
  res.clearCookie('neptrixx.sid', { secure: true, httpOnly: true, sameSite: 'lax' }); res.json({ ok: true });
}));
