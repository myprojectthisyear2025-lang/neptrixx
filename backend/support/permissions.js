/** Only a conversation's customer and authenticated admins can access it. */
import { Conversation, User } from './models.js';
import { objectId, fail } from './errors.js';
export async function authorizeConversation(id, user) {
  const conversation = await Conversation.findById(objectId(id));
  if (!conversation || (user.role !== 'admin' && String(conversation.customerId) !== String(user._id))) {
    fail(404, 'Conversation not found.');
  }
  return conversation;
}
export async function requireActiveCustomer(conversation) {
  const customer = await User.findOne({ _id: conversation.customerId, role: 'customer', blocked: false });
  if (!customer) fail(403, 'This customer account is unavailable.');
  return customer;
}
export async function ensureConversation(customerId) {
  try { return await Conversation.findOneAndUpdate({ customerId }, { $setOnInsert: { customerId } }, { new: true, upsert: true }); }
  catch (e) { if (e.code === 11000) return Conversation.findOne({ customerId }); throw e; }
}
