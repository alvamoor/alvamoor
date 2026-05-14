import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "alvamoor",
    short_name: "alvamoor",
    description: "alvamoor — a portfolio is being assembled",
    start_url: "/",
    display: "standalone",
    background_color: "#4a3829",
    theme_color: "#4a3829",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}
