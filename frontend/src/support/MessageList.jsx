/** Quiet sender/receiver bubbles, date groups, photo viewer links, replies, and read receipts. */
import MessagePhoto from './MessagePhoto';
import { useEffect, useRef } from 'react';
export default function MessageList({ thread, user, conversation, onReply, onPhoto }) {
  const scroll = useRef(null); const bottom = useRef(true); const previous = useRef(0);
  useEffect(() => {
    const box = scroll.current;
    if (box && (bottom.current || !previous.current)) box.scrollTop = box.scrollHeight;
    previous.current = thread.messages.length;
  }, [thread.messages, thread.typing]);
  const otherRead = user.role === 'admin' ? conversation.customerReadAt : conversation.adminReadAt;
  return <div className="sp-message-list" ref={scroll} role="log" aria-label="Conversation messages" aria-live="polite"
    onScroll={() => { const el = scroll.current; bottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
    {thread.hasMore && <button className="sp-history" disabled={thread.loading} onClick={async () => {
      const box = scroll.current; const before = box.scrollHeight; const top = box.scrollTop;
      await thread.load(true); requestAnimationFrame(() => { box.scrollTop = top + box.scrollHeight - before; });
    }}>Load earlier messages</button>}
    {thread.loading && !thread.messages.length && <p className="sp-empty">Loading your conversation…</p>}
    {!thread.loading && !thread.messages.length && <div className="sp-welcome"><span><img src="/neptrixx-mark.svg" alt="" /></span><h2>Let’s talk</h2><p>Send a message or photo.<br />Our team will reply here.</p></div>}
    {thread.messages.map((message, index) => {
      const mine = message.senderRole === user.role; const date = new Date(message.createdAt);
      const prior = thread.messages[index - 1]; const newDay = !prior || new Date(prior.createdAt).toDateString() !== date.toDateString();
      const replied = message.replyTo && thread.messages.find(m => m.id === message.replyTo);
      const status = message.failed ? 'Not sent' : message.pending ? 'Sending…' : new Date(otherRead || 0) >= date ? 'Read' : 'Sent';
      return <div key={message.clientId || message.id}>
        {newDay && <div className="sp-date">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
        <article className={`sp-message ${mine ? 'is-mine' : ''}`}>
          <div className="sp-bubble">
            {message.replyTo && <blockquote>{replied?.text || (replied?.imageUrl ? 'Photo' : 'Earlier message')}</blockquote>}
            {message.imageUrl && <MessagePhoto message={message} onPhoto={onPhoto} onLoad={() => {
              if (bottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
            }} />}
            {message.text && <p>{message.text}</p>}
          </div>
          <div className="sp-message-meta"><time dateTime={message.createdAt}>{date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
            {mine && <span>{status}</span>}
            {!message.pending && !message.failed && <button onClick={() => onReply(message)}>Reply</button>}
            {message.failed && <button onClick={() => thread.send(message)}>Retry</button>}
          </div>
        </article>
      </div>;
    })}
    {thread.typing && <p className="sp-typing">{user.role === 'admin' ? 'Customer' : 'Neptrixx'} is typing…</p>}
  </div>;
}
