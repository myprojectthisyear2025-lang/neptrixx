/** Atomic support-message persistence: deduplication, photo ownership, inbox update, and push outbox. */
import mongoose from 'mongoose';
import { Asset, Conversation, Message, PushJob } from './models.js';
import { historyCutoff } from './inbox.js';
import { fail, objectId, text } from './errors.js';
export async function persistMessage(conversation, user, input) {
  const body = text(input.text); const imageKey = text(input.imageKey, 300);
  const replyTo = input.replyTo ? objectId(input.replyTo) : null;
  if (!body && !imageKey) fail(400, 'Write a message or attach a photo.');
  if (typeof input.text === 'string' && input.text.length > 4000) fail(400, 'Keep messages under 4,000 characters.');
  const cutoff = replyTo ? await historyCutoff(conversation, user) : null;
  const dbSession = await mongoose.startSession(); let message; let inserted = false;
  try {
    await dbSession.withTransaction(async () => {
      inserted = false;
      message = await Message.findOne({ senderId: user._id, clientId: input.clientId }).session(dbSession);
      if (message) {
        if (String(message.conversationId) !== String(conversation._id) || message.text !== body ||
          message.imageKey !== imageKey || String(message.replyTo || '') !== String(replyTo || '')) {
          fail(409, 'This message reference has already been used for different content.');
        }
        return;
      }
      if (replyTo && !await Message.exists({ _id: replyTo, conversationId: conversation._id, deletedForAllAt: null, hiddenFor: { $ne: user._id }, createdAt: { $gt: cutoff } }).session(dbSession)) {
        fail(400, 'Reply message not found.');
      }
      const id = new mongoose.Types.ObjectId();
      if (imageKey) {
        const asset = await Asset.findOneAndUpdate({ key: imageKey, ownerId: user._id,
          purpose: 'chat', conversationId: conversation._id, messageId: null },
        { $set: { messageId: id } }, { new: true, session: dbSession });
        if (!asset) fail(403, 'Photo is unavailable or already attached.');
      }
      [message] = await Message.create([{ _id: id, conversationId: conversation._id,
        senderId: user._id, senderRole: user.role, clientId: input.clientId, text: body, imageKey, replyTo }], { session: dbSession });
      await Conversation.updateOne({ _id: conversation._id }, { $set: {
        preview: body.slice(0, 100) || 'Photo', lastMessageAt: message.createdAt, status: 'open',
      } }, { session: dbSession });
      await PushJob.create([{ messageId: message._id, conversationId: conversation._id, senderRole: user.role }], { session: dbSession });
      inserted = true;
    });
  } catch (e) {
    // Concurrent identical retries can lose the unique-index race. Re-read the winner safely.
    if (e.code !== 11000) throw e;
    message = await Message.findOne({ senderId: user._id, clientId: input.clientId }); inserted = false;
    if (!message || String(message.conversationId) !== String(conversation._id) || message.text !== body ||
      message.imageKey !== imageKey || String(message.replyTo || '') !== String(replyTo || '')) fail(409, 'Message reference conflict.');
  } finally { await dbSession.endSession(); }
  return { message, inserted };
}
