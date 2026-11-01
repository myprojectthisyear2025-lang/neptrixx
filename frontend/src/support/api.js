/** Credentialed API client; only public configuration reaches the browser bundle. */
import { API_BASE } from '../config/api';
export { API_BASE } from '../config/api';
let csrf = ''; let boot;
export function setCsrf(value) { csrf = value || ''; }
export async function request(path, options = {}) {
  if (!API_BASE) throw new Error('Messaging is not configured yet. Please contact Neptrixx by email.');
  const method = options.method || 'GET';
  if (method !== 'GET' && !csrf) await session();
  const form = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}/api/support${path}`, { credentials: 'include',
    ...options, method, headers: { ...(!form && options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}), ...options.headers },
    body: options.body ? form ? options.body : JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(payload.message || 'Request failed. Please try again.'); error.status = response.status; throw error; }
  if (payload.csrf) setCsrf(payload.csrf); return payload;
}
export function session() {
  return boot ||= request('/auth/session').finally(() => { boot = null; });
}
export const currentCsrf = () => csrf;
