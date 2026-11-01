# Neptrixx home-screen chat shortcut

## Install behavior

The manifest keeps the app name Neptrixx and stable app ID `/`, with start URL `/messages`, standalone
display, the existing app icons, and a Messages app shortcut. Apple-specific title/icon metadata is included.
Customers open their own conversation; admins open the inbox. A valid session remains signed in; if the
browser uses separate installed-app storage or the session expires, the user must log in again.
Older existing home-screen icons may need to be removed and re-added if their OS retains the old homepage URL.

After successful signup-code verification, the website automatically offers Add Neptrixx to Home Screen.
It does not silently install anything or trigger a native dialog after an asynchronous network response.
A user must click Install Neptrixx and confirm the browser prompt where available. Not now dismisses the offer.
Already-running standalone apps do not get another offer. Existing users have a manual option in
Account settings → Add to Home Screen; normal browser installation/bookmark menus remain available too.
The early install-event listener only captures the browser's one-use prompt; it performs no authentication,
worker registration, or notification permission request while support is off.

## iPhone and iPad

Tap Share → Add to Home Screen → Add and keep the name Neptrixx. If the option is missing, open the chat
in Safari first. Open the installed icon, log in if asked, then enable notifications there.
Home-screen web push and numeric app badges require iOS/iPadOS 16.4+ and notification permission.
The OS can independently suppress badges or sounds; the website cannot override those preferences.

## Android

Use the in-page Install Neptrixx button when the browser supplies a native installation event. Otherwise,
use the browser menu's Install app or Add to Home Screen option. Available wording/capabilities vary by browser.
Chromium on Android does not expose the App Badging API; the launcher normally derives a dot from unread
notifications. A precise numeric home-screen count cannot be guaranteed on Android or every launcher.
Unsupported browsers can still open/bookmark the chat and show the website's normal unread counts.

## Unread counts and background behavior

The backend calculates unread totals across all conversations, independently of the current inbox filter
or 100-row pagination. Per-admin hidden history and per-user message removal are respected. Muted messages
remain unread but do not generate push notifications for the muted admin.
Foreground updates set/clear the app badge where supported. Reading all messages also asks the worker to
close only Neptrixx message notifications, allowing Android's notification dot to clear. Logout clears the badge.
Background pushes include that recipient's current server unread total. The worker always shows a visible
message notification, then updates a supported badge and asks open pages to refresh. No silent-push loophole,
private-page cache, offline chat history, or extra background service is introduced.
If messages are read on another device while this installed app is suspended, its badge can stay stale until
it receives another push or opens/refreshes. Render free-service sleep, connectivity, notification permission,
OS suspension/Focus settings, and launcher support can delay or suppress notifications and badges.

## Validation and deployment

54 backend/worker tests pass, including global filtered-inbox totals, read/unsend clearing, recipient-specific
push counts, worker support fallbacks, safe navigation, and same-origin read-all cleanup. Browser fixtures
cover the automatic signup offer, user-activated native Android install, iOS/manual instructions, standalone
duplicate suppression, global badge updates/clear, and the direct-chat manifest. These do not replace real-device tests.
Deploy backend before using the new frontend. No new account, secret, native build, or paid Shell is needed.
Test one Android phone and one iPhone after deployment: install, open chat, enable notifications, receive a
message while locked, inspect the device-supported badge, then open/read messages and confirm clearing.
