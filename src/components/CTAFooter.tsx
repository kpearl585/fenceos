export default function CTAFooter() {
  return (
    <section id="early-access" className="bg-fence-800 text-white px-6 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold">
          Stop losing money on every estimate.
        </h2>
        <p className="mt-4 text-lg text-fence-200 leading-relaxed">
          FenceOS is launching soon. Get early access and be the first fence
          contractor in your market running protected estimates.
        </p>
        <div className="mt-10">
          <a
            href="#"
            className="inline-block bg-fence-500 hover:bg-fence-600 text-white font-semibold text-lg px-10 py-4 rounded-lg transition-colors w-full sm:w-auto text-center"
          >
            Book Early Access
          </a>
        </div>
        <p className="mt-6 text-sm text-fence-400">
          No credit card. No commitment. Just first dibs.
        </p>
      </div>

      <div className="mt-16 pt-8 border-t border-fence-700 text-center text-sm text-fence-400">
        <p>&copy; {new Date().getFullYear()} FenceOS. All rights reserved.</p>
      </div>
    </section>
  );
}
