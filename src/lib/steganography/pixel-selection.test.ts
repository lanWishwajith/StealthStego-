import { describe, expect, it } from "vitest";
import type { ChannelLocation } from "./pixel-selection";
import { generateLocationOrder } from "./pixel-selection";

function makeCandidates(pixelCount: number): ChannelLocation[] {
  const candidates: ChannelLocation[] = [];
  for (let p = 0; p < pixelCount; p++) {
    for (let c = 0; c < 3; c++) {
      candidates.push({ pixelIndex: p, channel: c as 0 | 1 | 2 });
    }
  }
  return candidates;
}

function keyOf(loc: ChannelLocation): string {
  return `${loc.pixelIndex}:${loc.channel}`;
}

describe("generateLocationOrder", () => {
  it("produces the same sequence for the same seed", () => {
    const candidates = makeCandidates(50);
    const seed = new TextEncoder().encode("same-seed-material");

    const a = generateLocationOrder(candidates, seed);
    const b = generateLocationOrder(candidates, seed);

    expect(a.map(keyOf)).toEqual(b.map(keyOf));
  });

  it("produces a different sequence for a different seed", () => {
    const candidates = makeCandidates(50);
    const seedA = new TextEncoder().encode("password-one");
    const seedB = new TextEncoder().encode("password-two");

    const a = generateLocationOrder(candidates, seedA);
    const b = generateLocationOrder(candidates, seedB);

    expect(a.map(keyOf)).not.toEqual(b.map(keyOf));
  });

  it("contains no duplicate locations", () => {
    const candidates = makeCandidates(80);
    const seed = new TextEncoder().encode("dup-check");

    const order = generateLocationOrder(candidates, seed);
    const seen = new Set(order.map(keyOf));

    expect(order.length).toBe(candidates.length);
    expect(seen.size).toBe(candidates.length);
  });

  it("only ever uses RGB channels (0, 1, or 2)", () => {
    const candidates = makeCandidates(30);
    const seed = new TextEncoder().encode("channel-check");

    const order = generateLocationOrder(candidates, seed);

    for (const loc of order) {
      expect([0, 1, 2]).toContain(loc.channel);
    }
  });
});
