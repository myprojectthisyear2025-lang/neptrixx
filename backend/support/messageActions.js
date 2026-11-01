/** Authorized edits, per-user removal, sender unsend, and atomic one-reaction-per-person updates. */
import { Router } from 'express';
import { Asset, Conversation, Message } from './models.js';
import { authorizeConversation } from './permissions.js';
import { historyCutoff } from './inbox.js';
import { publicMessage } from './presentation.js';
import { removePhoto } from './storage.js';
import { fail, objectId, text, wrap } from './errors.js';
export const messageActions = Router();
const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
messageActions.patch('/conversations/:id/messages/:messageId', wrap(async (req, res) => {
  const c = await authorizeConversation(req.params.id, req.user);
  const query = { _id: objectId(req.params.messageId), conversationId: c._id, hiddenFor: { $ne: req.user._id },
    createdAt: { $gt: await historyCutoff(c, req.user) } };
  const original = await Message.findOne(query); if (!original) fail(404, 'Message not found.');
  const action = req.body.action; let update;
  if (action === 'delete-me') update = { $addToSet: { hiddenFor: req.user._id }, $inc: { revision: 1 } };
  else {
    query.deletedForAllAt = null;
    if (original.deletedForAllAt) fail(409, 'This message was already unsent.');
    if (action === 'edit' || action === 'unsend') {
      if (String(original.senderId) !== String(req.user._id)) fail(403, 'You can only change your own messages.');
      query.senderId = req.user._id;
      if (action === 'edit') {
        if (original.imageKey) fail(400, 'Only text messages can be edited.');
        const body = text(req.body.text);
        if (!body || typeof req.body.text !== 'string' || req.body.text.length > 4000) fail(400, 'Enter 1–4,000 characters.');
        update = { $set: { text: body, editedAt: new Date() }, $inc: { revision: 1 } };
      } else update = { $set: { text: '', imageKey: '', replyTo: null, reactions: [], deletedForAllAt: new Date() }, $inc: { revision: 1 } };
    } else if (action === 'react') {
      const emoji = req.body.emoji;
      if (emoji !== null && !emojis.includes(emoji)) fail(400, 'Choose a supported reaction.');
      update = [{ $set: { reactions: { $concatArrays: [
        { $filter: { input: { $ifNull: ['$reactions', []] }, as: 'r', cond: { $ne: ['$$r.userId', req.user._id] } } },
        emoji ? [{ userId: req.user._id, emoji }] : [],
      ] }, revision: { $add: [{ $ifNull: ['$revision', 0] }, 1] }, updatedAt: new Date() } }];
    } else fail(400, 'Choose a message action.');
  }
  const message = await Message.findOneAndUpdate(query, update, { new: true });
  if (!message) fail(409, 'Message changed. Reload and try again.');
  const io = req.app.get('io');
  if (action === 'delete-me') io.to(`user:${req.user._id}`).emit('chat:hidden', { conversationId: String(c._id), messageId: String(message._id) });
  else {
    io.to(`user:${c.customerId}`).to('admins').emit('chat:updated', await publicMessage(message));
    if (action !== 'react') {
      const last = await Message.findOne({ conversationId: c._id }).sort({ _id: -1 });
      if (String(last?._id) === String(message._id)) await Conversation.updateOne({ _id: c._id }, {
        $set: { preview: message.deletedForAllAt ? 'Message unsent' : message.text.slice(0, 100) || 'Photo' } });
    }
    if (action === 'unsend' && original.imageKey) {
      await Asset.updateOne({ key: original.imageKey }, { $set: { messageId: null } });
      await removePhoto(original.imageKey).then(() => Asset.deleteOne({ key: original.imageKey }))
        .catch(() => console.warn('Unsent photo cleanup will retry.'));
    }
  }
  res.json(action === 'delete-me' ? { hidden: true, messageId: String(message._id) } : { message: await publicMessage(message) });
}));
