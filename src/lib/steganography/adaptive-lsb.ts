import type { DecodedImage, RgbChannel } from "@/types/image";
import { cloneDecodedImage } from "@/lib/image/canvas";
import { computeComplexityMap } from "@/lib/image/complexity";
import { deriveLocationSeed } from "@/lib/crypto/key-derivation";
import { generateLocationOrder, type ChannelLocation } from "./pixel-selection";
import { totalCandidateChannels } from "./capacity";

export class AdaptiveLsbCapacityError extends Error {
  constructor(requiredBits: number, availableBits: number) {
    super(
      `Payload requires ${requiredBits} channel bits but only ${availableBits} are available.`,
    );
    this.name = "AdaptiveLsbCapacityError";
  }
}

export class AdaptiveLsbDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdaptiveLsbDecodeError";
  }
}

/**
 * --- Header discovery design ---
 *
 * The decoder needs to know exactly how many bits to extract before it
 * has parsed anything, but it cannot derive a payload-specific location
 * seed until it has read the random salt that lives *inside* the payload
 * container -- a chicken-and-egg problem.
 *
 * We break the circularity with a two-tier scheme that uses a single,
 * password-only-derived location sequence (no random salt involved) to
 * place a tiny bootstrap header, and reuses that same fixed sequence's
 * *continuation* to place the actual payload container:
 *
 * 1. Location seed — derived once from the password and a fixed,
 *    well-known application-level constant (`BOOTSTRAP_SALT`). Without
 *    the correct password, an attacker cannot reproduce this sequence at
 *    all, so they cannot even locate the length header, let alone the
 *    ciphertext that follows.
 *
 * 2. Bootstrap header (first 32 bits of the sequence) — stores only the
 *    big-endian byte length of the payload container. No plaintext
 *    secret data is stored here, only a length.
 *
 * 3. Payload body (next `length * 8` bits of the *same* sequence) —
 *    the full versioned payload container (magic, version, flags,
 *    random salt, random IV, AES-GCM ciphertext+tag). The random salt
 *    and IV inside this container are what actually randomize the
 *    encryption; reusing one password-derived location sequence per
 *    image is safe because the *content* written to it (the ciphertext)
 *    still differs per-message thanks to that random salt/IV, and the
 *    location sequence itself is only ever reproducible by someone who
 *    already knows the password.
 *
 * Both the bootstrap and payload bits are drawn from the same
 * content-adaptive candidate pool (see below), so bits preferentially
 * land in high-complexity image regions rather than flat ones.
 */
const BOOTSTRAP_SALT = new TextEncoder().encode("StealthStego-Bootstrap-Salt-v1");
const BOOTSTRAP_HEADER_BYTES = 4; // big-endian payload container length
const BOOTSTRAP_HEADER_BITS = BOOTSTRAP_HEADER_BYTES * 8;

/**
 * Fraction of the highest-complexity candidate channels to consider
 * eligible for embedding. Restricting to the top fraction is what makes
 * embedding "content-adaptive" -- flat regions (skies, solid
 * backgrounds) are excluded from the candidate pool entirely, rather
 * than merely de-prioritized, so they never carry payload bits.
 */
const DEFAULT_COMPLEXITY_KEEP_FRACTION = 0.5;

export interface AdaptiveEncodeOptions {
  /** Fraction (0, 1] of highest-complexity channels eligible for embedding. */
  complexityKeepFraction?: number;
}

export interface AdaptiveEncodeResult {
  image: DecodedImage;
  /** Number of RGB channels actually eligible for embedding after complexity filtering. */
  eligibleChannels: number;
  /** Number of channel bits actually modified (bootstrap + payload). */
  modifiedBits: number;
}

/**
 * Secure Adaptive LSB encoder. Embeds an already-serialized payload
 * container (see `payload.ts`) using content-adaptive, password-keyed
 * location selection.
 */
