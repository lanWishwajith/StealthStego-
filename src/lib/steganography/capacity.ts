import type { DecodedImage } from "@/types/image";

/** RGB channels per pixel available for embedding (alpha is never used). */
const CHANNELS_PER_PIXEL = 3;

/** Total number of RGB channel values available for embedding in an image. */
export function totalCandidateChannels(image: DecodedImage): number {
  return image.width * image.height * CHANNELS_PER_PIXEL;
}

/** Maximum number of bytes that can be embedded at 1 bit per RGB channel. */
export function maxPayloadBytes(image: DecodedImage): number {
  return Math.floor(totalCandidateChannels(image) / 8);
}

/** Fraction (0–1) of available RGB channels a payload of `payloadBytes` would use. */
export function payloadDensity(image: DecodedImage, payloadBytes: number): number {
  const candidateChannels = totalCandidateChannels(image);
  if (candidateChannels === 0) return 0;
  return (payloadBytes * 8) / candidateChannels;
}

export type DensityLevel = "very-low" | "low" | "moderate" | "high";

/** Qualitative safety banding for payload density, shown to the user as a warning level. */
export function densityLevel(density: number): DensityLevel {
  if (density < 0.05) return "very-low";
  if (density < 0.15) return "low";
  if (density < 0.35) return "moderate";
  return "high";
}

export const DENSITY_LEVEL_LABELS: Record<DensityLevel, string> = {
  "very-low": "Very Low",
  low: "Low",
  moderate: "Moderate",
  high: "High",
};
