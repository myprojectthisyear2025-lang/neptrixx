/** Per-admin pin, mute, block, and private inbox deletion from an accessible dialog. */
import { useState } from 'react';
import Modal from './Modal';
import { request } from './api';
import { useSupport } from './SupportContext';
export default function InboxMenu({ conversation: c, onClose, onDeleted }) {
  const { refresh } = useSupport(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function run(body, block = false) {
    setBusy(true); setError('');
    try {
      await request(block ? `/admin/customers/${c.customer.id}` : `/admin/conversations/${c.id}/preferences`, { method: 'PATCH', body });
      await refresh();
      if (body.deleteForMe) onDeleted(c.id); onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Modal title={c.customer?.name || 'Conversation options'} onClose={onClose}>
    <div className="sp-action-menu">{confirmDelete ? <>
      <p>Delete this conversation from your inbox and hide its existing history for your account? The customer keeps their copy. A new message brings the chat back.</p>
      <button className="sp-danger" disabled={busy} onClick={() => run({ deleteForMe: true })}>Delete chat for me</button>
      <button disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button>
    </> : <>
      <button disabled={busy} onClick={() => run({ pinned: !c.pinnedAt })}>{c.pinnedAt ? 'Unpin' : 'Pin'} conversation</button>
      <button disabled={busy} onClick={() => run({ muted: !c.muted })}>{c.muted ? 'Unmute' : 'Mute'} notifications</button>
      <button disabled={busy} onClick={() => run({ blocked: !c.customer?.blocked }, true)}>{c.customer?.blocked ? 'Unblock' : 'Block'} customer</button>
      <button className="sp-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete chat for me</button>
      <p className="sp-muted">Pin, mute, and delete apply to your admin account. Blocking prevents the customer from accessing support.</p>
    </>}{error && <p className="sp-error" role="alert">{error}</p>}</div>
  </Modal>;
}
