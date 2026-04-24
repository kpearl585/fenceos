import Link from "next/link";

export default function CTAFooter() {
  return (
    <>
      {/* Final CTA */}
      <section className="bg-[#0F0F0F] px-6 py-20 md:py-24 text-[#F2F2F2]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display">Stop guessing. Start protecting your margin.</h2>
          <p className="mt-4 text-[#6B7280] text-lg leading-relaxed">
            Every job you quote without FenceEstimatePro is a job where your profit is at risk. Fix that today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#22C55E] text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
            >
              Start Free Trial &rarr;
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border-2 border-[rgba(255,255,255,0.12)] text-[#6B7280] hover:border-[rgba(22,163,74,0.4)] hover:text-[#F2F2F2] font-semibold text-lg px-10 py-4 rounded-xl transition-colors"
            >
              Login to Dashboard
            </Link>
          </div>
          <p className="mt-4 text-[#6B7280] text-sm">14-day free trial • No credit card required • Cancel anytime</p>
          <div className="mt-5 inline-flex items-center gap-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-full px-4 py-1.5 text-xs font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span style={{ color: "#c9a84c" }}>Veteran-Owned &amp; Operated</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080808] px-6 py-10 border-t border-[rgba(255,255,255,0.07)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#16A34A] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3v10H3V7zm6-3h3v13H9V4zm6 5h3v8h-3V9z" />
              </svg>
            </div>
            <span className="font-display font-bold text-[#F2F2F2] text-sm">FenceEstimatePro</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#6B7280]">
            <a href="#how-it-works" className="hover:text-[#F2F2F2] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#F2F2F2] transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-[#F2F2F2] transition-colors">Login</Link>
            <a href="#contact" className="hover:text-[#F2F2F2] transition-colors">Contact</a>
          </div>
          <div className="text-center">
            <p className="text-[#6B7280] text-xs mb-1">A Pearl Ventures Company</p>
            <a href="https://contractordocuments.com" target="_blank" rel="noopener noreferrer" className="text-[#6B7280] text-xs hover:text-[#F2F2F2] transition-colors">
              Also need contractor documents? Visit <span className="text-[#3B82F6] underline">ContractorDocuments.com</span>
            </a>
          </div>
          <p className="text-[#6B7280] text-xs">&copy; 2026 FenceEstimatePro. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
