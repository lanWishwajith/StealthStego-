import type { DecodedImage } from "@/types/image";
import { cloneDecodedImage } from "@/lib/image/canvas";
import { maxPayloadBytes } from "./capacity";

export class InsufficientCapacityError extends Error {
  constructor(requiredBytes: number, availableBytes: number) {
    super(
      `Payload requires ${requiredBytes} bytes but the image can only hold ${availableBytes} bytes.`,
    );
    this.name = "InsufficientCapacityError";
  }
}

export class NaiveLsbDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NaiveLsbDecodeError";
  }
}

/** Bytes used for the big-endian length prefix that precedes the payload. */
const LENGTH_PREFIX_BYTES = 4;

/**
 * Naive Sequential LSB — research baseline.
 *
 * Embeds a 32-bit big-endian length prefix followed by the payload bytes,
 * one bit per RGB channel, iterating pixels left-to-right/top-to-bottom
 * and skipping the alpha channel entirely. Intentionally simple so it can
 * be directly compared against the adaptive algorithm.
 */
export function naiveLsbEncode(image: DecodedImage, payload: Uint8Array): DecodedImage {
  const available = maxPayloadBytes(image);
  const required = payload.length + LENGTH_PREFIX_BYTES;
  if (required > available) {
    throw new InsufficientCapacityError(required, available);
  }

  const framed = frame(payload);
  const bits = bytesToBits(framed);
  const output = cloneDecodedImage(image);

  let bitIndex = 0;
  for (let pixel = 0; pixel < output.width * output.height && bitIndex < bits.length; pixel++) {
    const base = pixel * 4;
    for (let channel = 0; channel < 3 && bitIndex < bits.length; channel++) {
      const original = output.data[base + channel];
      output.data[base + channel] = setLsb(original, bits[bitIndex]);
      bitIndex++;
    }
  }

  return output;
}

/** Recovers the payload previously embedded by {@link naiveLsbEncode}. */
export function naiveLsbDecode(image: DecodedImage): Uint8Array {
  const totalChannels = image.width * image.height * 3;
  const headerBits = LENGTH_PREFIX_BYTES * 8;
  if (totalChannels < headerBits) {
    throw new NaiveLsbDecodeError("Image is too small to contain a StealthStego payload.");
  }

  const headerByteValues = extractBits(image, 0, headerBits);
  const lengthBytes = bitsToBytes(headerByteValues);
  const payloadLength = readUint32BE(lengthBytes, 0);

  const totalBits = headerBits + payloadLength * 8;
  if (totalBits > totalChannels) {
    throw new NaiveLsbDecodeError("Declared payload length exceeds available image data.");
  }

  const payloadBits = extractBits(image, headerBits, payloadLength * 8);
  return bitsToBytes(payloadBits);
}

function frame(payload: Uint8Array): Uint8Array {
  const framed = new Uint8Array(LENGTH_PREFIX_BYTES + payload.length);
  writeUint32BE(framed, 0, payload.length);
  framed.set(payload, LENGTH_PREFIX_BYTES);
  return framed;
}

function extractBits(image: DecodedImage, startBit: number, bitCount: number): number[] {
  const bits: number[] = new Array(bitCount);
  const startChannelIndex = startBit;
  for (let i = 0; i < bitCount; i++) {
    const channelIndex = startChannelIndex + i;
    const pixel = Math.floor(channelIndex / 3);
    const channel = channelIndex % 3;
    const base = pixel * 4 + channel;
    bits[i] = image.data[base] & 1;
  }
  return bits;
}

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = new Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    for (let b = 0; b < 8; b++) {
      bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
    }
  }
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const byteCount = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    let value = 0;
    for (let b = 0; b < 8; b++) {
      value = (value << 1) | bits[i * 8 + b];
    }
    bytes[i] = value;
  }
  return bytes;
}

function setLsb(value: number, bit: number): number {
  return (value & 0xfe) | bit;
}

function writeUint32BE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function readUint32BE(source: Uint8Array, offset: number): number {
  return (
    (source[offset] << 24) |
    (source[offset + 1] << 16) |
    (source[offset + 2] << 8) |
    source[offset + 3]
  ) >>> 0;
}
