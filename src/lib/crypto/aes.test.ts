import { describe, expect, it } from "vitest";
import { encryptWithPassword, decryptWithPassword, DecryptionError } from "./aes";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("encryptWithPassword / decryptWithPassword", () => {
  it("decrypts to the original plaintext with the correct password", async () => {
    const plaintext = encoder.encode("The secret is hidden in plain sight.");
    const payload = await encryptWithPassword(plaintext, "correct horse battery staple");

    const decrypted = await decryptWithPassword(payload, "correct horse battery staple");

    expect(decoder.decode(decrypted)).toBe(decoder.decode(plaintext));
  });

  it("fails to decrypt with the wrong password", async () => {
    const plaintext = encoder.encode("top secret");
    const payload = await encryptWithPassword(plaintext, "right-password");

    await expect(decryptWithPassword(payload, "wrong-password")).rejects.toThrow(
      DecryptionError,
    );
  });

  it("fails authentication when ciphertext is modified", async () => {
    const plaintext = encoder.encode("tamper test");
    const payload = await encryptWithPassword(plaintext, "password123");

    const tampered = {
      ...payload,
      ciphertext: payload.ciphertext.map((byte, i) =>
        i === 0 ? byte ^ 0xff : byte,
      ),
    };

    await expect(decryptWithPassword(tampered, "password123")).rejects.toThrow(
      DecryptionError,
    );
  });

  it("generates a different salt and IV on every call", async () => {
    const plaintext = encoder.encode("same message");
    const a = await encryptWithPassword(plaintext, "password");
    const b = await encryptWithPassword(plaintext, "password");

    expect(a.salt).not.toEqual(b.salt);
    expect(a.iv).not.toEqual(b.iv);
  });
});
