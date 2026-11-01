/** Browser-safe account/message payloads; photo URLs expire after fifteen minutes. */
import { presenceFor } from './presence.js';
import { photoUrl } from './storage.js';
export async function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, phone: user.phone,
    role: user.role, blocked: user.blocked, pushEnabled: user.pushEnabled,
    avatarUrl: await photoUrl(user.avatarKey), createdAt: user.createdAt, ...presenceFor(user) };
}
export async function publicMessage(message) {
  const removed = !!message.deletedForAllAt;
  return { id: String(message._id), conversationId: String(message.conversationId),
    senderId: String(message.senderId), senderRole: message.senderRole, clientId: message.clientId,
    text: removed ? '' : message.text, imageUrl: removed ? '' : await photoUrl(message.imageKey),
    deletedForAll: removed, editedAt: message.editedAt || null, revision: message.revision || 0,
    reactions: removed ? [] : (message.reactions || []).map(r => ({ userId: String(r.userId), emoji: r.emoji })),
    replyTo: !removed && message.replyTo ? String(message.replyTo) : null, createdAt: message.createdAt };
}
