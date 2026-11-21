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
 * MotionProvider — gates ALL motion behind reduced-motion + fine pointer.
 * Lenis smooth scroll + GSAP ScrollTrigger only init when
 * prefers-reduced-motion is no-preference AND pointer is fine.
 * Everything is torn down on unmount.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionOk = window.matchMedia(
      "(prefers-reduced-motion: no-preference)",
    ).matches;
    const pointerFine = window.matchMedia("(pointer: fine)").matches;

    if (!motionOk) {
      setReducedMotion(true);
      return;
    }
    setReducedMotion(false);
    if (!pointerFine) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
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
