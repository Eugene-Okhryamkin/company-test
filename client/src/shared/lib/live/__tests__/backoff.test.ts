import { describe, expect, it } from 'vitest'
import { computeBackoffDelay, DEFAULT_BACKOFF } from '@/shared/lib/live/backoff'

const noJitter = { ...DEFAULT_BACKOFF, jitter: 0 }

describe('computeBackoffDelay', () => {
  it('uses sensible defaults: 500 ms base, ×2, capped at 30 s, ±20 % jitter', () => {
    expect(DEFAULT_BACKOFF).toEqual({ baseMs: 500, factor: 2, maxMs: 30_000, jitter: 0.2 })
  })

  it('grows exponentially with the attempt number', () => {
    expect([0, 1, 2, 3, 4].map((attempt) => computeBackoffDelay(attempt, noJitter))).toEqual([500, 1000, 2000, 4000, 8000])
  })

  it('never exceeds the maximum', () => {
    expect(computeBackoffDelay(10, noJitter)).toBe(30_000)
    expect(computeBackoffDelay(1000, noJitter)).toBe(30_000)
  })

  it('spreads retries with jitter within ±jitter of the exponential delay', () => {
    expect(computeBackoffDelay(2, DEFAULT_BACKOFF, () => 0)).toBe(1600)
    expect(computeBackoffDelay(2, DEFAULT_BACKOFF, () => 0.5)).toBe(2000)
    expect(computeBackoffDelay(2, DEFAULT_BACKOFF, () => 0.999999)).toBeCloseTo(2400, 0)
  })

  it('keeps jittered delays within the maximum', () => {
    expect(computeBackoffDelay(20, DEFAULT_BACKOFF, () => 0.999)).toBeLessThanOrEqual(30_000)
  })
})
