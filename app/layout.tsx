import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewDesk — Hire an AI crew for one job",
  description:
    "CrewDesk is a Support Crew for solo founders: Triage, Reply, Escalate. It finishes the work, you approve, it ships. Free: 5 replies a day, forever.",
  openGraph: {
    title: "CrewDesk — Hire an AI crew for one job",
    description:
      "One crew, one job, finished. Founder approves before anything is sent.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrewDesk — Hire an AI crew for one job",
    description:
      "One crew, one job, finished. Founder approves before anything is sent.",
  },
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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
