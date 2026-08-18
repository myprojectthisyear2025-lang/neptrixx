# Neptrixx Website

Modern full-stack website for **https://www.neptrixx.com**.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Inquiry email delivery: Resend API
- Responsive UI: mobile, tablet, laptop, desktop

## Included in this version

- Bright modern redesign with no dark content cards
- Responsive layout and mobile hamburger navigation
- Mobile menu closes when the user taps outside it or presses Escape
- Desktop navigation scrolls away with the page instead of staying fixed
- Animated product showcase
- Yumi Beads added as a live Neptrixx product
- Worldwide company positioning
- Website Development and AI service options in the inquiry form
- Inquiry emails delivered to `neptrixxinternational@gmail.com`
- Spam honeypot and basic server-side rate limiting
- Public inquiry-list endpoint removed
- SEO title, description, canonical URL, Open Graph metadata, JSON-LD structured data
- `robots.txt`, `sitemap.xml`, web manifest, and social preview image

## Local development

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend: `http://localhost:5000`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`

## Required production environment variables

### Frontend

```env
VITE_API_BASE=https://YOUR-BACKEND-DOMAIN
```

### Backend

```env
CLIENT_ORIGIN=https://www.neptrixx.com,https://neptrixx.com
RESEND_API_KEY=re_your_api_key_here
INQUIRY_FROM_EMAIL=Neptrixx Website <website@neptrixx.com>
INQUIRY_TO_EMAIL=neptrixxinternational@gmail.com
```

For production email delivery, add and verify `neptrixx.com` in Resend and use a sender such as `website@neptrixx.com`.

## SEO after deployment

The code includes the on-site SEO pieces, but search engines control indexing and ranking. After deploying:

1. Add `https://www.neptrixx.com` to Google Search Console.
2. Verify the domain.
3. Submit `https://www.neptrixx.com/sitemap.xml`.
4. Use URL Inspection for the homepage and request indexing.
5. Keep the site live, fast, useful, and linked from your products and business profiles.

## Production checks

Frontend build:

```bash
cd frontend
npm run build
```

Backend syntax check:

```bash
cd backend
node --check server.js
node --check email.js
```
