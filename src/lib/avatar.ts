import type { CSSProperties } from "react";

/**
 * A stable hue (0–359) for a seed string, via 32-bit FNV-1a. The same seed
 * always gets the same colour, across sessions and devices.
 */
export function avatarHue(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

/** Sets `--avatar-hue` for {@link AVATAR_TINT_CLASS} to read. */
export function avatarTintStyle(seed: string): CSSProperties {
  return { "--avatar-hue": avatarHue(seed) } as CSSProperties;
}

/**
 * Only the hue varies; lightness and chroma are fixed per theme, so every
 * avatar carries the same visual weight and its initial clears 4.5:1 at any
 * hue. Pair with {@link avatarTintStyle}.
 */
export const AVATAR_TINT_CLASS =
  "bg-[color:oklch(0.9_0.05_var(--avatar-hue))] text-[color:oklch(0.42_0.1_var(--avatar-hue))] dark:bg-[color:oklch(0.36_0.07_var(--avatar-hue))] dark:text-[color:oklch(0.92_0.04_var(--avatar-hue))]";
