import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const services = [
  {
    title: "Product Design and MVPs",
    text: "We shape new ideas into clear product directions, lean launches, and systems that can keep growing after version one.",
  },
  {
    title: "Web and App Engineering",
    text: "From polished marketing sites to customer platforms and mobile-first products, we build software that is meant to be used.",
  },
  {
    title: "Custom Internal Tools",
    text: "Operations dashboards, workflow software, and business systems tailored around how your team already works.",
  },
  {
    title: "Commerce Platforms",
    text: "Stores, seller tools, catalogs, and marketplace experiences designed for both local markets and wider digital expansion.",
  },
  {
    title: "Automation and Analytics",
    text: "Data visibility, reporting, and automation that reduce repeated work and help teams move with more confidence.",
  },
  {
    title: "Launch and Long-Term Support",
    text: "Deployment, technical maintenance, iteration, and product support that continue after the first release goes live.",
  },
];

const products = [
  {
    name: "RomBuzz",
    badge: "Live product",
    description:
      "A real-time dating and social app built around connection, chat, matching, media, and stronger product depth.",
    url: "https://www.rombuzz.com",
    logo: "/rombuzz-logo.png",
    theme: "warm",
  },
  {
    name: "MeetInTheMiddle",
    badge: "In pipeline",
    description:
      "A meetup app that finds the midpoint between two people and helps them choose practical places to meet.",
    url: "",
    logo: "",
    theme: "cool",
  },
  {
    name: "OverLimit",
    badge: "In pipeline",
    description:
      "A driving safety concept focused on showing speed-limit overage in real time and encouraging better awareness.",
    url: "",
    logo: "",
    theme: "signal",
  },
  {
    name: "Nepal Commerce Hub",
    badge: "In pipeline",
    description:
      "A marketplace ecosystem designed to unify independent sellers, social commerce vendors, and established businesses.",
    url: "",
    logo: "",
    theme: "forest",
  },
];

const processSteps = [
  {
    title: "Frame the opportunity",
    text: "We align on goals, audience, constraints, and the product or business outcome that matters most.",
  },
  {
    title: "Design the experience",
    text: "We shape interface direction, information flow, and the system structure needed to support the idea.",
  },
  {
    title: "Build the core",
    text: "We develop, integrate, refine, and test with a focus on clarity, performance, and real-world use.",
  },
  {
    title: "Launch with momentum",
    text: "We ship, monitor, improve, and support the product after release so progress does not stop at launch.",
  },
];

const stats = [
  { value: "1", label: "live product" },
  { value: "3", label: "queued launches" },
  { value: "USA + Nepal", label: "operating footprint" },
];

