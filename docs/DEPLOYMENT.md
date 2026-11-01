# Hosted deployment guide

Use the existing Neptrixx GitHub repository and its `frontend/` and `backend/` roots.
No local development server or paid Render Shell is required. Credentials stay in hosting dashboards.

## 1. Existing service configuration

- MongoDB Atlas: independent cluster `Neptrixx-Support`, database `neptrixx`, and database user `neptrixx-support`.
- The database user needs `readWrite` only on `neptrixx`, restricted to this cluster.
- Atlas Network Access must allow the outbound addresses/ranges from this Neptrixx Render service.
- The application uses Mongo transactions; Atlas supports them.
- R2: private Standard bucket `neptrixx-support-media`, with Object Read & Write credentials scoped to that bucket.
- Resend: verified `neptrixx.com` sending domain and a domain-scoped Sending Access API key.
- Namecheap website/forwarding records remain; `api` CNAME points at `neptrixx.onrender.com`.
- Render: `api.neptrixx.com` must show domain verification AND an issued HTTPS certificate.

The normal website/contact code and all support code use this independent project's settings.
The code supports a single Free Render web service. Free services can sleep and delay first requests/push processing.
Socket.IO uses the in-memory adapter and rate limits are process-local; multi-instance scaling needs shared adapters/limits first.

## 2. Render environment

The following values were prepared in your dashboards. Do not replace them with the example placeholders in the ZIP.
The only newly introduced setting in this revision is `SUPPORT_ENABLED=true`.

| Variable | Needed value |
| --- | --- |
| `NODE_ENV` | `production` |
| `SUPPORT_ENABLED` | `true`; set `false` later to hide/stop the module without deleting data |
| `CLIENT_ORIGIN` | `https://neptrixx.com,https://www.neptrixx.com` |
| `MONGODB_URI` | Your Atlas URI, with its private password correctly URL-encoded |
| `MONGODB_DB_NAME` | `neptrixx` |
| `SESSION_SECRET` | Your existing saved random secret of at least 32 characters |
| `RESEND_API_KEY` | Domain-scoped Resend sending key |
| `EMAIL_FROM` | `Neptrixx <notifications@neptrixx.com>` |
| `EMAIL_REPLY_TO` | `support@neptrixx.com` |
| `INQUIRY_FROM_EMAIL` | `Neptrixx <notifications@neptrixx.com>` |
| `INQUIRY_TO_EMAIL` | `neptrixxinternational@gmail.com` |
| `R2_ACCOUNT_ID` | Cloudflare account ID only, without the S3 URL |
| `R2_ACCESS_KEY_ID` | R2 credential ID |
| `R2_SECRET_ACCESS_KEY` | R2 secret credential |
| `R2_BUCKET_NAME` | `neptrixx-support-media` |
| `WEB_PUSH_PUBLIC_KEY` | The generated public key |
| `WEB_PUSH_PRIVATE_KEY` | Matching private key; keep ONLY on Render |
| `WEB_PUSH_SUBJECT` | `mailto:support@neptrixx.com` |
| `INITIAL_ADMIN_EMAIL` | Your exact intended admin email; clear after successful setup |

Render: Root Directory `backend`; Build Command `npm ci --omit=dev`; Start Command `npm start`;
Health Check `/api/health`; Node 22.12+ or a newer supported Node release.
For an existing service, keep using its settings; do not import `render.yaml` as a second service accidentally.
The Blueprint is optional for new installations and uses the Free plan.
When support is disabled, its session/R2/push/signup settings are not required to start the core API.
MongoDB remains required for website inquiries; Resend inquiry settings remain needed to email those inquiries.
Never commit actual `.env` values. Enter variables in Render/Vercel, then deploy source.

## 3. Vercel environment and deployment

| Variable | Value |
| --- | --- |
| `VITE_API_BASE` | `https://api.neptrixx.com` |
| `VITE_WEB_PUSH_PUBLIC_KEY` | Legacy optional value; notification setup now fetches the server public key after login |

Choose Config, not Secret, for these public values. Never put the private key, database URI, R2 credentials,
session secret, or Resend key in a `VITE_` variable.
Vercel: Root Directory `frontend`; Install `npm ci`; Build `npm run build`; Output Directory `dist`.
Set values for Production before building. `frontend/vercel.json` supports refreshing direct message-page URLs.
Deploy the backend first and verify `/api/health`, then deploy the frontend.
Sockets connect directly to Render; they do not run in Vercel functions.

