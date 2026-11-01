/** Admin-only original registration record, separate from editable or deletable chat messages. */
import { useEffect, useState } from 'react';
import { request } from './api';
export default function CustomerCard({ card }) {
  const [url, setUrl] = useState(card.photoUrl); const [failed, setFailed] = useState(false); const [retried, setRetried] = useState(false);
  useEffect(() => { setUrl(card.photoUrl); setFailed(false); setRetried(false); }, [card.photoUrl]);
  async function refreshPhoto() {
    if (retried) { setFailed(true); return; } setRetried(true);
    try { const data = await request(`/admin/customers/${card.customerId}/profile-card`); setUrl(data.profileCard.photoUrl); }
    catch { setFailed(true); }
  }
  const original = card.source === 'signup';
  return <article className="sp-customer-card" aria-label={original ? 'Original signup profile' : 'Customer profile record'}>
    <div className="sp-card-heading"><span>Admin only</span><small>{original ? 'Original signup profile' : 'Existing account record'}</small></div>
    <div className="sp-card-profile">{url && !failed ? <img src={url} alt="Registration profile photo" onError={refreshPhoto} /> : <div className="sp-card-photo-missing">No photo available</div>}
      <div><h3>{card.name}</h3><p className="sp-muted">Customer ID: {card.customerId}</p></div></div>
    <dl><div><dt>Email</dt><dd>{card.email}</dd></div><div><dt>Phone</dt><dd>{card.phone || 'Not provided'}</dd></div>
      <div><dt>Joined</dt><dd>{new Date(card.registeredAt).toLocaleString()}</dd></div>
      {!original && <div><dt>Captured</dt><dd>{new Date(card.capturedAt).toLocaleString()}</dd></div>}</dl>
    <p className="sp-muted">{original ? 'Saved at signup. Later profile changes do not alter this record.' : 'Captured from the existing profile. Original signup details were not recorded for this account.'}</p>
  </article>;
}
