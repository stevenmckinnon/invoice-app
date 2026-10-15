import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { avatarHue } from "@/lib/avatar";

describe("avatarHue", () => {
  it("is stable for the same seed", () => {
    assert.equal(avatarHue("user_123"), avatarHue("user_123"));
  });

  it("stays within 0–359", () => {
    for (const seed of ["", "a", "dev@caley.test", "x".repeat(500)]) {
      const hue = avatarHue(seed);
      assert.ok(Number.isInteger(hue) && hue >= 0 && hue < 360, `${seed}: ${hue}`);
    }
  });

  it("spreads similar seeds across the wheel", () => {
    const hues = new Set(
      Array.from({ length: 50 }, (_, i) => Math.floor(avatarHue(`user_${i}`) / 30)),
    );
    // 50 near-identical ids should land in most of the twelve 30° buckets
    assert.ok(hues.size >= 9, `only ${hues.size} buckets`);
  });
});
