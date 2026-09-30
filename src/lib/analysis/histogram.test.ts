import { describe, expect, it } from "vitest";
import type { DecodedImage } from "@/types/image";
import { computeHistogram, computeRgbHistograms } from "./histogram";

function makeImage(values: Array<[number, number, number]>): DecodedImage {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return { width: values.length, height: 1, data };
}

describe("computeHistogram", () => {
  it("buckets each channel value with the correct count", () => {
    const image = makeImage([
      [10, 20, 30],
      [10, 20, 30],
      [11, 21, 31],
    ]);
    const r = computeHistogram(image, 0);
    expect(r[10]).toBe(2);
    expect(r[11]).toBe(1);
    expect(r.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe("computeRgbHistograms", () => {
  it("computes independent histograms per channel", () => {
    const image = makeImage([[0, 128, 255]]);
    const { r, g, b } = computeRgbHistograms(image);
    expect(r[0]).toBe(1);
    expect(g[128]).toBe(1);
    expect(b[255]).toBe(1);
  });
});
