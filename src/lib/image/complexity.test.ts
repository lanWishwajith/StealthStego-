import { describe, expect, it } from "vitest";
import type { DecodedImage } from "@/types/image";
import { computeComplexityMap } from "./complexity";

function makeFlatImage(width: number, height: number, value: number): DecodedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

function makeVerticalEdgeImage(width: number, height: number): DecodedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const half = Math.floor(width / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = x < half ? 0 : 255;
      const idx = (y * width + x) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("computeComplexityMap", () => {
  it("assigns zero complexity to a perfectly flat image", () => {
    const image = makeFlatImage(20, 20, 128);
    const complexity = computeComplexityMap(image);

    for (const value of complexity) {
      expect(value).toBe(0);
    }
  });

  it("assigns higher complexity near a hard edge than far from it", () => {
    const image = makeVerticalEdgeImage(40, 10);
    const complexity = computeComplexityMap(image);

    const edgeX = 20;
    const farX = 5;
    const y = 5;

    const edgeScore = complexity[y * 40 + edgeX];
    const farScore = complexity[y * 40 + farX];

    expect(edgeScore).toBeGreaterThan(farScore);
  });

  it("normalizes scores into [0, 1]", () => {
    const image = makeVerticalEdgeImage(30, 30);
    const complexity = computeComplexityMap(image);

    for (const value of complexity) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...complexity)).toBeCloseTo(1, 5);
  });
});
