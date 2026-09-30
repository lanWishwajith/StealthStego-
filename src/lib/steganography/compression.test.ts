import { describe, expect, it } from "vitest";
import { compressBytes, decompressBytes, maybeCompress, isCompressionSupported } from "./compression";

describe("compression", () => {
  it("round-trips bytes through compress -> decompress", async () => {
    if (!isCompressionSupported()) return;
    const original = new TextEncoder().encode("a".repeat(500));
    const compressed = await compressBytes(original);
    const decompressed = await decompressBytes(compressed);
    expect(Array.from(decompressed)).toEqual(Array.from(original));
  });

  it("maybeCompress shrinks a highly repetitive payload", async () => {
    if (!isCompressionSupported()) return;
    const original = new TextEncoder().encode("repeat-me ".repeat(200));
    const { bytes, compressed } = await maybeCompress(original);
    expect(compressed).toBe(true);
    expect(bytes.length).toBeLessThan(original.length);
  });

  it("maybeCompress falls back to original bytes for tiny payloads", async () => {
    if (!isCompressionSupported()) return;
    const original = new TextEncoder().encode("hi");
    const { bytes, compressed } = await maybeCompress(original);
    if (!compressed) {
      expect(bytes).toEqual(original);
    }
  });
});
