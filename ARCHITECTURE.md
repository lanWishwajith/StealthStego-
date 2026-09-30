# StealthStego — How It's Built

A technical overview of the app's architecture, algorithms, and tech
stack. For the user-facing explanation of the steganography concepts,
see the in-app **How It Works** (`/research`) and **Privacy** (`/privacy`)
pages — this document is the engineering companion to those.

## What it is

StealthStego is a browser-only image steganography tool: it hides an
encrypted text message inside a PNG image and can later recover it,
with every step — image decoding, encryption, embedding, extraction,
and statistical analysis — running client-side. No image, message, or
password ever leaves the browser; there is no backend beyond serving
the static site.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Static export, file-based routing, ships as a fully static site deployable to Vercel |
| UI | React 19 + Tailwind CSS v4 | Component model + utility styling, dark academic-tool aesthetic |
| Language | TypeScript (strict, ES2020 target) | Type safety across crypto/binary-format/pixel-math code, where bugs are easy to hide |
| Cryptography | Web Crypto API (`crypto.subtle`) | No custom crypto; browser-native, audited primitives only |
| Image I/O | Canvas API (`HTMLCanvasElement`, `ImageData`) | Universal decode path for PNG/JPEG input, exact-pixel PNG output |
| Testing | Vitest + jsdom | Fast unit tests for crypto/binary/pixel logic without a real browser |
| E2E verification | Playwright (ad hoc, not checked in) | Real-Chromium smoke tests of each page during development |

ES2020 was required (not the Next.js default ES2017) because the
deterministic PRNG uses BigInt literals for 64-bit mixing constants.

## High-level pipeline

```
Secret message
  → UTF-8 encode
  → optional gzip compression (CompressionStream)
  → AES-256-GCM encryption (PBKDF2-SHA256 derived key)
  → versioned binary payload container (magic/version/flags/salt/iv/ciphertext)
  → embedding (Naive Sequential LSB  |  Secure Adaptive LSB)
  → stego PNG
```

Decoding runs the same pipeline in reverse. Every stage is a small,
independently testable, pure(ish) function — cryptography, payload
framing, pixel selection, and complexity analysis are deliberately
kept in separate modules so each can be reasoned about (and tested)
in isolation.

## Source layout

```
src/
  app/                     Next.js routes (Encode, Decode, Steganalysis Lab, How It Works, Privacy)
  components/              Shared UI (dropzone, password field, capacity meter, histogram/bit-plane viewers)
  lib/
    crypto/                AES-GCM encryption, PBKDF2 key/seed derivation, secure random bytes
    image/                 Canvas decode/encode, MSE/PSNR/SSIM metrics, local complexity map
    steganography/         Payload container format, naive LSB, adaptive LSB, pixel-selection RNG, workflow orchestration
    analysis/              Entropy, histograms, LSB balance, chi-square — feeds the Steganalysis Lab
  types/                   Shared TypeScript types (DecodedImage, EmbeddingMethod, summaries)
```

## The two embedding algorithms

### Naive Sequential LSB (research baseline)

Overwrites the least-significant bit of each RGB channel in raster
order, starting from pixel 0, until the payload is written. Included
specifically as a **baseline for comparison** — it's the textbook
example of what's easy to detect, not a recommended method. It
clusters all changes into a contiguous block and ignores image
content entirely.

Implementation: [`src/lib/steganography/naive-lsb.ts`](src/lib/steganography/naive-lsb.ts).

### Secure Adaptive LSB (primary method)

Three independent techniques combine to reduce statistical
disturbance relative to the naive baseline:

1. **Encrypt first.** The payload embedded is AES-GCM ciphertext
   (high-entropy, indistinguishable from random), not structured
   plaintext.
