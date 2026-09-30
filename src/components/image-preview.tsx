interface ImagePreviewProps {
  label: string;
  src: string | null;
  width?: number;
  height?: number;
  emptyText?: string;
}

export function ImagePreview({
  label,
  src,
  width,
  height,
  emptyText = "No image loaded",
}: ImagePreviewProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- previewing arbitrary local pixel data, not an optimizable static asset
          <img
            src={src}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="text-sm text-muted">{emptyText}</p>
        )}
      </div>
      {src && width && height && (
        <p className="mt-1 text-xs text-muted">
          {width} × {height}px
        </p>
      )}
    </div>
  );
}
