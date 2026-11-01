# Original customer profile records

## Signup and the admin card

New account creation requires exactly one photo. It is uploaded with the signup form, checked and
normalized to WebP by the existing image pipeline, and stored in private R2. The 8 MB input limit,
shared two-upload capacity, session CSRF, and auth rate limits apply before accepting the account.
A pending photo is not a customer account. Email-code verification creates the account with its
original name, email, phone, photo key, capture time, and source in one immutable user-document field.
Only server-validated fields are copied; client-supplied roles, avatar references, or snapshots are ignored.
Code resend reuses the pending photo and is restricted to the signup browser session.

Immediately after verification, the server creates a conversation if needed and refreshes connected
admins' inboxes. A profile-only conversation has a timestamp/preview but is not counted as an unread
customer message. Its private card appears at the beginning of the admin conversation, separately
from editable/unsendable messages. It is not returned in customer history, session, or profile payloads.

The card shows the original name, email, phone (or Not provided), processed signup photo, customer ID,
and registration time. Current account edits do not rewrite those values. Original photos remain
referenced and protected from normal avatar replacement, removal, unused-upload deletion, and cleanup.
Admin photo access uses expiring signed URLs and an admin-only refresh route.

For accounts that already existed, the first capture is marked Existing account record with a capture
time. Original signup values cannot be reconstructed retroactively. Existing users are not locked out
because they joined before photos became mandatory. Capturing occurs before subsequent profile/email edits.

## Retention boundary

Ordinary chat deletion, message unsend, and profile changes cannot erase the record. It remains for the
account's lifetime. Explicit customer account deletion still removes the user document, original record,
conversation, and all associated photos under the existing account deletion behavior. This update does
not introduce indefinite retention after account deletion. The signup form and privacy page disclose
that original signup details/photo are retained for admin account history.

A self-reported profile and photo are not identity verification and do not prove two separate accounts
belong to the same person. This record helps compare later edits to the same account's starting details.

## Device notification state and inbox categories

The notification banner checks permission, this browser's native subscription, account ownership in
MongoDB, account notification preference, and the current server public key without requesting permission.
An enabled device does not show Enable notifications, including after reload. Account settings show
Enabled on this device. Focus, visibility, permission changes, and notification enable/disable refresh state.
Unknown connectivity status does not falsely claim notifications are disabled or repeatedly prompt.

Inbox categories are All, Unread, Muted, Blocked users, and Pinned. Filtering happens on the server
before pagination. Muted/pinned belong to the signed-in admin. Blocked users remain listed even if the
admin previously deleted that chat, so they remain discoverable for unblocking. Open/Resolved categories
are removed from the UI; existing conversation status data is retained.

## Deployment and validation

Deploy backend before using the new frontend. No new account, secret, paid Shell, or destructive migration
is required. Optional schema fields retain compatibility with existing accounts/messages. Multipart signup
is now required; old cached signup forms that send JSON need to reload the deployed frontend.
The same SUPPORT_ENABLED switch gates these additions. After deployment, verify an already-enabled
browser does not show the banner, create a disposable account with one photo, check its admin card,
edit that customer profile/photo, and confirm the card retains the original values.
