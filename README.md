# Neptrixx with customer support chat

Complete updated website source based on the latest uploaded Neptrixx project, with support messaging
adapted from the supplied RomBuzz backend and mobile chat UI.

Read [START_HERE.md](START_HERE.md) first, then follow the [hosted deployment guide](docs/DEPLOYMENT.md).
The complete credential checklist is in `backend/.env.example` and `frontend/.env.example`.

## Website

The existing company homepage, services, products, process, contact form, SEO metadata, and public legal pages remain.
A Chat with us button opens `/messages`; verified admin accounts use `/admin/messages`.
New project inquiries persist in MongoDB and continue using the existing Resend email template.

## Support features

- Optional support controlled by one Render setting; disabling preserves the company site and stored chat data.
- One-time admin enrollment after verification of your configured email; no paid Shell required.
- Verified email signup, login, password reset, verified email changes, and secure browser sessions.
- Full name, email, optional international phone number, and one required profile picture at signup.
- Private customer–business text/photo conversations with saved history, replies, read status, and unread counts.
- Searchable admin inbox with All/Unread/Muted/Blocked users/Pinned categories and customer access restrictions.
- Admin-only original signup profile cards that survive later profile edits and ordinary chat deletion.
- Notification prompts reflect this device’s actual subscription rather than asking again after setup.
- Private Cloudflare R2 photos, metadata stripping, upload limits, and temporary viewing URLs.
- Web Push for customers/admins with supported browser/OS behavior and persistent delivery retries.
- Account settings/deletion and responsive Light/Dark/System themes using Inter.

## Deployment

Frontend: React + Vite on Vercel. Backend: Node/Express + Socket.IO on Render.
MongoDB stores accounts, messages, sessions, inquiries, and push jobs; Resend delivers verification/recovery emails.
No local server setup is needed. Real credentials must be entered in the hosting dashboards before deployment.
The source ZIP itself does not push changes to GitHub or deploy either service.

See [enable/disable and removal boundaries](docs/OPTIONAL_SUPPORT.md), [module reuse and source mapping](docs/REUSE.md) and [verification results](docs/VALIDATION.md).
