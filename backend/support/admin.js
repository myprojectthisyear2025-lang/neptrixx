/** Admin-only customer search, new conversations, resolution, and abuse restrictions. */
import { Router } from 'express';
import { User, Conversation } from './models.js';
import { publicUser } from './presentation.js';
import { conversationView } from './chat.js';
import { ensureConversation, authorizeConversation } from './permissions.js';
import { adminOnly } from './security.js';
import { text, objectId, fail, wrap } from './errors.js';
export const admin = Router(); admin.use(adminOnly);
admin.get('/customers', wrap(async (req, res) => {
  const q = text(req.query.q, 100); const query = { role: 'customer' };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    if (/^[a-f\d]{24}$/i.test(q)) query.$or.push({ _id: objectId(q) });
  }
  if (req.query.before) query._id = { $lt: objectId(req.query.before) };
  const users = await User.find(query).sort({ _id: -1 }).limit(50);
  res.json({ customers: await Promise.all(users.map(publicUser)), next: users.length === 50 ? String(users.at(-1)._id) : null });
}));
admin.post('/customers/:id/conversation', wrap(async (req, res) => {
  const customer = await User.findOne({ _id: objectId(req.params.id), role: 'customer' });
  if (!customer) fail(404, 'Customer not found.');
  const c = await ensureConversation(customer._id);
  res.json({ conversation: await conversationView(c, req.user) });
}));
admin.patch('/customers/:id', wrap(async (req, res) => {
  if (typeof req.body.blocked !== 'boolean') fail(400, 'Choose the account restriction.');
  const user = await User.findOneAndUpdate({ _id: objectId(req.params.id), role: 'customer' },
    { $set: { blocked: req.body.blocked }, $inc: { sessionVersion: 1 } }, { new: true });
  if (!user) fail(404, 'Customer not found.');
  await ensureConversation(user._id);
  req.app.get('io').in(`user:${user._id}`).disconnectSockets(true);
  req.app.get('io').to('admins').emit('chat:conversation', { customerId: String(user._id) });
  res.json({ customer: await publicUser(user) });
}));
admin.patch('/conversations/:id', wrap(async (req, res) => {
  if (!['open', 'resolved'].includes(req.body.status)) fail(400, 'Choose Open or Resolved.');
  const c = await authorizeConversation(req.params.id, req.user);
  c.status = req.body.status; await c.save();
  req.app.get('io').to(`user:${c.customerId}`).to('admins').emit('chat:conversation', { id: String(c._id), status: c.status });
  res.json({ conversation: await conversationView(c, req.user) });
}));
