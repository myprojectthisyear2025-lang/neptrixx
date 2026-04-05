import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const inquiriesPath = path.join(dataDir, "inquiries.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(inquiriesPath)) {
  fs.writeFileSync(inquiriesPath, "[]", "utf-8");
}

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Neptrixx API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/company", (_req, res) => {
  res.json({
    name: "Neptrixx",
    tagline: "Digital products, software systems, and custom builds under one parent company.",
    products: [
      {
        name: "RomBuzz",
        type: "Product",
        description: "A social and dating platform built under Neptrixx.",
      },
      {
        name: "Custom Client Builds",
        type: "Service",
        description: "Web apps, mobile apps, SaaS, platforms, and internal tools.",
      },
    ],
    services: [
      "Mobile App Development",
      "Web Development",
      "MVP Development",
      "UI/UX Design Systems",
      "Backend APIs",
      "Product Strategy",
      "Maintenance & Support",
    ],
  });
});

app.post("/api/inquiries", (req, res) => {
  const {
    name = "",
    email = "",
    company = "",
    service = "",
    budget = "",
    timeline = "",
    message = "",
  } = req.body || {};

  const trimmed = {
    name: String(name).trim(),
    email: String(email).trim(),
    company: String(company).trim(),
    service: String(service).trim(),
    budget: String(budget).trim(),
    timeline: String(timeline).trim(),
    message: String(message).trim(),
  };

  if (!trimmed.name || !trimmed.email || !trimmed.message) {
    return res.status(400).json({
      ok: false,
      message: "Name, email, and project details are required.",
    });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email);
  if (!emailOk) {
    return res.status(400).json({
      ok: false,
      message: "Please enter a valid email address.",
    });
  }

  let records = [];
  try {
    records = JSON.parse(fs.readFileSync(inquiriesPath, "utf-8"));
    if (!Array.isArray(records)) records = [];
  } catch {
    records = [];
  }

  const newInquiry = {
    id: `inq_${Date.now()}`,
    ...trimmed,
    createdAt: new Date().toISOString(),
    status: "new",
  };

  records.unshift(newInquiry);
  fs.writeFileSync(inquiriesPath, JSON.stringify(records, null, 2), "utf-8");

  return res.status(201).json({
    ok: true,
    message: "Inquiry submitted successfully.",
    inquiry: newInquiry,
  });
});

app.get("/api/inquiries", (_req, res) => {
  try {
    const records = JSON.parse(fs.readFileSync(inquiriesPath, "utf-8"));
    return res.json({
      ok: true,
      total: Array.isArray(records) ? records.length : 0,
      inquiries: Array.isArray(records) ? records : [],
    });
  } catch {
    return res.status(500).json({
      ok: false,
      message: "Could not read inquiries.",
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found.",
  });
});

app.listen(PORT, () => {
  console.log(`Neptrixx API running on http://localhost:${PORT}`);
});
