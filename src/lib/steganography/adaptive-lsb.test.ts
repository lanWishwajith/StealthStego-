import { describe, expect, it } from "vitest";
import { makeTestImage, textToBytes, bytesToText } from "@/lib/test-utils/fixtures";
import {
  adaptiveLsbEncode,
  adaptiveLsbDecode,
  AdaptiveLsbCapacityError,
  AdaptiveLsbDecodeError,
} from "./adaptive-lsb";

describe("adaptiveLsbEncode / adaptiveLsbDecode", () => {
  it("recovers the exact serialized payload after encode -> decode", async () => {
    const image = makeTestImage(48, 48);
    const payload = textToBytes("A short serialized payload container.");

    const { image: stego } = await adaptiveLsbEncode(image, payload, "correct-password");
    const recovered = await adaptiveLsbDecode(stego, "correct-password");

    expect(bytesToText(recovered)).toBe(bytesToText(payload));
  });

  it("leaves the alpha channel unchanged", async () => {
    const image = makeTestImage(32, 32);
    const payload = textToBytes("hello world");

    const { image: stego } = await adaptiveLsbEncode(image, payload, "password");

    for (let i = 0; i < image.width * image.height; i++) {
      expect(stego.data[i * 4 + 3]).toBe(image.data[i * 4 + 3]);
    }
  });

  it("rejects payloads that exceed adaptive capacity", async () => {
    const image = makeTestImage(4, 4);
    const payload = new Uint8Array(1000);

    await expect(adaptiveLsbEncode(image, payload, "password")).rejects.toThrow(
      AdaptiveLsbCapacityError,
    );
  });

  it("fails to decode with the wrong password", async () => {
    const image = makeTestImage(48, 48);
    const payload = textToBytes("a secret payload of moderate length");

    const { image: stego } = await adaptiveLsbEncode(image, payload, "right-password");

    // Wrong password produces a garbage length header, which is
    // expected to either throw a decode error or, in the rare case the
    // garbage length happens to be small enough to be "valid", return
    // bytes that do not match the original payload.
    try {
      const recovered = await adaptiveLsbDecode(stego, "wrong-password");
      expect(bytesToText(recovered)).not.toBe(bytesToText(payload));
    } catch (error) {
      expect(error).toBeInstanceOf(AdaptiveLsbDecodeError);
    }
  });

  it("does not mutate the original image", async () => {
    const image = makeTestImage(32, 32);
    const original = new Uint8ClampedArray(image.data);
    await adaptiveLsbEncode(image, textToBytes("payload"), "password");
    expect(image.data).toEqual(original);
  });
});
