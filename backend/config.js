/** Hosted website settings; support is opt-in and its secrets are only required when enabled. */
export function config(env = process.env) {
  const get = key => String(env[key] || '').trim();
  const origins = get('CLIENT_ORIGIN').split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length || origins.some(s => !/^https:\/\/[^/]+$/.test(s))) {
    throw new Error('CLIENT_ORIGIN must list exact HTTPS website origins.');
  }
  const flag = get('SUPPORT_ENABLED').toLowerCase() || 'false';
  if (!['true', 'false'].includes(flag)) throw new Error('SUPPORT_ENABLED must be true or false.');
  const supportEnabled = flag === 'true';
  const required = ['MONGODB_URI'];
  if (supportEnabled) required.push('SESSION_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM',
    'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME',
    'WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY', 'WEB_PUSH_SUBJECT');
  for (const key of required) {
    if (!get(key) || /REPLACE|PLACEHOLDER|YOUR_/i.test(get(key))) throw new Error(`Configure ${key} in Render.`);
  }
  if (supportEnabled && get('SESSION_SECRET').length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 random characters.');
  }
  const initialAdminEmail = get('INITIAL_ADMIN_EMAIL').toLowerCase();
  if (supportEnabled && initialAdminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(initialAdminEmail)) {
    throw new Error('INITIAL_ADMIN_EMAIL must be your valid admin email or left empty.');
  }
  return { origins, supportEnabled, initialAdminEmail, mongo: get('MONGODB_URI'),
    dbName: get('MONGODB_DB_NAME') || 'neptrixx', secret: get('SESSION_SECRET'), port: Number(env.PORT) || 5000 };
}
