"use client";

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
 * engine — so the same cyan ring is also painted explicitly via the
 * .skip-focus class (globals.css) and dropped on blur. Identical
 * visuals, deterministic in every browser.
 */
export default function SkipLink() {
  return (
    <a
      href="#main"
      onClick={() => {
        const main = document.getElementById("main");
        if (!main) return;
        main.focus({ preventScroll: true });
        main.classList.add("skip-focus");
        main.addEventListener(
          "blur",
          () => main.classList.remove("skip-focus"),
          { once: true },
        );
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cta focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-void"
    >
      Skip to content
    </a>
  );
}
