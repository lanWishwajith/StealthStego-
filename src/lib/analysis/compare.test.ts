import { describe, expect, it } from "vitest";
import { makeTestImage } from "@/lib/test-utils/fixtures";
import { cloneDecodedImage } from "@/lib/image/canvas";
import { compareImages } from "./compare";

describe("compareImages", () => {
  it("reports no disturbance between identical images", () => {
    const original = makeTestImage(16, 16, 42);
    const stego = cloneDecodedImage(original);
    const report = compareImages(original, stego);

    expect(report.mse).toBe(0);
    expect(report.psnr).toBe(Infinity);
    expect(report.ssim).toBeCloseTo(1, 5);
    expect(report.modifiedChannels).toBe(0);
    expect(report.modifiedChannelPercent).toBe(0);
    expect(report.originalEntropy).toBeCloseTo(report.stegoEntropy, 5);
  });

  it("detects a known number of modified channels", () => {
    const original = makeTestImage(8, 8, 7);
    const stego = cloneDecodedImage(original);
    stego.data[0] ^= 1; // flip LSB of pixel 0's R channel
    stego.data[4] ^= 1; // flip LSB of pixel 1's R channel

    const report = compareImages(original, stego);
    expect(report.modifiedChannels).toBe(2);
    expect(report.histograms.r.reduce((a, b) => a + b, 0)).toBe(64);
  });
});
