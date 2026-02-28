import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import SolutionSection from "@/components/SolutionSection";
import EstimateDemo from "@/components/EstimateDemo";
import TestimonialsSection from "@/components/TestimonialsSection";
import ROISection from "@/components/ROISection";
import PricingSection from "@/components/PricingSection";
import CTAFooter from "@/components/CTAFooter";
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
        <TestimonialsSection />
        <ROISection />
        <PricingSection />
        <WaitlistSection />
        <CTAFooter />
      </main>
    </>
  );
}
