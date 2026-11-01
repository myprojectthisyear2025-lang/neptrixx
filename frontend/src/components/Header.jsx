// Neptrixx website navigation with supplied brand artwork.
import { useEffect, useState } from "react";

const links = [
  ["services", "Services"],
  ["products", "Products"],
  ["company", "Company"],
  ["process", "Process"],
];

export default function Header({ scrollToSection }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.classList.add("menu-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function goTo(id) {
    const wasOpen = menuOpen;
    setMenuOpen(false);

    if (wasOpen) {
      window.requestAnimationFrame(() => scrollToSection(id));
      return;
    }

    scrollToSection(id);
  }

  return (
    <>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo("hero")} aria-label="Go to top">
          <span className="brand-mark">
            <img src="/neptrixx-mark.svg" alt="" />
          </span>
          <span className="brand-copy">
            <span className="brand-text">Neptrixx</span>
            <span className="brand-subtext">Software, products, AI & digital systems</span>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                goTo(id);
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="#contact"
            className="nav-cta"
            onClick={(event) => {
              event.preventDefault();
              goTo("contact");
            }}
          >
            Start a project
          </a>
        </nav>

        <button
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {menuOpen ? (
        <div className="menu-overlay" role="presentation" onClick={() => setMenuOpen(false)}>
          <aside
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Mobile navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-head">
              <div>
                <span className="mobile-menu-kicker">Navigate Neptrixx</span>
                <strong>Where do you want to go?</strong>
              </div>
              <button type="button" className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                ×
              </button>
            </div>

            <nav className="mobile-menu-links">
              {links.map(([id, label], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(id);
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {label}
                  <b>↗</b>
                </a>
              ))}
              <a
                href="#contact"
                className="mobile-menu-cta"
                onClick={(event) => {
                  event.preventDefault();
                  goTo("contact");
                }}
              >
                Start a project
                <b>→</b>
              </a>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
