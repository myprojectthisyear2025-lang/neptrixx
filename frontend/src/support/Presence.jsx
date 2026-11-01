/** Live presence badges with minute/hour/day labels refreshed as time passes. */
import { useEffect, useState } from 'react';
export function activityLabel(person) {
  if (person?.online) return 'Active now';
  if (!person?.lastSeenAt) return 'Offline';
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(person.lastSeenAt)) / 60000));
  if (minutes < 60) return `Active ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24); return `Active ${days} ${days === 1 ? 'day' : 'days'} ago`;
}
export default function Presence({ person, dotOnly = false }) {
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(timer); }, []);
  const label = activityLabel(person);
  return <span className={`sp-presence ${person?.online ? 'is-online' : ''}`} title={label} aria-label={dotOnly ? label : undefined}>
    <i aria-hidden="true" />{!dotOnly && <span>{label}</span>}
  </span>;
}
export function inboxTime(value) {
  const date = new Date(value); const today = new Date();
  return date.toDateString() === today.toDateString() ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) :
    date.toLocaleDateString([], { month: 'short', day: 'numeric', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
}
