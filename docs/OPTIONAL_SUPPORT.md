# Optional support module

The company website can run with this module enabled, disabled, or removed from the source later.

## One backend switch

Set `SUPPORT_ENABLED=true` or `SUPPORT_ENABLED=false` in the existing Neptrixx Render backend's environment.
Apply the change by restarting/redeploying that backend. A saved but unapplied environment edit does not change the running service.
Missing `SUPPORT_ENABLED` defaults to false. Other values fail startup rather than accidentally enabling support.
The frontend reads `GET /api/support/status`, with no credentials and no browser/CDN caching.
There is no second toggle to keep synchronized in Vercel.

| Behavior | Enabled | Disabled |
| --- | --- | --- |
| Company homepage and sections | Available | Available |
| Project inquiry form | Available | Available |
| Chat launcher | Visible | Hidden |
| `/messages` and `/admin/messages` | Login/chat/inbox | Neutral unavailable page with support email |
| Support API/auth/uploads | Available with permissions | Rejected with HTTP 503; no support session created |
| Support Socket.IO server | Running | Not installed; requests rejected |
| Push/unused-upload background workers | Running | Not started |
| Existing accounts/messages/photos/subscriptions | Retained | Retained |
| One-time initial-admin setup record | Retained | Retained |

The browser checks on startup, on focus/visibility, and every 60 seconds while visible.
If support is explicitly disabled, it unmounts the chat UI and closes its browser socket connection.
A temporary status-network failure preserves an already-open chat/draft; the backend independently blocks disabled endpoints.
When support is off at page load, the chat bundle is not loaded and login/session/socket requests do not start.
Switch changes require no Vercel rebuild because the public backend response controls the interface.
Previously dispatched/queued browser notifications can still finish delivery. No new support push jobs run while off.
Push jobs more than one hour old are skipped after re-enable to avoid an old notification backlog.

## Admin setup without paid Shell

`INITIAL_ADMIN_EMAIL` is a private backend allowlist for initial enrollment, not a password or public signup field.
Only successful email-code verification can create an email-verified account.
Only the verified allowlisted account can become the first admin; ordinary signup always remains a customer.
A matching existing verified customer can enroll at its next successful password login while setup is still unclaimed.
An existing admin seals setup so an additional account cannot claim it.
Enrollment and its `SupportBootstrap` record are stored atomically in a Mongo transaction.
Changing `INITIAL_ADMIN_EMAIL`, restarting, disabling/re-enabling, or demoting a user does not reset that record.
A changed admin email keeps its admin role. Remove `INITIAL_ADMIN_EMAIL` after setup as a cleanup step.
Do not delete the setup record to try to add another admin; that is a separate owner-controlled task.
No public endpoint accepts an admin role, and there is no admin setup token embedded in the frontend.
Administrator two-factor authentication is not included in this first version.

## Source boundaries for later removal

- Frontend integration point: `frontend/src/App.jsx` uses `features/SupportFeature.jsx`.
- Frontend feature boundary: `frontend/src/features/SupportFeature.jsx` and `supportFeature.css`.
- Frontend module: `frontend/src/support/`, lazily imported only when enabled.
- Backend integration point: the guarded dynamic import of `support/install.js` in `backend/server.js`.
- Backend module: `backend/support/`; routes, sockets, session store, workers, and enrollment are installed together.
- Shared website code lives outside those folders: `frontend/src/config/api.js`, `backend/config.js`,
  `backend/lib/http.js`, and `backend/models/Inquiry.js`.

Usually disabling is enough. For physical removal, first disable and apply the backend switch, then remove the App wrapper
and the guarded server integration along with the optional module folders, notification assets/manifest entries,
service worker, support-only tests, routes/rewrites, and unused dependencies. Retain shared core/contact files.
The company page accepts a null launcher, so its sections and contact form do not depend on support components.
A physical-removal change should be checked against the latest website source when you request it.

## Optional data deletion is separate

Disabling or removing code does not delete user data, the dedicated R2 bucket, or provider credentials.
Support collections use these names:
`supportusers`, `supportcodes`, `supportconversations`, `supportmessages`, `supportassets`,
`supportsubscriptions`, `supportpushjobs`, `supportbootstraps`, and `support_sessions`.
The website's `websiteinquiries` collection is separate: do not drop the entire `neptrixx` database to remove chat.
Keep data if you may restore the module. Permanent deletion of its collections/bucket/keys requires a separate explicit decision.
Existing Namecheap website DNS records and forwarding aliases are unrelated to the toggle.

## Free Render limits

The code runs on one Free Render web service and does not depend on Shell access.
A sleeping/cold service can delay the first page/API request, sockets, and notification processing.
Background retries pause while the service is asleep and resume when it wakes. Instant delivery under every condition is not promised.
A shared socket adapter and shared rate limiter are needed before running multiple backend instances.
