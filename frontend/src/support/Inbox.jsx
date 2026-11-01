/** Admin inbox plus private customer search, including customers without a conversation. */
import { useEffect, useState } from 'react';
import { request } from './api';
import { useSupport } from './SupportContext';
import Avatar from './Avatar';
export default function Inbox({ selected, onSelect }) {
  const { conversations, refresh, nextInbox } = useSupport(); const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); const [customers, setCustomers] = useState(null);
  const [nextCustomer, setNextCustomer] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!query.trim()) { setCustomers(null); setError(''); return; }
    let active = true; const timer = setTimeout(() => {
      setBusy(true);
      request(`/admin/customers?q=${encodeURIComponent(query.trim())}`).then(data => {
        if (active) { setCustomers(data.customers); setNextCustomer(data.next); setError(''); }
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    }, 300); return () => { active = false; clearTimeout(timer); };
  }, [query]);
  async function openCustomer(customer) {
    setBusy(true); setError('');
    try { const data = await request(`/admin/customers/${customer.id}/conversation`, { method: 'POST' }); onSelect(data.conversation); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function more() {
    setBusy(true); setError('');
    try {
      if (customers) { const data = await request(`/admin/customers?q=${encodeURIComponent(query.trim())}&before=${nextCustomer}`);
        setCustomers(p => [...p, ...data.customers]); setNextCustomer(data.next); }
      else await refresh(true, nextInbox);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const visible = conversations.filter(c => filter === 'all' || filter === 'unread' ? filter === 'all' || c.unread > 0 : c.status === filter)
    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  return <aside className="sp-inbox">
    <div className="sp-inbox-head"><h1>Messages</h1><p className="sp-muted">Your customer conversations</p>
      <label className="sp-search"><span className="sp-sr-only">Search customers</span><input type="search" value={query} placeholder="Search name, email, phone, ID"
        onChange={e => setQuery(e.target.value)} /></label>
      {!query.trim() && <div className="sp-filters">{['all', 'unread', 'open', 'resolved'].map(value => <button key={value}
        className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>}
    </div>
    {error && <p className="sp-error" role="alert">{error}</p>}
    <div className="sp-inbox-list">
      {customers ? <>{customers.map(customer => <button className="sp-inbox-item" key={customer.id} disabled={busy} onClick={() => openCustomer(customer)}>
        <Avatar user={customer} /><span><strong>{customer.name}</strong><small>{customer.email}</small><small>{customer.blocked ? 'Restricted account' : 'Open conversation'}</small></span>
      </button>)}{!customers.length && <p className="sp-empty">No customers found.</p>}</> :
        visible.map(c => <button key={c.id} className={`sp-inbox-item ${selected?.id === c.id ? 'is-selected' : ''}`} onClick={() => onSelect(c)}>
          <Avatar user={c.customer} /><span><strong>{c.customer?.name || 'Customer'}</strong><small>{c.preview || 'Start a conversation'}</small></span>
          <span className="sp-inbox-trailing">{c.lastMessageAt && <time>{new Date(c.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time>}
            {c.unread > 0 && <b className="sp-count">{c.unread}</b>}{c.status === 'resolved' && <small>Resolved</small>}</span>
        </button>)}
      {!customers && !visible.length && <p className="sp-empty">{conversations.length ? 'No conversations in this view.' : 'No messages yet. Search for a customer to start.'}</p>}
      {(customers ? nextCustomer : nextInbox) && <button className="sp-history" disabled={busy} onClick={more}>Load more</button>}
      {busy && <p className="sp-empty" role="status">Loading…</p>}
    </div>
  </aside>;
}
