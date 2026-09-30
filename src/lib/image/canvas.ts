import type { DecodedImage } from "@/types/image";

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

/**
 * Decodes an image File/Blob into raw RGBA pixel data via an offscreen
 * canvas. Works for any format the browser's <img> decoder supports
 * (PNG, JPEG, WebP, ...); callers are responsible for enforcing which
 * input formats are acceptable for a given workflow.
 */
export async function decodeImageFile(file: Blob): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(objectUrl);
    return imageElementToImageData(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new ImageDecodeError("The selected file could not be decoded as an image."));
    img.src = src;
  });
}

function imageElementToImageData(image: HTMLImageElement): DecodedImage {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new ImageDecodeError("Canvas 2D context is not available in this browser.");
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };
}

/** Encodes RGBA pixel data back into a PNG Blob via an offscreen canvas. */
export async function encodeImageToPng(image: DecodedImage): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageDecodeError("Canvas 2D context is not available in this browser.");
  }

  const imageData = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new ImageDecodeError("Failed to encode image as PNG."));
      }
    }, "image/png");
  });
}

/** Creates a data URL for previewing a decoded image without a round trip through Blob. */
export function decodedImageToDataUrl(image: DecodedImage): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageDecodeError("Canvas 2D context is not available in this browser.");
  }

  const imageData = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Deep-clones a decoded image so mutations don't affect the original pixel buffer. */
export function cloneDecodedImage(image: DecodedImage): DecodedImage {
  return {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
}
