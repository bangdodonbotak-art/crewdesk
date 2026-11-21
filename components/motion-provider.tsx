"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const MotionContext = createContext<{ reducedMotion: boolean }>({
  reducedMotion: false,
});

export function useMotion() {
  return useContext(MotionContext);
}

// Anchor offset has ONE mechanism: `scroll-mt-20` on zero-height anchor
// SPANS placed directly above each section heading (not on the sections
// and not on the headings — the headings sit 64–96px below their section
// tops behind py-16/py-24, so anchoring the section landed the heading at
// ~144–193px; anchoring the heading itself overshot by 16px because the
// heading carries a gsap reveal transform (y:16) while Lenis / the browser
// measures its rect — live-check 17:23 WIB, verified locally). The span
// has no transform, so every path (Lenis click, hashchange, cross-page
// hash scroll, native touch jump) lands the heading at 80px.
// Lenis `scrollTo` subtracts the target's scroll-margin, and native
// anchor jumps honour it too. Read the computed scroll-margin and only
// pass an explicit -80 offset when the engine reports none (Obscura) —
// never both at once (no double-offset).
const scrollOffsetFor = (target: Element): number => {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop);
  return Number.isNaN(margin) || margin === 0 ? -80 : 0;
};

/**
 * MotionProvider.
 *
 * - `prefers-reduced-motion` is read synchronously at init (lazy useState),
 *   so children never see a wrong `false` first (audit N-6).
 * - GSAP ScrollTrigger registers on ALL devices — scroll reveals are not
 *   gated by pointer or viewport width.
 * - Lenis stays desktop-only (pointer: fine). On touch devices the native
 *   scroll + `scroll-behavior: smooth` (coarse-pointer media query) own
 *   anchor jumps.
 * - Anchor offset has ONE mechanism: `scroll-mt-20` on the target sections.
 *   Lenis `scrollTo` subtracts the target's scroll-margin, and native
 *   anchor jumps honour it too. The handler reads the computed
 *   scroll-margin and only passes an explicit -80 offset when the engine
 *   reports none (Obscura) — never both at once (no double-offset).
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const motionOk = window.matchMedia(
      "(prefers-reduced-motion: no-preference)",
    ).matches;
    if (!motionOk) {
      setReducedMotion(true);
      return;
    }
    setReducedMotion(false);

    gsap.registerPlugin(ScrollTrigger);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    const pointerFine = window.matchMedia("(pointer: fine)").matches;
    if (!pointerFine) return;

    const lenis = new Lenis({ lerp: 0.1 });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Manual anchor handling (desktop/Lenis path). The offset has ONE
    // mechanism — `scroll-mt-20` on the zero-height anchor spans — see
    // scrollOffsetFor above.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        "a[href*='#']",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        !url.hash ||
        url.hash.length < 2
      ) {
        return;
      }
      const id = decodeURIComponent(url.hash.slice(1));
      if (id === "top") {
        event.preventDefault();
        lenis.scrollTo(0, { duration: 0.9 });
        history.pushState(null, "", "#top");
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, {
        duration: 0.9,
        offset: scrollOffsetFor(target),
      });
      history.pushState(null, "", url.hash);
    };
    document.addEventListener("click", onClick);

    // Back/forward to a hashed URL: pushState does not fire hashchange,
    // but browser history navigation does — route it through Lenis too,
    // or the native jump loses the same race as the 404 case below.
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash.length < 2) return;
      let id: string;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch {
        return;
      }
      if (id === "top") {
        lenis.resize();
        lenis.scrollTo(0, { duration: 0.9 });
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      lenis.resize();
      lenis.scrollTo(target, {
        duration: 0.9,
        offset: scrollOffsetFor(target),
      });
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHashChange);
      gsap.ticker.remove(raf);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  // Hash scroll after client-side navigation (and on initial load).
  // The click handler above only covers same-page anchors, and this
  // provider mounts once per session — so a cross-page jump such as
  // 404 -> /#pricing never scrolled: Next's native jump loses the race
  // against Lenis's raf loop, which snaps scroll back to its internal
  // value (0). Routing the jump through Lenis — or native scrollIntoView
  // when Lenis is absent (touch / reduced-motion) — makes it stick.
  // Same-page anchor clicks do not change pathname, so this never
  // fights the click handler.
  //
  // Two Lenis traps, both handled here: (1) Lenis measures the page
  // height once and can hold a stale limit (0) right after a client
  // navigation from a short page (e.g. 404) — scrollTo then clamps the
  // target to 0 and no-ops. resize() re-measures and syncs Lenis's
  // internal scroll to the actual position first. (2) The first attempt
  // can land while the layout / Next's own post-navigation scroll is
  // still settling, so retries at +300/+900ms re-assert. A retry only
  // fires while the page is still near the top and the target is still
  // below the fold, so it never yanks the visitor back after they
  // scrolled away on their own.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.length < 2) return;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const scroll = () => {
      const lenis = lenisRef.current;
      if (id === "top") {
        if (lenis) {
          lenis.resize();
          lenis.scrollTo(0, { immediate: true });
        } else window.scrollTo(0, 0);
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(target, {
          immediate: true,
          offset: scrollOffsetFor(target),
        });
      } else {
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      }
    };
    const needsRetry = () => {
      if (window.location.hash.slice(1) !== id) return false;
      const target = document.getElementById(id);
      if (!target) return false;
      return window.scrollY < 100 && target.getBoundingClientRect().top > 150;
    };
    const timers: number[] = [];
    const raf = requestAnimationFrame(() => {
      scroll();
      timers.push(
        window.setTimeout(() => {
          if (needsRetry()) scroll();
        }, 300),
      );
      timers.push(
        window.setTimeout(() => {
          if (needsRetry()) scroll();
        }, 900),
      );
    });
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname, reducedMotion]);

  return (
    <MotionContext.Provider value={{ reducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}
