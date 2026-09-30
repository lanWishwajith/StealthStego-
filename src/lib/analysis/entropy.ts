import type { DecodedImage } from "@/types/image";

/**
 * Shannon entropy in bits, computed over the byte-value distribution of the
 * given channel across all pixels. Ranges from 0 (constant) to 8
 * (uniformly distributed byte values).
 */
export function shannonEntropy(image: DecodedImage, channel: 0 | 1 | 2): number {
  const pixelCount = image.width * image.height;
  if (pixelCount === 0) return 0;

  const counts = new Uint32Array(256);
  for (let i = 0; i < pixelCount; i++) {
    counts[image.data[i * 4 + channel]]++;
  }

  let entropy = 0;
  for (let v = 0; v < 256; v++) {
    if (counts[v] === 0) continue;
    const p = counts[v] / pixelCount;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Shannon entropy averaged across the R, G, and B channels. */
export function averageRgbEntropy(image: DecodedImage): number {
  return (
    (shannonEntropy(image, 0) + shannonEntropy(image, 1) + shannonEntropy(image, 2)) /
    3
  );
}
