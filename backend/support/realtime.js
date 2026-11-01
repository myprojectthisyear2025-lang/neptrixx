/** Authenticated Socket.IO notifications/typing; messages are saved through the HTTP API. */
import { trackPresence } from './presence.js';
import { Server } from 'socket.io';
import { accountFor } from './security.js';
import { authorizeConversation } from './permissions.js';
export function attachRealtime(server, app, sessions, origins) {
  const io = new Server(server, { cors: { origin: origins, credentials: true },
    allowRequest: (req, callback) => callback(null, origins.includes(req.headers.origin)),
    maxHttpBufferSize: 16384 });
  io.engine.use(sessions);
  io.use(async (socket, next) => {
    try {
      const user = await accountFor(socket.request.session);
      if (socket.handshake.auth.csrf !== socket.request.session.csrf) throw new Error('Session expired');
      socket.data.userId = String(user._id); socket.data.role = user.role; next();
    } catch { next(new Error('Please log in again.')); }
  });
  io.on('connection', socket => {
    socket.join(`user:${socket.data.userId}`); socket.join(`session:${socket.request.sessionID}`);
    if (socket.data.role === 'admin') socket.join('admins'); else socket.join('customers');
    trackPresence(socket, io);
    let lastTyping = 0;
    socket.on('typing', async (packet = {}) => {
      if (Date.now() - lastTyping < 600) return; lastTyping = Date.now();
      try {
        await new Promise((resolve, reject) => socket.request.session.reload(e => e ? reject(e) : resolve()));
        const user = await accountFor(socket.request.session);
        const c = await authorizeConversation(packet.conversationId, user);
        socket.to(`user:${c.customerId}`).to('admins').emit('chat:typing', {
          conversationId: String(c._id), role: user.role, active: packet.active !== false,
        });
      } catch { socket.disconnect(true); }
    });
    // Revalidate idle sockets too, so expired/blocked sessions cannot keep receiving events.
    const timer = setInterval(async () => {
      try {
        await new Promise((resolve, reject) => socket.request.session.reload(e => e ? reject(e) : resolve()));
        await accountFor(socket.request.session);
      } catch { socket.disconnect(true); }
    }, 60000); timer.unref(); socket.on('disconnect', () => clearInterval(timer));
  });
  app.set('io', io); return io;
}
