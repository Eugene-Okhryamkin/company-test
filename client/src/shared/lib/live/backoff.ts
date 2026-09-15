export interface BackoffOptions {
  /** Delay before the first retry, ms. */
  baseMs: number
  factor: number
  /** Upper bound for any delay, ms. */
  maxMs: number
  /** Relative random spread (0.2 → ±20 %), avoids reconnect storms after a server restart. */
  jitter: number
}

export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 500, factor: 2, maxMs: 30_000, jitter: 0.2 }

/** Exponential backoff with jitter: min(max, base·factor^attempt) · (1 ± jitter). attempt starts at 0. */
export function computeBackoffDelay(
  attempt: number,
  { baseMs, factor, maxMs, jitter }: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(maxMs, baseMs * factor ** attempt)
  const spread = 1 - jitter + random() * 2 * jitter
  return Math.min(maxMs, Math.round(exponential * spread))
}
