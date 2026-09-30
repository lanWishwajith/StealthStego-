import { EncodeForm } from "./encode-form";

export const metadata = {
  title: "Encode — StealthStego",
};

export default function EncodePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Encode Secret Message
      </h1>
      <p className="mt-2 text-sm text-muted">
        Hide an encrypted message inside a PNG image using naive or
        content-adaptive embedding. All processing happens locally in your
        browser.
      </p>
      <div className="mt-8">
        <EncodeForm />
      </div>
    </div>
  );
}
