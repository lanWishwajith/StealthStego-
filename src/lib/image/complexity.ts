import type { DecodedImage } from "@/types/image";

/**
 * Per-pixel content complexity score in [0, 1], where higher values mean
 * more local texture/edges/noise (good places to hide data) and lower
 * values mean flat, smooth regions (skies, solid backgrounds -- bad
 * places to hide data, since changes are more statistically visible).
 */
export type ComplexityMap = Float32Array;

/**
 * Estimates local image complexity per pixel using gradient magnitude
 * over luminance, sampled from the 4-connected neighborhood (up, down,
 * left, right). This approximates edge strength and local variance
 * cheaply: flat regions produce near-zero gradients in every direction,
 * while edges/texture/noise produce large gradients in at least one
 * direction.
 *
 * Deliberately simple (no learned models) so it can be explained and
 * reproduced in an academic report.
 *
 * Luminance is computed from the top 7 bits of each channel (LSB
 * masked off) so the complexity ranking is invariant to the ±1 value
 * changes that LSB embedding itself introduces. Without this, encoding
 * could shift a pixel from "eligible" to "ineligible" near the
 * complexity cutoff, making the encoder and decoder disagree on the
 * candidate pool and silently corrupting the location sequence.
 */
export function computeComplexityMap(image: DecodedImage): ComplexityMap {
  const { width, height, data } = image;
  const luminance = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const base = i * 4;
    const r = data[base] & 0xfe;
    const g = data[base + 1] & 0xfe;
    const b = data[base + 2] & 0xfe;
    // ITU-R BT.601 luma coefficients.
    luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const complexity = new Float32Array(width * height);
  let maxGradient = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const left = luminance[idx - (x > 0 ? 1 : 0)];
      const right = luminance[idx + (x < width - 1 ? 1 : 0)];
      const up = luminance[idx - (y > 0 ? width : 0)];
      const down = luminance[idx + (y < height - 1 ? width : 0)];

      const dx = Math.abs(right - left);
      const dy = Math.abs(down - up);
      const gradient = Math.sqrt(dx * dx + dy * dy);

      complexity[idx] = gradient;
      if (gradient > maxGradient) maxGradient = gradient;
    }
  }

  if (maxGradient > 0) {
    for (let i = 0; i < complexity.length; i++) {
      complexity[i] = complexity[i] / maxGradient;
    }
  }

  return complexity;
}
