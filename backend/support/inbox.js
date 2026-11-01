/** Database-filtered and paginated inbox with private pin/mute/history preferences. */
import mongoose from 'mongoose';
import { Conversation, Message, Preference, User } from './models.js';
import { fail } from './errors.js';
export async function inboxRecords(user, options) {
  const userId = user._id;
  const stages = [
    { $match: user.role === 'admin' ? {} : { customerId: userId } },
    { $lookup: { from: User.collection.name, let: { uid: '$customerId' }, pipeline: [
      { $match: { role: 'customer', $expr: { $eq: ['$_id', '$$uid'] } } }, { $project: { _id: 1, blocked: 1 } },
    ], as: 'customerRecord' } },
    { $match: { 'customerRecord.0': { $exists: true } } },
    { $lookup: { from: Preference.collection.name, let: { cid: '$_id' }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$conversationId', '$$cid'] }, { $eq: ['$userId', userId] }] } } },
    ], as: 'preferences' } },
    { $set: { preference: { $arrayElemAt: ['$preferences', 0] } } },
    { $set: { pinTime: { $cond: [{ $ifNull: ['$preference.pinnedAt', false] }, new Date(1), new Date(0)] },
      cutoff: { $ifNull: ['$preference.hiddenAt', new Date(0)] } } },
    ...(options.filter === 'blocked' ? [] : [{ $match: { $expr: { $or: [{ $eq: ['$cutoff', new Date(0)] }, { $gt: ['$lastMessageAt', '$cutoff'] }] } } }]),
    { $lookup: { from: Message.collection.name, let: { cid: '$_id',
      read: user.role === 'admin' ? '$adminReadAt' : '$customerReadAt', cutoff: '$cutoff' }, pipeline: [
      { $match: { senderRole: user.role === 'admin' ? 'customer' : 'admin', hiddenFor: { $ne: userId }, deletedForAllAt: null,
        $expr: { $and: [{ $eq: ['$conversationId', '$$cid'] }, { $gt: ['$createdAt', '$$read'] }, { $gt: ['$createdAt', '$$cutoff'] }] } } },
      { $count: 'count' },
    ], as: 'unreadRows' } },
    { $set: { unread: { $ifNull: [{ $arrayElemAt: ['$unreadRows.count', 0] }, 0] } } },
  ];
  if (options.filter === 'muted') stages.push({ $match: { 'preference.muted': true } });
  else if (options.filter === 'pinned') stages.push({ $match: { pinTime: { $gt: new Date(0) } } });
  else if (options.filter === 'blocked') stages.push({ $match: { 'customerRecord.blocked': true } });
  else if (options.filter === 'unread') stages.push({ $match: { unread: { $gt: 0 } } });
  else if (['open', 'resolved'].includes(options.filter)) stages.push({ $match: { status: options.filter } });
  else if (options.filter && options.filter !== 'all') fail(400, 'Invalid inbox filter.');
  if (options.before) {
    let cursor;
    try { cursor = JSON.parse(Buffer.from(String(options.before), 'base64url').toString()); } catch { fail(400, 'Invalid inbox cursor.'); }
    if (!cursor || !/^[a-f\d]{24}$/i.test(cursor.i || '') || ![cursor.p, cursor.t].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 8640000000000000)) fail(400, 'Invalid inbox cursor.');
    const pinTime = new Date(cursor.p); const at = new Date(cursor.t);
    stages.push({ $match: { $or: [{ pinTime: { $lt: pinTime } }, { pinTime, lastMessageAt: { $lt: at } },
      { pinTime, lastMessageAt: at, _id: { $lt: new mongoose.Types.ObjectId(cursor.i) } }] } });
  }
  stages.push({ $sort: { pinTime: -1, lastMessageAt: -1, _id: -1 } }, { $limit: 101 });
  const rows = await Conversation.aggregate(stages); const hasMore = rows.length > 100; const records = rows.slice(0, 100);
  const last = records.at(-1);
  return { records, next: hasMore ? Buffer.from(JSON.stringify({ p: last.pinTime.getTime(), t: last.lastMessageAt.getTime(), i: String(last._id) })).toString('base64url') : null };
}
export async function preferenceFor(c, user) {
  return c.preference || await Preference.findOne({ userId: user._id, conversationId: c._id }).lean() || {};
}
export async function historyCutoff(c, user) { return (await preferenceFor(c, user)).hiddenAt || new Date(0); }
