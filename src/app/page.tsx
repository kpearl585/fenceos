import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import SolutionSection from "@/components/SolutionSection";
import EngineSection from "@/components/EngineSection";
import EstimateDemo from "@/components/EstimateDemo";
import DemoSection from "@/components/DemoSection";
import ROISection from "@/components/ROISection";
import PricingSection from "@/components/PricingSection";
import CTAFooter from "@/components/CTAFooter";
import FAQSection from "@/components/FAQSection";
import ContactSection from "@/components/ContactSection";
import FounderStrip from "@/components/FounderStrip";
import CrossSell from "@/components/CrossSell";

export const metadata: Metadata = {
  title: "FenceEstimatePro -Fence Estimation Software for Contractors",
  description:
    "FenceGraph engine calculates every post, panel, and bag of concrete from your fence runs. Run-based geometry, margin protection, and digital proposals -built for fence contractors.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FenceEstimatePro -Fence Estimation Software for Contractors",
    description:
      "FenceGraph engine calculates every post, panel, and bag of concrete from your fence runs. Run-based geometry, margin protection, and digital proposals -built for fence contractors.",
    url: "https://fenceestimatepro.com",
  },
  twitter: {
    title: "FenceEstimatePro -Fence Estimation Software for Contractors",
    description:
      "Run-based fence estimation engine. Auto-derives posts, calculates concrete, locks margin. Built for fence contractors.",
  },
};

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
        <ROISection />
        <FounderStrip />
        <EngineSection />
        <PricingSection />
        <FAQSection />
        <ContactSection />
        <CrossSell />
        <CTAFooter />
      </main>
    </>
  );
}
