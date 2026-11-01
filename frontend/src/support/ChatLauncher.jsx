/** Persistent website entry point; customers go directly to support and admins to their inbox. */
import { useSupport } from './SupportContext';
import './launcher.css';
export default function ChatLauncher() {
  const { user, unread } = useSupport();
  return <a className="support-launcher" href={user?.role === 'admin' ? '/admin/messages' : '/messages'}>
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 10h10M7 14h6"/></svg>
    {user?.role === 'admin' ? 'Customer inbox' : 'Chat with us'}{unread > 0 && <span aria-label={`${unread} unread messages`}>{unread > 99 ? '99+' : unread}</span>}
  </a>;
}
