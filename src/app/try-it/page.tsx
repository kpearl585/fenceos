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
    <main className="min-h-screen bg-fence-950 text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 sm:pt-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-fence-800/60 border border-fence-700 px-3 py-1 text-xs font-medium text-fence-200">
            <span className="h-1.5 w-1.5 rounded-full bg-fence-300" />
            Free — no signup required
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight">
            See a fence estimate from a photo
          </h1>
          <p className="mt-4 text-lg text-fence-100/90">
            Upload any yard photo. Our AI identifies the fence run, counts
            gates, and returns a rough price range in seconds.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-2xl bg-white shadow-xl shadow-black/20 border border-white/10 overflow-hidden">
          <PhotoUploadForm />
        </div>

        <p className="mt-6 text-center text-xs text-fence-200/70">
          Photos are used only to generate your estimate and are deleted within
          7 days. We&rsquo;ll never share them.
        </p>
      </section>
    </main>
  );
}