Login uses Secure, HttpOnly, SameSite=Lax cookies. The website and API must share a registrable domain:
`neptrixx.com` / `www.neptrixx.com` with `api.neptrixx.com`.
Raw `*.vercel.app` previews with `*.onrender.com` APIs are intentionally unsupported by this cookie configuration.
For preview testing, use separate matching subdomains, a separate database/bucket, and exact allowed origins.
Do not copy production secrets into previews. No Vercel rebuild is needed just to change the support switch later.

## 4. Create the first admin in the website

1. Verify `INITIAL_ADMIN_EMAIL` in Render is your intended admin mailbox and `SUPPORT_ENABLED=true`.
2. Open the deployed website, choose Chat with us, and sign up using that exact email address.
3. Enter the code sent by Resend. Only after successful verification is that account eligible for admin enrollment.
4. Open `/admin/messages`. Other users' signup accounts remain customers.
5. Clear `INITIAL_ADMIN_EMAIL` in Render and apply that change after confirming admin access.

A matching customer already verified by this revision can enroll on its next successful login while setup is unclaimed.
Enrollment is recorded once in MongoDB. Restarting/toggling support or changing the configured email does not re-open setup.
Do not delete the `supportbootstraps` record. Adding further admins is a separate controlled task.
No Shell command, admin role selector, hardcoded admin password, or frontend secret is required.

## 5. Photos and browser notifications

Photos upload through the Render API, so browser-upload R2 CORS is unnecessary.
The API validates image contents, strips metadata, resizes/converts to WebP, and stores private objects.
Each input photo is limited to 8 MB and chat text to 4,000 characters. Signed viewing URLs expire after 15 minutes.
Sender unsend removes the photo reference and attempts immediate R2 deletion; failed deletion is retried by abandoned-upload cleanup.
Previously downloaded/cached copies cannot be recalled.
The app can refresh expired URLs through authorized endpoints. Keep public `r2.dev` access disabled.

Click Enable notifications on each device and accept the browser prompt.
On iPhone/iPad, use iOS/iPadOS 16.4+, Share → Add to Home Screen, then open the Home Screen app and enable notifications.
Choose one canonical website origin for installation. The service worker shows generic alerts and opens the relevant conversation.
It does not cache website pages. Logout removes this device's subscription; account settings can disable notifications.
Denied permissions, Focus/Do Not Disturb, offline/force-stopped devices, browser restrictions, and service sleep affect delivery.
Brave may require Settings → Privacy and security → Use Google services for push messaging, then a browser restart.
Notification setup repairs an existing subscription when the server public key changes.
The website cannot enable a browser push service or override denied permissions or device sound settings.
A soft in-page tone is available for focused website sessions after interaction, with a per-device toggle and test button.
Queued retries use backoff up to eight attempts. Old jobs over one hour are skipped after a long disabled period.
Notifications already dispatched can still arrive after disabling. Email unread reminders and admin two-factor auth are not included.

Your notification keys are already generated. For a fresh installation only, generate a pair with the one-off command:

```powershell
npx --yes web-push generate-vapid-keys
```

This command does not start a local server. Keep the pair stable across deployments.

## 6. Hosted checks

- Signup/code verification, login/logout, expired/wrong-code handling, and password reset.
- First-admin automatic enrollment and rejection of customer access to admin routes or others' conversations.
- Text/photo sending both ways, retry, refresh/history, replies, read/unread state, and network reconnect.
- Customer search by name/email/phone/customer ID, including users who have not started a conversation.
- Resolve/reopen and customer restrict/restore.
- Real email delivery, private R2 upload/view/delete, and notifications while backgrounded/locked.
- Notification clicks open the right conversation after login.
- Profile/avatar editing, verified email change, and deletion using disposable customer accounts.
- `SUPPORT_ENABLED=false`: launcher/pages/API/sockets stop, existing data remains, company/contact form still works.
- `SUPPORT_ENABLED=true` again: conversations and admin access return without another enrollment.

Historical `backend/data/inquiries.json` is preserved. New inquiries are durable MongoDB records.
Optional historical import is separate from deployment; no Shell step is needed for an empty JSON file.
Review the existing privacy/terms pages for actual support data handling and your providers' backup retention.
