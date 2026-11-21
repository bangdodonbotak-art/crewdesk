import type { Metadata } from "next";
import { PLANS } from "../lib/site-data";
import MotionProvider from "../components/motion-provider";
import SkipLink from "../components/skip-link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crewdesk-nine.vercel.app"),
  alternates: { canonical: "https://crewdesk-nine.vercel.app/" },
  title: "CrewDesk — Hire an AI crew to run your support inbox",
  description:
    "CrewDesk triages your support inbox, drafts replies from your knowledge base, and waits for your approval. Free forever — 5 replies a day, no card.",
  openGraph: {
    title: "CrewDesk — Hire an AI crew to run your support inbox",
    description:
      "CrewDesk triages your support inbox, drafts replies from your knowledge base, and waits for your approval. Free forever — 5 replies a day, no card.",
    type: "website",
    url: "https://crewdesk-nine.vercel.app/",
    images: [{ url: "/logo.webp", width: 512, height: 512, alt: "CrewDesk logo" }],
  },
  icons: { icon: "/logo-96.png", apple: "/logo.png" },
  twitter: {
    card: "summary_large_image",
    title: "CrewDesk — Hire an AI crew to run your support inbox",
    description:
      "CrewDesk triages your support inbox, drafts replies from your knowledge base, and waits for your approval. Free forever — 5 replies a day, no card.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CrewDesk",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: PLANS.filter((p) => p.id === "free" || p.id === "starter").map(
    (p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.monthlyPriceUsd,
      priceCurrency: "USD",
    }),
  ),
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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo-96.png" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <SkipLink />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
