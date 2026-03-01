import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FenceEstimatePro",
    short_name: "FenceEstimate",
    description: "Fence estimating that protects your margin",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a1a12",
    theme_color: "#2D6A4F",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "New Estimate",
        url: "/dashboard/estimates/new",
        description: "Create a new estimate",
      },
      {
        name: "Jobs Board",
        url: "/dashboard/jobs",
        description: "View your jobs kanban",
      },
    ],
  };
}
