"use client";

import { useEffect, useRef } from "react";
import type { DecodedImage } from "@/types/image";

interface BitPlaneViewerProps {
  image: DecodedImage;
  /** Bit position to visualize, 0 = least significant. */
  bitPosition: number;
  channel: 0 | 1 | 2;
}

/**
 * Renders a single bit plane of one RGB channel as black/white pixels.
 * The LSB plane (bitPosition 0) of a stego image typically looks like
 * uniform noise where embedding density is high, versus visible structure
 * in an unmodified image.
 */
export function BitPlaneViewer({ image, bitPosition, channel }: BitPlaneViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const output = ctx.createImageData(image.width, image.height);
    const mask = 1 << bitPosition;
    const pixelCount = image.width * image.height;
    for (let i = 0; i < pixelCount; i++) {
      const base = i * 4;
      const bit = (image.data[base + channel] & mask) !== 0 ? 255 : 0;
      output.data[base] = bit;
      output.data[base + 1] = bit;
      output.data[base + 2] = bit;
      output.data[base + 3] = 255;
    }
    ctx.putImageData(output, 0, 0);
  }, [image, bitPosition, channel]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded border border-border bg-black"
      aria-label={`Bit plane ${bitPosition} of channel ${channel}`}
    />
  );
}
