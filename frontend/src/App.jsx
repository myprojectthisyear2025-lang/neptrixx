import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const services = [
  {
    title: "Mobile Apps",
    text: "Native-feeling mobile products for startups, brands, and founders who want polished UX without bloated delivery.",
  },
  {
    title: "Web Platforms",
    text: "Scalable websites, dashboards, SaaS products, client portals, and high-converting company sites.",
  },
  {
    title: "Custom Software",
    text: "Internal systems, automation tools, niche workflows, and full custom builds where off-the-shelf tools fail.",
  },
  {
    title: "Design + Strategy",
    text: "Product thinking, system design, UI direction, launch planning, and practical MVP scoping.",
  },
];

const products = [
  {
    name: "RomBuzz",
    badge: "Flagship Product",
    description:
      "A modern social and dating product under the Neptrixx ecosystem, built with product depth and long-term growth in mind.",
    url: "https://www.rombuzz.com",
    logo: "/rombuzz-logo.png",
  },
  {
    name: "Future Software Suite",
    badge: "In Progress",
    description:
      "Neptrixx is designed as a parent brand that can continuously launch new software products under one trusted umbrella.",
    url: "",
    logo: "",
  },
];

const processSteps = [
  "Discovery and business clarity",
  "Wireframes and system planning",
  "Frontend and backend development",
  "QA, launch, and support",
];

const stats = [
  { value: "01", label: "Parent company for products" },
  { value: "02", label: "Client service lines" },
  { value: "∞", label: "Scalable software possibilities" },
];

