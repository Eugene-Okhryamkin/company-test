import { describe, expect, it } from 'vitest'
import { normalizeSearchText } from '@/shared/lib/normalize-search-text'

describe('normalizeSearchText', () => {
  it('lower-cases, trims and treats ё as е', () => {
    expect(normalizeSearchText('  Ёлка API ')).toBe('елка api')
  })
})
