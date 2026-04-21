import type { Metadata } from "next";
import PhotoUploadForm from "./PhotoUploadForm";

export const metadata: Metadata = {
  title: "AI Fence Estimator — Upload a Photo, Get a Quote | FenceEstimatePro",
  description:
    "Free tool: upload any yard photo and our AI identifies the fence run, estimates linear feet, counts gates, and returns a rough price in seconds. No signup required.",
  openGraph: {
    title: "See a fence estimate from a photo — FenceEstimatePro",
    description:
      "Upload a yard photo. Our AI returns a structured fence estimate in under 30 seconds. Free. No signup.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function TryItPage() {
  return (
    <main className="relative min-h-screen bg-background text-text overflow-hidden">
      {/* Grid pattern + accent glow — same treatment as the landing hero */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <section className="relative mx-auto max-w-4xl px-6 pt-20 pb-10 sm:pt-28">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-light">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-light animate-pulse" />
            Free — no signup required
          </div>
          <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            See a fence estimate
            <br />
            <span className="gradient-text">from a photo.</span>
          </h1>
          <p className="mt-5 text-lg text-muted leading-relaxed">
            Upload any yard photo. Our AI identifies the fence run, counts
            gates, and returns a rough price range in seconds.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-2xl bg-surface-2 border border-border overflow-hidden">
          <PhotoUploadForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Photos are used only to generate your estimate and are deleted within
          7 days. We&rsquo;ll never share them.
        </p>

        <p className="mt-3 text-center text-xs text-muted">
          Something not working?{" "}
          <a
            href="mailto:support@fenceestimatepro.com"
            className="text-accent-light underline underline-offset-4 hover:text-accent transition-colors duration-150"
          >
            support@fenceestimatepro.com
          </a>
        </p>
      </section>
    </main>
  );
}
