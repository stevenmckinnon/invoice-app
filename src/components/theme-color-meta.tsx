"use client";

import { useEffect } from "react";

import { useTheme } from "next-themes";

const THEME_COLORS: Record<string, string> = {
  light: "#ffffff",
  dark: "#000000",
};

/**
 * layout.tsx sets the initial theme-color via prefers-color-scheme media
 * queries so the status bar is right before hydration. Those follow the OS
 * setting, not the in-app toggle, so once next-themes resolves the actual
 * theme this replaces them with a single tag that tracks it.
 */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;

    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((el) => el.remove());

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = THEME_COLORS[resolvedTheme] ?? THEME_COLORS.light;
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  return null;
}
