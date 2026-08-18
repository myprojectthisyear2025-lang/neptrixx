import { stats } from "../data/siteData";

export default function Hero({ scrollToSection }) {
  return (
    <section className="hero" id="hero">
      <div className="hero-copy" data-reveal>
        <span className="eyebrow">Global software & product company</span>
        <h1>We build digital products that move businesses forward.</h1>
        <p className="hero-text">
          Neptrixx designs and develops websites, mobile apps, custom software, AI solutions,
          e-commerce platforms, and tailored IT systems for businesses and founders worldwide.
        </p>

        <div className="hero-actions">
          <button className="button primary" type="button" onClick={() => scrollToSection("contact")}>
            Build with Neptrixx <span>→</span>
          </button>
          <button className="button secondary" type="button" onClick={() => scrollToSection("products")}>
            See our products
          </button>
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

      <div className="hero-visual" data-reveal>
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="hero-panel hero-panel-main">
          <div className="hero-panel-topline">
            <span className="live-dot" />
            <span>Built for worldwide ideas</span>
          </div>
          <h2>From a first sketch to a working product.</h2>
          <p>
            Strategy, design, engineering, AI, infrastructure, launch, and long-term support can all
            live under one team.
          </p>
          <div className="capability-cloud" aria-label="Neptrixx capabilities">
            <span>Web</span>
            <span>Mobile</span>
            <span>AI</span>
            <span>Commerce</span>
            <span>APIs</span>
            <span>UI/UX</span>
          </div>
        </div>

        <div className="hero-mini-grid">
          <article className="hero-mini-card">
            <span className="mini-icon">✦</span>
            <strong>Products we own</strong>
            <p>RomBuzz, Yumi Beads, and more in development.</p>
          </article>
          <article className="hero-mini-card hero-mini-accent">
            <span className="mini-icon">◎</span>
            <strong>Products we build for you</strong>
            <p>Custom technology shaped around your exact need.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
