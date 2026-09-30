import type { DecodedImage } from "@/types/image";

/** Builds a deterministic synthetic image for unit tests (no browser required). */
export function makeTestImage(width: number, height: number, seed = 1): DecodedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let state = seed;
  for (let i = 0; i < width * height; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const r = state & 0xff;
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const g = state & 0xff;
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const b = state & 0xff;
    const base = i * 4;
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = 255;
  }
  return { width, height, data };
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
