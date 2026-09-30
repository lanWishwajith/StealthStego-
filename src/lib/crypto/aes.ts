import { randomBytes } from "./random";
import { deriveAesKeyFromPassword, SALT_LENGTH_BYTES } from "./key-derivation";

export const IV_LENGTH_BYTES = 12;

export class DecryptionError extends Error {
  constructor() {
    super("Decryption failed: wrong password or corrupted data.");
    this.name = "DecryptionError";
  }
}

export interface EncryptedPayload {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

/**
 * Encrypts plaintext with AES-256-GCM using a key derived from `password`.
 * A fresh random salt and IV are generated for every call — IVs must never
 * be reused with the same key, and deriving a new key per encryption via a
 * fresh salt makes that guarantee trivial to uphold.
 */
export async function encryptWithPassword(
  plaintext: Uint8Array,
  password: string,
): Promise<EncryptedPayload> {
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const key = await deriveAesKeyFromPassword(password, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    salt,
    iv,
    ciphertext: new Uint8Array(ciphertextBuffer),
  };
}

/**
 * Decrypts a payload previously produced by {@link encryptWithPassword}.
 * AES-GCM's authentication tag verifies both the correct password was
 * supplied and the ciphertext was not tampered with; either failure
 * surfaces as {@link DecryptionError} without further detail.
 */
export async function decryptWithPassword(
  payload: EncryptedPayload,
  password: string,
): Promise<Uint8Array> {
  const key = await deriveAesKeyFromPassword(password, payload.salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(payload.iv) },
      key,
      toArrayBuffer(payload.ciphertext),
    );
    return new Uint8Array(plaintextBuffer);
  } catch {
    throw new DecryptionError();
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
