"use client";

import { useId, useState } from "react";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  helpText?: string;
}

export function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "new-password",
  helpText,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const helpId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-surface focus-within:border-accent-strong">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={helpText ? helpId : undefined}
          className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="shrink-0 px-3 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {helpText && (
        <p id={helpId} className="mt-1 text-xs text-muted">
          {helpText}
        </p>
      )}
    </div>
  );
}
