import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "FenceEstimatePro privacy policy. How we collect, use, and protect your data. We never sell personal information. Hosted on secure US infrastructure.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const EFFECTIVE = "February 28, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-fence-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-7 h-7 bg-fence-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-white font-bold">FenceEstimatePro</span>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Effective: {EFFECTIVE}</p>

        <div className="space-y-10 text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Overview</h2>
            <p>Pearl Ventures ("we", "us") operates FenceEstimatePro. This Privacy Policy explains how we collect, use, and protect your information. We are committed to handling your data with integrity — we do not sell personal data, period.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-white/90 mb-1">Account Information</p>
                <p>Email address, name, company name, and password (hashed — never stored in plain text).</p>
              </div>
              <div>
                <p className="font-medium text-white/90 mb-1">Business Data</p>
                <p>Customer records, estimates, job details, materials, pricing, and financial data you enter into the platform. This data belongs to you.</p>
              </div>
              <div>
                <p className="font-medium text-white/90 mb-1">Usage Data</p>
                <p>Pages visited, features used, browser type, IP address, and device information. Used to improve the Service.</p>
              </div>
              <div>
                <p className="font-medium text-white/90 mb-1">Payment Information</p>
                <p>We use Stripe for payment processing. We never store credit card numbers — Stripe handles all payment data under PCI DSS compliance.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send transactional emails (account confirmation, password resets)</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To analyze aggregate usage patterns (never individual-level selling)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Data Storage and Security</h2>
            <p>Your data is stored on Supabase infrastructure (PostgreSQL) hosted on AWS in the US East region. We use row-level security, encrypted connections (TLS), and hashed passwords. Access to production data is restricted to essential personnel only.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We share data only with:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><span className="text-white/90">Supabase</span> — database and authentication infrastructure</li>
              <li><span className="text-white/90">Vercel</span> — hosting and content delivery</li>
              <li><span className="text-white/90">Stripe</span> — payment processing</li>
              <li><span className="text-white/90">Law enforcement</span> — only when legally required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Your Rights</h2>
            <p>You have the right to: access the data we hold about you; request correction of inaccurate data; request deletion of your account and associated data; export your business data at any time; opt out of non-transactional communications.</p>
            <p className="mt-3">To exercise any of these rights, email <a href="mailto:privacy@fenceestimatepro.com" className="text-fence-400 hover:text-fence-300">privacy@fenceestimatepro.com</a></p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Cookies</h2>
            <p>We use session cookies required for authentication. We do not use third-party advertising cookies or tracking pixels. Analytics, if used, are privacy-respecting and do not fingerprint individual users.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you cancel, we retain your data for 30 days during which you may request an export. After 30 days, data is permanently deleted unless legally required to retain it.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">9. AI Photo Estimator</h2>
            <p className="mb-3">Our AI Photo Estimator lets anyone upload a yard photo to generate a rough fence estimate without creating an account. When you use it:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><span className="text-white/90">The photo is sent to OpenAI</span> for the Vision analysis that produces the estimate. We do not use your photos to train any model, and OpenAI&rsquo;s API terms state the same.</li>
              <li><span className="text-white/90">Uploaded photos are stored privately in our Supabase bucket</span> and automatically deleted after 7 days. EXIF / location metadata is stripped before the Vision call.</li>
              <li><span className="text-white/90">Your email, if provided,</span> is used only to deliver the claim link for your estimate and to create your account if you sign up. We do not add you to any marketing list without your consent.</li>
              <li><span className="text-white/90">Anonymous estimates</span> (no email provided) are kept for 30 days then purged.</li>
              <li><span className="text-white/90">Your IP address</span> is recorded against each upload strictly for abuse prevention and rate-limiting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">10. Children's Privacy</h2>
            <p>FenceEstimatePro is a business tool intended for adults. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy. Material changes will be communicated via email or in-app notification at least 7 days before taking effect.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">12. Contact</h2>
            <p>Privacy questions: <a href="mailto:privacy@fenceestimatepro.com" className="text-fence-400 hover:text-fence-300">privacy@fenceestimatepro.com</a><br/>
            General: <a href="mailto:support@fenceestimatepro.com" className="text-fence-400 hover:text-fence-300">support@fenceestimatepro.com</a><br/>
            Pearl Ventures · Ocala, Florida</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center text-xs text-white/25">
          <span>© 2026 Pearl Ventures · FenceEstimatePro</span>
          <Link href="/terms" className="text-white/40 hover:text-white/60">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
