/** Support chat HTTP API, adapted from RomBuzz's persist-before-publish and unread flows. */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { Conversation, Message, User } from './models.js';
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
  const readAt = user.role === 'admin' ? c.adminReadAt : c.customerReadAt;
  const unread = await Message.countDocuments({ conversationId: c._id,
    senderRole: user.role === 'admin' ? 'customer' : 'admin', createdAt: { $gt: readAt } });
  return { id: String(c._id), status: c.status, preview: c.preview, lastMessageAt: c.lastMessageAt?.getTime() > 0 ? c.lastMessageAt : null,
    customerReadAt: c.customerReadAt, adminReadAt: c.adminReadAt, unread,
    customer: customer ? await publicUser(customer) : null };
}
chat.get('/conversations', wrap(async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { customerId: req.user._id };
  // Sort by recent activity so older customers' new messages stay visible.
  if (req.query.before) {
    const [stamp, id] = String(req.query.before).split('_');
    if (!/^\d{1,16}$/.test(stamp) || !Number.isFinite(new Date(Number(stamp)).getTime())) fail(400, 'Invalid inbox cursor.');
    const date = new Date(Number(stamp));
    query.$or = [{ lastMessageAt: { $lt: date } }, { lastMessageAt: date, _id: { $lt: objectId(id) } }];
  }
  const records = await Conversation.find(query).sort({ lastMessageAt: -1, _id: -1 }).limit(100);
  const conversations = await Promise.all(records.map(c => conversationView(c, req.user)));
  conversations.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  res.json({ conversations, next: records.length === 100 ? `${records.at(-1).lastMessageAt.getTime()}_${records.at(-1)._id}` : null });
}));
chat.get('/conversations/:id', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user);
  res.json({ conversation: await conversationView(c, req.user) });
}));
chat.get('/conversations/:id/messages', wrap(async (req, res) => {
  const conversation = await authorizeConversation(req.params.id, req.user);
  const query = { conversationId: conversation._id };
  if (req.query.before) query._id = { $lt: objectId(req.query.before) };
  const records = await Message.find(query).sort({ _id: -1 }).limit(50).lean();
  res.json({ messages: await Promise.all(records.reverse().map(publicMessage)),
    hasMore: records.length === 50, conversation: await conversationView(conversation, req.user) });
}));
chat.get('/conversations/:id/messages/:messageId/photo', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user);
  const message = await Message.findOne({ _id: objectId(req.params.messageId), conversationId: c._id });
  if (!message?.imageKey) fail(404, 'Photo not found.');
  res.json({ url: await photoUrl(message.imageKey) });
}));
chat.post('/conversations/:id/messages', rateLimit({ windowMs: 60000, limit: 60,
  message: { message: 'Please slow down before sending more messages.' } }), wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user); await requireActiveCustomer(c);
  const clientId = text(req.body.clientId, 100) || randomUUID();
  if (!/^[\w-]{8,100}$/.test(clientId)) fail(400, 'Invalid message reference.');
  const { message, inserted } = await persistMessage(c, req.user, { ...req.body, clientId });
  const payload = await publicMessage(message); const io = req.app.get('io');
  io.to(`user:${c.customerId}`).to('admins').emit('chat:message', payload);
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
