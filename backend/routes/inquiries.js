/** Existing contact form endpoint; inquiries now persist in MongoDB across Render deploys. */
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { sendInquiryEmail } from '../email.js';
import { Inquiry } from '../models/Inquiry.js';
import { text, emailOf, validEmail, fail, wrap } from '../lib/http.js';
export const inquiries = Router();
inquiries.post('/api/inquiries', rateLimit({ windowMs: 15 * 60000, limit: 5,
  message: { message: 'Too many inquiries. Please try again later.' } }), wrap(async (req, res) => {
  if (text(req.body.website, 200)) return res.status(201).json({ ok: true, message: 'Inquiry submitted successfully.' });
  const inquiry = { id: `inq_${randomUUID()}`, name: text(req.body.name, 100), email: emailOf(req.body.email),
    company: text(req.body.company, 120), service: text(req.body.service, 120), budget: text(req.body.budget, 80),
    timeline: text(req.body.timeline, 80), message: text(req.body.message, 5000), createdAt: new Date().toISOString() };
  if (!inquiry.name || !inquiry.message) fail(400, 'Name, email, and project details are required.'); validEmail(inquiry.email);
  const saved = await Inquiry.create({ ...inquiry, status: 'pending_email' });
  try {
    const email = await sendInquiryEmail(inquiry);
    await Inquiry.updateOne({ _id: saved._id }, { $set: { status: 'emailed', emailId: email.id || '' } });
    res.status(201).json({ ok: true, message: 'Inquiry emailed successfully.' });
  } catch {
    await Inquiry.updateOne({ _id: saved._id }, { $set: { status: 'email_failed' } });
    res.status(502).json({ ok: false, message: 'Your inquiry was saved, but email delivery failed. Please email support@neptrixx.com.' });
  }
}));
