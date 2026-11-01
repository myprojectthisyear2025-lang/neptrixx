/** Support-only MongoDB models; no dating relationships or embedded message arrays. */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
export const User = model('SupportUser', new Schema({
  name: { type: String, required: true }, email: { type: String, unique: true, required: true },
  emailVerifiedAt: { type: Date, default: null },
  phone: { type: String, default: '' }, passwordHash: { type: String, required: true, select: false },
  avatarKey: { type: String, default: '' }, role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  blocked: { type: Boolean, default: false }, pushEnabled: { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0 },
}, { timestamps: true }));
export const Code = model('SupportCode', new Schema({
  email: { type: String, required: true }, purpose: { type: String, enum: ['signup', 'reset', 'email'] },
  hash: String, expiresAt: Date, sentAt: Date, attempts: { type: Number, default: 0 },
  pending: { name: String, phone: String, passwordHash: String, userId: String },
}).index({ email: 1, purpose: 1 }, { unique: true }).index({ expiresAt: 1 }, { expireAfterSeconds: 0 }));
export const Conversation = model('SupportConversation', new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'SupportUser', unique: true, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  preview: { type: String, default: '' }, lastMessageAt: { type: Date, default: () => new Date(0) },
  customerReadAt: { type: Date, default: () => new Date(0) },
  adminReadAt: { type: Date, default: () => new Date(0) },
}, { timestamps: true }).index({ lastMessageAt: -1, _id: -1 }));
export const Message = model('SupportMessage', new Schema({
  conversationId: { type: Schema.Types.ObjectId, required: true },
  senderId: { type: Schema.Types.ObjectId, required: true },
  senderRole: { type: String, enum: ['customer', 'admin'], required: true },
  clientId: { type: String, required: true }, text: { type: String, default: '' },
  imageKey: { type: String, default: '' }, replyTo: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true }).index({ senderId: 1, clientId: 1 }, { unique: true })
  .index({ conversationId: 1, createdAt: -1, _id: -1 }));
export const Asset = model('SupportAsset', new Schema({
  key: { type: String, unique: true }, ownerId: { type: Schema.Types.ObjectId, required: true },
  purpose: { type: String, enum: ['avatar', 'chat'] },
  conversationId: { type: Schema.Types.ObjectId, default: null },
  messageId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true }));
export const Subscription = model('SupportSubscription', new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  endpoint: { type: String, unique: true }, keys: { p256dh: String, auth: String },
}, { timestamps: true }));
export const PushJob = model('SupportPushJob', new Schema({
  messageId: { type: Schema.Types.ObjectId, unique: true }, conversationId: Schema.Types.ObjectId,
  senderRole: String, done: { type: Boolean, default: false }, attempts: { type: Number, default: 0 }, availableAt: { type: Date, default: Date.now },
  lockedUntil: { type: Date, default: () => new Date(0) },
}, { timestamps: true }));
export { Inquiry } from '../models/Inquiry.js';
export const Bootstrap = model('SupportBootstrap', new Schema({
  _id: { type: String, default: 'initial-admin' }, userId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: ['verified-owner', 'admin-exists'], required: true },
}, { timestamps: true }));
