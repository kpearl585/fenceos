export default function Hero() {
  return (
    <section className="bg-fence-900 text-white px-6 py-20 md:py-32">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          Fence estimating that{" "}
          <span className="text-fence-400">protects your margin.</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-fence-200 max-w-2xl mx-auto leading-relaxed">
          Most fence contractors lose thousands per year on bad math, missed
          materials, and change orders that eat profit. FenceOS fixes that
          before the quote leaves your hands.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#demo"
            className="w-full sm:w-auto inline-block bg-fence-500 hover:bg-fence-600 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-colors text-center"
          >
            Try Live Estimate Demo
          </a>
          <a
            href="#early-access"
            className="w-full sm:w-auto inline-block border-2 border-fence-400 text-fence-300 hover:text-white hover:border-white font-semibold text-lg px-8 py-4 rounded-lg transition-colors text-center"
          >
            Book Early Access
          </a>
        </div>
      </div>
    </section>
  );
}
