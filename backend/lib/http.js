/** Shared website/API errors, input limits, and async route handling. */
import mongoose from 'mongoose';
export function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const text = (value, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const emailOf = value => text(value, 254).toLowerCase();
export function validEmail(email) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.'); }
export function validPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    fail(400, 'Use a password of at least 12 characters and no more than 72 bytes.');
  }
}
export function objectId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, 'Invalid identifier.');
  return new mongoose.Types.ObjectId(value);
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || (error.code === 11000 ? 409 : error.name === 'MulterError' ? 400 : 500);
  if (status >= 500) console.error('API operation failed:', error.name);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' :
    error.code === 11000 ? 'This record already exists. Please refresh.' : error.message });
}

export function originGuard(origins) {
  return (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !origins.includes(req.get("origin"))) {
      return res.status(403).json({ message: "Request origin is not allowed." });
    }
    next();
  };
}
