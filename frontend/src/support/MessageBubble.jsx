/** A text/photo bubble with long-press actions, reactions, edited state, and unsend tombstones. */
import MessagePhoto from './MessagePhoto';
import { useLongPress } from './useLongPress';
export default function MessageBubble({ message, user, otherRead, replied, onOptions, onPhoto, onLoad, onRetry }) {
  const mine = message.senderId === user.id; const date = new Date(message.createdAt);
  const actionable = !message.pending && !message.failed;
  const hold = useLongPress(() => { if (actionable) onOptions(message); });
  const reactions = Object.entries((message.reactions || []).reduce((all, r) => ({ ...all, [r.emoji]: (all[r.emoji] || 0) + 1 }), {}));
  const status = message.failed ? 'Not sent' : message.pending ? 'Sending…' : new Date(otherRead || 0) >= date ? 'Read' : 'Sent';
  return <article className={`sp-message ${mine ? 'is-mine' : ''} ${message.deletedForAll ? 'is-unsent' : ''}`}>
    <div className="sp-bubble" {...hold}>
      {message.deletedForAll ? <p className="sp-muted">Message unsent</p> : <>
        {message.replyTo && <blockquote>{replied?.deletedForAll ? 'Message unsent' : replied?.text || (replied?.imageUrl ? 'Photo' : 'Earlier message')}</blockquote>}
        {message.imageUrl && <MessagePhoto message={message} onPhoto={onPhoto} onLoad={onLoad} />}
        {message.text && <p>{message.text}</p>}
      </>}
    </div>
    {!!reactions.length && <div className="sp-reactions">{reactions.map(([emoji, count]) => <button key={emoji} onClick={() => onOptions(message)}
      aria-label={`${emoji}, ${count} reaction${count === 1 ? '' : 's'}`} aria-pressed={message.reactions.some(r => r.userId === user.id && r.emoji === emoji)}>{emoji} {count}</button>)}</div>}
    <div className="sp-message-meta"><time dateTime={message.createdAt}>{date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
      {message.editedAt && !message.deletedForAll && <span>Edited</span>}{mine && <span>{status}</span>}
      {actionable && <button onClick={() => onOptions(message)} aria-label="Message options">•••</button>}
      {message.failed && <button onClick={() => onRetry(message)}>Retry</button>}
    </div>
  </article>;
}
