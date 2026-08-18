import SectionHeading from "./SectionHeading";
import { services } from "../data/siteData";

export default function ServicesSection() {
  return (
    <section className="section" id="services">
      <SectionHeading
        eyebrow="What we build"
        title="Technology services without the agency confusion"
        text="Tell us what you need to launch, improve, automate, or redesign. We turn that requirement into a clear product and a working system."
      />

      <div className="service-grid">
        {services.map((service) => (
          <article className="info-card" key={service.title} data-reveal>
            <span className="card-index">{service.icon}</span>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
            <span className="card-arrow" aria-hidden="true">↗</span>
          </article>
        ))}
      </div>
    </section>
  );
}
