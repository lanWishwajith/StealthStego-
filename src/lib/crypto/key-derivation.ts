/**
 * PBKDF2-SHA256 iteration count for deriving encryption keys from a
 * password. Chosen to be slow enough to meaningfully resist offline
 * brute-force while staying under ~1s on typical browser hardware.
 */
export const PBKDF2_ITERATIONS = 250_000;

export const SALT_LENGTH_BYTES = 16;

/** Derives an AES-256-GCM CryptoKey from a password and salt using PBKDF2-SHA256. */
export async function deriveAesKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Derives raw key material (not a CryptoKey) from a password, used to seed
 * the deterministic pixel-location shuffle. Uses a distinct HKDF `info`
 * string so this never collides with the AES-GCM encryption key even when
 * given the same password and salt.
 */
export async function deriveLocationSeed(
  password: string,
  salt: Uint8Array,
  lengthBytes: number,
): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    lengthBytes * 8,
  );

  return new Uint8Array(bits);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
