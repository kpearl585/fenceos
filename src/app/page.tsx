import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import SolutionSection from "@/components/SolutionSection";
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
        <PricingSection />
        <FAQSection />
        <WaitlistSection />
        <CTAFooter />
      </main>
    </>
  );
}
