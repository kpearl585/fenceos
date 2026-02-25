export const siteConfig = {
  name: "FenceEstimatePro",
  domain: "fenceestimatepro.com",
  url: "https://fenceestimatepro.com",
  description:
    "Fence estimating software that calculates materials, protects your margin, and generates professional estimates. Built for fence contractors.",
  tagline: "Fence estimating that protects your margin.",
  founder: "Keegan Pearl",
  social: {
    twitter: "@fenceestimatepro",
  },
} as const;

export type SiteConfig = typeof siteConfig;
