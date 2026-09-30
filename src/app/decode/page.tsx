import { DecodeForm } from "./decode-form";

export const metadata = {
  title: "Decode — StealthStego",
};

export default function DecodePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Decode Hidden Message
      </h1>
      <p className="mt-2 text-sm text-muted">
        Upload a stego PNG and enter the password to recover the hidden
        message. Processing happens entirely in your browser.
      </p>
      <div className="mt-8">
        <DecodeForm />
      </div>
    </div>
  );
}