const sectionIds = ["hero", "services", "products", "company", "process", "contact"];

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
  const [activeSection, setActiveSection] = useState("hero");

  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;

      for (const section of sectionIds) {
        const element = document.getElementById(section);
        if (!element) continue;

        const { offsetTop, offsetHeight } = element;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(section);
          break;
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        text: "Your inquiry was sent successfully. We will review it and get back to you.",
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
        text: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderNavLink(id, label) {
    return (
      <a
        href={`#${id}`}
        className={activeSection === id ? "is-active" : ""}
        onClick={(event) => {
          event.preventDefault();
          scrollToSection(id);
        }}
      >
        {label}
      </a>
    );
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => scrollToSection("hero")}>
          <span className="brand-mark">
            <img src="/neptrixx-logo.png" alt="Neptrixx logo" />
          </span>
          <span className="brand-copy">
            <span className="brand-text">Neptrixx</span>
            <span className="brand-subtext">Platform company for products and digital builds</span>
          </span>
        </button>

        <nav className="nav">
          {renderNavLink("services", "Services")}
          {renderNavLink("products", "Products")}
          {renderNavLink("company", "Company")}
          <a
            href="#contact"
            className="nav-cta"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("contact");
            }}
          >
            Start a project
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="hero">
          <div className="hero-copy">
            <span className="eyebrow">Hybrid product studio and parent platform</span>
            <h1>
              One brand housing bold software products, polished client work, and the next wave of
              launches.
            </h1>
            <p className="hero-text">
              Neptrixx is positioned as a multi-product company, not just a services site. We build
              our own ecosystem while helping clients launch websites, apps, commerce platforms, and
              software systems that feel modern from day one.
            </p>

            <div className="hero-actions">
              <a
                href="#products"
                className="button primary"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("products");
                }}
              >
                Explore the ecosystem
              </a>
              <a
                href="#contact"
                className="button secondary"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("contact");
                }}
              >
                Talk about your build
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

          <div className="hero-visual">
            <div className="signal-card signal-card-main">
              <span className="panel-kicker">Platform snapshot</span>
              <h2>Designed to present many products under one memorable company identity.</h2>
              <p>
                The experience blends clean light surfaces, darker depth panels, and strong accent
                contrast so the brand feels premium, active, and scalable.
              </p>
            </div>

            <div className="hero-stack">
              <div className="signal-card pastel">
                <span className="mini-label">Flagship</span>
                <h3>RomBuzz</h3>
                <p>Live in the market and setting the tone for the wider Neptrixx ecosystem.</p>
              </div>

              <div className="signal-card dark">
                <span className="mini-label">Reach</span>
                <h3>USA and Nepal</h3>
                <p>Built to serve both local opportunities and products with broader ambition.</p>
              </div>

              <div className="signal-card light">
                <span className="mini-label">Focus</span>
                <h3>Products plus execution</h3>
                <p>Internal launches, client systems, and long-term technical support in one flow.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="services">
          <div className="section-heading">
            <span className="eyebrow">Capabilities</span>
            <h2>Services that support launches, growth, and serious digital execution</h2>
            <p>
              Every service line is framed to support both your current business need and the next
              stage of platform growth.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service, index) => (
              <article className="info-card" key={service.title}>
                <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading">
            <span className="eyebrow">Product ecosystem</span>
            <h2>Neptrixx is built to launch multiple focused products over time</h2>
            <p>
              The frontend now treats your company like a living platform, showing what is already
              active and what is building behind it.
            </p>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article className={`product-card ${product.theme}`} key={product.name}>
                <div className="product-head">
                  <span className="product-badge">{product.badge}</span>
                  <span className="product-dot" />
                </div>

                {product.url ? (
                  <h3>
                    <a href={product.url} target="_blank" rel="noreferrer" className="product-link">
                      {product.logo ? (
                        <img
                          src={product.logo}
                          alt={`${product.name} logo`}
                          className="product-inline-logo"
                        />
                      ) : null}
                      <span>{product.name}</span>
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

        <section className="section company-section" id="company">
          <div className="section-heading">
            <span className="eyebrow">Company profile</span>
            <h2>Built for product ownership, client delivery, and a stronger public identity</h2>
            <p>
              Neptrixx International Company Pvt. Ltd. is presented here as a serious digital
              company with a parent-brand mindset and room for multiple launches under one roof.
            </p>
          </div>

          <div className="company-grid">
            <article className="about-card">
              <span className="panel-kicker">What this site should communicate</span>
              <h3>A company brand with visual range, not a flat agency template</h3>
              <p>
                The new UI mixes luminous panels, darker sections, editorial spacing, and stronger
                typography so visitors immediately understand there is both product ambition and
                delivery capability here.
              </p>
            </article>

            <div className="company-side">
              <article className="contact-card">
                <h3>What Neptrixx does</h3>
                <ul>
                  <li>Software products and platform launches</li>
                  <li>Web and mobile application development</li>
                  <li>Marketplace and commerce systems</li>
                  <li>Internal tools, dashboards, and automation</li>
                  <li>Brand-facing UI and digital growth support</li>
                  <li>Deployment, maintenance, and iteration</li>
                </ul>
              </article>

              <article className="contact-card tone-dark">
                <h3>Why the presentation matters</h3>
                <p>
                  A multi-product business needs a homepage that feels alive, premium, and scalable.
                  This version is meant to look eye-catching without locking the brand into a pure
                  dark theme.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="process">
          <div className="section-heading">
            <span className="eyebrow">Execution model</span>
            <h2>A clean path from idea to launch</h2>
            <p>
              The process section now reads like a product operation rather than vague agency copy.
            </p>
          </div>

          <div className="timeline">
            {processSteps.map((step, index) => (
              <article className="timeline-item" key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="section-heading">
            <span className="eyebrow">Start a conversation</span>
            <h2>Bring in a new build, product concept, or platform upgrade</h2>
            <p>
              The inquiry form still works with your backend flow, but now sits inside a more
              premium and better-balanced interface.
            </p>
          </div>

          <div className="contact-layout">
            <div className="contact-copy">
              <article className="contact-card">
                <h3>Best fit projects</h3>
                <ul>
                  <li>Business websites with a stronger public presence</li>
                  <li>Web apps and customer platforms</li>
                  <li>Mobile app development and MVP launches</li>
                  <li>Custom internal software and operations tools</li>
                  <li>Commerce and marketplace ecosystems</li>
                  <li>Long-term product support and iteration</li>
                </ul>
              </article>

              <article className="contact-card tone-accent">
                <h3>Business contact</h3>
                <p>
                  Email:{" "}
                  <a href="mailto:neptrixxinternational@gmail.com" className="footer-legal-link">
                    neptrixxinternational@gmail.com
                  </a>
                </p>
                <p>Base: USA and Nepal</p>
              </article>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label>
                  <span>Name *</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label>
                  <span>Email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
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
                    onChange={(event) => updateField("company", event.target.value)}
                    placeholder="Company or brand"
                  />
                </label>

                <label>
                  <span>Service</span>
                  <select
                    value={form.service}
                    onChange={(event) => updateField("service", event.target.value)}
                  >
                    <option>Web Development</option>
                    <option>Mobile App Development</option>
                    <option>Custom Software</option>
                    <option>E-commerce / Marketplace</option>
                    <option>UI/UX Design</option>
                    <option>Maintenance & Support</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label>
                  <span>Budget</span>
                  <input
                    value={form.budget}
                    onChange={(event) => updateField("budget", event.target.value)}
                    placeholder="$3k - $20k"
                  />
                </label>

                <label>
                  <span>Timeline</span>
                  <input
                    value={form.timeline}
                    onChange={(event) => updateField("timeline", event.target.value)}
                    placeholder="2 weeks to 3 months"
                  />
                </label>
              </div>

              <label>
                <span>Project details *</span>
                <textarea
                  value={form.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder="Tell us what you want to build, improve, or launch..."
                  rows="6"
                  required
                />
              </label>

              <button className="button primary submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send inquiry"}
              </button>

              {result.text ? <p className={`form-message ${result.type}`}>{result.text}</p> : null}
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong className="footer-brand">Neptrixx</strong>
          <p className="footer-copy">
            Parent company for digital products, client platforms, and scalable software systems.
          </p>
        </div>

        <div className="footer-links footer-links-column">
          <a
            href="#services"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("services");
            }}
          >
            Services
          </a>
          <a
            href="#products"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("products");
            }}
          >
            Products
          </a>
          <a
            href="#company"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("company");
            }}
          >
            Company
          </a>
          <a
            href="#contact"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("contact");
            }}
          >
            Contact
          </a>
        </div>

        <div className="footer-legal">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer" className="footer-legal-link">
            Privacy Policy
          </a>
          <a
            href="/terms-of-service.html"
            target="_blank"
            rel="noreferrer"
            className="footer-legal-link"
          >
            Terms of Service
          </a>
          <p className="copyright">Copyright {year} Neptrixx. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
