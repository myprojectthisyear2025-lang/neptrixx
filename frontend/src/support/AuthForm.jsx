/** Focused login/signup and six-digit email verification/reset; no dating onboarding. */
import { useState } from 'react';
import SignupPhoto from './SignupPhoto';
import { request } from './api';
import { useSupport } from './SupportContext';
export default function AuthForm() {
  const { setUser, install, setError: clearGlobalError } = useSupport(); const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ name: '', email: '', phone: '', password: '', code: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0); const [photo, setPhoto] = useState(null);
  const change = e => setFields(f => ({ ...f, [e.target.name]: e.target.value }));
  function switchMode(value) { setMode(value); setError(''); setNotice(''); setFields(f => ({ ...f, password: '', code: '' })); }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const path = { login: 'login', signup: 'signup', verify: 'verify', forgot: 'forgot', reset: 'reset' }[mode];
      let body = fields;
      if (mode === 'signup') {
        if (!photo) throw new Error('Add one profile photo to create your account.');
        body = new FormData(); Object.entries(fields).forEach(([key, value]) => body.append(key, value)); body.append('photo', photo);
      }
      const data = await request(`/auth/${path}`, { method: 'POST', body });
      if (data.user) { if (mode === 'verify') install.offerInstall(data.user.id); clearGlobalError(''); setUser(data.user); setFields(f => ({ ...f, password: '', code: '' })); }
      else if (mode === 'signup') { setMode('verify'); setResendAt(Date.now() + 60000); setNotice(data.message); }
      else if (mode === 'forgot') { setMode('reset'); setResendAt(Date.now() + 60000); setNotice(data.message); }
      else if (mode === 'reset') { setMode('login'); setFields(f => ({ ...f, password: '', code: '' })); setNotice(data.message); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function resend() {
    if (Date.now() < resendAt) { setNotice('Please wait one minute between code requests.'); return; }
    setBusy(true); setError('');
    try {
      const data = await request(`/auth/${mode === 'verify' ? 'resend-signup' : 'forgot'}`, { method: 'POST', body: fields });
      setNotice(data.message); setResendAt(Date.now() + 60000);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const title = { login: 'Welcome back', signup: 'Create your account', verify: 'Check your email', forgot: 'Forgot your password?', reset: 'Set a new password' }[mode];
  return <section className="sp-auth">
    <div className="sp-auth-mark"><img src="/neptrixx-mark.svg" alt="" /></div><p className="sp-eyebrow">NEPTRIXX SUPPORT</p>
    <h1>{title}</h1><p className="sp-muted">{mode === 'login' ? 'Sign in to continue your conversation.' :
      mode === 'signup' ? 'A simple way to keep in touch with our team.' : 'We’ll help you get back to your conversation.'}</p>
    <form onSubmit={submit} className="sp-form">
      {mode === 'signup' && <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} value={fields.name} onChange={change} /></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}
        readOnly={mode === 'verify' || mode === 'reset'} value={fields.email} onChange={change} /></label>
      {mode === 'signup' && <label>Phone number <span className="sp-muted">(optional)</span><input name="phone" type="tel"
        autoComplete="tel" placeholder="+977 9800000000" value={fields.phone} onChange={e => setFields(f => ({ ...f, phone: e.target.value.replace(/[\s()-]/g, '') }))} /></label>}
      {['login', 'signup', 'reset'].includes(mode) && <label>{mode === 'reset' ? 'New password' : 'Password'}<input name="password" type="password" required
        minLength={mode === 'login' ? 1 : 12} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        value={fields.password} onChange={change} />{mode !== 'login' && <small>At least 12 characters.</small>}</label>}
      {['verify', 'reset'].includes(mode) && <label>Email code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
        autoComplete="one-time-code" required value={fields.code} onChange={change} /></label>}
      {mode === 'signup' && <SignupPhoto file={photo} onChange={setPhoto} onError={setError} />}
      {mode === 'signup' && <small>By creating an account, you agree to our <a href="/terms-of-service.html" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy-policy.html" target="_blank" rel="noreferrer">Privacy Policy</a>. Our support team retains your signup details and original photo in your account history.</small>}
      {error && <p className="sp-error" role="alert">{error}</p>}{notice && <p className="sp-notice" role="status">{notice}</p>}
      <button className="sp-primary" disabled={busy}>{busy ? 'Please wait…' : { login: 'Log in', signup: 'Create account', verify: 'Verify email', forgot: 'Send reset code', reset: 'Reset password' }[mode]}</button>
    </form>
    <div className="sp-auth-links">
      {mode === 'login' && <><button onClick={() => switchMode('forgot')}>Forgot password?</button><button onClick={() => switchMode('signup')}>New here? Create an account</button></>}
      {mode === 'signup' && <button onClick={() => switchMode('login')}>Already have an account? Log in</button>}
      {['verify', 'reset'].includes(mode) && <button disabled={busy} onClick={resend}>Resend email code</button>}
      {!['login', 'signup'].includes(mode) && <button onClick={() => switchMode('login')}>Back to login</button>}
    </div>
  </section>;
}
