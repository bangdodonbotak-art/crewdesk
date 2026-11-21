import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — CrewDesk",
  description: "This page does not exist on CrewDesk.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-4 max-w-2xl text-paper">
        404 — This page is not on the crew&apos;s list.
      </h1>
      <p className="mt-4 max-w-md text-muted">
        The page you&apos;re looking for doesn&apos;t exist, or it was moved.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-md bg-cta px-6 font-medium text-void"
        >
          Back to CrewDesk
        </Link>
        <Link
          href="/#pricing"
          className="flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
        >
          See pricing
        </Link>
      </div>
    </main>
  );
}
