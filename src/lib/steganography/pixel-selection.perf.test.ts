import { describe, expect, it } from "vitest";
import type { ChannelLocation } from "./pixel-selection";
import { generateLocationOrder } from "./pixel-selection";

describe("generateLocationOrder performance", () => {
  it("shuffles a megapixel-scale candidate pool in a reasonable time", () => {
    const pixelCount = 1_000_000; // e.g. a ~1000x1000 image
    const candidates: ChannelLocation[] = new Array(pixelCount * 3);
    for (let p = 0; p < pixelCount; p++) {
      candidates[p * 3] = { pixelIndex: p, channel: 0 };
      candidates[p * 3 + 1] = { pixelIndex: p, channel: 1 };
      candidates[p * 3 + 2] = { pixelIndex: p, channel: 2 };
    }

    const seed = new TextEncoder().encode("perf-test-seed");
    const start = performance.now();
    const order = generateLocationOrder(candidates, seed);
    const elapsedMs = performance.now() - start;

    expect(order.length).toBe(candidates.length);
    expect(elapsedMs).toBeLessThan(9_000);
  }, 15_000);
});
