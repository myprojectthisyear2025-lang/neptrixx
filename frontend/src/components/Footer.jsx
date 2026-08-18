export default function Footer({ scrollToSection, year }) {
  const navItems = [
    ["services", "Services"],
    ["products", "Products"],
    ["company", "Company"],
    ["contact", "Contact"],
  ];

  return (
    <footer className="footer">
      <div className="footer-brand-block">
        <div className="footer-brand-line">
          <img src="/neptrixx-logo.png" alt="Neptrixx logo" />
          <strong>Neptrixx</strong>
        </div>
        <p>Websites, apps, AI services, custom software, product design, and digital systems for clients worldwide.</p>
      </div>

      <nav className="footer-links" aria-label="Footer navigation">
        {navItems.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(event) => { event.preventDefault(); scrollToSection(id); }}>
            {label}
          </a>
        ))}
      </nav>

      <div className="footer-legal">
        <a href="/privacy-policy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
        <a href="/terms-of-service.html" target="_blank" rel="noreferrer">Terms of Service</a>
        <p>© {year} Neptrixx. All rights reserved.</p>
      </div>
    </footer>
  );
}
