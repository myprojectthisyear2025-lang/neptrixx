/** Simple profile editing, single avatar, per-account notification choice, and deletion. */
import { useState } from 'react';
import { request } from './api';
import { useSupport } from './SupportContext';
import { uploadPhoto } from './upload';
import { enableNotifications, disableNotifications } from './notifications';
import MessageSoundSettings from './MessageSoundSettings';
import Avatar from './Avatar';
import Modal from './Modal';
import EmailChange from './EmailChange';
export default function Profile({ onClose }) {
  const { user, setUser, logout } = useSupport(); const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone); const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false); const [password, setPassword] = useState('');
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const photo = file ? await uploadPhoto(file, 'avatar') : null;
      const data = await request('/profile', { method: 'PATCH', body: { name, phone: phone.replace(/[\s()-]/g, ''), ...(photo ? { avatarKey: photo.key } : {}) } });
      setUser(data.user); setFile(null); setNotice('Profile saved.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function notifications(enable) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (enable) await enableNotifications(); else { await disableNotifications(); await request('/profile', { method: 'PATCH', body: { pushEnabled: false } }); }
      setUser(u => ({ ...u, pushEnabled: enable })); setNotice(enable ? 'Notifications enabled on this device.' : 'Message notifications disabled for this account.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function removeAvatar() {
    setBusy(true); setError('');
    try { const data = await request('/profile', { method: 'PATCH', body: { avatarKey: '' } }); setUser(data.user); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function deleteAccount(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await request('/profile', { method: 'DELETE', body: { password } }); setUser(null); window.location.assign('/'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal title="Your account" onClose={onClose}>
    <form className="sp-form" onSubmit={save}>
      <div className="sp-profile-photo"><Avatar key={user.avatarUrl} user={user} /><label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp"
        onChange={e => { const f = e.target.files?.[0]; if (f?.size > 8 * 1024 * 1024) setError('Choose a photo smaller than 8 MB.'); else setFile(f || null); }} /></label></div>
      {user.avatarUrl && <button type="button" disabled={busy} onClick={removeAvatar}>Remove profile photo</button>}
      <label>Full name<input value={name} minLength={2} maxLength={100} required onChange={e => setName(e.target.value)} /></label>
      <label>Email address<input value={user.email} readOnly /><small>Verified email.</small></label>
      <label>Phone number<input type="tel" value={phone} placeholder="Include country code" onChange={e => setPhone(e.target.value)} /></label>
      <small>Customer ID: {user.id}</small><button className="sp-primary" disabled={busy}>{busy ? 'Please wait…' : 'Save profile'}</button>
    </form>
    <div className="sp-settings-section"><EmailChange onDone={setUser} /></div>
    <div className="sp-settings-section"><h3>Message notifications</h3><p className="sp-muted">Enable on each device you use. Your browser and phone settings control alerts.</p>
      <div className="sp-button-row"><button disabled={busy} onClick={() => notifications(true)}>Enable on this device</button><button disabled={busy} onClick={() => notifications(false)}>Disable notifications</button></div>
    </div>
    <MessageSoundSettings />
    {error && <p className="sp-error" role="alert">{error}</p>}{notice && <p className="sp-notice" role="status">{notice}</p>}
    <div className="sp-settings-section"><button disabled={busy} onClick={() => logout().catch(e => setError(e.message))}>Log out to reset password</button><button className="sp-logout" disabled={busy} onClick={() => logout().catch(e => setError(e.message))}>Log out</button></div>
    {user.role === 'customer' && <div className="sp-settings-section">
      {!deleting ? <button className="sp-danger" onClick={() => setDeleting(true)}>Delete my account</button> : <form className="sp-form" onSubmit={deleteAccount}>
        <p>This permanently deletes your account, conversation, and shared photos.</p><label>Confirm your password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="sp-danger" disabled={busy}>Permanently delete account</button><button type="button" onClick={() => setDeleting(false)}>Cancel</button>
      </form>}
    </div>}
  </Modal>;
}
