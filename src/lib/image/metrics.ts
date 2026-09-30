import type { DecodedImage } from "@/types/image";

export class ImageDimensionMismatchError extends Error {
  constructor() {
    super("Images must have identical dimensions to compare.");
    this.name = "ImageDimensionMismatchError";
  }
}

function assertSameDimensions(a: DecodedImage, b: DecodedImage): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new ImageDimensionMismatchError();
  }
}

/**
 * Mean Squared Error over RGB channels (alpha excluded, since embedding
 * never touches alpha and including it would dilute the signal).
 */
export function meanSquaredError(a: DecodedImage, b: DecodedImage): number {
  assertSameDimensions(a, b);
  const pixelCount = a.width * a.height;
  let sumSquaredError = 0;
  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4;
    for (let c = 0; c < 3; c++) {
      const diff = a.data[base + c] - b.data[base + c];
      sumSquaredError += diff * diff;
    }
  }
  return sumSquaredError / (pixelCount * 3);
}

/**
 * Peak Signal-to-Noise Ratio in decibels, derived from MSE. Higher values
 * indicate less distortion; identical images yield +Infinity.
 */
export function peakSignalToNoiseRatio(a: DecodedImage, b: DecodedImage): number {
  const mse = meanSquaredError(a, b);
  if (mse === 0) return Infinity;
  const MAX_PIXEL_VALUE = 255;
  return 10 * Math.log10((MAX_PIXEL_VALUE * MAX_PIXEL_VALUE) / mse);
}

/** Counts RGB (sub-pixel) channel values that differ between two images. */
export function modifiedChannelCount(a: DecodedImage, b: DecodedImage): number {
  assertSameDimensions(a, b);
  const pixelCount = a.width * a.height;
  let modified = 0;
  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4;
    for (let c = 0; c < 3; c++) {
      if (a.data[base + c] !== b.data[base + c]) modified++;
    }
  }
  return modified;
}

const SSIM_K1 = 0.01;
const SSIM_K2 = 0.03;
const SSIM_DYNAMIC_RANGE = 255;
const SSIM_C1 = (SSIM_K1 * SSIM_DYNAMIC_RANGE) ** 2;
const SSIM_C2 = (SSIM_K2 * SSIM_DYNAMIC_RANGE) ** 2;

function luma(data: Uint8ClampedArray, pixelIndex: number): number {
  const base = pixelIndex * 4;
  return (
    0.299 * data[base] + 0.587 * data[base + 1] + 0.114 * data[base + 2]
  );
}

/**
 * Global (single-window) Structural Similarity Index over luma, approximated
 * without the sliding 11x11 Gaussian window used by the reference
 * implementation. This trades local sensitivity for O(n) simplicity, which
 * is an acceptable approximation for a whole-image similarity summary in
 * this research tool.
 */
export function structuralSimilarity(a: DecodedImage, b: DecodedImage): number {
  assertSameDimensions(a, b);
  const pixelCount = a.width * a.height;
  if (pixelCount === 0) return 1;

  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < pixelCount; i++) {
    sumA += luma(a.data, i);
    sumB += luma(b.data, i);
  }
  const meanA = sumA / pixelCount;
  const meanB = sumB / pixelCount;

  let varA = 0;
  let varB = 0;
  let covariance = 0;
  for (let i = 0; i < pixelCount; i++) {
    const da = luma(a.data, i) - meanA;
    const db = luma(b.data, i) - meanB;
    varA += da * da;
    varB += db * db;
    covariance += da * db;
  }
  varA /= pixelCount;
  varB /= pixelCount;
  covariance /= pixelCount;

  const numerator = (2 * meanA * meanB + SSIM_C1) * (2 * covariance + SSIM_C2);
  const denominator =
    (meanA * meanA + meanB * meanB + SSIM_C1) * (varA + varB + SSIM_C2);
  return numerator / denominator;
}
