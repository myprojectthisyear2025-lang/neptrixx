/** Recent customer preview, full timestamp, presence, unread count, and hold actions. */
import Avatar from './Avatar';
import Presence, { inboxTime } from './Presence';
import { useLongPress } from './useLongPress';
export default function InboxRow({ conversation: c, selected, onSelect, onMenu }) {
  const hold = useLongPress(() => onMenu(c));
  return <div className={`sp-inbox-row ${selected ? 'is-selected' : ''}`} {...hold}>
    <button className={`sp-inbox-item ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(c)}>
      <span className="sp-avatar-presence"><Avatar user={c.customer} /><Presence person={c.customer} dotOnly /></span>
      <span><strong>{c.customer?.name || 'Customer'}</strong><small>{c.preview || 'Start a conversation'}</small>
        <small className="sp-row-status">{c.pinnedAt ? 'Pinned · ' : ''}{c.muted ? 'Muted · ' : ''}{c.customer?.blocked ? 'Blocked' : c.customer?.online ? 'Active now' : 'Offline'}</small></span>
      <span className="sp-inbox-trailing">{c.lastMessageAt && <time dateTime={c.lastMessageAt} title={new Date(c.lastMessageAt).toLocaleString()}>{inboxTime(c.lastMessageAt)}</time>}
        {c.unread > 0 && <b className="sp-count">{c.unread}</b>}{c.status === 'resolved' && <small>Resolved</small>}</span>
    </button>
    <button className="sp-inbox-options" aria-label={`Options for ${c.customer?.name || 'customer'}`} onClick={() => onMenu(c)}>•••</button>
  </div>;
}
