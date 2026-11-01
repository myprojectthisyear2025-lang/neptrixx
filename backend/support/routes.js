/** Optional support route installation; not imported or mounted when SUPPORT_ENABLED=false. */
import { rateLimit } from 'express-rate-limit';
import { auth } from './auth.js';
import { chat } from './chat.js';
import { admin } from './admin.js';
import { uploads } from './uploads.js';
import { profile } from './profile.js';
import { emailChange } from './emailChange.js';
import { push } from './push.js';
import { authenticated, csrf } from './security.js';
export function installSupportRoutes(app, sessions, settings) {
  app.set('initialAdminEmail', settings.initialAdminEmail || '');
  app.use('/api/support', rateLimit({ windowMs: 60000, limit: 300,
    message: { message: 'Too many requests. Please try again shortly.' } }), sessions,
    (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, csrf);
  app.use('/api/support/auth', auth);
  app.use('/api/support', authenticated, chat, uploads, profile, emailChange, push);
  app.use('/api/support/admin', admin);
}
