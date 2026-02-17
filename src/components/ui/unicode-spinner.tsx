"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpinnerAnimation {
  readonly frames: readonly string[];
  readonly interval: number;
}

const SIZE_MAP = {
  xs: "text-xs leading-3",
  sm: "text-sm leading-3.5",
  md: "text-base leading-4",
  xl: "text-2xl leading-6",
} as const;

type SpinnerSize = keyof typeof SIZE_MAP;

interface UnicodeSpinnerProps {
  animation: SpinnerAnimation;
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

export function UnicodeSpinner({
  animation,
  size = "md",
  className,
  label = "Loading",
}: UnicodeSpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % animation.frames.length);
    }, animation.interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animation, prefersReducedMotion]);

  return (
    <output
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center font-mono",
        SIZE_MAP[size],
        className,
      )}
    >
      {animation.frames[frameIndex]}
    </output>
  );
}

function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
