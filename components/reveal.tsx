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
  /** When true, animate each `[data-reveal-child]` descendant with a
   * stagger instead of animating the wrapper as one block. The wrapper
   * itself is NOT animated in that mode — targets never overlap. */
  staggerChildren?: boolean;
  className?: string;
}

/**
 * Reveal — scroll-triggered fade + rise. Transform + opacity ONLY.
 * Runs on ALL viewports (the old `(min-width: 769px)` gate is gone);
 * on narrow screens the trigger starts earlier (`top 90%`).
 * Reduced-motion: renders children directly, no animation.
 */
export default function Reveal({
  children,
  delay = 0,
  staggerChildren = false,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const start = isMobile ? "top 90%" : "top 85%";
    const stagger = delay || 0.1;

    const ctx = gsap.context(() => {
      if (staggerChildren) {
        const items = el.querySelectorAll("[data-reveal-child]");
        if (items.length > 0) {
          gsap.from(items, {
            // F-4: start at opacity 0.35, not 0 — the old fade left text
            // (e.g. pricing "$0") nearly unreadable during the reveal.
            // clearProps restores the natural state on complete, so CSS
            // :hover transforms (pricing card lift) work again — the
            // inline transform left by gsap.from was overriding them.
            opacity: 0.35,
            y: 16,
            duration: 0.6,
            ease: "power2.out",
            stagger,
            clearProps: "transform,opacity",
            scrollTrigger: { trigger: el, start, once: true },
          });
        }
        return;
      }
      gsap.from(el, {
        opacity: 0.35,
        y: 12,
        duration: 0.7,
        delay,
        ease: "power2.out",
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [reducedMotion, delay, staggerChildren]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
