/** Mobile-inspired text composer with one photo preview, caption, upload progress, and reply. */
import { useEffect, useRef, useState } from 'react';
import { uploadPhoto } from './upload';
import { useSupport } from './SupportContext';
export default function Composer({ conversation, onSend, reply, clearReply }) {
  const { socketRef } = useSupport(); const [text, setText] = useState(''); const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(''); const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); const [error, setError] = useState('');
  const input = useRef(null); const typingAt = useRef(0); const sending = useRef(false);
  const savedUpload = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(e) {
    const photo = e.target.files?.[0]; e.target.value = ''; if (!photo) return;
    if (photo.size > 8 * 1024 * 1024) { setError('Choose a photo smaller than 8 MB.'); return; }
    setFile(photo); savedUpload.current = null; setError('');
  }
  async function submit(e) {
    e.preventDefault(); if (sending.current || !text.trim() && !file) return;
    sending.current = true; setBusy(true); setError('');
    try {
      let attachment = savedUpload.current;
      if (file && !attachment) { setProgress(0); attachment = await uploadPhoto(file, 'chat', conversation.id, setProgress); savedUpload.current = attachment; }
      const payload = { text: text.trim(), imageKey: attachment?.key || '', imageUrl: attachment?.url || '', replyTo: reply?.id || null };
      setText(''); setFile(null); savedUpload.current = null; clearReply();
      socketRef.current?.emit('typing', { conversationId: conversation.id, active: false });
      await onSend(payload);
    } catch (e) { setError(e.message); }
    finally { sending.current = false; setBusy(false); }
  }
  return <form className="sp-composer" onSubmit={submit}>
    {reply && <div className="sp-reply-preview"><span>Replying to: {reply.text || 'Photo'}</span><button type="button" aria-label="Cancel reply" onClick={clearReply}>×</button></div>}
    {preview && <div className="sp-photo-preview"><img src={preview} alt="Photo to send" /><button type="button" disabled={busy} onClick={() => { setFile(null); savedUpload.current = null; }}>Remove photo</button></div>}
    {error && <p className="sp-error" role="alert">{error}</p>}
    {busy && file && <p role="status" className="sp-muted">{progress < 100 ? `Uploading photo… ${progress}%` : 'Preparing photo…'}</p>}
    <div className="sp-compose-row">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choose} />
      <button type="button" className="sp-attach" disabled={busy} aria-label="Attach a photo" onClick={() => input.current.click()}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg>
      </button>
      <textarea aria-label="Message" placeholder="Write a message…" maxLength={4000} rows={1} value={text} disabled={busy}
        onChange={e => {
          setText(e.target.value);
          if (Date.now() - typingAt.current > 800) { socketRef.current?.emit('typing', { conversationId: conversation.id, active: true }); typingAt.current = Date.now(); }
        }} onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia('(min-width: 761px)').matches) { e.preventDefault(); submit(e); }
        }} />
      <button className="sp-primary sp-send" disabled={busy || !text.trim() && !file}>{busy ? 'Sending…' : 'Send'}</button>
    </div>
    <small className="sp-compose-hint">Photos up to 8 MB · Your conversation is private</small>
  </form>;
}
