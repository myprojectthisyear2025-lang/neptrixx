/** Photo-required email signup; only a verified code can claim the pending private avatar and original profile. */
import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Asset, Code } from './models.js';
import { upload, uploadCapacity } from './photoUpload.js';
import { putPhoto, removePhoto } from './storage.js';
import { issueCode, consumeCode } from './codes.js';
import { bootstrapAdmin } from './bootstrap.js';
import { announceCustomer } from './registration.js';
import { establish, csrfToken } from './security.js';
import { publicUser } from './presentation.js';
import { emailOf, validEmail, validPassword, text, fail, wrap } from './errors.js';
export const signup = Router();
signup.post('/signup', uploadCapacity, upload.single('photo'), wrap(async (req, res) => {
  const email = emailOf(req.body.email); validEmail(email); validPassword(req.body.password);
  const name = text(req.body.name, 100); const phone = text(req.body.phone, 25);
  if (name.length < 2) fail(400, 'Enter your full name.');
  if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) fail(400, 'Use an international phone number, such as +9779800000000.');
  if (!req.file) fail(400, 'Add one profile photo to create your account.');
  if (await User.exists({ email })) fail(409, 'An account already exists. Log in or reset your password.');
  const recent = await Code.exists({ email, purpose: 'signup', sentAt: { $gt: new Date(Date.now() - 60000) } });
  if (recent) fail(429, 'Wait 60 seconds before requesting another code.');
  const id = new mongoose.Types.ObjectId(); const key = await putPhoto(String(id), 'avatar', req.file.buffer);
  try {
    await Asset.create({ key, ownerId: id, purpose: 'avatar' });
    await issueCode(email, 'signup', { name, phone, userId: String(id), avatarKey: key, passwordHash: await bcrypt.hash(req.body.password, 12) });
  } catch (e) {
    await removePhoto(key).then(() => Asset.deleteOne({ key })).catch(() => console.warn('Pending signup photo cleanup will retry.')); throw e;
  }
  req.session.signupEmail = email; req.session.signupId = String(id);
  res.json({ message: 'Check your email for a verification code.' });
}));
signup.post('/resend-signup', wrap(async (req, res) => {
  const email = emailOf(req.body.email); validEmail(email);
  const record = await Code.findOne({ email, purpose: 'signup', expiresAt: { $gt: new Date() } });
  if (!record?.pending?.avatarKey || req.session.signupEmail !== email || req.session.signupId !== record.pending.userId) {
    fail(400, 'Start signup again and choose your profile photo.');
  }
  await issueCode(email, 'signup', record.pending.toObject());
  res.json({ message: 'A new verification code was sent.' });
}));
signup.post('/verify', wrap(async (req, res) => {
  const email = emailOf(req.body.email); validEmail(email);
  const pending = await consumeCode(email, 'signup', req.body.code);
  if (!pending.avatarKey || !pending.userId || !await Asset.exists({ key: pending.avatarKey,
    ownerId: pending.userId, purpose: 'avatar' })) fail(400, 'Start signup again with a profile photo.');
  const created = await User.create({ _id: pending.userId, email, name: pending.name, phone: pending.phone,
    passwordHash: pending.passwordHash, avatarKey: pending.avatarKey, emailVerifiedAt: new Date(),
    signupSnapshot: { name: pending.name, email, phone: pending.phone, photoKey: pending.avatarKey, capturedAt: new Date(), source: 'signup' } });
  const user = await bootstrapAdmin(created, req.app.get('initialAdminEmail'));
  await announceCustomer(user, req.app.get('io')); await establish(req, user);
  res.status(201).json({ user: await publicUser(user), csrf: csrfToken(req) });
}));
