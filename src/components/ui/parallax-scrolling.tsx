'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

interface ParallaxSectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ParallaxComponent({
  title = "<span dir='ltr' class='inline-flex items-center'>STUDY<span class='text-primary font-black'>++</span></span> Academic Hub",
  subtitle = "Next-Generation Computer Science Education",
  className = "",
}: ParallaxSectionProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const triggerElement = parallaxRef.current?.querySelector('[data-parallax-layers]');

    if (triggerElement) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5,
        },
      });

      const layers = [
        { layer: "1", yPercent: 40 },
        { layer: "2", yPercent: 25 },
        { layer: "3", yPercent: 15 },
        { layer: "4", yPercent: 5 },
      ];

      layers.forEach((layerObj, idx) => {
        const els = triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`);
        if (els.length > 0) {
          tl.to(
            els,
            {
              yPercent: layerObj.yPercent,
              ease: "none",
            },
            idx === 0 ? undefined : "<"
          );
        }
      });
    }

    let lenis: Lenis | null = null;
    try {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      lenis.on('scroll', ScrollTrigger.update);
      const rafCallback = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);
    } catch {
      // ignore
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (triggerElement) gsap.killTweensOf(triggerElement);
      lenis?.destroy();
    };
  }, []);

  return (
    <div
      ref={parallaxRef}
      className={`relative w-full overflow-hidden py-16 sm:py-24 my-8 rounded-3xl border border-primary/20 bg-gradient-to-b from-card/80 via-primary/[0.03] to-card/80 backdrop-blur-xl shadow-2xl ${className}`}
    >
      <div data-parallax-layers className="relative min-h-[380px] sm:min-h-[460px] flex items-center justify-center overflow-hidden px-4">
        {/* Layer 1: Ambient mesh grid & background elements */}
        <div
          data-parallax-layer="1"
          className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none"
        >
          <div className="w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl" />
        </div>

        {/* Layer 2: Decorative Floating Tech Rings */}
        <div
          data-parallax-layer="2"
          className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-40"
        >
          <div className="size-48 sm:size-64 rounded-full border border-dashed border-primary/30 animate-[spin_60s_linear_infinite]" />
          <div className="size-36 sm:size-48 rounded-full border border-primary/20 animate-[spin_40s_linear_infinite_reverse]" />
        </div>

        {/* Layer 3: Central High-Tech Headline */}
        <div
          data-parallax-layer="3"
          className="relative z-20 text-center max-w-3xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-black text-primary uppercase tracking-widest shadow-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>Academic Platform Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight drop-shadow-md">
            {title}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Layer 4: Foreground subtle highlights */}
        <div
          data-parallax-layer="4"
          className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none"
        >
          <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}

export default ParallaxComponent;

