export const metadata = {
  title: "Security & Privacy — StealthStego",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Security &amp; Privacy
      </h1>
      <p className="mt-2 text-sm text-muted">
        How StealthStego handles your images, messages, and passwords.
      </p>

      <div className="mt-10 space-y-10">
        <Section title="Everything Runs Locally">
          <p>
            StealthStego performs all image decoding, encryption, embedding,
            extraction, and analysis in your browser using the Web Crypto
            and Canvas APIs. Your image, your message, and your password
            are never sent to a server, logged, or stored anywhere outside
            your browser&apos;s memory for the duration of the page session.
          </p>
          <p>
            There is no backend for this application beyond serving the
            static site itself. Closing or reloading the tab discards all
            in-memory state, including any password you entered.
          </p>
        </Section>

        <Section title="Cryptography Details">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Messages are encrypted with <strong>AES-256-GCM</strong>, an
              authenticated encryption mode that provides both
              confidentiality and tamper detection in a single primitive.
            </li>
            <li>
              Encryption keys are derived from your password using{" "}
              <strong>PBKDF2-SHA256</strong> with a high iteration count and
              a fresh random salt for every message, so the same password
              never produces the same key twice.
            </li>
            <li>
              A fresh random IV (initialization vector) is generated for
              every encryption operation using{" "}
              <code>crypto.getRandomValues</code>, avoiding IV reuse, which
              would otherwise weaken GCM&apos;s security guarantees.
            </li>
            <li>
              Passwords are never stored, transmitted, or written to disk in
              any form. They exist only transiently in browser memory while
              a page is open.
            </li>
          </ul>
        </Section>

        <Section title="What This Tool Does Not Guarantee">
          <p>
            StealthStego is a research and educational project, not a
            hardened operational security tool. In particular:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Embedding is <strong>not guaranteed to be undetectable</strong>.
              The Secure Adaptive LSB method is designed and experimentally
              evaluated to produce lower statistical disturbance than naive
              sequential embedding, but a motivated adversary with
              sufficient resources may still detect the presence of a
              hidden payload.
            </li>
            <li>
              Uploading a stego image to social media, messaging apps, or
              most cloud photo services will very likely destroy the hidden
              payload, since these platforms commonly re-compress images as
              JPEG or resize them, both of which corrupt LSB data.
            </li>
            <li>
              Any re-saving, editing, or format conversion of the stego PNG
              outside this tool carries the same risk.
            </li>
            <li>
              The overall security of a hidden message depends heavily on
              password strength. A short or guessable password remains
              vulnerable to brute-force or dictionary attacks regardless of
              how the payload is embedded.
            </li>
          </ul>
        </Section>

        <Section title="Recommended Usage">
          <ul className="ml-5 list-disc space-y-2">
            <li>Use a long, unique password for each message.</li>
            <li>
              Keep the stego PNG in its original, unmodified form until it
              reaches its intended recipient.
            </li>
            <li>
              Treat this tool as a demonstration of steganographic and
              cryptographic concepts for coursework or research, not as a
              substitute for established, audited security software in any
              context with real safety or legal stakes.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
