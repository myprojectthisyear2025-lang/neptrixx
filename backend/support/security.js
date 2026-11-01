/** Mongo-backed browser sessions, CSRF checks, and fresh account authorization. */
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { randomBytes } from 'node:crypto';
import { User } from './models.js';
import { fail, wrap } from './errors.js';
export function sessionMiddleware(settings) {
  const store = MongoStore.create({ mongoUrl: settings.mongo, dbName: settings.dbName, collectionName: 'support_sessions' });
  const middleware = session({ name: 'neptrixx.sid', secret: settings.secret, resave: false, saveUninitialized: false,
    store,
    cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 86400000 },
  });
  middleware.store = store; return middleware;
}
export function csrfToken(req) { return req.session.csrf ||= randomBytes(32).toString('hex'); }
export { originGuard } from "../lib/http.js";
export function csrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.session.csrf || req.get('x-csrf-token') !== req.session.csrf) {
    return res.status(403).json({ message: 'Session expired. Refresh the page and try again.' });
  }
  next();
}
export async function accountFor(sessionData) {
  const user = sessionData?.userId ? await User.findById(sessionData.userId) : null;
  if (!user || user.blocked || user.sessionVersion !== sessionData.version) fail(401, 'Please log in again.');
  return user;
}
export const authenticated = wrap(async (req, res, next) => { req.user = await accountFor(req.session); next(); });
export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  next();
};
export async function establish(req, user) {
  await new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
  req.session.userId = String(user._id); req.session.version = user.sessionVersion; csrfToken(req);
  await new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
}
