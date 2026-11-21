"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const MotionContext = createContext<{ reducedMotion: boolean }>({
  reducedMotion: false,
});

export function useMotion() {
  return useContext(MotionContext);
}

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
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Manual anchor handling (desktop/Lenis path). The offset has ONE
    // mechanism — `scroll-mt-20` on the target sections — but some engines
    // do not implement `scroll-margin` (Obscura's engine returns "" for
    // getComputedStyle().scrollMarginTop). So: if the browser reports a
    // real scroll-margin, Lenis subtracts it itself (offset 0); if it
    // reports none, we pass -80 explicitly. Never both.
    const scrollOffsetFor = (target: Element): number => {
      const margin = parseFloat(
        getComputedStyle(target).scrollMarginTop,
      );
      return Number.isNaN(margin) || margin === 0 ? -80 : 0;
    };
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

    // Deep link on load: jump straight to the hash target via Lenis.
    if (window.location.hash.length > 1) {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id === "top" ? null : document.getElementById(id);
      requestAnimationFrame(() => {
        if (target)
          lenis.scrollTo(target, {
            immediate: true,
            offset: scrollOffsetFor(target),
          });
        else if (id === "top") lenis.scrollTo(0, { immediate: true });
      });
    }

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <MotionContext.Provider value={{ reducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}
