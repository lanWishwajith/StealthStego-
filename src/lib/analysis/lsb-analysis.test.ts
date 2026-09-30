import { describe, expect, it } from "vitest";
import type { DecodedImage } from "@/types/image";
import { computeLsbDistribution } from "./lsb-analysis";

describe("computeLsbDistribution", () => {
  it("reports all-zero LSBs for even channel values", () => {
    const width = 4;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      data[x * 4] = 10;
      data[x * 4 + 1] = 20;
      data[x * 4 + 2] = 30;
      data[x * 4 + 3] = 255;
    }
    const image: DecodedImage = { width, height, data };
    const result = computeLsbDistribution(image);
    expect(result.oneCount).toBe(0);
    expect(result.zeroCount).toBe(width * height * 3);
    expect(result.oneRatio).toBe(0);
  });

  it("reports a 0.5 ratio for an evenly split channel population", () => {
    const width = 4;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      const value = x % 2 === 0 ? 10 : 11;
      data[x * 4] = value;
      data[x * 4 + 1] = value;
      data[x * 4 + 2] = value;
      data[x * 4 + 3] = 255;
    }
    const image: DecodedImage = { width, height, data };
    const result = computeLsbDistribution(image);
    expect(result.oneRatio).toBeCloseTo(0.5, 5);
  });
});
