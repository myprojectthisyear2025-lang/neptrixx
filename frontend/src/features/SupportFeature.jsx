/** Single integration boundary; Render's public switch decides whether any support code runs. */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config/api';
import './supportFeature.css';
const SupportRuntime = lazy(() => import('../support/SupportRuntime'));
export default function SupportFeature({ renderWebsite }) {
  const portal = /^\/(messages|admin\/messages)\/?$/.test(window.location.pathname);
  const [status, setStatus] = useState('checking'); const state = useRef('checking');
  const busy = useRef(false); const controller = useRef(null); const mounted = useRef(false);
  const check = useCallback(async () => {
    if (busy.current) return; busy.current = true;
    const current = new AbortController(); controller.current = current;
    const timeout = setTimeout(() => current.abort(), 30000);
    try {
      if (!API_BASE) throw new Error('Not configured');
      const response = await fetch(`${API_BASE}/api/support/status`, { cache: 'no-store',
        credentials: 'omit', signal: current.signal });
      if (!response.ok) throw new Error('Status unavailable');
      const data = await response.json();
      if (typeof data.enabled !== 'boolean') throw new Error('Invalid status');
      if (mounted.current && controller.current === current) { state.current = data.enabled ? 'enabled' : 'disabled'; setStatus(state.current); }
    } catch {
      // Preserve an open draft during temporary network failures; the server still enforces the switch.
      if (mounted.current && controller.current === current && state.current !== 'enabled') { state.current = 'unavailable'; setStatus('unavailable'); }
    } finally { clearTimeout(timeout); if (controller.current === current) busy.current = false; }
  }, []);
  useEffect(() => {
    mounted.current = true; check();
    const visible = () => { if (!document.hidden) check(); };
    const timer = setInterval(visible, 60000);
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { mounted.current = false; controller.current?.abort(); busy.current = false; clearInterval(timer);
      window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [check]);
  const fallback = portal ? <SupportUnavailable status={status === 'enabled' ? 'checking' : status} retry={check} /> : renderWebsite(null);
  if (status !== 'enabled') return fallback;
  return <Suspense fallback={fallback}><SupportRuntime portal={portal} renderWebsite={renderWebsite} /></Suspense>;
}
function SupportUnavailable({ status, retry }) {
  const loading = status === 'checking';
  return <main className="support-unavailable">
    <a href="/">← Neptrixx home</a><span className="support-unavailable-mark">N</span>
    <h1>{loading ? 'Opening support…' : 'Messaging is currently unavailable'}</h1>
    <p>{loading ? 'Please wait while we connect you.' : 'You can still reach our team by email.'}</p>
    {!loading && <><a href="mailto:support@neptrixx.com">support@neptrixx.com</a><button onClick={retry}>Try again</button></>}
  </main>;
}
