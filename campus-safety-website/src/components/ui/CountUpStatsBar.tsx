"use client";

import { useEffect, useRef, useState } from "react";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedNumber({ target, suffix, started }: { target: number; suffix: string; started: boolean }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started) return;
    let startTimestamp: number | null = null;
    const duration = 2000;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [started, target]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export default function CountUpStatsBar({ items }: { items: StatItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={containerRef} className="w-full bg-[#09090b] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {items.map((item, idx) => (
            <div
              key={item.label}
              className={`flex-1 text-center py-8 md:py-0 md:px-6 ${
                idx < items.length - 1
                  ? "border-b md:border-b-0 md:border-r border-white/15"
                  : ""
              } ${idx > 0 ? "w-4/5 md:w-auto" : "w-4/5 md:w-auto"}`}
            >
              <div className="text-5xl sm:text-6xl font-bold text-white leading-none tracking-tighter mb-2 flex items-baseline justify-center">
                <AnimatedNumber target={item.value} suffix={item.suffix} started={started} />
              </div>
              <div className="text-xs sm:text-sm font-medium uppercase tracking-[0.15em] text-zinc-400">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
