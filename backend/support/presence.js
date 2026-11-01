/** Visible, authenticated socket presence; last activity persists across server restarts. */
import { Router } from 'express';
import { User } from './models.js';
import { wrap } from './errors.js';
const active = new Map();
export function presenceFor(user) {
  const sockets = active.get(String(user._id));
  return { online: [...(sockets?.values() || [])].some(at => Date.now() - at < 75000), lastSeenAt: user.lastSeenAt || null };
}
export async function teamPresence() {
  const admins = await User.find({ role: 'admin', blocked: false }).select('lastSeenAt');
  return { userId: 'support', role: 'admin', online: admins.some(u => presenceFor(u).online),
    lastSeenAt: admins.reduce((latest, u) => !latest || u.lastSeenAt > latest ? u.lastSeenAt : latest, null) };
}
export function trackPresence(socket, io) {
  const id = socket.data.userId; const role = socket.data.role; let touched = 0; let visible = false;
  let queue = Promise.resolve();
  async function update(show) {
    visible = show;
    const sockets = active.get(id) || new Map();
    if (show) sockets.set(socket.id, Date.now()); else sockets.delete(socket.id);
    if (sockets.size) active.set(id, sockets); else active.delete(id);
    const now = new Date();
    if (show || touched) await User.updateOne({ _id: id }, { $max: { lastSeenAt: now } });
    touched = Date.now();
    const user = await User.findById(id).select('lastSeenAt'); if (!user) return;
    if (role === 'admin') io.to('customers').to('admins').emit('chat:presence', await teamPresence());
    else io.to('admins').to(`user:${id}`).emit('chat:presence', { userId: id, role, ...presenceFor(user) });
  }
  const schedule = show => { queue = queue.then(() => update(show)).catch(() => {}); };
  socket.on('presence:activity', packet => {
    const show = packet?.visible === true;
    if (show === visible && Date.now() - touched < 15000) return;
    schedule(show);
  });
  const timer = setInterval(() => {
    if (visible && Date.now() - touched > 75000) schedule(false);
  }, 20000); timer.unref();
  socket.on('disconnect', () => { clearInterval(timer); schedule(false); });
}
export const presence = Router();
presence.get('/presence', wrap(async (_req, res) => res.json({ support: await teamPresence() })));
