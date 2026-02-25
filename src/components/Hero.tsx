import { siteConfig } from "@/lib/site";

export default function Hero() {
  return (
    <section className="bg-fence-900 text-white px-6 py-20 md:py-32">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-fence-400 font-semibold text-sm uppercase tracking-widest mb-4">
          Built for fence contractors
        </p>

        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          Stop losing money on{" "}
          <span className="text-fence-400">every fence estimate.</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-fence-200 max-w-2xl mx-auto leading-relaxed">
          {siteConfig.name} calculates your materials, locks in your margin,
          and builds your estimate — so you never underbid a job again.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#demo"
            className="w-full sm:w-auto inline-block bg-fence-500 hover:bg-fence-600 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-colors text-center"
          >
            Try the Demo
          </a>
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-block border-2 border-fence-400 text-fence-300 hover:text-white hover:border-white font-semibold text-lg px-8 py-4 rounded-lg transition-colors text-center"
          >
            See Beta Pricing
          </a>
        </div>

        <p className="mt-6 text-sm text-fence-400">
          No credit card. No signup. Try the live calculator right now.
        </p>
      </div>
    </section>
  );
}
