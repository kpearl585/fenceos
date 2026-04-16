import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#2D6A4F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://fenceestimatepro.com"),
  alternates: { canonical: "/" },
  title: {
    default: "FenceEstimatePro — Fence Estimation Software for Contractors",
    template: "%s | FenceEstimatePro",
  },
  description:
    "FenceGraph engine calculates every post, panel, and bag of concrete from your fence runs. Run-based geometry, margin protection, and digital proposals — built for fence contractors.",
  keywords: [
    "fence estimating software",
    "fence contractor software",
    "fence bid calculator",
    "fence takeoff software",
    "fence estimation app",
    "fence material calculator",
    "fence job pricing",
    "fence proposal software",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FenceEstimate",
  },
  openGraph: {
    type: "website",
    siteName: "FenceEstimatePro",
    locale: "en_US",
    title: "FenceEstimatePro — Fence Estimation Software for Contractors",
    description:
      "FenceGraph engine calculates every post, panel, and bag of concrete from your fence runs. Run-based geometry, margin protection, and digital proposals — built for fence contractors.",
    url: "https://fenceestimatepro.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FenceEstimatePro — Run-based fence estimation engine for contractors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FenceEstimatePro — Fence Estimation Software for Contractors",
    description:
      "FenceGraph engine calculates every post, panel, and bag of concrete from your fence runs. Built for fence contractors.",
    images: ["/og-image.png"],
  },
};

const jsonLdSoftwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FenceEstimatePro",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "29",
    priceCurrency: "USD",
  },
  description:
    "Run-based fence estimation engine for contractors. Auto-derives post types, calculates volumetric concrete, and locks margin before the quote goes out.",
  url: "https://fenceestimatepro.com",
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does fence estimating software calculate materials?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FenceEstimatePro uses run-based geometry — each fence segment is modeled independently with auto-derived post types (end, corner, line, gate hinge/latch), volumetric concrete calculation (pi x r-squared x depth), and panel optimization to minimize scrap. This is fundamentally different from per-linear-foot formulas that generic tools use.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best software for fence contractors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FenceEstimatePro is purpose-built for fence contractors. Unlike generic construction estimating tools, it models fence runs geometrically, auto-calculates post counts by type, computes exact concrete volumes per hole, and locks your margin before any quote goes out. Plans start at $49/mo.",
      },
    },
    {
      "@type": "Question",
      name: "How do I calculate concrete for fence posts?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The correct method uses volumetric calculation: pi x radius-squared x hole depth for each post hole, minus the volume displaced by the post itself. FenceEstimatePro automates this — accounting for different hole diameters based on post type, local soil conditions, and Florida code-compliant depth requirements.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to create a fence estimate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With FenceEstimatePro, the average estimate takes about 5 minutes — compared to 45-60 minutes manually. Enter your fence runs, and the FenceGraph engine auto-derives every post, panel, bag of concrete, and hardware item. Then send a professional digital proposal directly to the customer.",
      },
    },
    {
      "@type": "Question",
      name: "Can fence estimating software help protect my profit margin?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. FenceEstimatePro includes Margin Lock — set your target gross margin and the system warns you before any quote goes out below it. Combined with accurate material takeoffs that prevent underbidding, contractors typically save $1,200+ per job they would have underpriced.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://vercel.live" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdSoftwareApp),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdFaq),
          }}
        />
      </head>
      <body className="bg-background text-text font-body">
        {children}
        <Analytics />
        <SpeedInsights />
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
