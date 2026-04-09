import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const services = [
  {
    title: "Web & App Development",
    text: "Business websites, customer platforms, dashboards, and mobile-first products built for real users, not just presentations.",
  },
  {
    title: "Custom Software",
    text: "Internal systems, workflow automation, niche tools, and product builds for companies that need software shaped around their operations.",
  },
  {
    title: "E-commerce & Marketplace Solutions",
    text: "Online stores, multi-vendor platforms, seller systems, catalogs, and digital commerce experiences tailored for Nepal and global markets.",
  },
  {
    title: "Digital Growth & Media",
    text: "UI/UX, brand presentation, content systems, social media support, and digital marketing execution that helps products grow after launch.",
  },
  {
    title: "Data, Automation & Analytics",
    text: "Business data tools, dashboards, process automation, and software that helps teams make practical decisions with cleaner visibility.",
  },
  {
    title: "Deployment & Maintenance",
    text: "Hosting setup, deployment support, technical maintenance, system updates, and long-term product improvement after the first release.",
  },
];

const products = [
  {
    name: "RomBuzz",
    badge: "Live Product",
    description:
      "A real-time dating and social app built for modern connection, with chat, matching, media, and live product depth.",
    url: "https://www.rombuzz.com",
    logo: "/rombuzz-logo.png",
  },
  {
    name: "MeetInTheMiddle",
    badge: "Coming Soon",
    description:
      "A smart meetup app that finds the midpoint between two people and highlights practical places to meet, from restaurants to public venues.",
    url: "",
    logo: "",
  },
  {
    name: "OverLimit",
    badge: "Coming Soon",
    description:
      "A driving-safety product designed to show how far over the speed limit you are in real time and push safer awareness on the road.",
    url: "",
    logo: "",
  },
  {
    name: "Nepal Commerce Hub",
    badge: "Coming Soon",
    description:
      "A marketplace platform designed to bring Nepal’s Instagram sellers, Facebook sellers, and established businesses into one shared commerce ecosystem.",
    url: "",
    logo: "",
  },
];

const processSteps = [
  "Strategy and scope alignment",
  "UI, system planning, and workflow design",
  "Build, integrate, and test",
  "Launch, improve, and support",
];

