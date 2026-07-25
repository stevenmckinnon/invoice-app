"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared by AppHeader and MobileBottomNav so both pieces of chrome hide and
 * reveal at the same scroll offset — they previously used separate listeners
 * with different thresholds and disappeared at different moments.
 *
 * Reads are batched into a rAF so a fast scroll doesn't run layout work on
 * every wheel/touch event.
 */
const HIDE_ON_SCROLL_THRESHOLD = 120;

export const useHideOnScroll = (threshold = HIDE_ON_SCROLL_THRESHOLD) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(currentScrollY <= lastScrollYRef.current);
      }

      lastScrollYRef.current = currentScrollY;
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return isVisible;
};