2. **Password-keyed deterministic location selection.** Candidate
   pixel/channel locations are shuffled using a sequence derived from
   the password, spreading modified channels across the whole image
   instead of clustering them — reproducible by the decoder, but not
   predictable without the password. See [Deterministic location
   selection](#deterministic-location-selection-not-mathrandom) below.
3. **Content-adaptive placement.** A local complexity map (gradient
   magnitude over luma) ranks pixels by how much natural texture
   surrounds them; embedding prefers high-texture regions and skips
   flat regions where a bit flip is most conspicuous.

Implementation: [`src/lib/steganography/adaptive-lsb.ts`](src/lib/steganography/adaptive-lsb.ts).

## Deterministic location selection (not `Math.random()`)

Embedding locations must be:
- **Reproducible** — the decoder needs to derive the exact same
  sequence the encoder used, from the password alone.
- **Unpredictable without the password** — otherwise the "randomized"
  placement provides no real benefit over naive sequential order.

This rules out `Math.random()` (not reproducible, not seedable) and,
for performance reasons, rules out calling `crypto.subtle` on every
single draw.

**Design:** `crypto.subtle` (PBKDF2-SHA256) is used once, asynchronously,
to derive a seed from the password. That seed then drives a
synchronous SplitMix64-based Fisher-Yates shuffle
([`src/lib/steganography/pixel-selection.ts`](src/lib/steganography/pixel-selection.ts))
over all candidate `(pixel, channel)` locations. This separates
*cryptographic secrecy* (where the seed comes from) from *bulk
randomness* (how the shuffle is executed), which matters in practice:
an earlier version called the async crypto API per swap and took over
20 seconds to shuffle a 1-megapixel image; the synchronous mixer
brings that under ~5-9 seconds even at megapixel scale (see
`pixel-selection.perf.test.ts`).

## Header/bootstrap discovery

A decoder facing a stego image has a chicken-and-egg problem: it
needs the salt embedded *inside* the payload to derive the
location-seed that would tell it *where* the payload is.

**Solution:** a single fixed, hardcoded salt (`BOOTSTRAP_SALT`,
independent of the message-specific AES-GCM salt) derives one
location sequence used for both a small length-prefix header and the
payload body itself. The decoder always knows where to start reading
for a given password — what it doesn't know in advance is how much to
read, hence the bootstrap length header read first. Actual message
secrecy still comes from the AES-GCM salt/IV embedded inside the
payload, not from the location sequence, which is a deliberate,
documented tradeoff (position sequence is stable per
password+image-size; ciphertext content is not).

See the full reasoning in the top-of-file comment in
[`src/lib/steganography/adaptive-lsb.ts`](src/lib/steganography/adaptive-lsb.ts).

## Content-adaptive complexity map

[`src/lib/image/complexity.ts`](src/lib/image/complexity.ts) scores
every pixel by local gradient magnitude over ITU-R BT.601 luma. One
subtlety: embedding itself flips LSBs, which would perturb the very
complexity scores used to decide *where* to embed, causing the
encoder and decoder to disagree about which locations are "eligible."
The luma calculation masks off bit 0 before scoring
(`data[i] & 0xfe`), making the complexity ranking invariant to the
one-bit changes embedding performs, so both sides compute the
identical ranking.

## Cryptography

- **AES-256-GCM** ([`src/lib/crypto/aes.ts`](src/lib/crypto/aes.ts)) —
  authenticated encryption; wrong password or tampered ciphertext both
  fail decryption with the same generic error (no oracle for
  distinguishing the two).
- **PBKDF2-SHA256** ([`src/lib/crypto/key-derivation.ts`](src/lib/crypto/key-derivation.ts)),
  250,000 iterations — derives both the AES key and (separately) the
  location-selection seed from the password.
- Fresh random salt (16 bytes) and IV (12 bytes) via
  `crypto.getRandomValues` for every encryption — no IV reuse.
- Passwords are never persisted; they exist only in component state
  for the lifetime of the page.

## Binary payload container

A small versioned format wraps the ciphertext so the decoder can
validate what it's reading before trusting it:

```
magic ("SSTG") | version | flags (compression bit) | salt | iv | ciphertext
```

[`src/lib/steganography/payload.ts`](src/lib/steganography/payload.ts)
implements `serializePayload`/`parsePayload` with truncation checks at
every field boundary, rejecting unknown magic bytes or unsupported
versions outright — this is what lets the format add fields later
without breaking old encoders/decoders silently.

## Steganalysis Lab

A comparison dashboard ([`src/app/analysis/analysis-form.tsx`](src/app/analysis/analysis-form.tsx))
runs both embedding methods against one source image and reports,
side by side:

- **MSE / PSNR** and an approximate global **SSIM**
  ([`src/lib/image/metrics.ts`](src/lib/image/metrics.ts))
- **Shannon entropy** per channel, before/after
  ([`src/lib/analysis/entropy.ts`](src/lib/analysis/entropy.ts))
- **RGB histograms** and an inline SVG chart
  ([`src/lib/analysis/histogram.ts`](src/lib/analysis/histogram.ts))
- **LSB 0/1 balance** ([`src/lib/analysis/lsb-analysis.ts`](src/lib/analysis/lsb-analysis.ts))
- **Chi-square Pairs-of-Values** test, the classic Westfeld &
  Pfitzmann LSB steganalysis technique
  ([`src/lib/analysis/chi-square.ts`](src/lib/analysis/chi-square.ts))
- A visual **bit-plane viewer** for the LSB plane
  ([`src/components/bit-plane-viewer.tsx`](src/components/bit-plane-viewer.tsx))

Wording throughout is deliberately measured — "reduced statistical
disturbance," "experimentally evaluated" — never "undetectable" or
"impossible to detect." The Lab exists specifically so claims about
detectability are backed by a number the user can see, not asserted.

## Testing

59 tests across 15 files (Vitest), covering:
- Crypto round trips, wrong-password failure, tampered-ciphertext
  rejection
- Payload serialize/parse round trips and malformed-input rejection
  (bad magic, unsupported version, truncated bytes)
- Naive LSB round trip and capacity rejection
- Adaptive LSB round trip, seed reproducibility, no duplicate
  locations, alpha channel never touched, wrong password fails
- Complexity map invariants (flat image = zero complexity, edges rank
  higher, LSB-invariance)
- Metrics (MSE/PSNR/SSIM/entropy/modified-channel counts) against
  deterministic synthetic test images
- A performance test guarding megapixel-scale shuffle time

Run with `npm run test`.

## Deployment

The app builds to fully static output (`next build` — every route
prerenders, no server runtime required), which is what makes the
"nothing ever leaves your browser" guarantee possible: there's no
server-side code path for image/message data to flow through even by
accident.
