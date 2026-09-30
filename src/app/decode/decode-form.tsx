"use client";

import { useState } from "react";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImagePreview } from "@/components/image-preview";
import { PasswordInput } from "@/components/password-input";
import { decodeImageFile, decodedImageToDataUrl } from "@/lib/image/canvas";
import { decodeMessage, StegoDecodeError } from "@/lib/steganography/workflow";
import type { DecodedImage } from "@/types/image";
import type { EmbeddingMethod, DecodeSummary } from "@/types/steganography";

interface LoadedImage {
  decoded: DecodedImage;
  previewUrl: string;
}

export function DecodeForm() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<EmbeddingMethod>("adaptive");

  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [result, setResult] = useState<DecodeSummary | null>(null);

  async function handleFileSelected(file: File) {
    setLoadError(null);
    setResult(null);
    setDecodeError(null);

    if (file.type !== "image/png") {
      setLoadError("Please select a PNG image produced by StealthStego's Encode page.");
      return;
    }

    try {
      const decoded = await decodeImageFile(file);
      const previewUrl = decodedImageToDataUrl(decoded);
      setLoaded({ decoded, previewUrl });
    } catch {
      setLoadError("This file could not be read as an image.");
    }
  }

  async function handleDecode() {
    if (!loaded) return;
    setIsDecoding(true);
    setDecodeError(null);
    setResult(null);

    try {
      const summary = await decodeMessage({
        image: loaded.decoded,
        password,
        method,
      });
      setResult(summary);
    } catch (error) {
      setDecodeError(
        error instanceof StegoDecodeError
          ? error.message
          : "Decoding failed unexpectedly. Please try again.",
      );
    } finally {
      setIsDecoding(false);
    }
  }

  const canDecode = Boolean(loaded) && password.length > 0 && !isDecoding;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <ImageDropzone
          label="Stego Image"
          onFileSelected={handleFileSelected}
          accept="image/png"
          helpText="Upload the PNG file produced by the Encode page."
          error={loadError}
        />

        {loaded && (
          <div className="mt-6">
            <ImagePreview
              label="Uploaded Image"
              src={loaded.previewUrl}
              width={loaded.decoded.width}
              height={loaded.decoded.height}
            />
          </div>
        )}
      </section>

      {loaded && (
        <section className="space-y-6 rounded-lg border border-border bg-surface p-6">
          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Enter the password used during encoding"
            autoComplete="current-password"
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Embedding Method</legend>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 has-[:checked]:border-accent-strong">
                <input
                  type="radio"
                  name="decode-method"
                  value="naive"
                  checked={method === "naive"}
                  onChange={() => setMethod("naive")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Naive Sequential LSB</span>
                  <span className="block text-xs text-muted">Use if this image was encoded with the baseline method.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 has-[:checked]:border-accent-strong">
                <input
                  type="radio"
                  name="decode-method"
                  value="adaptive"
                  checked={method === "adaptive"}
                  onChange={() => setMethod("adaptive")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Secure Adaptive LSB</span>
                  <span className="block text-xs text-muted">Use if this image was encoded with the adaptive method.</span>
                </span>
              </label>
            </div>
          </fieldset>

          {decodeError && (
            <p role="alert" className="text-sm text-danger">
              {decodeError}
            </p>
          )}

          <button
            type="button"
            onClick={handleDecode}
            disabled={!canDecode}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDecoding ? "Decoding…" : "Decode Message"}
          </button>
        </section>
      )}

      {result && (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">Recovered Message</h2>
          <div
            role="status"
            className="whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm text-foreground"
          >
            {result.message}
          </div>
          <p className="text-xs text-muted">
            Decoded in {result.processingTimeMs.toFixed(0)} ms
            {result.compressed ? " · payload was compressed" : ""}
          </p>
        </section>
      )}
    </div>
  );
}
