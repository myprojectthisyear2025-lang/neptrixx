/** Small verified-email-change form inside account settings. */
import { useState } from 'react';
import { request } from './api';
export default function EmailChange({ onDone }) {
  const [open, setOpen] = useState(false); const [sent, setSent] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const data = await request(`/profile/email/${sent ? 'confirm' : 'code'}`, { method: 'POST', body: { email, password, code } });
      if (sent) { onDone(data.user); window.location.reload(); } else { setSent(true); setPassword(''); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)}>Change email address</button>;
  return <form className="sp-form sp-settings-section" onSubmit={submit}>
    <label>New email address<input type="email" required value={email} readOnly={sent} onChange={e => setEmail(e.target.value)} /></label>
    {sent ? <label>Email verification code<input inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></label> :
      <label>Current password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>}
    {sent && <small>Check your new email. The code expires in 10 minutes. You can cancel and request another after one minute.</small>}
    {error && <p className="sp-error" role="alert">{error}</p>}
    <button disabled={busy}>{busy ? 'Please wait…' : sent ? 'Verify and change email' : 'Send verification code'}</button>
    <button type="button" disabled={busy} onClick={() => { setOpen(false); setSent(false); setPassword(''); setCode(''); }}>Cancel</button>
  </form>;
}
