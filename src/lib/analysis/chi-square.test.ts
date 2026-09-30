import { describe, expect, it } from "vitest";
import type { DecodedImage } from "@/types/image";
import { chiSquarePairsOfValues } from "./chi-square";

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

describe("chiSquarePairsOfValues", () => {
  it("is maximally skewed when a value has no paired-value sibling present", () => {
    // A perfectly constant channel puts every sample on one side of its
    // pair (even) and none on the other (odd) -- the most skewed case
    // possible, so the statistic equals the full sample count for that pair.
    const image = makeFlatImage(4, 4, 10);
    const result = chiSquarePairsOfValues(image, 0);
    expect(result.statistic).toBe(8);
    expect(result.degreesOfFreedom).toBe(1);
  });

  it("is near zero when even/odd pair counts are equalized (LSB-embedding-like)", () => {
    const width = 8;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      // Alternate between 10 and 11 evenly -> equalized pair (10, 11).
      const value = x % 2 === 0 ? 10 : 11;
      data[x * 4] = value;
      data[x * 4 + 3] = 255;
    }
    const image: DecodedImage = { width, height, data };
    const result = chiSquarePairsOfValues(image, 0);
    expect(result.statistic).toBeCloseTo(0, 5);
  });

  it("increases as a pair becomes more skewed", () => {
    function makeSkewedImage(evenCount: number, oddCount: number): DecodedImage {
      const width = evenCount + oddCount;
      const data = new Uint8ClampedArray(width * 4);
      for (let x = 0; x < evenCount; x++) data[x * 4] = 10;
      for (let x = evenCount; x < width; x++) data[x * 4] = 11;
      return { width, height: 1, data };
    }

    const mildlySkewed = chiSquarePairsOfValues(makeSkewedImage(6, 4), 0).statistic;
    const heavilySkewed = chiSquarePairsOfValues(makeSkewedImage(9, 1), 0).statistic;
    expect(heavilySkewed).toBeGreaterThan(mildlySkewed);
  });
});
