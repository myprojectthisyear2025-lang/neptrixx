/** Browser-safe account/message payloads; photo URLs expire after fifteen minutes. */
import { photoUrl } from './storage.js';
export async function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, phone: user.phone,
    role: user.role, blocked: user.blocked, pushEnabled: user.pushEnabled,
    avatarUrl: await photoUrl(user.avatarKey), createdAt: user.createdAt };
}
export async function publicMessage(message) {
  return { id: String(message._id), conversationId: String(message.conversationId),
    senderId: String(message.senderId), senderRole: message.senderRole, clientId: message.clientId,
    text: message.text, imageUrl: await photoUrl(message.imageKey),
    replyTo: message.replyTo ? String(message.replyTo) : null, createdAt: message.createdAt };
}
