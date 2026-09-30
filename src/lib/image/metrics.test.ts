import { describe, expect, it } from "vitest";
import { makeTestImage } from "@/lib/test-utils/fixtures";
import { cloneDecodedImage } from "@/lib/image/canvas";
import {
  ImageDimensionMismatchError,
  meanSquaredError,
  modifiedChannelCount,
  peakSignalToNoiseRatio,
  structuralSimilarity,
} from "./metrics";

describe("meanSquaredError", () => {
  it("is zero for identical images", () => {
    const image = makeTestImage(8, 8, 1);
    expect(meanSquaredError(image, cloneDecodedImage(image))).toBe(0);
  });

  it("reflects a known per-channel offset", () => {
    const a = makeTestImage(4, 4, 2);
    const b = cloneDecodedImage(a);
    for (let i = 0; i < b.data.length; i += 4) {
      b.data[i] = Math.min(255, b.data[i] + 2);
    }
    // Only the R channel changed, by 2, across 1/3 of the compared sub-pixels.
    const expected = (2 * 2) / 3;
    expect(meanSquaredError(a, b)).toBeCloseTo(expected, 5);
  });

  it("throws on dimension mismatch", () => {
    const a = makeTestImage(4, 4, 1);
    const b = makeTestImage(5, 5, 1);
    expect(() => meanSquaredError(a, b)).toThrow(ImageDimensionMismatchError);
  });
});

describe("peakSignalToNoiseRatio", () => {
  it("is Infinity for identical images", () => {
    const image = makeTestImage(8, 8, 3);
    expect(peakSignalToNoiseRatio(image, cloneDecodedImage(image))).toBe(Infinity);
  });

  it("decreases as distortion increases", () => {
    const a = makeTestImage(8, 8, 4);
    const bSmall = cloneDecodedImage(a);
    bSmall.data[0] = (bSmall.data[0] + 1) % 256;
    const bLarge = cloneDecodedImage(a);
    for (let i = 0; i < bLarge.data.length; i += 4) {
      bLarge.data[i] = (bLarge.data[i] + 50) % 256;
    }
    const psnrSmall = peakSignalToNoiseRatio(a, bSmall);
    const psnrLarge = peakSignalToNoiseRatio(a, bLarge);
    expect(psnrSmall).toBeGreaterThan(psnrLarge);
  });
});

describe("modifiedChannelCount", () => {
  it("is zero for identical images", () => {
    const image = makeTestImage(6, 6, 5);
    expect(modifiedChannelCount(image, cloneDecodedImage(image))).toBe(0);
  });

  it("counts exactly the sub-pixels that differ", () => {
    const a = makeTestImage(4, 4, 6);
    const b = cloneDecodedImage(a);
    b.data[0] = (b.data[0] + 1) % 256; // R of pixel 0
    b.data[5] = (b.data[5] + 1) % 256; // G of pixel 1
    expect(modifiedChannelCount(a, b)).toBe(2);
  });
});

describe("structuralSimilarity", () => {
  it("is 1 for identical images", () => {
    const image = makeTestImage(8, 8, 7);
    expect(structuralSimilarity(image, cloneDecodedImage(image))).toBeCloseTo(1, 5);
  });

  it("decreases for a visibly distorted image", () => {
    const a = makeTestImage(16, 16, 8);
    const b = cloneDecodedImage(a);
    for (let i = 0; i < b.data.length; i += 4) {
      b.data[i] = 255 - b.data[i];
      b.data[i + 1] = 255 - b.data[i + 1];
      b.data[i + 2] = 255 - b.data[i + 2];
    }
    expect(structuralSimilarity(a, b)).toBeLessThan(0.5);
  });
});
