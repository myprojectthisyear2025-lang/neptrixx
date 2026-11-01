/** Quiet sender/receiver bubbles, date groups, photo viewer links, replies, and read receipts. */
import CustomerCard from './CustomerCard';
import MessageBubble from './MessageBubble';
import MessageActions from './MessageActions';
import { useEffect, useRef, useState } from 'react';
export default function MessageList({ thread, user, conversation, onReply, onPhoto }) {
  const [menu, setMenu] = useState(null);
  const scroll = useRef(null); const bottom = useRef(true); const previous = useRef(0);
  useEffect(() => {
    const box = scroll.current;
    if (box && (bottom.current || !previous.current)) box.scrollTop = box.scrollHeight;
    previous.current = thread.messages.length;
  }, [thread.messages, thread.typing]);
  const otherRead = user.role === 'admin' ? conversation.customerReadAt : conversation.adminReadAt;
  return <div className="sp-message-list" ref={scroll} role="log" aria-label="Conversation messages" aria-live="polite"
    onScroll={() => { const el = scroll.current; bottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
    {user.role === 'admin' && thread.profileCard && <CustomerCard card={thread.profileCard} />}
    {thread.hasMore && <button className="sp-history" disabled={thread.loading} onClick={async () => {
      const box = scroll.current; const before = box.scrollHeight; const top = box.scrollTop;
      await thread.load(true); requestAnimationFrame(() => { box.scrollTop = top + box.scrollHeight - before; });
    }}>Load earlier messages</button>}
    {thread.loading && !thread.messages.length && <p className="sp-empty">Loading your conversation…</p>}
    {!thread.loading && !thread.messages.length && !thread.profileCard && <div className="sp-welcome"><span><img src="/neptrixx-mark.svg" alt="" /></span><h2>Let’s talk</h2><p>Send a message or photo.<br />Our team will reply here.</p></div>}
    {thread.messages.map((message, index) => {
      const date = new Date(message.createdAt);
      const prior = thread.messages[index - 1]; const newDay = !prior || new Date(prior.createdAt).toDateString() !== date.toDateString();
      const replied = message.replyTo && thread.messages.find(m => m.id === message.replyTo);
      return <div key={message.clientId || message.id}>
        {newDay && <div className="sp-date">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
        <MessageBubble message={message} user={user} otherRead={otherRead} replied={replied} onOptions={setMenu} onPhoto={onPhoto}
          onRetry={thread.send} onLoad={() => { if (bottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }} />
      </div>;
    })}
    {menu && <MessageActions message={thread.messages.find(m => m.id === menu.id) || menu} user={user} onClose={() => setMenu(null)} onAction={thread.action} onReply={onReply} />}
    {thread.typing && <p className="sp-typing">{user.role === 'admin' ? 'Customer' : 'Neptrixx'} is typing…</p>}
  </div>;
}
