# Reusing the support module

This document identifies the extracted/adapted chat pieces and how to move them into another website.

## Source of truth

- Neptrixx: `neptrixx-main (1).zip`.
- Chat backend reference: `rombuzz_main-main (33).zip`, backend code only.
- UI reference: `rombuzz-mobile-main (35).zip`, mobile chat code only.
- The RomBuzz web frontend was not used.

## What was adapted

| Source files | Support implementation |
| --- | --- |
| `server/services/chatPersistence.js` | `backend/support/chatPersistence.js`: idempotent message IDs, persistence before publish, monotonic read state |
| `server/sockets/chatEvents.js` and `server/routes/chatRooms.js` | `backend/support/chat.js`, `realtime.js`: authenticated realtime delivery, typing, read updates |
| Chat unread services | Conversation-specific unread queries in `backend/support/chat.js` |
| OTP/password routes | New minimal verified signup and reset modules, Resend delivery, hashed expiring codes |
| R2 configuration/media helpers | New private-photo storage module using the existing S3-compatible approach |
| Mobile `ChatWindowView.tsx` | Browser composition in `Thread.jsx`: header, scrolling message list, composer |
| Mobile `ChatComposer.tsx` and message/media components | Browser-native text/photo input, preview, reply quoting, sender/receiver bubbles |
| Mobile chat styles | Similar spacing and message structure, with the requested muted light/dark themes |

These are focused adaptations, not unmodified folder copies. The original chat depended on matches, relationships,
moderation, gifts, purchased/disappearing media, Expo APIs, and mobile push tokens. Those dependencies are excluded.
The website uses normal HTML/React, cookie sessions, and Web Push. No React Native runtime is required.

## Main reusable folders

- `backend/support/`: models, auth, permissions, messages, private photos, profile, admin, push, realtime, jobs.
- `frontend/src/support/`: login/signup, inbox, thread, composer, settings, notifications, scoped styles.
- `frontend/src/features/SupportFeature.jsx`: runtime feature gate and unavailable-state boundary.
- `frontend/public/support-sw.js`: background message notifications.
- `frontend/public/support-*.png`: technical install/notification icons.

`backend/server.js` conditionally installs `backend/support/install.js` when `SUPPORT_ENABLED=true`.
The installer mounts support routes/sessions, sockets and workers. Core company/contact code does not import the module.
`frontend/src/App.jsx` uses `features/SupportFeature.jsx`, which reads the backend status and lazily loads `SupportRuntime`.
The runtime mounts `SupportProvider` and chooses the chat route or company pages only when support is enabled.
`ChatLauncher` is the entry point added to the company pages. The original company sections remain in place.
The contact form now reads the same hosted API configuration and stores new inquiries in MongoDB.

## Move to another React website

1. Copy the two support folders, service worker, icons, and manifest entries.
2. Install the dependencies listed in the respective `package.json` files and preserve the lockfiles.
3. Copy `backend/lib/http.js` and the relevant core configuration/status endpoint; dynamically install `support/install.js`.
4. Copy `frontend/src/features/SupportFeature.jsx`, its CSS, and `frontend/src/config/api.js`.
5. Use the boundary in App to pass a launcher into the company page; its runtime handles Provider/Portal/Launcher.
6. Set new domains/origins, sender addresses, database/bucket names, and VAPID configuration.
7. Adapt the Neptrixx labels/logo and the `--sp-*` color tokens. Keep private credentials on the backend.
8. Update the service worker's allowed message paths if routes change, and configure the host's SPA rewrites.

Use the original website's latest files for that integration. If it already has authentication, map its verified users
and roles to the support permissions instead of introducing a second unrelated login system.
If deploying the module as a separate business/site, use a separate database/bucket and an independent VAPID key pair.

## Boundaries in this version

- Customer ↔ business only; no customer directory or customer-to-customer messaging.
- One persistent conversation per customer; all admins share it.
- Text and one photo per message; up to 8 MB input, resized to at most 2048 px on the server.
- Optional phone/profile picture; email verification is required. Phone numbers are not verified.
- Set the backend `SUPPORT_ENABLED` flag to true to opt in; set false to disable without deleting data.
- Configure a new `INITIAL_ADMIN_EMAIL` for each independent installation, then verify that mailbox to claim setup once.
- No calls, voice/video messages, reactions, gifts, billing, location, matching, or disappearing media.
- Delivery status is Sending / Sent / Read / Failed; Sent means the server saved the message.
- Customer search includes accounts with no messages. Inbox/history include Load more pagination.
- Account deletion removes the customer's chat, its photo objects (including admin-shared photos), and subscriptions.
- Database/provider backups follow the retention settings you configure with those providers.
- New code files have a brief header and stay under 200 lines. Existing unrelated website files are preserved;
  generated lockfiles and unchanged original styling are not hand-authored support modules.

## Conversation interaction extension

`messageActions.js`, `inbox.js`, `preferences.js`, and `presence.js` remain inside
`backend/support/`. The new action/presence/sound UI remains inside `frontend/src/support/`.
The same feature switch gates all new routes, sockets, and UI.
