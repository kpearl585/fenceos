import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import SolutionSection from "@/components/SolutionSection";
import EngineSection from "@/components/EngineSection";
import EstimateDemo from "@/components/EstimateDemo";
import TestimonialsSection from "@/components/TestimonialsSection";
import DemoSection from "@/components/DemoSection";
import ROISection from "@/components/ROISection";
import PricingSection from "@/components/PricingSection";
import CTAFooter from "@/components/CTAFooter";
import FAQSection from "@/components/FAQSection";
import WaitlistSection from "@/components/WaitlistSection";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <SolutionSection />
        <EstimateDemo />
        <DemoSection />
        <TestimonialsSection />
        <ROISection />
        
      {/* Founder Strip */}
      <section style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <img src="/keegan-pearl.jpg" alt="Keegan Pearl — Founder" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', border: '2px solid rgba(45,106,79,0.6)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '100px', padding: '0.25rem 0.65rem' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ fontSize: '0.65rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '0.08em' }}>U.S. NAVY VETERAN</span>
              </div>
            </div>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 0.875rem', borderLeft: '2px solid #2D6A4F', paddingLeft: '1rem' }}>
              &ldquo;I built FenceEstimatePro because fence contractors deserve software built for them &mdash; not a generic tool they have to force-fit. Fast estimates, professional proposals, jobs tracked from start to finish. Built by someone who respects the trade.&rdquo;
            </p>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Keegan Pearl</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Founder &middot; FenceEstimatePro</div>
          </div>
        </div>
      </section>
      <EngineSection />
      <PricingSection />
        <FAQSection />
        <WaitlistSection />
        <CTAFooter />
      </main>
    </>
  );
}
