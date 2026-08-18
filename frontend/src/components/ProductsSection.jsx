import SectionHeading from "./SectionHeading";
import { products } from "../data/siteData";

function ProductIdentity({ product }) {
  if (product.logo) {
    return <img src={product.logo} alt={`${product.name} logo`} className="product-logo" />;
  }

  return <span className="product-lettermark">{product.name.slice(0, 2).toUpperCase()}</span>;
}

export default function ProductsSection() {
  return (
    <section className="section products-section" id="products">
      <div className="products-glow" aria-hidden="true" />
      <SectionHeading
        eyebrow="Neptrixx products"
        title="Products with their own identity, built under one company"
        text="Some are already live. Others are being shaped now. Every product is designed to solve a clear problem instead of existing just to fill a portfolio."
      />

      <div className="product-grid">
        {products.map((product, index) => {
          const content = (
            <>
              <div className="product-head">
                <ProductIdentity product={product} />
                <span className="product-badge">
                  <i className={product.badge === "Live" ? "status-live" : "status-build"} />
                  {product.badge}
                </span>
              </div>
              <div className="product-copy">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
              </div>
              <div className="product-footer">
                <span>{product.url ? "Visit product" : "Coming from Neptrixx"}</span>
                <b>{product.url ? "↗" : "→"}</b>
              </div>
            </>
          );

          return product.url ? (
            <a
              key={product.name}
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className={`product-card ${product.theme}`}
              style={{ "--product-delay": `${index * 0.45}s` }}
              data-reveal
            >
              {content}
            </a>
          ) : (
            <article
              key={product.name}
              className={`product-card ${product.theme}`}
              style={{ "--product-delay": `${index * 0.45}s` }}
              data-reveal
            >
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
