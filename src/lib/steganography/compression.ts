/**
 * Optional plaintext compression, applied before encryption. Uses the
 * browser's native CompressionStream when available and falls back to
 * storing the plaintext uncompressed otherwise -- the payload's
 * `compressed` flag records which happened so the decoder always knows
 * whether to reverse it.
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

export async function compressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = bytesToStream(bytes).pipeThrough(
    new CompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
  );
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function decompressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = bytesToStream(bytes).pipeThrough(
    new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
  );
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/**
 * Compresses `plaintext` if CompressionStream is supported and doing so
 * actually reduces size; otherwise returns the original bytes unchanged.
 * Short messages often compress *larger* due to gzip header/footer
 * overhead, so callers should trust the returned `compressed` flag
 * rather than assuming compression always applies.
 */
export async function maybeCompress(
  plaintext: Uint8Array,
): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  if (!isCompressionSupported()) {
    return { bytes: plaintext, compressed: false };
  }

  const compressed = await compressBytes(plaintext);
  if (compressed.length < plaintext.length) {
    return { bytes: compressed, compressed: true };
  }
  return { bytes: plaintext, compressed: false };
}
