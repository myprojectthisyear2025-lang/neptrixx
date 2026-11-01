/** One profile photo with a readable initials fallback. */
import { useEffect, useState } from 'react';
export default function Avatar({ user, business = false }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [user?.avatarUrl]);
  const name = business ? 'Neptrixx Support' : user?.name || 'Customer';
  return <span className="sp-avatar" aria-label={name}>
    {user?.avatarUrl && !broken ? <img src={user.avatarUrl} alt="" onError={() => setBroken(true)} /> :
      business ? 'N' : name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase()}
  </span>;
}
