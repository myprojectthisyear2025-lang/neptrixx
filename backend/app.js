/** Core company/contact API plus a public switch; support is installed separately when enabled. */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { company } from './routes/company.js';
import { inquiries } from './routes/inquiries.js';
import { originGuard, errorHandler } from './lib/http.js';
export function createApp(settings) {
  const app = express(); app.set('trust proxy', 1); app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ credentials: true, origin(origin, done) { done(null, !origin || settings.origins.includes(origin)); } }));
  app.use(express.json({ limit: '64kb' })); app.use(originGuard(settings.origins));
  app.get('/api/health', (req, res) => res.json({ ok: true, app: 'Neptrixx API',
    supportEnabled: settings.supportEnabled, timestamp: new Date().toISOString() }));
  app.get('/api/support/status', (req, res) => res.set('Cache-Control', 'no-store').json({ enabled: settings.supportEnabled }));
  app.use(company); app.use(inquiries);
  if (!settings.supportEnabled) {
    const disabled = (req, res) => res.status(503).set('Cache-Control', 'no-store')
      .json({ code: 'support_disabled', message: 'Messaging is currently unavailable.' });
    app.use('/api/support', disabled); app.use('/socket.io', disabled);
  }
  return app;
}
export function finalizeApp(app) {
  app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
  app.use(errorHandler); return app;
}
