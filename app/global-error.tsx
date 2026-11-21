"use client";

import type { ReactNode } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-void text-paper">
        <main
          id="main"
          className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center"
        >
          <p className="font-mono text-sm text-accent">500</p>
          <h1 className="mt-4 text-3xl font-semibold">
            Something went wrong on our side.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The crew hit an error{error?.digest ? ` (${error.digest})` : ""}.
            Try again — nothing was sent.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-cta px-5 text-sm font-semibold text-void"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
