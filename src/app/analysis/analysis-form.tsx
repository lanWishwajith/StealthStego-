"use client";

import { useState } from "react";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImagePreview } from "@/components/image-preview";
import { PasswordInput } from "@/components/password-input";
import { AnalysisCard } from "@/components/analysis-card";
import { HistogramChart } from "@/components/histogram-chart";
import { BitPlaneViewer } from "@/components/bit-plane-viewer";
import { decodeImageFile, decodedImageToDataUrl, encodeImageToPng } from "@/lib/image/canvas";
import { encodeMessage, StegoEncodeError } from "@/lib/steganography/workflow";
import { compareImages, type ImageComparisonReport } from "@/lib/analysis/compare";
import type { DecodedImage } from "@/types/image";
import type { EmbeddingMethod } from "@/types/steganography";

interface LoadedImage {
  decoded: DecodedImage;
  previewUrl: string;
}

interface MethodResult {
  method: EmbeddingMethod;
  stegoImage: DecodedImage;
  stegoPreviewUrl: string;
  report: ImageComparisonReport;
}

const DEFAULT_MESSAGE =
  "This is a sample analysis message used to compare embedding methods.";

export function AnalysisForm() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [password, setPassword] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [results, setResults] = useState<MethodResult[] | null>(null);

  async function handleFileSelected(file: File) {
    setLoadError(null);
    setResults(null);
    if (file.type !== "image/png" && file.type !== "image/jpeg" && file.type !== "image/jpg") {
      setLoadError("Please select a PNG or JPEG image.");
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

  async function handleRunAnalysis() {
    if (!loaded) return;
    setIsRunning(true);
    setRunError(null);
    setResults(null);

    try {
      const methods: EmbeddingMethod[] = ["naive", "adaptive"];
      const nextResults: MethodResult[] = [];

      for (const method of methods) {
        const { image: stegoImage } = await encodeMessage({
          image: loaded.decoded,
          message,
          password,
          method,
          compress: false,
        });
        const report = compareImages(loaded.decoded, stegoImage);
        const blob = await encodeImageToPng(stegoImage);
        const stegoPreviewUrl = URL.createObjectURL(blob);
        nextResults.push({ method, stegoImage, stegoPreviewUrl, report });
      }

      setResults(nextResults);
    } catch (error) {
      setRunError(
        error instanceof StegoEncodeError
          ? error.message
          : "Analysis failed unexpectedly. Please try a shorter message or larger image.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  const canRun = Boolean(loaded) && message.length > 0 && password.length > 0;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <ImageDropzone
          label="Source Image"
          onFileSelected={handleFileSelected}
          helpText="Both embedding methods will be run against this image for comparison."
          error={loadError}
        />

        {loaded && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <ImagePreview
              label="Original"
              src={loaded.previewUrl}
              width={loaded.decoded.width}
              height={loaded.decoded.height}
            />
          </div>
        )}
      </section>

      {loaded && (
        <section className="space-y-6 rounded-lg border border-border bg-surface p-6">
          <div>
            <label htmlFor="analysis-message" className="mb-2 block text-sm font-medium text-foreground">
              Test Message
            </label>
            <textarea
              id="analysis-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-strong focus:outline-none"
            />
          </div>

          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Any password (used only for this analysis run)"
          />

          {runError && (
            <p role="alert" className="text-sm text-danger">
              {runError}
            </p>
          )}

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={!canRun || isRunning}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Running comparison…" : "Run Comparison"}
          </button>
        </section>
      )}

      {results && loaded && (
        <section className="space-y-10">
          <ComparisonTable results={results} />
          {results.map((result) => (
            <MethodDetail key={result.method} loaded={loaded} result={result} />
          ))}
        </section>
      )}
    </div>
  );
}

const METHOD_LABELS: Record<EmbeddingMethod, string> = {
  naive: "Naive Sequential LSB",
  adaptive: "Secure Adaptive LSB",
};

function formatPsnr(psnr: number): string {
  return Number.isFinite(psnr) ? `${psnr.toFixed(2)} dB` : "∞ dB";
}

function ComparisonTable({ results }: { results: MethodResult[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-160 text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Metric</th>
            {results.map((r) => (
              <th key={r.method} className="px-4 py-3">
                {METHOD_LABELS[r.method]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <Row label="MSE" values={results.map((r) => r.report.mse.toFixed(4))} />
          <Row label="PSNR" values={results.map((r) => formatPsnr(r.report.psnr))} />
          <Row label="SSIM (approx.)" values={results.map((r) => r.report.ssim.toFixed(4))} />
          <Row
            label="Modified channels"
            values={results.map(
              (r) =>
                `${r.report.modifiedChannels.toLocaleString()} (${(r.report.modifiedChannelPercent * 100).toFixed(2)}%)`,
            )}
          />
          <Row
            label="Entropy (original → stego)"
            values={results.map(
              (r) => `${r.report.originalEntropy.toFixed(3)} → ${r.report.stegoEntropy.toFixed(3)} bits`,
            )}
          />
          <Row label="LSB one-ratio" values={results.map((r) => r.report.lsbOneRatio.toFixed(4))} />
          <Row
            label="Chi-square (avg., lower may suggest LSB use)"
            values={results.map((r) => r.report.chiSquareAverage.toFixed(2))}
          />
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-3 text-xs text-muted">
        These statistics describe measurable differences between the original and stego
        images under this experimental setup. They indicate reduced statistical disturbance
        for the adaptive method relative to naive sequential embedding, not a guarantee that
        either output is undetectable by all steganalysis techniques.
      </p>
    </div>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="px-4 py-3 text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-3 font-medium text-foreground">
          {v}
        </td>
      ))}
    </tr>
  );
}

function MethodDetail({ loaded, result }: { loaded: LoadedImage; result: MethodResult }) {
  return (
    <div className="space-y-6 rounded-lg border border-border bg-surface p-6">
      <h3 className="text-lg font-semibold text-foreground">{METHOD_LABELS[result.method]}</h3>

      <div className="grid gap-6 sm:grid-cols-2">
        <ImagePreview
          label="Stego Output"
          src={result.stegoPreviewUrl}
          width={loaded.decoded.width}
          height={loaded.decoded.height}
        />
        <div className="grid grid-cols-2 gap-3">
          <AnalysisCard title="PSNR" value={formatPsnr(result.report.psnr)} />
          <AnalysisCard title="MSE" value={result.report.mse.toFixed(3)} />
          <AnalysisCard
            title="Modified"
            value={`${(result.report.modifiedChannelPercent * 100).toFixed(2)}%`}
          />
          <AnalysisCard title="LSB Balance" value={result.report.lsbOneRatio.toFixed(3)} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">RGB Histograms (stego)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <HistogramChart histogram={result.report.histograms.r} color="#ef4444" label="Red" />
          <HistogramChart histogram={result.report.histograms.g} color="#22c55e" label="Green" />
          <HistogramChart histogram={result.report.histograms.b} color="#5b8cff" label="Blue" />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          Least-Significant Bit Plane (Red channel, stego)
        </p>
        <div className="max-w-md">
          <BitPlaneViewer image={result.stegoImage} bitPosition={0} channel={0} />
        </div>
      </div>
    </div>
  );
}
