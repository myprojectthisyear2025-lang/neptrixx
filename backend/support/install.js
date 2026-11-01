/** Optional backend integration: models, sessions, sockets, routes and background jobs as one unit. */
import { sessionMiddleware } from './security.js';
import { attachRealtime } from './realtime.js';
import { installSupportRoutes } from './routes.js';
import { configurePush } from './push.js';
import { startJobs } from './jobs.js';
import { sealExistingAdmin } from './bootstrap.js';
import * as models from './models.js';
export async function installSupport(server, app, settings) {
  await Promise.all(Object.values(models).map(model => model.init()));
  await sealExistingAdmin();
  configurePush(); const sessions = sessionMiddleware(settings);
  installSupportRoutes(app, sessions, settings);
  const io = attachRealtime(server, app, sessions, settings.origins);
  const stopJobs = startJobs();
  return async () => {
    stopJobs(); await new Promise(resolve => io.close(resolve)); await sessions.store.close();
  };
}
