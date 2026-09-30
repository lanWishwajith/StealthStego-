"use client";

import { useCallback, useId, useRef, useState } from "react";

interface ImageDropzoneProps {
  label: string;
  onFileSelected: (file: File) => void;
  /** Accepted MIME types shown to the browser file picker. */
  accept?: string;
  helpText?: string;
  error?: string | null;
}

export function ImageDropzone({
  label,
  onFileSelected,
  accept = "image/png,image/jpeg",
  helpText,
  error,
}: ImageDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        role="button"
        tabIndex={0}
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragActive
            ? "border-accent bg-surface-raised"
            : "border-border bg-surface hover:border-accent-strong"
        }`}
      >
        <p className="text-sm font-medium text-foreground">
          Drag and drop an image here
        </p>
        <p className="mt-1 text-xs text-muted">or click to browse files</p>
        {helpText && <p className="mt-3 text-xs text-muted">{helpText}</p>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
