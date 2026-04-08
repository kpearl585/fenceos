import type { Metadata } from "next";
import HeroV2 from "@/components/v2/HeroV2";
import SocialProofBar from "@/components/v2/SocialProofBar";
import ProblemSolution from "@/components/v2/ProblemSolution";
import ProductShowcase from "@/components/v2/ProductShowcase";
import TestimonialsV2 from "@/components/v2/TestimonialsV2";
import PricingV2 from "@/components/v2/PricingV2";
import FAQV2 from "@/components/v2/FAQV2";
import FinalCTA from "@/components/v2/FinalCTA";

export const metadata: Metadata = {
  title: "FenceEstimatePro - Fence Estimates in 5 Minutes, Not 45",
  description:
    "Stop losing money on bad estimates. FenceEstimatePro calculates every post, panel, and bag of concrete automatically. Lock your margin before you send the quote. 14-day free trial.",
  alternates: { canonical: "/v2" },
};

export default function LandingPageV2() {
  return (
    <main className="bg-white">
      <HeroV2 />
      <SocialProofBar />
      <ProblemSolution />
      <ProductShowcase />
      <TestimonialsV2 />
      <PricingV2 />
      <FAQV2 />
      <FinalCTA />
    </main>
  );
}
