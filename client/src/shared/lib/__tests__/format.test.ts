import { describe, expect, it } from 'vitest'
import { formatNumber, formatPerformance, formatRub } from '@/shared/lib/format'

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1000, '1 000'],
    [12345678, '12 345 678'],
    [1234567.6, '1 234 568'],
    [-1234, '-1 234'],
  ])('%s → "%s" (regular spaces as thousand separators)', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

describe('formatRub', () => {
  it('formats budgets as "12 345 678 руб."', () => {
    expect(formatRub(12_345_678)).toBe('12 345 678 руб.')
    expect(formatRub(0)).toBe('0 руб.')
  })
})

describe('formatPerformance', () => {
  it.each([
    [63.476, '63,5'],
    [40, '40,0'],
    [100, '100,0'],
    [0.04, '0,0'],
  ])('%s → "%s"', (value, expected) => {
    expect(formatPerformance(value)).toBe(expected)
  })
})
