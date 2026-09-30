import { describe, expect, it } from "vitest";
import { makeTestImage, textToBytes, bytesToText } from "@/lib/test-utils/fixtures";
import { naiveLsbEncode, naiveLsbDecode, InsufficientCapacityError } from "./naive-lsb";

describe("naiveLsbEncode / naiveLsbDecode", () => {
  it("recovers the exact payload after encode -> decode", () => {
    const image = makeTestImage(32, 32);
    const payload = textToBytes("The quick brown fox jumps over the lazy dog.");

    const stego = naiveLsbEncode(image, payload);
    const recovered = naiveLsbDecode(stego);

    expect(bytesToText(recovered)).toBe(bytesToText(payload));
  });

  it("leaves the alpha channel unchanged", () => {
    const image = makeTestImage(16, 16);
    const payload = textToBytes("hello");
    const stego = naiveLsbEncode(image, payload);

    for (let i = 0; i < image.width * image.height; i++) {
      expect(stego.data[i * 4 + 3]).toBe(image.data[i * 4 + 3]);
    }
  });

  it("rejects payloads that exceed image capacity", () => {
    const image = makeTestImage(4, 4);
    const payload = new Uint8Array(1000);

    expect(() => naiveLsbEncode(image, payload)).toThrow(InsufficientCapacityError);
  });

  it("handles an empty payload", () => {
    const image = makeTestImage(8, 8);
    const stego = naiveLsbEncode(image, new Uint8Array(0));
    const recovered = naiveLsbDecode(stego);
    expect(recovered.length).toBe(0);
  });

  it("does not mutate the original image", () => {
    const image = makeTestImage(16, 16);
    const original = new Uint8ClampedArray(image.data);
    naiveLsbEncode(image, textToBytes("payload"));
    expect(image.data).toEqual(original);
  });
});
