import type { DecodedImage, RgbChannel } from "@/types/image";

/** 256-bucket count of byte values for one RGB channel. */
export type ChannelHistogram = Uint32Array;

export function computeHistogram(image: DecodedImage, channel: RgbChannel): ChannelHistogram {
  const histogram = new Uint32Array(256);
  const pixelCount = image.width * image.height;
  for (let i = 0; i < pixelCount; i++) {
    histogram[image.data[i * 4 + channel]]++;
  }
  return histogram;
}

export interface RgbHistograms {
  r: ChannelHistogram;
  g: ChannelHistogram;
  b: ChannelHistogram;
}

export function computeRgbHistograms(image: DecodedImage): RgbHistograms {
  return {
    r: computeHistogram(image, 0),
    g: computeHistogram(image, 1),
    b: computeHistogram(image, 2),
  };
}
