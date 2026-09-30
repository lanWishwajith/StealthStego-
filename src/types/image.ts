/** Decoded raster image data plus its dimensions, ready for pixel manipulation. */
export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA byte data, 4 bytes per pixel, row-major. */
  data: Uint8ClampedArray;
}

export type RgbChannel = 0 | 1 | 2;

export const CHANNEL_LABELS: Record<RgbChannel, "R" | "G" | "B"> = {
  0: "R",
  1: "G",
  2: "B",
};
