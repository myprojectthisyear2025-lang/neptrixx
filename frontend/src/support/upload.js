/** Photo upload with visible progress and the same session/CSRF protection as API calls. */
import { API_BASE, currentCsrf } from './api';
export function uploadPhoto(file, purpose, conversationId, onProgress = () => {}) {
  if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('Choose a photo smaller than 8 MB.'));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', `${API_BASE}/api/support/uploads`);
    xhr.withCredentials = true; xhr.setRequestHeader('X-CSRF-Token', currentCsrf()); xhr.timeout = 90000;
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onerror = () => reject(new Error('Photo upload failed. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Photo upload timed out. Please try again.'));
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText); } catch { /* invalid response */ }
      xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject(new Error(data.message || 'Photo upload failed.'));
    };
    const body = new FormData(); body.append('purpose', purpose);
    if (conversationId) body.append('conversationId', conversationId); body.append('photo', file); xhr.send(body);
  });
}
