import { siteConfig } from "@/lib/site";

export default function CTAFooter() {
  return (
    <section id="early-access" className="bg-fence-800 text-white px-6 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold">
          Stop guessing. Start protecting your margin.
        </h2>
        <p className="mt-4 text-lg text-fence-200 leading-relaxed">
          {siteConfig.name} is launching soon. Get early access and lock in
          beta pricing before it goes up.
        </p>
        <div className="mt-10">
          <a
            href="#demo"
            className="inline-block bg-fence-500 hover:bg-fence-600 text-white font-semibold text-lg px-10 py-4 rounded-lg transition-colors w-full sm:w-auto text-center"
          >
            Try the Demo
          </a>
        </div>
        <p className="mt-6 text-sm text-fence-400">
          No credit card. No signup. Try the calculator right now.
        </p>
      </div>

      <div className="mt-16 pt-8 border-t border-fence-700 text-center text-sm text-fence-400">
        <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
      </div>
    </section>
  );
}
