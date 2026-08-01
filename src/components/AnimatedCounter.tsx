"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeToReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  delay?: number;
}

/**
 * Animated counter component that animates from 0 to the target value
 * Uses easing function for smooth animation
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  decimals = 2,
  prefix = "",
  suffix = "",
  className = "",
  delay = 0,
}) => {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  // Counting up is decoration, not information. When the OS asks for less
  // motion we skip the animation entirely and render the target value.
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    useCallback(() => window.matchMedia(REDUCED_MOTION_QUERY).matches, []),
    useCallback(() => false, []),
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Cancel any ongoing animation
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current);
    }

    // Reset and start new animation
    const startAnimation = () => {
      startTimeRef.current = undefined;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const easeOutCubic = (t: number): number => {
          return 1 - Math.pow(1 - t, 3);
        };

        const easedProgress = easeOutCubic(progress);
        const currentCount = value * easedProgress;

        setCount(currentCount);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    };

    // Start animation after delay
    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration, delay, prefersReducedMotion]);

  const displayed = prefersReducedMotion ? value : count;

  return (
    // tabular-nums by construction: this value changes every frame while it
    // counts up, and proportional digits make it jitter horizontally.
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {displayed.toLocaleString("en-GB", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};
