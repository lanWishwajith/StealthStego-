import Link from "next/link";

const FEATURES = [
  {
    title: "Encode",
    description:
      "Hide an encrypted message inside a PNG image using naive or content-adaptive LSB embedding.",
    href: "/encode",
    cta: "Encode a message",
  },
  {
    title: "Decode",
    description:
      "Recover a hidden message from a stego PNG using its password. Authenticated decryption verifies integrity.",
    href: "/decode",
    cta: "Decode an image",
  },
  {
    title: "Steganalysis Lab",
    description:
      "Compare naive and adaptive embedding side by side using MSE, PSNR, entropy, and LSB distribution metrics.",
    href: "/analysis",
    cta: "Open the lab",
  },
] as const;

const PIPELINE_STEPS = [
  "Secret message",
  "UTF-8 encode",
  "Optional compression",
  "Password-based key derivation",
  "AES-256-GCM encryption",
  "Content complexity analysis",
  "Keyed deterministic location selection",
  "Low-density LSB embedding",
  "Stego PNG",
] as const;

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          StealthStego
        </h1>
        <p className="mt-6 text-base leading-relaxed text-muted">
          StealthStego explores how encryption, content-adaptive pixel
          selection, and low payload density can reduce the statistical
          disturbance left by hidden messages in images — compared against a
          naive sequential LSB baseline. All processing runs locally in your
          browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/encode"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
          >
            Start Encoding
          </Link>
          <Link
            href="/research"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            How It Works
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mt-20 grid gap-4 sm:grid-cols-3"
      >
        <h2 id="features-heading" className="sr-only">
          Main features
        </h2>
        {FEATURES.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {feature.description}
            </p>
            <span className="mt-4 text-sm font-medium text-accent-strong group-hover:underline">
              {feature.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section
        aria-labelledby="pipeline-heading"
        className="mt-20 rounded-lg border border-border bg-surface p-6 sm:p-8"
      >
        <h2
          id="pipeline-heading"
          className="text-lg font-semibold text-foreground"
        >
          Secure Adaptive LSB Pipeline
        </h2>
        <p className="mt-2 text-sm text-muted">
          The primary embedding algorithm evaluated in this project.
        </p>
        <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {PIPELINE_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-foreground">
                {step}
              </span>
              {index < PIPELINE_STEPS.length - 1 && (
                <span aria-hidden="true" className="text-muted">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-lg border border-border bg-surface p-6 text-sm text-muted sm:p-8">
        <p>
          <strong className="text-foreground">Research note:</strong>{" "}
          StealthStego aims to reduce detectability relative to naive LSB
          embedding, not to guarantee undetectability. The Steganalysis Lab
          is provided to experimentally evaluate — not assume — the
          improvement.
        </p>
      </section>
    </div>
  );
}
