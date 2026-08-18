import SectionHeading from "./SectionHeading";

export default function CompanySection() {
  return (
    <section className="section company-section" id="company">
      <SectionHeading
        eyebrow="About Neptrixx"
        title="One technology company for products, client builds, and ambitious ideas"
        text="Neptrixx is built to create its own digital products while also helping customers turn business requirements into dependable technology."
      />

      <div className="company-grid">
        <article className="about-card" data-reveal>
          <span className="about-symbol">N×</span>
          <h3>Built globally. Designed around the problem.</h3>
          <p>
            We do not force every customer into the same package. A project can be a simple website,
            a complete mobile app, an AI workflow, a commerce platform, an internal dashboard, or a
            custom IT system that does not fit a standard category.
          </p>
          <div className="worldwide-pill">Serving customers all over the world</div>
        </article>

        <div className="company-side">
          <article className="company-card" data-reveal>
            <span className="company-card-icon">✦</span>
            <div>
              <h3>Clear for non-technical customers</h3>
              <p>We explain the product in plain language and keep the build tied to the business goal.</p>
            </div>
          </article>
          <article className="company-card" data-reveal>
            <span className="company-card-icon">⌁</span>
            <div>
              <h3>Strong enough for serious systems</h3>
              <p>Architecture, APIs, databases, integrations, deployment, security, and ongoing iteration are part of the same conversation.</p>
            </div>
          </article>
          <article className="company-card" data-reveal>
            <span className="company-card-icon">∞</span>
            <div>
              <h3>Support after launch</h3>
              <p>Products change. We can stay involved for updates, maintenance, performance work, and the next phase.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
