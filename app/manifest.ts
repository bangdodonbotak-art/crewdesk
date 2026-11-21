import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrewDesk — Hire an AI crew to run your support inbox",
    short_name: "CrewDesk",
    description:
      "CrewDesk triages your support inbox, drafts replies from your knowledge base, and waits for your approval.",
    start_url: "/",
    display: "standalone",
    background_color: "#07080a",
    theme_color: "#07080a",
    icons: [
      { src: "/logo-96.png", sizes: "96x96", type: "image/png" },
      { src: "/logo.webp", sizes: "512x512", type: "image/webp" },
    ],
  };
}
