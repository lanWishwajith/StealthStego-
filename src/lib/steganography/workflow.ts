import type { DecodedImage } from "@/types/image";
import type { EmbeddingMethod, EncodeSummary, DecodeSummary } from "@/types/steganography";
import { encryptWithPassword, decryptWithPassword, DecryptionError } from "@/lib/crypto/aes";
import { serializePayload, parsePayload, PayloadFormatError } from "./payload";
import { maybeCompress, decompressBytes, isCompressionSupported } from "./compression";
import { naiveLsbEncode, naiveLsbDecode, InsufficientCapacityError, NaiveLsbDecodeError } from "./naive-lsb";
import { adaptiveLsbEncode, adaptiveLsbDecode, AdaptiveLsbCapacityError, AdaptiveLsbDecodeError } from "./adaptive-lsb";
import { maxPayloadBytes, payloadDensity, totalCandidateChannels } from "./capacity";

export class StegoEncodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StegoEncodeError";
  }
}

export class StegoDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StegoDecodeError";
  }
}

export interface EncodeParams {
  image: DecodedImage;
  message: string;
  password: string;
  method: EmbeddingMethod;
  /** Attempt gzip compression before encryption. Ignored if unsupported by the browser. */
  compress: boolean;
}

export interface EncodeOutcome {
  image: DecodedImage;
  summary: EncodeSummary;
}

/**
 * Full Encode pipeline: UTF-8 -> optional compression -> AES-256-GCM
 * encryption -> payload container -> naive or adaptive LSB embedding.
 */
export async function encodeMessage(params: EncodeParams): Promise<EncodeOutcome> {
  const start = performance.now();

  if (params.message.length === 0) {
    throw new StegoEncodeError("Enter a message to hide before encoding.");
  }
  if (params.password.length === 0) {
    throw new StegoEncodeError("Enter a password to protect the message.");
  }

  const plaintext = new TextEncoder().encode(params.message);
  const { bytes: preEncryptionBytes, compressed } = params.compress
    ? await maybeCompress(plaintext)
    : { bytes: plaintext, compressed: false };

  const encrypted = await encryptWithPassword(preEncryptionBytes, params.password);
  const serialized = serializePayload({
    compressed,
    salt: encrypted.salt,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
  });

  const capacityBytes = maxPayloadBytes(params.image);

  try {
    if (params.method === "naive") {
      const output = naiveLsbEncode(params.image, serialized);
      const density = payloadDensity(params.image, serialized.length);
      return {
        image: output,
        summary: {
          method: "naive",
          imageWidth: params.image.width,
          imageHeight: params.image.height,
          payloadBytes: plaintext.length,
          serializedPayloadBytes: serialized.length,
          capacityBytes,
          payloadDensity: density,
          modifiedChannels: serialized.length * 8 + 32,
          processingTimeMs: performance.now() - start,
          compressed,
        },
      };
    }

    const { image, eligibleChannels, modifiedBits } = await adaptiveLsbEncode(
      params.image,
      serialized,
      params.password,
    );
    return {
      image,
      summary: {
        method: "adaptive",
        imageWidth: params.image.width,
        imageHeight: params.image.height,
        payloadBytes: plaintext.length,
        serializedPayloadBytes: serialized.length,
        capacityBytes: Math.floor(eligibleChannels / 8),
        payloadDensity: modifiedBits / totalCandidateChannels(params.image),
        modifiedChannels: modifiedBits,
        processingTimeMs: performance.now() - start,
        compressed,
      },
    };
  } catch (error) {
    if (error instanceof InsufficientCapacityError || error instanceof AdaptiveLsbCapacityError) {
      throw new StegoEncodeError(
        "The message is too large for this image at the selected embedding method. Try a shorter message or a larger image.",
      );
    }
    throw error;
  }
}

export interface DecodeParams {
  image: DecodedImage;
  password: string;
  method: EmbeddingMethod;
}

/**
 * Full Decode pipeline: LSB extraction -> payload container parsing ->
 * AES-256-GCM decryption -> optional decompression -> UTF-8 text.
 *
 * Error messages are deliberately generic about *why* decoding failed
 * (wrong password vs. corrupted data vs. no payload present are often
 * indistinguishable from the outside) to avoid leaking cryptographic
 * implementation details to the user.
 */
export async function decodeMessage(params: DecodeParams): Promise<DecodeSummary> {
  const start = performance.now();

  if (params.password.length === 0) {
    throw new StegoDecodeError("Enter the password used to encode this image.");
  }

  let serialized: Uint8Array;
  try {
    serialized =
      params.method === "naive"
        ? naiveLsbDecode(params.image)
        : await adaptiveLsbDecode(params.image, params.password);
  } catch (error) {
    if (
      error instanceof NaiveLsbDecodeError ||
      error instanceof AdaptiveLsbDecodeError
    ) {
      throw new StegoDecodeError(
        "No recognizable StealthStego payload was found in this image, or the image data is truncated.",
      );
    }
    throw error;
  }

  let container;
  try {
    container = parsePayload(serialized);
  } catch (error) {
    if (error instanceof PayloadFormatError) {
      throw new StegoDecodeError(
        "This image does not contain a recognized StealthStego payload, the payload version is unsupported, or it is corrupted.",
      );
    }
    throw error;
  }

  let plaintext: Uint8Array;
  try {
    plaintext = await decryptWithPassword(
      { salt: container.salt, iv: container.iv, ciphertext: container.ciphertext },
      params.password,
    );
  } catch (error) {
    if (error instanceof DecryptionError) {
      throw new StegoDecodeError("Incorrect password, or the payload has been corrupted.");
    }
    throw error;
  }

  if (container.compressed) {
    if (!isCompressionSupported()) {
      throw new StegoDecodeError(
        "This payload was compressed, but your browser does not support decompression.",
      );
    }
    plaintext = await decompressBytes(plaintext);
  }

  return {
    method: params.method,
    message: new TextDecoder().decode(plaintext),
    compressed: container.compressed,
    processingTimeMs: performance.now() - start,
  };
}
