import { describe, expect, it } from 'vitest'
import { getPerformanceLevel, PERFORMANCE_LABELS } from '@/entities/org-node/model/performance'

describe('getPerformanceLevel', () => {
  it.each([
    [100, 'high'],
    [80, 'high'],
    [79.9, 'medium'],
    [60, 'medium'],
    [59.9, 'low'],
    [0, 'low'],
  ] as const)('%s → %s', (value, level) => {
    expect(getPerformanceLevel(value)).toBe(level)
  })

  it('has a human-readable label for every level', () => {
    expect(PERFORMANCE_LABELS).toEqual({ high: 'высокая', medium: 'средняя', low: 'низкая' })
  })
})
