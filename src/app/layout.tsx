import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FenceOS — Fence Estimating That Protects Your Margin",
  description:
    "FenceOS helps fence contractors generate accurate estimates, calculate materials automatically, and protect gross margin before the quote goes out.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-fence-900 font-sans">{children}</body>
    </html>
  );
}
