"use client";

import { useMemo, useState } from "react";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImagePreview } from "@/components/image-preview";
import { PasswordInput } from "@/components/password-input";
import { CapacityMeter } from "@/components/capacity-meter";
import { decodeImageFile, decodedImageToDataUrl, encodeImageToPng } from "@/lib/image/canvas";
import { maxPayloadBytes } from "@/lib/steganography/capacity";
import { encodeMessage, StegoEncodeError } from "@/lib/steganography/workflow";
import type { DecodedImage } from "@/types/image";
import type { EmbeddingMethod, EncodeSummary } from "@/types/steganography";

interface LoadedImage {
  file: File;
  decoded: DecodedImage;
  previewUrl: string;
}

export function EncodeForm() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<EmbeddingMethod>("adaptive");
  const [compress, setCompress] = useState(true);

  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [result, setResult] = useState<
    { url: string; blob: Blob; summary: EncodeSummary; fileName: string } | null
  >(null);

  const payloadBytes = useMemo(() => new TextEncoder().encode(message).length, [message]);
  const capacityBytes = loaded ? maxPayloadBytes(loaded.decoded) : 0;

  async function handleFileSelected(file: File) {
    setLoadError(null);
    setResult(null);

    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      // JPEG input is allowed but must be re-encoded as PNG for embedding,
      // since re-compression would destroy LSB data.
    } else if (file.type !== "image/png") {
      setLoadError("Please select a PNG or JPEG image.");
      return;
    }

    try {
      const decoded = await decodeImageFile(file);
      const previewUrl = decodedImageToDataUrl(decoded);
      setLoaded({ file, decoded, previewUrl });
    } catch {
      setLoadError("This file could not be read as an image.");
    }
  }

  async function handleEncode() {
    if (!loaded) return;
    setIsEncoding(true);
    setEncodeError(null);
    setResult(null);

    try {
      const { image, summary } = await encodeMessage({
        image: loaded.decoded,
        message,
        password,
        method,
        compress,
      });
      const blob = await encodeImageToPng(image);
      const url = URL.createObjectURL(blob);
      // Randomized, non-identifying file name: a name like
      // "stealthstego-encoded.png" would itself reveal which tool produced
      // the file, undermining the point of hiding a message in the first place.
      const fileName = `${crypto.randomUUID()}.png`;
      setResult({ url, blob, summary, fileName });
    } catch (error) {
      setEncodeError(
        error instanceof StegoEncodeError
          ? error.message
          : "Encoding failed unexpectedly. Please try again.",
      );
    } finally {
      setIsEncoding(false);
    }
  }

  const overCapacity = loaded ? payloadBytes > capacityBytes : false;
  const canEncode = Boolean(loaded) && message.length > 0 && password.length > 0 && !overCapacity;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <ImageDropzone
          label="Source Image"
          onFileSelected={handleFileSelected}
          helpText="PNG recommended. JPEG will be decoded and re-encoded as PNG for embedding."
          error={loadError}
        />

        {loaded && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <ImagePreview
              label="Original Preview"
              src={loaded.previewUrl}
              width={loaded.decoded.width}
              height={loaded.decoded.height}
            />
            <div className="flex flex-col justify-center gap-4">
              <CapacityMeter payloadBytes={payloadBytes} capacityBytes={capacityBytes} />
            </div>
          </div>
        )}
      </section>

      {loaded && (
        <section className="space-y-6 rounded-lg border border-border bg-surface p-6">
          <div>
            <label htmlFor="secret-message" className="mb-2 block text-sm font-medium text-foreground">
              Secret Message
            </label>
            <textarea
              id="secret-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Type the message you want to hide inside the image..."
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-strong focus:outline-none"
            />
          </div>

          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Enter a strong password"
            helpText="Used to encrypt the message and to select embedding locations. Not stored anywhere."
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Embedding Method</legend>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 has-[:checked]:border-accent-strong">
                <input
                  type="radio"
                  name="method"
                  value="naive"
                  checked={method === "naive"}
                  onChange={() => setMethod("naive")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Naive Sequential LSB</span>
                  <span className="block text-xs text-muted">
                    Research baseline. Embeds bits sequentially across all pixels.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 has-[:checked]:border-accent-strong">
                <input
                  type="radio"
                  name="method"
                  value="adaptive"
                  checked={method === "adaptive"}
                  onChange={() => setMethod("adaptive")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Secure Adaptive LSB</span>
                  <span className="block text-xs text-muted">
                    Content-adaptive, password-keyed embedding with reduced statistical disturbance.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={compress}
              onChange={(event) => setCompress(event.target.checked)}
            />
            Compress message before encryption (when supported by your browser)
          </label>

          <CapacityMeter payloadBytes={payloadBytes} capacityBytes={capacityBytes} />

          {encodeError && (
            <p role="alert" className="text-sm text-danger">
              {encodeError}
            </p>
          )}

          <button
            type="button"
            onClick={handleEncode}
            disabled={!canEncode || isEncoding}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEncoding ? "Encoding…" : "Encode Image"}
          </button>
        </section>
      )}

      {result && loaded && (
        <section className="space-y-6 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">Encoding Complete</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <ImagePreview
              label="Original"
              src={loaded.previewUrl}
              width={loaded.decoded.width}
              height={loaded.decoded.height}
            />
            <ImagePreview
              label="Stego"
              src={result.url}
              width={loaded.decoded.width}
              height={loaded.decoded.height}
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <SummaryItem label="Dimensions" value={`${result.summary.imageWidth} × ${result.summary.imageHeight}`} />
            <SummaryItem label="Payload bytes" value={`${result.summary.payloadBytes} B`} />
            <SummaryItem label="Capacity" value={`${(result.summary.capacityBytes / 1024).toFixed(1)} KB`} />
            <SummaryItem label="Payload density" value={`${(result.summary.payloadDensity * 100).toFixed(2)}%`} />
            <SummaryItem label="Modified channels" value={result.summary.modifiedChannels.toLocaleString()} />
            <SummaryItem label="Compressed" value={result.summary.compressed ? "Yes" : "No"} />
            <SummaryItem label="Processing time" value={`${result.summary.processingTimeMs.toFixed(0)} ms`} />
          </dl>

          <div className="flex flex-wrap gap-3">
            <a
              href={result.url}
              download={result.fileName}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
            >
              Download PNG
            </a>
            <a
              href="/analysis"
              className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
            >
              Analyze in Steganalysis Lab
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
