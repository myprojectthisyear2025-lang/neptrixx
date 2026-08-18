import { useMemo } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ServicesSection from "./components/ServicesSection";
import ProductsSection from "./components/ProductsSection";
import CompanySection from "./components/CompanySection";
import ProcessSection from "./components/ProcessSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import { useReveal } from "./hooks/useReveal";

export default function App() {
  const year = useMemo(() => new Date().getFullYear(), []);
  useReveal();

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="site-shell">
      <Header scrollToSection={scrollToSection} />
      <main>
        <Hero scrollToSection={scrollToSection} />
        <ServicesSection />
        <ProductsSection />
        <CompanySection />
        <ProcessSection />
        <ContactSection />
      </main>
      <Footer scrollToSection={scrollToSection} year={year} />
    </div>
  );
}
