# Verification results

Recorded for this source package on November 1, 2026. These checks do not imply a production deployment.

## Passed

- Backend syntax checks and the 200-line limit for new backend modules.
- All new hand-authored support source files have a brief opening description and stay under 200 lines.
- Production frontend build with Vite 8.3.5.
- Backend production dependency audit: zero reported vulnerabilities.
- Frontend dependency audit: zero reported vulnerabilities.
- Fifty-four backend/worker tests using an isolated real MongoDB replica set, HTTP requests, and Socket.IO clients.
- Browser checks against the production bundle with explicitly mocked API responses, at desktop and phone widths.
- Optional-mode browser checks: company homepage stays usable, no chat/auth/socket bundle starts while off,
  direct message URLs are unavailable, and runtime enable/disable takes effect without rebuilding.
- Visual review of rendered light-mode admin desktop/mobile views and the dark-mode customer view.

## Backend behaviors covered by tests

1. Verified email signup, password hashing, safe public account payload, secure cookie, and admin-role injection rejection.
2. Single-use verification codes and resend cooldown.
3. Cross-origin and missing-CSRF request rejection.
4. Exactly one conversation per customer and rejection of customer directory access.
5. Rejection of another customer's history/send access.
6. Duplicate-send protection and atomic creation of one message and one push job.
7. Rejection of arbitrary or another user's private photo keys, with transaction rollback.
8. Admin search, unread counts, read acknowledgments, replies, resolve, and automatic reopen.
9. Authenticated socket delivery and anonymous socket rejection.
10. Password reset and invalidation of previously logged-in sessions.
11. New email ownership verification and account email change.
12. Immediate account-access restriction by admin.
13. Retry/completion state for a transient browser-push failure.
14. Password-confirmed account deletion and conversation record removal.
15. Photo metadata stripping, dimension limits, and WebP output.
16. Invalid file/SVG upload rejection.
17. Push endpoint host/protocol restrictions.
18. Startup rejection of missing/placeholder hosted configuration.
19. Support defaults off and skips requirements for its unused secrets.
20. Disabled support blocks auth, chat, admin, uploads and socket requests without creating sessions.
21. Owner email without its correct verification code cannot claim admin; ordinary signup cannot choose its role.
22. Verified configured owner email claims admin and an atomic persistent setup latch.
23. Changing the owner email setting or demoting an account does not re-open enrollment.
24. Website inquiry delivery and existing chat data remain intact while support is disabled.
25. An existing verified matching customer can enroll on a valid login if setup is still unclaimed.
26. Existing admins seal setup so another account cannot claim it.
27. The actual disabled server entry point starts without support secrets or support collections.
28. The actual enabled entry point installs support and returns a secure browser session.

Email sending is mocked in backend tests, so no actual verification mail was delivered.
Push transport is mocked when testing retries, so no actual device notification was sent.

## Browser behaviors checked

- Signup screen → code verification → customer conversation.
- Sending text and displaying the saved message.
- Light/dark preference switching.
- Account/details dialogs and Escape dismissal.
- Admin inbox selection, customer search, and mobile Back navigation.
- No horizontal page overflow at 390 px width; no uncaught browser errors during these checks.

Browser API fixtures are test-only and are NOT included in the website or production backend.
Live realtime delivery/auth permissions are covered by the separate backend tests.

## Requires your credentials and hosted/device testing

- Actual Resend sender verification and email delivery.
- Actual private R2 upload, viewing, deletion, and bucket/token permissions.
- Custom domain DNS/TLS and cookie behavior between Vercel and Render.
- One-time verified-owner admin enrollment on the deployed database.
- Android/iPhone background and lock-screen push, permissions, and notification-click navigation.
- Real mobile keyboard behavior, network changes, and browser/device compatibility.
- Final production privacy/terms content and provider backup-retention settings.

This revision is prepared on a separate review branch. No production deployment, DNS configuration,
service account, or production database is changed by the source update.
The original legal pages are preserved; they should be reviewed for the actual support features before rollout.

The supplied Neptrixx artwork is preserved as `frontend/public/neptrixx-brand.jpg`.
The emblem SVG and favicon embed those original bytes and use a viewport to show
the emblem at small sizes; no AI recreation is used. Website, footer, support header,
and social metadata use the new artwork.

The conversation-interaction extension passes 54 backend/worker tests in total and production-bundle browser
checks for mobile holds, message/photo actions, inbox preferences, push recovery, sound controls,
and continued feature-off behavior. See `CHAT_INTERACTIONS.md` for deployment/device test boundaries.

Registration/device-state checks cover missing/invalid/oversized photos, verified-only account creation,
photo-preserving code resend, immutable admin records, current-profile/email changes, legacy capture labels,
retained-media cleanup protection, requested inbox categories, and the existing account deletion boundary.
Browser checks verify no enable prompt on an already subscribed device across reload, permission-change
refresh without permission prompts, required photo/preview, admin-only card rendering, and mobile categories.

Home-screen installation and app-badge checks cover the user-confirmed signup offer, iOS/manual guidance,
standalone detection, filtered-inbox-independent totals, background recipient counts, worker capability
fallbacks, and read-all clearing. See `HOME_SCREEN.md` for real-device requirements and Android limits.
