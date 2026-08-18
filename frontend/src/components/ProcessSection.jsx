import SectionHeading from "./SectionHeading";
import { processSteps } from "../data/siteData";

export default function ProcessSection() {
  return (
    <section className="section" id="process">
      <SectionHeading
        eyebrow="How we work"
        title="A simple path from requirement to release"
        text="The process stays understandable even when the technology underneath becomes complex."
      />

      <div className="timeline">
        {processSteps.map((step, index) => (
          <article className="timeline-item" key={step.title} data-reveal>
            <span className="timeline-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="timeline-line" aria-hidden="true" />
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
