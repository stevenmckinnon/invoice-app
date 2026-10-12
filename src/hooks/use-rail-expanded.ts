"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "caley-rail-expanded";
const CHANGE_EVENT = "caley-rail-expanded-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const getSnapshot = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Whether the desktop rail is expanded to show labels (icons-only is the
 * default). The preference is mirrored onto <html data-rail> because the
 * `rail-expanded:` variant (globals.css) has to reach <main> and portalled
 * tooltips, not just the rail's own subtree.
 */
export const useRailExpanded = () => {
  const expanded = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    document.documentElement.dataset.rail = expanded ? "expanded" : "collapsed";
  }, [expanded]);

  const toggle = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, getSnapshot() ? "0" : "1");
    } catch {
      // Private mode: the toggle just won't persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { expanded, toggle };
};
