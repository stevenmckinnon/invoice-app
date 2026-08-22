"use client";

import { useTheme } from "next-themes";

const THEME_COLORS: Record<string, string> = {
  light: "#ffffff",
  dark: "#000000",
};

/**
 * Rendered as JSX (not an imperative DOM write) so React owns the <meta>
 * node — React 19 auto-hoists <meta> tags into <head> regardless of where
 * in the tree they're rendered. An earlier version of this used
 * document.head.appendChild/removeChild directly, which fought Next's own
 * head management and threw "Cannot read properties of null (removeChild)"
 * on every client-side navigation.
 *
 * Before hydration there's no theme-color tag at all (layout.tsx no longer
 * sets one), so the browser briefly uses its default chrome color — next-
 * themes' no-flash script resolves the theme before paint, so this fills in
 * within the same frame in practice.
 */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  if (!resolvedTheme) return null;

  return (
    <meta
      name="theme-color"
      content={THEME_COLORS[resolvedTheme] ?? THEME_COLORS.light}
    />
  );
}
