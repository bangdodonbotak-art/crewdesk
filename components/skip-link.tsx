"use client";

import { useState } from "react";

/**
 * Skip link. A bare href="#main" only changes the URL and scrolls — it
 * does NOT move keyboard focus, so the next Tab lands back on the header
 * logo instead of the first control inside the content. Activating the
 * link therefore also focuses <main> (every page's <main> carries
 * tabindex="-1", so it can take programmatic focus without entering the
 * tab order). Focus uses preventScroll: the scroll itself is done by the
 * anchor / Lenis, not by the focus jump. No animation is involved, so
 * reduced-motion is untouched.
 *
 * Ring: :focus-visible matching for programmatic focus depends on the
 * browser's keyboard heuristic, which cannot be verified in this VM's
 * engine — so activation also shows a real fixed overlay <div> (below):
 * a 2px cyan viewport frame, pointer-events none, z-100, removed when
 * <main> blurs (next Tab moves focus to the hero CTA, which shows its
 * own :focus-visible ring). A ring on <main> itself does not work: an
 * outline renders only as one 2px line flush under the sticky header
 * (missed by the live screenshot scan), an inset box-shadow is painted
 * UNDER the descendant sections' opaque backgrounds and never shows,
 * and a body::after frame does not compute in Obscura's engine
 * (position:static + border:0 despite the rule being in the served CSS).
 * The overlay uses border-accent (the token): it paints cyan in
 * Obscura screenshots, unlike var() inside a box-shadow declaration.
 */
export default function SkipLink() {
  const [active, setActive] = useState(false);
  return (
    <>
      <a
        href="#main"
        onClick={() => {
          const main = document.getElementById("main");
          if (!main) return;
          main.focus({ preventScroll: true });
          setActive(true);
          main.addEventListener(
            "blur",
            () => setActive(false),
            { once: true },
          );
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cta focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-void"
      >
        Skip to content
      </a>
      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[100] border-2 border-accent"
        />
      )}
    </>
  );
}
