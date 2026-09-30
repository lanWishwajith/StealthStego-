export const metadata = {
  title: "How It Works — StealthStego",
};

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">How It Works</h1>
      <p className="mt-2 text-sm text-muted">
        Background on steganography, cryptography, and the design decisions
        behind StealthStego. This page is written for a campus research
        audience and intentionally avoids overclaiming what the tool can
        guarantee.
      </p>

      <div className="mt-10 space-y-10">
        <Section title="Steganography vs. Cryptography">
          <p>
            Cryptography protects the <em>content</em> of a message: an
            attacker who intercepts ciphertext cannot read it without the
            key, but they can plainly see that a secret message exists.
            Steganography protects the <em>existence</em> of a message by
            hiding it inside an innocuous cover object — here, a PNG image
            — so that an observer has no obvious reason to suspect anything
            is hidden at all.
          </p>
          <p>
            These two properties are complementary, not substitutes.
            StealthStego combines both: the message is AES-256-GCM
            encrypted <em>before</em> it is embedded, so even if a hidden
            payload is detected and extracted, its contents remain
            protected by the password-derived key.
          </p>
        </Section>

        <Section title="Why Naive Sequential LSB Leaks Patterns">
          <p>
            The simplest form of image steganography overwrites the
            least-significant bit (LSB) of each color channel, starting
            from the first pixel and proceeding in raster order until the
            message is fully embedded. This is included in StealthStego as
            a <strong>research baseline</strong>, not a recommended method.
          </p>
          <p>
            Sequential embedding concentrates all modified pixels into a
            contiguous block at the start of the image, leaving the
            remainder of the image statistically untouched. This produces a
            sharp discontinuity in local noise characteristics that is
            straightforward to locate with simple sliding-window variance
            or chi-square analysis. It also embeds regardless of local
            image content, so flat, low-texture regions (like a clear sky)
            receive the same bit flips as busy, high-texture regions —
            flat regions are exactly where LSB noise is most visually and
            statistically conspicuous.
          </p>
        </Section>

        <Section title="Why Encryption, Randomization, and Adaptive Embedding Help">
          <p>
            StealthStego&apos;s Secure Adaptive LSB method addresses these
            weaknesses with three independent design choices:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Encryption first.</strong> AES-256-GCM output is
              computationally indistinguishable from random noise. Embedding
              high-entropy ciphertext (rather than structured plaintext)
              avoids introducing recognizable byte patterns into the LSB
              plane.
            </li>
            <li>
              <strong>Password-keyed, deterministic location selection.</strong>{" "}
              Instead of writing bits sequentially, candidate pixel/channel
              locations are shuffled using a sequence derived from the
              password via PBKDF2-SHA256. This spreads modified channels
              across the whole image rather than clustering them, which
              defeats simple positional analysis. The shuffle is
              deterministic (not <code>Math.random()</code>) so the same
              password reproduces the same sequence for decoding, but an
              attacker without the password cannot predict it.
            </li>
            <li>
              <strong>Content-adaptive placement.</strong> A local
              complexity map (based on gradient magnitude) ranks each pixel
              by how much natural texture surrounds it. Embedding
              preferentially uses higher-complexity regions, where a
              single-bit change is least likely to create a statistically
              or visually detectable anomaly, and avoids large flat regions
              entirely when possible.
            </li>
          </ul>
          <p>
            Together, these reduce the statistical disturbance introduced
            by embedding relative to the naive baseline, as shown
            quantitatively in the{" "}
            <a href="/analysis" className="text-accent underline hover:text-accent-strong">
              Steganalysis Lab
            </a>
            . They do not make detection impossible in principle.
          </p>
        </Section>

        <Section title="Limitations">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Not guaranteed undetectable.</strong> A sufficiently
              resourced adversary using advanced steganalysis (e.g.
              ensemble classifiers trained on large image corpora) may
              still detect the presence of a payload, even with adaptive
              embedding. StealthStego reduces detectability relative to
              naive embedding; it does not eliminate it.
            </li>
            <li>
              <strong>Lossy transformations destroy the payload.</strong> Any
              re-compression, resizing, or format conversion (including
              most social media uploads, which re-encode images as JPEG)
              will corrupt or destroy LSB-embedded data. StealthStego only
              works reliably on the exact PNG bytes produced by the encoder.
            </li>
            <li>
              <strong>Password strength matters.</strong> The scheme&apos;s
              security depends entirely on the secrecy and strength of the
              chosen password. A weak or reused password undermines both
              the encryption and the location-selection secrecy.
            </li>
            <li>
              <strong>Capacity is bounded.</strong> Larger messages require
              modifying a larger fraction of available channels, which
              increases both statistical and visual disturbance. The
              Encode page&apos;s capacity meter warns when payload density
              rises into ranges more likely to be flagged by analysis.
            </li>
          </ul>
        </Section>

        <Section title="Steganalysis: How Hidden Data Is Detected">
          <p>
            Steganalysis is the study of detecting, and where possible
            extracting, hidden data. Common statistical techniques include:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Chi-square Pairs-of-Values analysis.</strong>{" "}
              Sequential LSB embedding tends to equalize the frequency of
              adjacent even/odd byte-value pairs, producing an anomalously
              low chi-square statistic in embedded regions.
            </li>
            <li>
              <strong>Histogram and entropy analysis.</strong> Embedding
              high-entropy ciphertext into low-entropy image regions
              measurably shifts the local byte-value distribution.
            </li>
            <li>
              <strong>Visual bit-plane inspection.</strong> Plotting the LSB
              plane in isolation often reveals structure (natural image
              gradients) in unmodified images versus uniform noise in
              heavily embedded regions.
            </li>
          </ul>
          <p>
            The Steganalysis Lab in this project implements simplified
            versions of several of these techniques so that the tradeoffs
            between embedding methods can be inspected directly, rather
            than taken on faith.
          </p>
        </Section>

        <Section title="Future Work">
          <p>
            This project intentionally scopes itself to LSB-family
            techniques that can run entirely client-side in a browser.
            Directions that were considered out of scope, but are relevant
            to the broader research area, include:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Provably secure steganography (PSS)</strong>{" "}
              constructions, which aim for information-theoretic
              indistinguishability from a cover distribution under formal
              assumptions, at the cost of much lower payload capacity and
              significant implementation complexity.
            </li>
            <li>
              <strong>Generative steganography</strong>, where the cover
              image itself is synthesized (e.g. via a generative model)
              conditioned on the payload, rather than a fixed image being
              modified after the fact. This is an active research area with
              open questions around robustness and reproducibility.
            </li>
            <li>
              Adaptive embedding guided by learned perceptual or
              statistical cost functions (in the spirit of frameworks like
              HUGO/S-UNIWARD from the steganography literature), rather than
              the hand-crafted gradient-based complexity metric used here.
            </li>
          </ul>
          <p>
            These are noted as directions for further study, not features
            of the current implementation.
          </p>
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
