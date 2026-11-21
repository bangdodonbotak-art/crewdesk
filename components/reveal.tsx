"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotion } from "./motion-provider";

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in seconds (0.06–0.12 typical). */
  delay?: number;
  className?: string;
}

/**
 * Reveal — scroll-triggered fade + rise. Transform + opacity ONLY.
 * gsap.from opacity 0 → 1, y 12 → 0, 0.7s, power2.out.
 * Reduced-motion: renders children directly, no animation.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    // gsap.matchMedia — scroll reveals are desktop-only.
    const mm = gsap.matchMedia();
    mm.add("(min-width: 769px)", () => {
      gsap.from(el, {
        opacity: 0,
        y: 12,
        duration: 0.7,
        delay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
      });
    });

    return () => mm.revert();
  }, [reducedMotion, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
