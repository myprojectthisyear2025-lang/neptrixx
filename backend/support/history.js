/** Incremental history sync repairs edits/removals missed while disconnected without losing live arrivals. */
import { Message } from './models.js';
import { historyCutoff } from './inbox.js';
import { publicMessage } from './presentation.js';
import { fail, objectId } from './errors.js';
export async function loadHistory(c, user, options) {
  const syncAt = new Date(); const cutoff = await historyCutoff(c, user);
  const query = { conversationId: c._id, hiddenFor: { $ne: user._id }, createdAt: { $gt: cutoff } };
  if (options.before) query._id = { $lt: objectId(options.before) };
  const records = await Message.find(query).sort({ _id: -1 }).limit(50).lean();
  let changes = []; let reset = false;
  if (options.loadedFrom && options.changedSince) {
    const since = new Date(String(options.changedSince));
    if (!Number.isFinite(since.getTime())) fail(400, 'Invalid history sync timestamp.');
    changes = await Message.find({ conversationId: c._id, _id: { $gte: objectId(options.loadedFrom) },
      updatedAt: { $gte: since } }).sort({ updatedAt: 1 }).limit(201).lean();
    reset = changes.length > 200; if (reset) changes = [];
  }
  const visible = m => m.createdAt > cutoff && !m.hiddenFor?.some(id => String(id) === String(user._id));
  return { messages: await Promise.all(records.reverse().map(publicMessage)), hasMore: records.length === 50,
    updates: await Promise.all(changes.filter(visible).map(publicMessage)), hiddenIds: changes.filter(m => !visible(m)).map(m => String(m._id)),
    hiddenBefore: cutoff, syncAt, reset };
}
