/** Refresh expired private photo URLs through the authorized conversation endpoint. */
import { useEffect, useState } from 'react';
import { request } from './api';
export default function MessagePhoto({ message, onPhoto, onLoad }) {
  const [url, setUrl] = useState(message.imageUrl); const [error, setError] = useState(false);
  const [retried, setRetried] = useState(false);
  useEffect(() => { setUrl(message.imageUrl); setError(false); setRetried(false); }, [message.imageUrl]);
  async function refresh() {
    if (retried || message.pending || message.failed) { setError(true); return; }
    setRetried(true);
    try { const data = await request(`/conversations/${message.conversationId}/messages/${message.id}/photo`); setUrl(data.url); }
    catch { setError(true); }
  }
  if (error) return <span className="sp-muted">Photo unavailable. Reload this conversation to try again.</span>;
  return <button className="sp-image-button" onClick={() => onPhoto(url)} aria-label="Open photo">
    <img src={url} alt="Shared photo" loading="lazy" onLoad={onLoad} onError={refresh} />
  </button>;
}
