import { describe, expect, it } from "vitest";
import type { DecodedImage } from "@/types/image";
import { shannonEntropy } from "./entropy";

function makeFlatImage(width: number, height: number, r: number, g: number, b: number): DecodedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const base = i * 4;
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = 255;
  }
  return { width, height, data };
}

describe("shannonEntropy", () => {
  it("is zero for a constant channel", () => {
    const image = makeFlatImage(4, 4, 100, 100, 100);
    expect(shannonEntropy(image, 0)).toBe(0);
  });

  it("is 8 bits for a channel uniformly distributed over all 256 values", () => {
    const width = 256;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      data[x * 4] = x;
      data[x * 4 + 3] = 255;
    }
    const image: DecodedImage = { width, height, data };
    expect(shannonEntropy(image, 0)).toBeCloseTo(8, 5);
  });

  it("is 1 bit for a channel split evenly between two values", () => {
    const width = 4;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      data[x * 4] = x % 2 === 0 ? 0 : 255;
      data[x * 4 + 3] = 255;
    }
    const image: DecodedImage = { width, height, data };
    expect(shannonEntropy(image, 0)).toBeCloseTo(1, 5);
  });
});
