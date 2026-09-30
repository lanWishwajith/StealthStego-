import { describe, expect, it } from "vitest";
import { makeTestImage } from "@/lib/test-utils/fixtures";
import { encodeMessage, decodeMessage, StegoDecodeError, StegoEncodeError } from "./workflow";

describe("encodeMessage / decodeMessage (naive)", () => {
  it("round-trips a message", async () => {
    const image = makeTestImage(48, 48);
    const { image: stego } = await encodeMessage({
      image,
      message: "Hello, StealthStego!",
      password: "correct-password",
      method: "naive",
      compress: false,
    });

    const result = await decodeMessage({ image: stego, password: "correct-password", method: "naive" });
    expect(result.message).toBe("Hello, StealthStego!");
  });

  it("fails with the wrong password", async () => {
    const image = makeTestImage(48, 48);
    const { image: stego } = await encodeMessage({
      image,
      message: "secret",
      password: "right",
      method: "naive",
      compress: false,
    });

    await expect(
      decodeMessage({ image: stego, password: "wrong", method: "naive" }),
    ).rejects.toThrow(StegoDecodeError);
  });

  it("rejects decoding an image with no payload", async () => {
    const image = makeTestImage(32, 32);
    await expect(
      decodeMessage({ image, password: "any", method: "naive" }),
    ).rejects.toThrow(StegoDecodeError);
  });
});

describe("encodeMessage / decodeMessage (adaptive)", () => {
  it("round-trips a message", async () => {
    const image = makeTestImage(64, 64);
    const { image: stego } = await encodeMessage({
      image,
      message: "Adaptive embedding works end to end.",
      password: "correct-password",
      method: "adaptive",
      compress: false,
    });

    const result = await decodeMessage({
      image: stego,
      password: "correct-password",
      method: "adaptive",
    });
    expect(result.message).toBe("Adaptive embedding works end to end.");
  });

  it("round-trips a compressed message", async () => {
    const image = makeTestImage(64, 64);
    const message = "repeat ".repeat(50);
    const { image: stego, summary } = await encodeMessage({
      image,
      message,
      password: "password",
      method: "adaptive",
      compress: true,
    });

    const result = await decodeMessage({ image: stego, password: "password", method: "adaptive" });
    expect(result.message).toBe(message);
    // Compression may or may not have engaged depending on environment support,
    // but if it did, the decoder must report the same flag.
    expect(result.compressed).toBe(summary.compressed);
  });
});

describe("encodeMessage validation", () => {
  it("rejects an empty message", async () => {
    const image = makeTestImage(16, 16);
    await expect(
      encodeMessage({ image, message: "", password: "pw", method: "naive", compress: false }),
    ).rejects.toThrow(StegoEncodeError);
  });

  it("rejects an empty password", async () => {
    const image = makeTestImage(16, 16);
    await expect(
      encodeMessage({ image, message: "hi", password: "", method: "naive", compress: false }),
    ).rejects.toThrow(StegoEncodeError);
  });

  it("rejects a message that exceeds capacity", async () => {
    const image = makeTestImage(4, 4);
    await expect(
      encodeMessage({
        image,
        message: "x".repeat(1000),
        password: "pw",
        method: "naive",
        compress: false,
      }),
    ).rejects.toThrow(StegoEncodeError);
  });
});
