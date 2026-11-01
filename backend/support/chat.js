/** Support chat HTTP API, adapted from RomBuzz's persist-before-publish and unread flows. */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { loadHistory } from './history.js';
import { inboxRecords, preferenceFor, historyCutoff } from './inbox.js';
import { Conversation, Message, User, Preference } from './models.js';
import { authorizeConversation, ensureConversation, requireActiveCustomer } from './permissions.js';
import { photoUrl } from './storage.js';
import { publicMessage, publicUser } from './presentation.js';
import { objectId, text, fail, wrap } from './errors.js';
import { persistMessage } from './chatPersistence.js';
export const chat = Router();
chat.post('/conversation', wrap(async (req, res) => {
  if (req.user.role !== 'customer') fail(403, 'Choose a customer from your inbox.');
  const conversation = await ensureConversation(req.user._id);
  res.json({ conversation: await conversationView(conversation, req.user) });
}));
export async function conversationView(c, user) {
  const customer = await User.findById(c.customerId);
  const pref = await preferenceFor(c, user);
  const readAt = user.role === 'admin' ? c.adminReadAt : c.customerReadAt;
  const cutoff = pref.hiddenAt || new Date(0);
  const visible = { conversationId: c._id, hiddenFor: { $ne: user._id }, createdAt: { $gt: cutoff } };
  const unread = await Message.countDocuments({ ...visible, deletedForAllAt: null,
    senderRole: user.role === 'admin' ? 'customer' : 'admin', createdAt: { $gt: new Date(Math.max(+readAt, +cutoff)) } });
  const last = await Message.findOne(visible).sort({ _id: -1 }).select('text imageKey deletedForAllAt');
  return { id: String(c._id), status: c.status, preview: last ? last.deletedForAllAt ? 'Message unsent' : last.text.slice(0, 100) || 'Photo' : '',
    lastMessageAt: c.lastMessageAt?.getTime() > 0 ? c.lastMessageAt : null,
    customerReadAt: c.customerReadAt, adminReadAt: c.adminReadAt, unread,
    pinnedAt: pref.pinnedAt || null, muted: !!pref.muted, customer: customer ? await publicUser(customer) : null };
}
chat.get('/conversations', wrap(async (req, res) => {
  const { records, next } = await inboxRecords(req.user, req.query);
  const conversations = await Promise.all(records.map(c => conversationView(c, req.user)));
  const muted = await Preference.find({ userId: req.user._id, muted: true }).select('conversationId');
  res.json({ conversations, next, mutedConversationIds: muted.map(p => String(p.conversationId)) });
}));
chat.get('/conversations/:id', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user);
  res.json({ conversation: await conversationView(c, req.user) });
}));
chat.get('/conversations/:id/messages', wrap(async (req, res) => {
  const conversation = await authorizeConversation(req.params.id, req.user);
  const data = await loadHistory(conversation, req.user, req.query);
  res.json({ ...data, conversation: await conversationView(conversation, req.user) });
}));
chat.get('/conversations/:id/messages/:messageId/photo', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user);
  const message = await Message.findOne({ _id: objectId(req.params.messageId), conversationId: c._id });
  if (!message?.imageKey || message.deletedForAllAt || message.hiddenFor?.some(id => String(id) === String(req.user._id)) || message.createdAt <= await historyCutoff(c, req.user)) fail(404, 'Photo not found.');
  res.json({ url: await photoUrl(message.imageKey) });
}));
chat.post('/conversations/:id/messages', rateLimit({ windowMs: 60000, limit: 60,
  message: { message: 'Please slow down before sending more messages.' } }), wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user); await requireActiveCustomer(c);
  const clientId = text(req.body.clientId, 100) || randomUUID();
  if (!/^[\w-]{8,100}$/.test(clientId)) fail(400, 'Invalid message reference.');
  const { message, inserted } = await persistMessage(c, req.user, { ...req.body, clientId });
  const payload = await publicMessage(message); const io = req.app.get('io');
  if (inserted) io.to(`user:${c.customerId}`).to('admins').emit('chat:message', payload);
  res.status(inserted ? 201 : 200).json({ message: payload });
}));
chat.post('/conversations/:id/read', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user);
  const message = await Message.findOne({ _id: objectId(req.body.messageId), conversationId: c._id });
  if (!message) fail(404, 'Message not found.');
  const field = req.user.role === 'admin' ? 'adminReadAt' : 'customerReadAt';
  const updated = await Conversation.findByIdAndUpdate(c._id, { $max: { [field]: message.createdAt } }, { new: true });
  req.app.get('io').to(`user:${c.customerId}`).to('admins').emit('chat:read', {
    conversationId: String(c._id), field, at: updated[field],
  }); res.json({ ok: true });
}));