export async function adaptiveLsbEncode(
  image: DecodedImage,
  serializedPayload: Uint8Array,
  password: string,
  options: AdaptiveEncodeOptions = {},
): Promise<AdaptiveEncodeResult> {
  const keepFraction = options.complexityKeepFraction ?? DEFAULT_COMPLEXITY_KEEP_FRACTION;
  const candidates = selectEligibleCandidates(image, keepFraction);

  const requiredBits = BOOTSTRAP_HEADER_BITS + serializedPayload.length * 8;
  if (requiredBits > candidates.length) {
    throw new AdaptiveLsbCapacityError(requiredBits, candidates.length);
  }

  const locationSeed = await deriveLocationSeed(password, BOOTSTRAP_SALT, 32);
  const order = generateLocationOrder(candidates, locationSeed);

  const bootstrapLocations = order.slice(0, BOOTSTRAP_HEADER_BITS);
  const payloadLocations = order.slice(
    BOOTSTRAP_HEADER_BITS,
    BOOTSTRAP_HEADER_BITS + serializedPayload.length * 8,
  );

  const output = cloneDecodedImage(image);

  writeBits(output, bootstrapLocations, uint32ToBits(serializedPayload.length));
  writeBits(output, payloadLocations, bytesToBits(serializedPayload));

  return {
    image: output,
    eligibleChannels: candidates.length,
    modifiedBits: bootstrapLocations.length + payloadLocations.length,
  };
}

/**
 * Secure Adaptive LSB decoder counterpart to {@link adaptiveLsbEncode}.
 * Reproduces the same password-keyed location sequence to first recover
 * the payload length, then the serialized payload container itself.
 */
export async function adaptiveLsbDecode(
  image: DecodedImage,
  password: string,
  options: AdaptiveEncodeOptions = {},
): Promise<Uint8Array> {
  const keepFraction = options.complexityKeepFraction ?? DEFAULT_COMPLEXITY_KEEP_FRACTION;
  const candidates = selectEligibleCandidates(image, keepFraction);

  if (candidates.length < BOOTSTRAP_HEADER_BITS) {
    throw new AdaptiveLsbDecodeError("Image is too small to contain a StealthStego payload.");
  }

  const locationSeed = await deriveLocationSeed(password, BOOTSTRAP_SALT, 32);
  const order = generateLocationOrder(candidates, locationSeed);

  const bootstrapLocations = order.slice(0, BOOTSTRAP_HEADER_BITS);
  const payloadLength = bitsToUint32(readBits(image, bootstrapLocations));

  const requiredBits = BOOTSTRAP_HEADER_BITS + payloadLength * 8;
  if (requiredBits > order.length) {
    throw new AdaptiveLsbDecodeError("Declared payload length exceeds available image data.");
  }

  const payloadLocations = order.slice(BOOTSTRAP_HEADER_BITS, requiredBits);
  return bitsToBytes(readBits(image, payloadLocations));
}

/**
 * Builds the content-adaptive candidate pool: RGB channels belonging to
 * the top `keepFraction` most complex pixels. The pixel ranking itself
 * depends only on public image content (not the password), so both
 * encoder and decoder reconstruct the identical pool; the *order* within
 * it is then password-keyed by {@link generateLocationOrder}.
 */
function selectEligibleCandidates(
  image: DecodedImage,
  keepFraction: number,
): ChannelLocation[] {
  const complexity = computeComplexityMap(image);
  const pixelCount = image.width * image.height;

  const pixelIndices = Array.from({ length: pixelCount }, (_, i) => i);
  pixelIndices.sort((a, b) => complexity[b] - complexity[a]);

  const keepCount = Math.max(1, Math.floor(pixelCount * keepFraction));
  const eligiblePixels = new Set(pixelIndices.slice(0, keepCount));

  const candidates: ChannelLocation[] = [];
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    if (!eligiblePixels.has(pixel)) continue;
    for (let channel = 0; channel < 3; channel++) {
      candidates.push({ pixelIndex: pixel, channel: channel as RgbChannel });
    }
  }
  return candidates;
}

function writeBits(image: DecodedImage, locations: ChannelLocation[], bits: number[]): void {
  for (let i = 0; i < locations.length; i++) {
    const { pixelIndex, channel } = locations[i];
    const base = pixelIndex * 4 + channel;
    image.data[base] = (image.data[base] & 0xfe) | bits[i];
  }
}

function readBits(image: DecodedImage, locations: ChannelLocation[]): number[] {
  const bits = new Array<number>(locations.length);
  for (let i = 0; i < locations.length; i++) {
    const { pixelIndex, channel } = locations[i];
    const base = pixelIndex * 4 + channel;
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

function uint32ToBits(value: number): number[] {
  const bits = new Array<number>(32);
  for (let b = 0; b < 32; b++) {
    bits[b] = (value >>> (31 - b)) & 1;
  }
  return bits;
}

function bitsToUint32(bits: number[]): number {
  let value = 0;
  for (let b = 0; b < 32; b++) {
    value = value * 2 + bits[b];
  }
  return value >>> 0;
}

/** Re-exported so callers only need this module for capacity-aware UI hints. */
export { totalCandidateChannels };
