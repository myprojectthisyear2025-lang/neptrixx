/** Authenticated photo upload through Render; only validated WebP output reaches private R2. */
import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { Asset } from './models.js';
import { authorizeConversation, requireActiveCustomer } from './permissions.js';
import { putPhoto, photoUrl, removePhoto } from './storage.js';
import { fail, wrap } from './errors.js';
export const uploads = Router();
let inFlight = 0;
function uploadCapacity(req, res, next) {
  if (inFlight >= 2) return res.status(429).json({ message: 'Photo uploads are busy. Please try again in a moment.' });
  inFlight += 1; let released = false;
  const release = () => { if (!released) { released = true; inFlight -= 1; } };
  res.once('finish', release); res.once('close', release); next();
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 3 } });
uploads.post('/uploads', rateLimit({ windowMs: 60000, limit: 12,
  message: { message: 'Please wait before uploading more photos.' } }), uploadCapacity, upload.single('photo'), wrap(async (req, res) => {
  const purpose = req.body.purpose;
  if (!['avatar', 'chat'].includes(purpose) || !req.file) fail(400, 'Choose a photo to upload (maximum 8 MB).');
  let conversation = null;
  if (purpose === 'chat') {
    conversation = await authorizeConversation(req.body.conversationId, req.user); await requireActiveCustomer(conversation);
  }
  const key = await putPhoto(String(req.user._id), purpose, req.file.buffer);
  try { await Asset.create({ key, ownerId: req.user._id, purpose, conversationId: conversation?._id }); }
  catch (e) { await removePhoto(key).catch(() => {}); throw e; }
  res.status(201).json({ key, url: await photoUrl(key) });
}));
uploads.delete('/uploads', wrap(async (req, res) => {
  const asset = await Asset.findOne({ key: req.body.key, ownerId: req.user._id, messageId: null });
  if (!asset || req.user.avatarKey === asset.key) fail(404, 'Unused upload not found.');
  await removePhoto(asset.key); await asset.deleteOne(); res.json({ ok: true });
}));
