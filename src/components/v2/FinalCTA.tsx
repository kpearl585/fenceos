export default function FinalCTA() {
  return (
    <>
      {/* Final CTA section */}
      <section id="waitlist" className="bg-gradient-to-br from-green-600 to-green-700 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
            Stop Losing Money on Bad Estimates
          </h2>
          <p className="text-xl text-green-50 mb-8 max-w-2xl mx-auto">
            Join 47+ fence contractors already protecting their margins with FenceEstimatePro. Start your free trial today.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-green-700 font-bold text-lg px-10 py-5 rounded-lg transition-all shadow-xl"
            >
              Start Your Free Trial
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a
              href="mailto:support@fenceestimatepro.com"
              className="inline-flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 text-white font-semibold text-lg px-10 py-5 rounded-lg transition-all border-2 border-green-500"
            >
              Talk to Us First
            </a>
          </div>

          <p className="text-green-100 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-green-500">
            <div className="flex items-center gap-2 text-green-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-sm font-medium">Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2 text-green-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#c9a84c" stroke="#c9a84c" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-sm font-medium">Veteran-Owned</span>
            </div>
            <div className="flex items-center gap-2 text-green-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-sm font-medium">4.9/5 Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <span className="font-bold text-white text-lg font-display">FenceEstimatePro</span>
              </div>
              <p className="text-sm text-gray-500">
                Professional fence estimating software for contractors.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Product</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#demo" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Login</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Company</p>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Support</p>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@fenceestimatepro.com" className="hover:text-white transition-colors">Email Support</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">© 2026 FenceEstimatePro. All rights reserved.</p>
            <p className="text-sm text-gray-500">
              A <span className="text-gray-400">Pearl Ventures</span> Company
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
