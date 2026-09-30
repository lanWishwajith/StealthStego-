import type { ChannelHistogram } from "@/lib/analysis/histogram";

interface HistogramChartProps {
  histogram: ChannelHistogram;
  color: string;
  label: string;
}

/** Renders a 256-bucket byte-value histogram as a lightweight inline SVG bar chart. */
export function HistogramChart({ histogram, color, label }: HistogramChartProps) {
  const max = Math.max(1, ...Array.from(histogram));
  const width = 256;
  const height = 80;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} value distribution histogram`}
        className="rounded border border-border bg-surface"
      >
        {Array.from(histogram).map((count, value) => {
          const barHeight = (count / max) * height;
          return (
            <rect
              key={value}
              x={value}
              y={height - barHeight}
              width={1}
              height={barHeight}
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
}
