# Chat interactions update

This revision builds on Neptrixx main commit `15a2b19` and uses only this project's settings and data.

## Behavior

- Green dot and Active now mean at least one authenticated tab is visible and focused.
- Last-seen timestamps persist. The label changes through minutes, hours, and days; unknown users show Offline.
- Presence counts tabs separately, expires stale heartbeats, and shares customer presence only with admins/the customer.
- Hold a message/photo, right-click it, or use its visible menu button. Touch scrolling cancels a hold.
- Reply and six emoji reactions are available; selecting your current emoji removes it.
- Each person has one reaction per message. Edits/unsend only work for the original sender.
- Edit applies to text messages. Photos can be replied to, reacted to, unsent, or deleted for me.
- Unsend keeps a Message unsent placeholder, removes content/reactions, and stops new photo-URL access.
- Delete for me hides that message only from the current user, including on reload.
- Admin inbox shows newest activity first, with pinned chats above unpinned chats; each group sorts by recent activity.
- Same-day messages show a clock time; older messages show a date and a full timestamp on hover.
- All/unread/open/resolved filtering happens before pagination, including older unread conversations.
- Hold an inbox row or use its menu to pin, mute, block, or delete chat for me.
- Pin/mute/delete belong to the signed-in admin. Blocking applies to the customer account and ends its sessions.
- Delete chat for me hides current history only for that admin; a later message brings the chat back.
- Muting suppresses this admin's push and foreground message tone, while other admins keep their own settings.
- Open-website sounds play after a browser interaction, in the focused tab. Account settings include a device toggle and Test sound.
- Background/locked-device alerts use Web Push and operating-system notification sound settings.
- Push setup fetches the backend public key and replaces subscriptions using an old key.
- Registration errors explain Brave push settings, permission blocks, unsupported browsers, or connectivity issues.

## Deployment

Merge and deploy the backend before using the new frontend. Existing models gain optional fields and a new
`supportpreferences` collection/index; no destructive migration or paid Render Shell is needed.
Existing accounts/messages remain readable. Keep existing private dashboard settings; no new service account is needed.
The old Vercel public-key variable can stay, but subscription setup now uses the backend key.
The original SUPPORT_ENABLED switch still stops all support behavior without deleting data.

## Validation

Backend integration coverage includes ownership and cross-account restrictions, durable private deletion,
concurrent reactions, recency/pin sorting, server-side unread pagination across 102 conversations,
private admin preferences, mute-aware push, photo unsend, public-key access, and multi-tab presence.
Browser fixtures cover edit/reply/reactions, mobile hold/right-click, photo/text unsend, per-user deletion,
pin/mute/delete menus, unread filtering, stale-key replacement, Brave guidance, tone preview, and mobile overflow.
Fixtures and screenshots are not included in the production bundle.

Real-device checks remain necessary after deployment: Brave push service setting/restart, Android/iPhone
notification arrival with the phone locked, browser-native sound behavior, real R2 deletion, and two-way
presence/actions between separate authenticated devices. An offline or force-stopped device, blocked push service,
Focus/Do Not Disturb, browser suspension, and Render free-instance sleep can prevent or delay alerts.
