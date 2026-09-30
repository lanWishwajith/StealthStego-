import { DENSITY_LEVEL_LABELS, densityLevel, type DensityLevel } from "@/lib/steganography/capacity";

interface CapacityMeterProps {
  payloadBytes: number;
  capacityBytes: number;
}

const DENSITY_COLORS: Record<DensityLevel, string> = {
  "very-low": "bg-success",
  low: "bg-success",
  moderate: "bg-warning",
  high: "bg-danger",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function CapacityMeter({ payloadBytes, capacityBytes }: CapacityMeterProps) {
  const density = capacityBytes > 0 ? payloadBytes / capacityBytes : 0;
  const level = densityLevel(density);
  const percent = Math.min(100, density * 100);
  const overCapacity = payloadBytes > capacityBytes;

  return (
    <div role="status" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">Payload: {formatBytes(payloadBytes)}</span>
        <span className="text-muted">Capacity: {formatBytes(capacityBytes)}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${overCapacity ? "bg-danger" : DENSITY_COLORS[level]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted">Density: {(density * 100).toFixed(2)}%</span>
        <span className={overCapacity ? "font-medium text-danger" : "text-muted"}>
          {overCapacity ? "Exceeds capacity" : DENSITY_LEVEL_LABELS[level]}
        </span>
      </div>
      {overCapacity && (
        <p className="mt-2 text-xs text-danger">
          This message is too large for the selected image and method. Shorten the
          message, choose a larger image, or enable compression.
        </p>
      )}
      {!overCapacity && level === "high" && (
        <p className="mt-2 text-xs text-warning">
          High payload density increases the chance of detectable statistical
          disturbance. Consider a shorter message or larger image.
        </p>
      )}
    </div>
  );
}
