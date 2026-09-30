import type { DecodedImage } from "@/types/image";

export interface LsbDistribution {
  /** Count of RGB sub-pixel values with LSB = 0. */
  zeroCount: number;
  /** Count of RGB sub-pixel values with LSB = 1. */
  oneCount: number;
  /** Fraction of sampled bits equal to 1; an unbiased LSB channel is close to 0.5. */
  oneRatio: number;
}

/**
 * Tallies the least-significant bit across all RGB channels. Natural
 * (unmodified) images are typically not perfectly balanced, but sequential
 * LSB embedding of encrypted (high-entropy) data pushes the ratio sharply
 * toward 0.5, which is the statistical fingerprint steganalysis looks for.
 */
export function computeLsbDistribution(image: DecodedImage): LsbDistribution {
  const pixelCount = image.width * image.height;
  let oneCount = 0;
  const totalBits = pixelCount * 3;
  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4;
    oneCount += image.data[base] & 1;
    oneCount += image.data[base + 1] & 1;
    oneCount += image.data[base + 2] & 1;
  }
  return {
    zeroCount: totalBits - oneCount,
    oneCount,
    oneRatio: totalBits === 0 ? 0 : oneCount / totalBits,
  };
}
