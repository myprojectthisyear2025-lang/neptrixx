/** Admin inbox choices are scoped to the signed-in admin; deletion hides only their history. */
import { Router } from 'express';
import { Preference } from './models.js';
import { authorizeConversation } from './permissions.js';
import { conversationView } from './chat.js';
import { adminOnly } from './security.js';
import { fail, wrap } from './errors.js';
export const preferences = Router(); preferences.use(adminOnly);
preferences.patch('/conversations/:id/preferences', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user); const changes = {};
  if (req.body.pinned !== undefined) {
    if (typeof req.body.pinned !== 'boolean') fail(400, 'Choose whether to pin this conversation.');
    changes.pinnedAt = req.body.pinned ? new Date() : null;
  }
  if (req.body.muted !== undefined) {
    if (typeof req.body.muted !== 'boolean') fail(400, 'Choose whether to mute this conversation.');
    changes.muted = req.body.muted;
  }
  if (req.body.deleteForMe === true) { changes.hiddenAt = new Date(); changes.pinnedAt = null; }
  if (!Object.keys(changes).length) fail(400, 'Choose an inbox action.');
  await Preference.findOneAndUpdate({ userId: req.user._id, conversationId: c._id }, { $set: changes }, { upsert: true });
  const io = req.app.get('io');
  io.to(`user:${req.user._id}`).emit('chat:preference', { conversationId: String(c._id), deleted: req.body.deleteForMe === true });
  res.json({ conversation: await conversationView(c, req.user) });
}));
