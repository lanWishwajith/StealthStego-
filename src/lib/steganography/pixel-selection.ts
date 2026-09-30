import type { RgbChannel } from "@/types/image";

/** A single embeddable location: a pixel index and one of its RGB channels. */
export interface ChannelLocation {
  pixelIndex: number;
  channel: RgbChannel;
}

/**
 * Deterministic, password-keyed pseudo-random number generator used to
 * order embedding locations.
 *
 * Design: the *seed* itself must come from cryptographically secure,
 * password-derived key material (see `key-derivation.ts`, which uses
 * PBKDF2-SHA256 over the user's password and a random salt) — that is
 * the step that makes the sequence unpredictable without the password.
 * Given that seed, this class expands it into a bulk keystream using a
 * fast, synchronous SplitMix64-style mixer.
 *
 * This is intentionally NOT `Math.random()` (which is unseeded and not
 * reproducible) and NOT a per-draw call into Web Crypto (which is
 * cryptographically stronger but far too slow to drive a Fisher-Yates
 * shuffle over millions of pixel channels — each `crypto.subtle` call is
 * an async round trip). Splitting the responsibility this way keeps the
 * *source of secrecy* cryptographic while keeping the *bulk shuffle*
 * fast and exactly reproducible by the decoder, which reruns the same
 * seed derivation and mixer.
 */
export class DeterministicRng {
  private state: bigint;

  constructor(seed: Uint8Array) {
    this.state = seedToState(seed);
  }

  /** Advances and returns the next 32-bit unsigned pseudo-random value. */
  private nextUint32(): number {
    // SplitMix64 step: https://prng.di.unimi.it/splitmix64.c
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK64;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    z = z ^ (z >> 31n);
    return Number(z & 0xffffffffn);
  }

  /** Returns a uniformly distributed integer in [0, max) using rejection sampling. */
  nextInt(max: number): number {
    if (max <= 0) return 0;
    // 2^32 is not evenly divisible by most `max` values; reject draws in
    // the remainder to avoid modulo bias.
    const limit = Math.floor(0x100000000 / max) * max;
    for (;;) {
      const value = this.nextUint32();
      if (value < limit) {
        return value % max;
      }
    }
  }
}

const MASK64 = 0xffffffffffffffffn;

/** Folds an arbitrary-length crypto-derived seed into a 64-bit SplitMix64 state via FNV-1a. */
function seedToState(seed: Uint8Array): bigint {
  let hash = 0xcbf29ce484222325n; // FNV offset basis
  const prime = 0x100000001b3n;
  for (const byte of seed) {
    hash = (hash ^ BigInt(byte)) & MASK64;
    hash = (hash * prime) & MASK64;
  }
  // Ensure a non-zero starting state.
  return hash === 0n ? 0x9e3779b97f4a7c15n : hash;
}

/**
 * Generates a deterministic, duplicate-free, password-keyed ordering over
 * a pool of candidate RGB channel locations.
 *
 * Implements a keyed Fisher-Yates shuffle: starting from the full
 * candidate pool (already filtered/ranked by complexity upstream), we
 * repeatedly draw a deterministic random index and swap it to the front.
 * This guarantees no duplicates and an unbiased permutation for a given
 * seed, while remaining exactly reproducible by the decoder.
 */
export function generateLocationOrder(
  candidates: ChannelLocation[],
  seed: Uint8Array,
): ChannelLocation[] {
  const pool = candidates.slice();
  const rng = new DeterministicRng(seed);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}