const stats = [
  { value: "01", label: "Live product" },
  { value: "03", label: "Planned launches" },
  { value: "USA + Nepal", label: "Operating base" },
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

  return (
    <div className="site-shell">
      <header className="topbar">
        <a href="#hero" className="brand">
          <span className="brand-mark brand-mark-image">
            <img src="/neptrixx-logo.png" alt="Neptrixx logo" />
          </span>
          <span className="brand-copy">
            <span className="brand-text">Neptrixx</span>
            <span className="brand-subtext">USA + Nepal based software company</span>
          </span>
        </a>

        <nav className="nav">
          <a href="#services">Services</a>
          <a href="#products">Products</a>
          <a href="#company">Company</a>
          <a href="#contact" className="nav-cta">
            Start a Project
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" id="hero">
          <div className="hero-copy">
            <p className="eyebrow">Parent Company • Product Studio • Client Services</p>
            <h1>Building products, platforms, and digital systems under one serious company brand.</h1>
            <p className="hero-text">
              Neptrixx is a USA- and Nepal-based software company building products like <strong>RomBuzz</strong>
              while also delivering websites, apps, custom software, marketplace systems, digital tools, and long-term technical support for clients.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="button primary">
                Start With Neptrixx
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
              <h3>One company for products, execution, and future scale.</h3>
              <p>
                Neptrixx is structured to launch its own software products while also building digital systems for clients that need real engineering, clean delivery, and long-term support.
              </p>
            </div>

            <div className="panel-grid">
              <div className="panel-card">
                <span className="mini-label">Flagship</span>
                <h4>RomBuzz</h4>
                <p>Real-time dating and social product already in the ecosystem.</p>
              </div>

              <div className="panel-card">
                <span className="mini-label">Company</span>
                <h4>USA + Nepal</h4>
                <p>Operating across markets while building for local and global users.</p>
              </div>

              <div className="panel-card">
                <span className="mini-label">Services</span>
                <h4>Apps, Web, Commerce</h4>
                <p>From business websites to software systems and marketplace platforms.</p>
              </div>

              <div className="panel-card">
                <span className="mini-label">Direction</span>
                <h4>Long-Term Product Focus</h4>
                <p>Built to launch multiple software products under one parent brand.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="services">
          <div className="section-heading">
            <p className="eyebrow">Services</p>
            <h2>What Neptrixx can build and support</h2>
            <p>
              The company’s public-facing service lines cover practical digital execution: software, web, mobile, commerce, design support, analytics, and ongoing technical operations.
            </p>
          </div>

          <div className="service-grid service-grid-3">
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
            <h2>Products under the Neptrixx ecosystem</h2>
            <p>
              Neptrixx is being built as a parent company that can launch multiple focused products over time, not just a one-site business brand.
            </p>
          </div>

          <div className="product-grid product-grid-4">
            {products.map((product) => (
              <article className="product-card" key={product.name}>
                <span className="product-badge">{product.badge}</span>

                {product.url ? (
                  <h3>
                    <a href={product.url} target="_blank" rel="noreferrer" className="product-link inline-product-link">
                      {product.logo ? (
                        <img src={product.logo} alt={`${product.name} logo`} className="product-inline-logo" />
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

        <section className="section" id="company">
          <div className="section-heading">
            <p className="eyebrow">Company</p>
            <h2>Built for product ownership and client delivery.</h2>
            <p>
              Neptrixx International Company Pvt. Ltd. operates as a software and digital services company with product ambitions, client delivery capability, and a broader scope that includes software, websites, mobile apps, commerce systems, media support, analytics, and technical services.
            </p>
          </div>

          <div className="company-grid">
            <div className="about-card">
              <p className="eyebrow">Public-facing identity</p>
              <h2>Based in Nepal, operated across Nepal and the USA.</h2>
              <p>
                The public website is meant to show what matters to clients and users: what Neptrixx builds, what products are under it, and what kinds of digital work the company can deliver.
              </p>
            </div>

            <div className="contact-copy">
              <div className="contact-card">
                <h3>What the company does</h3>
                <ul>
                  <li>Software products and platforms</li>
                  <li>Web and mobile application development</li>
                  <li>E-commerce and marketplace systems</li>
                  <li>Digital media and marketing support</li>
                  <li>Data, dashboards, and process tools</li>
                  <li>Technical deployment and maintenance</li>
                </ul>
              </div>

              <div className="contact-card">
                <h3>What the public should know</h3>
                <p>
                  Neptrixx is positioned as a serious parent company with one live product, multiple planned launches, and service capability for clients that need real execution rather than agency fluff.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="process">
          <div className="section-heading">
            <p className="eyebrow">Process</p>
            <h2>Clear execution path, not vague promises</h2>
            <p>
              Projects move from practical scoping to system design, build, launch, and ongoing support.
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

        <section className="section contact-section" id="contact">
          <div className="section-heading">
            <p className="eyebrow">Contact</p>
            <h2>Start your project with Neptrixx</h2>
            <p>
              Share what you want to build and Neptrixx will review the inquiry through the working backend form.
            </p>
          </div>

          <div className="contact-layout">
            <div className="contact-copy">
              <div className="contact-card">
                <h3>What clients can ask for</h3>
                <ul>
                  <li>Business websites and web apps</li>
                  <li>iOS and Android app development</li>
                  <li>Custom software and internal systems</li>
                  <li>E-commerce or marketplace builds</li>
                  <li>Product MVPs and launch support</li>
                  <li>Maintenance, updates, and technical support</li>
                </ul>
              </div>

              <div className="contact-card">
                <h3>Business contact</h3>
                <p>
                  Email: <a href="mailto:neptrixxinternational@gmail.com" className="footer-legal-link">neptrixxinternational@gmail.com</a>
                </p>
                <p>
                  Base: USA and Nepal
                </p>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label>
                  <span>Name *</span>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label>
                  <span>Email *</span>
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
                    onChange={(e) => updateField("budget", e.target.value)}
                    placeholder="$2k - $10k"
                  />
                </label>

                <label>
                  <span>Timeline</span>
                  <input
                    value={form.timeline}
                    onChange={(e) => updateField("timeline", e.target.value)}
                    placeholder="2 to 6 weeks"
                  />
                </label>
              </div>

              <label>
                <span>Project details *</span>
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

              {result.text ? <p className={`form-message ${result.type}`}>{result.text}</p> : null}
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Neptrixx</strong>
          <p>Parent company for software products, client services, and scalable digital systems.</p>
        </div>

        <div className="footer-links footer-links-column">
          <a href="#services">Services</a>
          <a href="#products">Products</a>
          <a href="#company">Company</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-legal">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer" className="footer-legal-link">Privacy Policy</a>
          <a href="/terms-of-service.html" target="_blank" rel="noreferrer" className="footer-legal-link">Terms of Service</a>
          <p className="copyright">© {year} Neptrixx. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
