import type { DecodedImage } from "@/types/image";
import { meanSquaredError, modifiedChannelCount, peakSignalToNoiseRatio, structuralSimilarity } from "@/lib/image/metrics";
import { averageRgbEntropy } from "./entropy";
import { computeLsbDistribution } from "./lsb-analysis";
import { chiSquarePairsOfValues } from "./chi-square";
import { computeRgbHistograms, type RgbHistograms } from "./histogram";

export interface ImageComparisonReport {
  mse: number;
  psnr: number;
  ssim: number;
  modifiedChannels: number;
  modifiedChannelPercent: number;
  originalEntropy: number;
  stegoEntropy: number;
  lsbOneRatio: number;
  /** Average chi-square Pairs-of-Values statistic across R, G, B (lower can suggest LSB embedding). */
  chiSquareAverage: number;
  histograms: RgbHistograms;
}

/**
 * Runs the full statistical comparison suite between an original image and
 * a candidate stego image of identical dimensions. Pure/synchronous so it
 * can run on the main thread for typical research-scale images; callers
 * with very large images may want to defer this to a Web Worker.
 */
export function compareImages(original: DecodedImage, stego: DecodedImage): ImageComparisonReport {
  const modifiedChannels = modifiedChannelCount(original, stego);
  const totalChannels = original.width * original.height * 3;

  const chiR = chiSquarePairsOfValues(stego, 0).statistic;
  const chiG = chiSquarePairsOfValues(stego, 1).statistic;
  const chiB = chiSquarePairsOfValues(stego, 2).statistic;

  return {
    mse: meanSquaredError(original, stego),
    psnr: peakSignalToNoiseRatio(original, stego),
    ssim: structuralSimilarity(original, stego),
    modifiedChannels,
    modifiedChannelPercent: totalChannels === 0 ? 0 : modifiedChannels / totalChannels,
    originalEntropy: averageRgbEntropy(original),
    stegoEntropy: averageRgbEntropy(stego),
    lsbOneRatio: computeLsbDistribution(stego).oneRatio,
    chiSquareAverage: (chiR + chiG + chiB) / 3,
    histograms: computeRgbHistograms(stego),
  };
}
