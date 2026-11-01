/** Shared bounded multipart parser: signup and authenticated uploads share the same two slots. */
import multer from 'multer';
let inFlight = 0;
export function uploadCapacity(req, res, next) {
  if (inFlight >= 2) return res.status(429).json({ message: 'Photo uploads are busy. Please try again in a moment.' });
  inFlight += 1; let released = false;
  const release = () => { if (!released) { released = true; inFlight -= 1; } };
  res.once('finish', release); res.once('close', release); next();
}
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 8 } });
