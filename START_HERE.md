# Start here

Complete updated Neptrixx project for the existing GitHub → Render/Vercel deployment.
No service accounts or data from any other project are used.

## Before uploading

Your MongoDB, R2, Resend, session/admin-email, notification keys, and API domain were configured in the dashboards.
Keep those values there; the ZIP contains only example placeholders.
Add ONE new Render environment variable:

| Key | Value |
| --- | --- |
| `SUPPORT_ENABLED` | `true` |

Save without deploying until the source is uploaded.
Vercel should already have `VITE_API_BASE=https://api.neptrixx.com` and the matching public notification key.
No Vercel feature flag is needed: the website reads the switch from the backend.

## Deploy the source

1. Put this project's source into the existing Neptrixx repository, retaining `frontend/` and `backend/`.
2. Check Render Root Directory `backend`, Build Command `npm ci --omit=dev`, Start Command `npm start`.
3. Deploy the backend and check its `/api/health` response before deploying the frontend.
4. Check Vercel Root Directory `frontend`, Build Command `npm run build`, Output Directory `dist`.
5. Deploy the frontend, then open Chat with us on the website.
6. Sign up with the EXACT email saved in Render's `INITIAL_ADMIN_EMAIL` and verify its email code.
7. That verified account becomes the first admin automatically. Open `/admin/messages` after verification.
8. Complete the live checks in `docs/DEPLOYMENT.md`, including real email/photos and device notifications.

Admin setup does not require Render Shell, a paid Render plan, or an admin password in the source code.
A persistent one-time setup record prevents a second automatic admin enrollment later.
After the first successful admin login, clear `INITIAL_ADMIN_EMAIL` in Render and apply that environment change.

## Keep or disable chat

Change `SUPPORT_ENABLED` to `false` in Render and redeploy/restart the backend to apply it.
The launcher disappears, support pages become unavailable, and support APIs/sockets/workers stop.
Existing accounts, messages, photos, sessions, subscriptions, and the setup record are preserved.
Switch back to `true` to restore support; no frontend rebuild is required for a switch change.
An already open browser checks at least once per visible minute and when refocused.
See `docs/OPTIONAL_SUPPORT.md` for removal boundaries and retained data.

The ZIP does not push changes to GitHub or deploy either service.
The existing company pages, website DNS records, and email-forwarding aliases stay in place.
Start with `docs/DEPLOYMENT.md` for the full configuration table and hosted workflow.
`docs/REUSE.md` identifies the reusable folders; `docs/VALIDATION.md` records checks and remaining live tests.
