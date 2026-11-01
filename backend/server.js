/** Render entry point: the company website runs with or without the optional support module. */
import 'dotenv/config';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { config } from './config.js';
import { createApp, finalizeApp } from './app.js';
import { Inquiry } from './models/Inquiry.js';
async function start() {
  const settings = config();
  await mongoose.connect(settings.mongo, { dbName: settings.dbName }); await Inquiry.init();
  const app = createApp(settings); const server = createServer(app);
  let stopSupport = async () => {};
  if (settings.supportEnabled) {
    const { installSupport } = await import('./support/install.js');
    stopSupport = await installSupport(server, app, settings);
  }
  finalizeApp(app);
  server.listen(settings.port, '0.0.0.0', () => console.log(`Neptrixx API listening; support ${settings.supportEnabled ? 'enabled' : 'disabled'}.`));
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return; stopping = true;
    setTimeout(() => process.exit(1), 10000).unref();
    try {
      await stopSupport();
      if (server.listening) await new Promise(resolve => server.close(resolve));
      await mongoose.disconnect(); process.exit(0);
    } catch { process.exit(1); }
  };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
