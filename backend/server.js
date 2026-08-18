import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendInquiryEmail } from "./email.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const inquiriesPath = path.join(dataDir, "inquiries.json");
const requestLog = new Map();

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(inquiriesPath)) fs.writeFileSync(inquiriesPath, "[]", "utf-8");

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "64kb" }));

function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 5;
  const current = (requestLog.get(ip) || []).filter((time) => now - time < windowMs);

  if (current.length >= maxRequests) {
    requestLog.set(ip, current);
    return true;
  }

  current.push(now);
  requestLog.set(ip, current);
  return false;
}

function persistInquiry(inquiry) {
  let records = [];
  try {
    records = JSON.parse(fs.readFileSync(inquiriesPath, "utf-8"));
    if (!Array.isArray(records)) records = [];
  } catch {
    records = [];
  }

  const next = [inquiry, ...records].slice(0, 500);
  fs.writeFileSync(inquiriesPath, JSON.stringify(next, null, 2), "utf-8");
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Neptrixx API",
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM_EMAIL),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/company", (_req, res) => {
  res.json({
    name: "Neptrixx",
    tagline: "Websites, apps, AI, custom software, and digital products for clients worldwide.",
    reach: "Worldwide",
    products: [
      { name: "RomBuzz", status: "Live", url: "https://www.rombuzz.com" },
      { name: "Yumi Beads", status: "Live", url: "https://www.yumibeads.com" },
      { name: "MeetInTheMiddle", status: "In development" },
      { name: "OverLimit", status: "In development" },
      { name: "Nepal Commerce Hub", status: "In development" },
    ],
    services: [
      "Website Development",
      "Mobile App Development",
      "Custom Software / IT Systems",
      "AI Services & Automation",
      "E-commerce / Marketplaces",
      "Product & UI/UX Design",
      "Maintenance & Support",
    ],
  });
});

app.post("/api/inquiries", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ ok: false, message: "Too many inquiries. Please try again later." });
  }

  if (clean(req.body?.website, 200)) {
    return res.status(201).json({ ok: true, message: "Inquiry submitted successfully." });
  }

  const inquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: clean(req.body?.name, 100),
    email: clean(req.body?.email, 200).toLowerCase(),
    company: clean(req.body?.company, 120),
    service: clean(req.body?.service, 120),
    budget: clean(req.body?.budget, 80),
    timeline: clean(req.body?.timeline, 80),
    message: clean(req.body?.message, 5000),
    createdAt: new Date().toISOString(),
    status: "pending_email",
  };

  if (!inquiry.name || !inquiry.email || !inquiry.message) {
    return res.status(400).json({ ok: false, message: "Name, email, and project details are required." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return res.status(400).json({ ok: false, message: "Please enter a valid email address." });
  }

  try {
    const email = await sendInquiryEmail(inquiry);
    const saved = { ...inquiry, status: "emailed", emailId: email.id || "" };
    persistInquiry(saved);

    return res.status(201).json({ ok: true, message: "Inquiry emailed successfully." });
  } catch (error) {
    console.error("Inquiry email error:", error);
    persistInquiry({ ...inquiry, status: "email_failed", error: error.message });

    return res.status(502).json({
      ok: false,
      message: "Your inquiry could not be emailed right now. Please email neptrixxinternational@gmail.com directly.",
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: "Route not found." });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, message: "Server error." });
});

app.listen(PORT, () => {
  console.log(`Neptrixx API running on port ${PORT}`);
});
