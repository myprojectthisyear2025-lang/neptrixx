# Neptrixx Full-Stack Website

A ready-to-run full-stack starter for **neptrixx.com**.

## What this includes

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Responsive design:** mobile + desktop friendly
- **Sections:** Hero, Services, Products, Process, About, Contact
- **Real backend endpoint:** inquiry form submission
- **Local persistence:** inquiries saved to `backend/data/inquiries.json`

## Project structure

```bash
neptrixx-fullstack/
  frontend/
  backend/
```

## Run locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 2) Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Production notes

This is a **strong MVP starter**, not a fully hardened enterprise deployment yet.

Before going live, you should still add:

- rate limiting
- CAPTCHA
- email delivery
- database
- admin auth/dashboard
- input logging/monitoring
- analytics
- proper deployment envs and domain config
