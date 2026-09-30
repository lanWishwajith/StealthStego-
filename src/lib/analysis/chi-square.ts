import type { DecodedImage } from "@/types/image";
import { computeHistogram } from "./histogram";

export interface ChiSquareResult {
  /** Chi-square statistic over Pairs-of-Values (POV) buckets 2k / 2k+1. */
  statistic: number;
  /** Degrees of freedom (number of POV pairs with non-zero expected count). */
  degreesOfFreedom: number;
}

/**
 * Chi-square Pairs-of-Values test (Westfeld & Pfitzmann), a classic LSB
 * steganalysis technique. Sequential LSB embedding tends to equalize the
 * counts within each even/odd value pair (2k, 2k+1), producing a low
 * chi-square statistic relative to the pair's expected (averaged) count.
 * A low statistic across many pairs is suggestive of LSB embedding; it is
 * not proof, since natural images can also produce low values locally.
 */
export function chiSquarePairsOfValues(
  image: DecodedImage,
  channel: 0 | 1 | 2,
): ChiSquareResult {
  const histogram = computeHistogram(image, channel);
  let statistic = 0;
  let degreesOfFreedom = 0;

  for (let k = 0; k < 128; k++) {
    const even = histogram[2 * k];
    const odd = histogram[2 * k + 1];
    const expected = (even + odd) / 2;
    if (expected === 0) continue;
    statistic += (even - expected) ** 2 / expected;
    degreesOfFreedom++;
  }

  return { statistic, degreesOfFreedom };
}
