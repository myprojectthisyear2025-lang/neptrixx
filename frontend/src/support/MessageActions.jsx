/** Accessible message actions for holds, right-clicks, and keyboard-operable menu buttons. */
import { useState } from 'react';
import Modal from './Modal';
export default function MessageActions({ message, user, onClose, onAction, onReply }) {
  const [editing, setEditing] = useState(false); const [text, setText] = useState(message.text);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const mine = message.senderId === user.id;
  async function run(action, extra = {}) {
    setBusy(true); setError('');
    try { await onAction(message, action, extra); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal title={editing ? 'Edit message' : 'Message options'} onClose={onClose}>
    {editing ? <form className="sp-action-edit" onSubmit={e => { e.preventDefault(); run('edit', { text }); }}>
      <label>Message<textarea autoFocus maxLength={4000} rows={5} value={text} onChange={e => setText(e.target.value)} /></label>
      <button className="sp-primary" disabled={busy || !text.trim()}>Save changes</button>
    </form> : <div className="sp-action-menu">
      {!message.deletedForAll && <>
        <div className="sp-reaction-picker" aria-label="Choose a reaction">{['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => {
          const selected = message.reactions?.some(r => r.userId === user.id && r.emoji === emoji);
          return <button key={emoji} disabled={busy} aria-label={`React ${emoji}`} aria-pressed={!!selected}
            onClick={() => run('react', { emoji: selected ? null : emoji })}>{emoji}</button>;
        })}</div>
        <button disabled={busy} onClick={() => { onReply(message); onClose(); }}>Reply</button>
        {mine && !message.imageUrl && <button disabled={busy} onClick={() => setEditing(true)}>Edit message</button>}
        {mine && <button className="sp-danger" disabled={busy} onClick={() => run('unsend')}>Unsend for everyone</button>}
      </>}
      <button disabled={busy} onClick={() => run('delete-me')}>Delete for me</button>
      <p className="sp-muted">Delete for me only removes your copy. Unsend removes your message from everyone's conversation.</p>
    </div>}
    {error && <p className="sp-error" role="alert">{error}</p>}
  </Modal>;
}
