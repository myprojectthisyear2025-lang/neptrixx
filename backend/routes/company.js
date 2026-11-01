/** Existing public company information, preserved from the uploaded website. */
import { Router } from "express";
export const company = Router();
company.get("/api/company", (_req, res) => {
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

