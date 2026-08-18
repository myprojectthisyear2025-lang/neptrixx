import { useState } from "react";
import SectionHeading from "./SectionHeading";
import { inquiryServices } from "../data/siteData";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const emptyForm = {
  name: "",
  email: "",
  company: "",
  service: "Website Development",
  budget: "",
  timeline: "",
  message: "",
  website: "",
};

export default function ContactSection() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState({ type: "", text: "" });

  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setResult({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE}/api/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Your inquiry could not be sent.");

      setResult({
        type: "success",
        text: "Inquiry sent. Neptrixx will receive the project details by email.",
      });
      setForm(emptyForm);
    } catch (error) {
      setResult({
        type: "error",
        text: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section contact-section" id="contact">
      <SectionHeading
        eyebrow="Start a project"
        title="Tell us what you want to build"
        text="You do not need a technical specification. Tell us the problem, the idea, or the result you want, and we can take it from there."
      />

      <div className="contact-layout">
        <div className="contact-copy">
          <article className="contact-card contact-intro" data-reveal>
            <span className="contact-icon">↗</span>
            <h3>Good projects to bring us</h3>
            <ul>
              <li>Business and company websites</li>
              <li>Mobile apps and web applications</li>
              <li>AI features and workflow automation</li>
              <li>Custom internal software and dashboards</li>
              <li>E-commerce and marketplace platforms</li>
              <li>Product redesigns, upgrades, and maintenance</li>
            </ul>
          </article>

          <article className="contact-card contact-business" data-reveal>
            <span className="contact-label">Business contact</span>
            <a href="mailto:neptrixxinternational@gmail.com">neptrixxinternational@gmail.com</a>
            <p>Serving clients all over the world.</p>
          </article>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} data-reveal>
          <div className="form-heading">
            <span>Project inquiry</span>
            <strong>Usually takes about 2 minutes</strong>
          </div>

          <div className="field-grid">
            <label>
              <span>Name *</span>
              <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Your full name" maxLength="100" required />
            </label>
            <label>
              <span>Email *</span>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" maxLength="200" required />
            </label>
          </div>

          <div className="field-grid">
            <label>
              <span>Company</span>
              <input value={form.company} onChange={(e) => updateField("company", e.target.value)} placeholder="Company or brand" maxLength="120" />
            </label>
            <label>
              <span>What do you need?</span>
              <select value={form.service} onChange={(e) => updateField("service", e.target.value)}>
                {inquiryServices.map((service) => <option key={service}>{service}</option>)}
              </select>
            </label>
          </div>

          <div className="field-grid">
            <label>
              <span>Budget</span>
              <input value={form.budget} onChange={(e) => updateField("budget", e.target.value)} placeholder="Optional" maxLength="80" />
            </label>
            <label>
              <span>Timeline</span>
              <input value={form.timeline} onChange={(e) => updateField("timeline", e.target.value)} placeholder="When do you want to launch?" maxLength="80" />
            </label>
          </div>

          <label>
            <span>Project details *</span>
            <textarea value={form.message} onChange={(e) => updateField("message", e.target.value)} placeholder="Tell us what you want to build, improve, automate, or launch..." rows="6" maxLength="5000" required />
          </label>

          <label className="honeypot" aria-hidden="true">
            <span>Website</span>
            <input tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => updateField("website", e.target.value)} />
          </label>

          <button className="button primary submit" type="submit" disabled={submitting}>
            {submitting ? "Sending inquiry..." : "Send inquiry by email"}
            <span>{submitting ? "" : "→"}</span>
          </button>

          {result.text ? (
            <p className={`form-message ${result.type}`} role="status" aria-live="polite">
              {result.text}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