function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    service: "Web Development",
    budget: "",
    timeline: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState({ type: "", text: "" });

  const year = useMemo(() => new Date().getFullYear(), []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setResult({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE}/api/inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Submission failed.");
      }

      setResult({
        type: "success",
        text: "Your project inquiry was sent successfully.",
      });

      setForm({
        name: "",
        email: "",
        company: "",
        service: "Web Development",
        budget: "",
        timeline: "",
        message: "",
      });
    } catch (error) {
      setResult({
        type: "error",
        text: error.message || "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a href="#hero" className="brand">
          <span className="brand-mark">N</span>
          <span className="brand-text">Neptrixx</span>
        </a>

        <nav className="nav">
          <a href="#services">Services</a>
          <a href="#products">Products</a>
          <a href="#process">Process</a>
          <a href="#contact" className="nav-cta">
            Start a Project
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="hero">
          <div className="hero-copy">
            <p className="eyebrow">Parent Company • Product Studio • Client Solutions</p>
            <h1>
              Building software products under one bold, clean, scalable brand.
            </h1>
            <p className="hero-text">
              Neptrixx is the parent company behind products like <strong>RomBuzz</strong>
              , while also delivering websites, mobile apps, software platforms,
              and custom systems for clients.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="button primary">
                Launch with Neptrixx
              </a>
              <a href="#products" className="button secondary">
                Explore Products
              </a>
            </div>

            <div className="hero-stats">
              {stats.map((item) => (
                <div className="stat-card" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-card panel-main">
              <span className="panel-tag">Why Neptrixx</span>
              <h3>One company. Multiple products. Serious execution.</h3>
              <p>
                This brand is structured to support in-house software, client projects,
                product launches, and long-term digital growth without looking chaotic.
              </p>
            </div>

            <div className="panel-grid">
              <div className="panel-card">
                <span className="mini-label">Product</span>
                <h4>RomBuzz</h4>
                <p>Part of the Neptrixx ecosystem.</p>
              </div>

              <div className="panel-card">
                <span className="mini-label">Service</span>
                <h4>Custom Builds</h4>
                <p>Apps, websites, dashboards, software systems.</p>
              </div>

              <div className="panel-card">
                <span className="mini-label">Approach</span>
                <h4>Premium Simplicity</h4>
                <p>Clean, modern, sharp—not noisy and not childish.</p>
              </div>

              <div className="panel-card">
                <span className="mini-label">Goal</span>
                <h4>Global Reach</h4>
                <p>Products and services that can sell anywhere.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="services">
          <div className="section-heading">
            <p className="eyebrow">Services</p>
            <h2>What Neptrixx can build for clients</h2>
            <p>
              This is not just a product brand. It is also the client-facing engine
              for digital execution.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service) => (
              <article className="info-card" key={service.title}>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </section>

          <section className="section alt" id="products">
          <div className="section-heading">
            <p className="eyebrow">Products</p>
            <h2>Software products under the Neptrixx brand</h2>
            <p>
              Neptrixx is structured as a parent company, so products can be launched
              under the same ecosystem with clarity.
            </p>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.name}>
                <span className="product-badge">{product.badge}</span>

                {product.logo ? (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noreferrer"
                    className="product-logo-link"
                    aria-label={`Open ${product.name}`}
                  >
                    <img
                      src={product.logo}
                      alt={`${product.name} logo`}
                      className="product-logo"
                    />
                  </a>
                ) : null}

                {product.url ? (
                  <h3>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noreferrer"
                      className="product-link"
                    >
                      {product.name}
                    </a>
                  </h3>
                ) : (
                  <h3>{product.name}</h3>
                )}

                <p>{product.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="process">
          <div className="section-heading">
            <p className="eyebrow">Process</p>
            <h2>Simple execution path, not agency nonsense</h2>
            <p>
              The point is delivery. Not endless meetings, fake decks, and pretty promises.
            </p>
          </div>

          <div className="timeline">
            {processSteps.map((step, index) => (
              <div className="timeline-item" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section about-band">
          <div className="about-card">
            <p className="eyebrow">About Neptrixx</p>
            <h2>Designed to be the umbrella for serious digital work.</h2>
            <p>
              The website balances two jobs: present your own products and convert
              service leads. Most companies fail because they look either too generic
              or too over-designed. This structure avoids both problems.
            </p>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="section-heading">
            <p className="eyebrow">Contact</p>
            <h2>Start your project with Neptrixx</h2>
            <p>
              Tell us what you need. This form already works with the backend and saves inquiries.
            </p>
          </div>

          <div className="contact-layout">
            <div className="contact-copy">
              <div className="contact-card">
                <h3>What clients can ask for</h3>
                <ul>
                  <li>Business websites</li>
                  <li>Full web apps</li>
                  <li>iOS / Android app development</li>
                  <li>Custom admin panels</li>
                  <li>Software MVPs</li>
                  <li>Ongoing maintenance</li>
                </ul>
              </div>

              <div className="contact-card">
                <h3>Why this setup works</h3>
                <p>
                  It gives you a strong public-facing company site now, without forcing
                  you to build your full enterprise stack on day one.
                </p>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label>
                  <span>Name</span>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </div>

              <div className="field-grid">
                <label>
                  <span>Company</span>
                  <input
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Company name"
                  />
                </label>

                <label>
                  <span>Service</span>
                  <select
                    value={form.service}
                    onChange={(e) => updateField("service", e.target.value)}
                  >
                    <option>Web Development</option>
                    <option>Mobile App Development</option>
                    <option>Custom Software</option>
                    <option>UI/UX Design</option>
                    <option>MVP Build</option>
                    <option>Maintenance & Support</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label>
                  <span>Budget</span>
                  <input
                    value={form.budget}
                    onChange={(e) => updateField("budget", e.target.value)}
                    placeholder="$2k - $10k"
                  />
                </label>

                <label>
                  <span>Timeline</span>
                  <input
                    value={form.timeline}
                    onChange={(e) => updateField("timeline", e.target.value)}
                    placeholder="2 to 4 weeks"
                  />
                </label>
              </div>

              <label>
                <span>Project details</span>
                <textarea
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  placeholder="Tell Neptrixx what you want to build..."
                  rows="6"
                  required
                />
              </label>

              <button className="button primary submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send Inquiry"}
              </button>

              {result.text ? (
                <p className={`form-message ${result.type}`}>{result.text}</p>
              ) : null}
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Neptrixx</strong>
          <p>Parent brand for products, services, and scalable digital systems.</p>
        </div>

        <div className="footer-links">
          <a href="#services">Services</a>
          <a href="#products">Products</a>
          <a href="#contact">Contact</a>
        </div>

        <p className="copyright">© {year} Neptrixx. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
