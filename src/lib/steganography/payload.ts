/**
 * StealthStego versioned binary payload container.
 *
 * Layout (all multi-byte integers big-endian):
 *
 * | Field            | Bytes | Notes                                   |
 * |------------------|-------|------------------------------------------|
 * | Magic            | 4     | ASCII "SSTG"                             |
 * | Version          | 1     | Format version, currently 1              |
 * | Flags            | 1     | Bit 0: payload is compressed             |
 * | Salt length      | 1     | PBKDF2 salt length in bytes              |
 * | Salt             | N     | Random salt used for key derivation      |
 * | IV length         | 1     | AES-GCM IV length in bytes               |
 * | IV                | N     | Random AES-GCM initialization vector     |
 * | Ciphertext length | 4     | Length of the AES-GCM ciphertext+tag     |
 * | Ciphertext        | N     | AES-256-GCM ciphertext (includes tag)    |
 *
 * The container never stores the password. AES-GCM's authentication tag
 * (bundled inside "Ciphertext") is what lets the decoder detect a wrong
 * password or tampered/corrupted data.
 */

export const PAYLOAD_MAGIC = "SSTG";
export const PAYLOAD_VERSION = 1;

export const PayloadFlags = {
  COMPRESSED: 0b0000_0001,
} as const;

export class PayloadFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadFormatError";
  }
}

export interface PayloadContainer {
  version: number;
  compressed: boolean;
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface SerializePayloadInput {
  compressed: boolean;
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

/** Serializes an encrypted payload into the StealthStego binary container format. */
export function serializePayload(input: SerializePayloadInput): Uint8Array {
  const magicBytes = new TextEncoder().encode(PAYLOAD_MAGIC);
  const flags = input.compressed ? PayloadFlags.COMPRESSED : 0;

  const totalLength =
    magicBytes.length +
    1 + // version
    1 + // flags
    1 + // salt length
    input.salt.length +
    1 + // iv length
    input.iv.length +
    4 + // ciphertext length
    input.ciphertext.length;

  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  buffer.set(magicBytes, offset);
  offset += magicBytes.length;

  buffer[offset++] = PAYLOAD_VERSION;
  buffer[offset++] = flags;

  buffer[offset++] = input.salt.length;
  buffer.set(input.salt, offset);
  offset += input.salt.length;

  buffer[offset++] = input.iv.length;
  buffer.set(input.iv, offset);
  offset += input.iv.length;

  writeUint32BE(buffer, offset, input.ciphertext.length);
  offset += 4;
  buffer.set(input.ciphertext, offset);
  offset += input.ciphertext.length;

  return buffer;
}

/** Parses and validates a StealthStego binary payload container. */
export function parsePayload(bytes: Uint8Array): PayloadContainer {
  const magicBytes = new TextEncoder().encode(PAYLOAD_MAGIC);
  requireLength(bytes, magicBytes.length, "magic value");
  for (let i = 0; i < magicBytes.length; i++) {
    if (bytes[i] !== magicBytes[i]) {
      throw new PayloadFormatError("Data does not contain a recognized StealthStego payload.");
    }
  }
  let offset = magicBytes.length;

  requireLength(bytes, offset + 2, "version/flags header");
  const version = bytes[offset++];
  if (version !== PAYLOAD_VERSION) {
    throw new PayloadFormatError(`Unsupported StealthStego payload version: ${version}.`);
  }
  const flags = bytes[offset++];
  const compressed = (flags & PayloadFlags.COMPRESSED) !== 0;

  requireLength(bytes, offset + 1, "salt length");
  const saltLength = bytes[offset++];
  requireLength(bytes, offset + saltLength, "salt");
  const salt = bytes.slice(offset, offset + saltLength);
  offset += saltLength;

  requireLength(bytes, offset + 1, "IV length");
  const ivLength = bytes[offset++];
  requireLength(bytes, offset + ivLength, "IV");
  const iv = bytes.slice(offset, offset + ivLength);
  offset += ivLength;

  requireLength(bytes, offset + 4, "ciphertext length");
  const ciphertextLength = readUint32BE(bytes, offset);
  offset += 4;
  requireLength(bytes, offset + ciphertextLength, "ciphertext");
  const ciphertext = bytes.slice(offset, offset + ciphertextLength);

  return { version, compressed, salt, iv, ciphertext };
}

function requireLength(bytes: Uint8Array, minLength: number, fieldName: string): void {
  if (bytes.length < minLength) {
    throw new PayloadFormatError(`Payload is truncated: missing ${fieldName}.`);
  }
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
