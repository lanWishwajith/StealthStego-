import type { ReactNode } from "react";

interface AnalysisCardProps {
  title: string;
  value: ReactNode;
  description?: string;
}

/** A single-metric summary tile used throughout the Steganalysis Lab. */
export function AnalysisCard({ title, value, description }: AnalysisCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      {description && <p className="mt-1 text-xs text-muted">{description}</p>}
    </div>
  );
}
