import { describe, expect, it } from "vitest";
import { serializePayload, parsePayload, PayloadFormatError, PAYLOAD_VERSION } from "./payload";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe("serializePayload / parsePayload", () => {
  it("round-trips a payload", () => {
    const salt = bytes(1, 2, 3, 4, 5, 6, 7, 8);
    const iv = bytes(9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 11, 12);
    const ciphertext = new Uint8Array(64).map((_, i) => i);

    const serialized = serializePayload({ compressed: true, salt, iv, ciphertext });
    const parsed = parsePayload(serialized);

    expect(parsed.version).toBe(PAYLOAD_VERSION);
    expect(parsed.compressed).toBe(true);
    expect(parsed.salt).toEqual(salt);
    expect(parsed.iv).toEqual(iv);
    expect(parsed.ciphertext).toEqual(ciphertext);
  });

  it("round-trips with compressed flag false", () => {
    const serialized = serializePayload({
      compressed: false,
      salt: bytes(1, 2),
      iv: bytes(3, 4),
      ciphertext: bytes(5, 6, 7),
    });
    const parsed = parsePayload(serialized);
    expect(parsed.compressed).toBe(false);
  });

  it("rejects data with an invalid magic value", () => {
    const bad = new TextEncoder().encode("NOPE-not-a-payload-at-all");
    expect(() => parsePayload(bad)).toThrow(PayloadFormatError);
  });

  it("rejects an unsupported version", () => {
    const serialized = serializePayload({
      compressed: false,
      salt: bytes(1),
      iv: bytes(2),
      ciphertext: bytes(3),
    });
    serialized[4] = 99; // version byte
    expect(() => parsePayload(serialized)).toThrow(/version/i);
  });

  it("rejects a truncated payload", () => {
    const serialized = serializePayload({
      compressed: false,
      salt: bytes(1, 2, 3, 4),
      iv: bytes(5, 6, 7, 8),
      ciphertext: new Uint8Array(32),
    });
    const truncated = serialized.slice(0, serialized.length - 10);
    expect(() => parsePayload(truncated)).toThrow(PayloadFormatError);
  });
});
