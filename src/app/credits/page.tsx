import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits & Attributions",
  description:
    "Third-party assets used in FenceEstimatePro and their licenses. We credit every open-source creator whose work ships in our product.",
  alternates: { canonical: "/credits" },
  robots: { index: true, follow: true },
};

const UPDATED = "April 19, 2026";

export default function CreditsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center accent-glow">
            <svg className="w-4 h-4 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-text font-bold">FenceEstimatePro</span>
        </Link>

        <h1 className="font-display text-3xl font-bold text-text mb-2">Credits &amp; Attributions</h1>
        <p className="text-muted text-sm mb-12">Last updated: {UPDATED}</p>

        <div className="space-y-10 text-text/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-text font-semibold text-lg mb-3">Overview</h2>
            <p>
              FenceEstimatePro is built with help from an open-source community
              of creators. This page credits every third-party asset that ships
              inside our product along with its license, as required by the
              terms of those licenses. If you are the author of work credited
              here and would like us to correct an attribution, please{" "}
              <Link href="/privacy" className="text-accent-light underline hover:text-accent">
                contact us
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-text font-semibold text-lg mb-3">3D Models</h2>

            <div className="space-y-6">
              <div className="border border-border bg-surface-2 rounded-lg p-5">
                <p className="text-text font-medium mb-1">Wood Privacy Fence (AR panel)</p>
                <p className="text-muted text-xs mb-3">
                  Used in the AR Quote feature to visualize 6-foot wood privacy fences on customer property.
                </p>
                <dl className="grid grid-cols-1 gap-y-2 text-xs">
                  <div className="flex">
                    <dt className="w-24 text-muted">Title</dt>
                    <dd>&ldquo;CC0 - Woode Fence&rdquo;</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted">Author</dt>
                    <dd>plaggy</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted">Source</dt>
                    <dd>
                      <a
                        href="https://skfb.ly/otBYu"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-light underline hover:text-accent"
                      >
                        skfb.ly/otBYu
                      </a>{" "}
                      (Sketchfab)
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted">License</dt>
                    <dd>
                      <a
                        href="https://creativecommons.org/licenses/by/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-light underline hover:text-accent"
                      >
                        CC BY 4.0
                      </a>
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-muted">Modifications</dt>
                    <dd>
                      Optimized for mobile AR using{" "}
                      <a
                        href="https://gltf-transform.dev/cli"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-light underline hover:text-accent"
                      >
                        gltf-transform
                      </a>{" "}
                      (meshopt compression + webp textures).
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-text font-semibold text-lg mb-3">Software Libraries</h2>
            <p className="mb-4">
              FenceEstimatePro stands on the shoulders of many open-source
              projects. A non-exhaustive highlight of the libraries that power
              our product:
            </p>
            <ul className="space-y-2 list-disc list-inside marker:text-accent">
              <li>
                <a
                  href="https://nextjs.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-light underline hover:text-accent"
                >
                  Next.js
                </a>{" "}
                &mdash; the React framework we build the app on (MIT).
              </li>
              <li>
                <a
                  href="https://supabase.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-light underline hover:text-accent"
                >
                  Supabase
                </a>{" "}
                &mdash; database, auth, and storage (Apache 2.0).
              </li>
              <li>
                <a
                  href="https://modelviewer.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-light underline hover:text-accent"
                >
                  &lt;model-viewer&gt;
                </a>{" "}
                by Google &mdash; the web component that renders our 3D / AR experience (Apache 2.0).
              </li>
              <li>
                <a
                  href="https://tailwindcss.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-light underline hover:text-accent"
                >
                  Tailwind CSS
                </a>{" "}
                &mdash; styling system (MIT).
              </li>
              <li>
                <a
                  href="https://gltf-transform.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-light underline hover:text-accent"
                >
                  glTF-Transform
                </a>{" "}
                &mdash; 3D asset optimization pipeline (MIT).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-text font-semibold text-lg mb-3">Contact</h2>
            <p>
              Questions or corrections about anything credited on this page?
              Email us and we&apos;ll update it promptly.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
