/** Mongo-backed push retries and cleanup of abandoned uploads; call from one Render service. */
import { PushJob, Subscription, User, Conversation, Message, Asset, Preference } from './models.js';
import { deliver } from './push.js';
import { removePhoto } from './storage.js';
let busy = false;
export async function processJobs() {
  if (busy) return; busy = true;
  try {
    for (let i = 0; i < 20; i++) {
      const job = await PushJob.findOneAndUpdate({ done: { $ne: true }, attempts: { $lt: 8 },
        availableAt: { $lte: new Date() }, lockedUntil: { $lte: new Date() } },
      { $set: { lockedUntil: new Date(Date.now() + 120000) }, $inc: { attempts: 1 } }, { new: true });
      if (!job) break;
      try {
        const c = await Conversation.findById(job.conversationId);
        const message = await Message.findById(job.messageId);
        if (c && message && !message.deletedForAllAt) {
          const recipients = await User.find({ ...(job.senderRole === 'admin' ? { _id: c.customerId } : { role: 'admin' }),
            blocked: false, pushEnabled: true }).select('_id');
          const readAt = job.senderRole === 'admin' ? c.customerReadAt : c.adminReadAt;
          if (message.createdAt > readAt && Date.now() - message.createdAt.getTime() < 3600000) {
            const muted = await Preference.find({ conversationId: c._id, $or: [{ muted: true },
              { hiddenAt: { $gte: message.createdAt } }] }).select('userId');
            const subscriptions = await Subscription.find({ userId: { $in: recipients.map(u => u._id), $nin: [...muted.map(p => p.userId), ...(message.hiddenFor || [])] } });
            const results = await Promise.allSettled(subscriptions.map(s => deliver(s, {
              title: 'Neptrixx', body: 'You have a new message.', tag: `chat-${c._id}`,
              path: `${job.senderRole === 'admin' ? '/messages' : '/admin/messages'}?conversation=${c._id}`,
            })));
            if (results.some(r => r.status === 'rejected')) throw new Error('Push delivery incomplete');
          }
        }
        await PushJob.updateOne({ _id: job._id }, { $set: { done: true } });
      } catch {
        await PushJob.updateOne({ _id: job._id }, { $set: {
          availableAt: new Date(Date.now() + Math.min(3600000, 5000 * 2 ** job.attempts)), lockedUntil: new Date(0),
        } });
      }
    }
  } finally { busy = false; }
}
export async function cleanupUploads() {
  const assets = await Asset.find({ messageId: null, createdAt: { $lt: new Date(Date.now() - 86400000) } }).limit(100);
  for (const asset of assets) {
    if (await User.exists({ $or: [{ avatarKey: asset.key }, { 'signupSnapshot.photoKey': asset.key }] }) || await Message.exists({ imageKey: asset.key })) continue;
    await removePhoto(asset.key); await asset.deleteOne();
  }
}
export function startJobs() {
  const push = setInterval(() => processJobs().catch(() => console.warn('Push worker unavailable')), 5000);
  const cleanup = setInterval(() => cleanupUploads().catch(() => console.warn('Upload cleanup unavailable')), 3600000);
  push.unref(); cleanup.unref();
  return () => { clearInterval(push); clearInterval(cleanup); };
}
