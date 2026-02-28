import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service | FenceEstimatePro" };

const EFFECTIVE = "February 28, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-fence-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-7 h-7 bg-fence-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-white font-bold">FenceEstimatePro</span>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-12">Effective: {EFFECTIVE}</p>

        <div className="prose prose-invert max-w-none space-y-10 text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using FenceEstimatePro (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. These terms apply to all users, including contractors, foremen, and sales representatives.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Description of Service</h2>
            <p>FenceEstimatePro is a cloud-based SaaS platform that provides fence contractors with tools for estimating, job management, materials tracking, and business reporting. The Service is provided by Pearl Ventures, based in Ocala, Florida.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Account Registration</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must notify us immediately of any unauthorized access. You are responsible for all activity that occurs under your account.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Subscription and Billing</h2>
            <p>FenceEstimatePro offers paid subscription plans. By subscribing, you authorize us to charge your payment method on a recurring basis. Plans are billed monthly or annually as selected. You may cancel at any time — cancellation takes effect at the end of the current billing period. No refunds are issued for partial periods.</p>
            <div className="mt-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="font-medium text-white mb-2">Current Plans</p>
              <ul className="space-y-1 text-white/60">
                <li>Starter — $29/month</li>
                <li>Pro — $59/month</li>
                <li>Business — $99/month</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Acceptable Use</h2>
            <p>You agree not to: use the Service for any unlawful purpose; attempt to gain unauthorized access to any portion of the Service; reverse engineer, copy, or resell any part of the Service; upload malicious code or interfere with the Service&apos;s infrastructure; use the Service to store or transmit infringing, defamatory, or otherwise unlawful content.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Data and Privacy</h2>
            <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-fence-400 hover:text-fence-300 underline">Privacy Policy</Link>. You retain ownership of all data you input into the Service. You grant us a limited license to process that data solely to provide and improve the Service. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Confidentiality of Financial Data</h2>
            <p>The Service contains sensitive financial information including cost data, margin data, and pricing. You are responsible for managing role-based access within your organization. FenceEstimatePro enforces access controls but is not liable for unauthorized disclosure resulting from account sharing or improper role configuration.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Disclaimers</h2>
            <p>The Service is provided &ldquo;as is&rdquo; without warranties of any kind. Estimate calculations are based on the inputs you provide — FenceEstimatePro does not guarantee the accuracy or profitability of any estimate. You are solely responsible for the quotes you provide to your customers.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Pearl Ventures shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you shall not exceed the amount you paid in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">10. Termination</h2>
            <p>We reserve the right to suspend or terminate your account for violation of these terms, non-payment, or any activity that we determine to be harmful to the Service or other users. Upon termination, you may request an export of your data within 30 days.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">11. Changes to Terms</h2>
            <p>We may update these Terms at any time. We will notify you of material changes via email or an in-app notice. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Florida. Any disputes shall be resolved in the courts of Marion County, Florida.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">13. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:support@fenceestimatepro.com" className="text-fence-400 hover:text-fence-300">support@fenceestimatepro.com</a></p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center text-xs text-white/25">
          <span>© 2026 Pearl Ventures · FenceEstimatePro</span>
          <Link href="/privacy" className="text-white/40 hover:text-white/60">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
