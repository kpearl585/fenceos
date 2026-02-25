import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import EstimateDemo from "@/components/EstimateDemo";
import PricingSection from "@/components/PricingSection";
import CTAFooter from "@/components/CTAFooter";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <EstimateDemo />
      <PricingSection /> 
      <CTAFooter />
    </main>
  );
}
