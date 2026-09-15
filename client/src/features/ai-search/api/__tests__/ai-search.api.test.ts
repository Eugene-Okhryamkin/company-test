import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAiSearchStatus, interpretSearchQuery } from '@/features/ai-search/api/ai-search.api'
import { EMPTY_SEARCH_FILTER } from '@/features/ai-search/model/search-filter.schema'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('fetchAiSearchStatus', () => {
  it('reads whether AI search is enabled', async () => {
    fetchMock.mockResolvedValue(Response.json({ aiEnabled: true }))

    await expect(fetchAiSearchStatus(new AbortController().signal)).resolves.toEqual({ aiEnabled: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/search/status', expect.anything())
  })
})

describe('interpretSearchQuery', () => {
  it('posts the query and returns the validated filter', async () => {
    const filter = { ...EMPTY_SEARCH_FILTER, levels: [3], limit: 3 }
    fetchMock.mockResolvedValue(Response.json({ filter }))

    await expect(interpretSearchQuery('три команды')).resolves.toEqual(filter)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/search/interpret',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ query: 'три команды' }) }),
    )
  })

  it.each([
    ['an unknown level', { ...EMPTY_SEARCH_FILTER, levels: [7] }],
    ['a negative budget', { ...EMPTY_SEARCH_FILTER, totalBudget: { min: -1, max: null } }],
    ['performance above 100', { ...EMPTY_SEARCH_FILTER, avgPerformance: { min: 101, max: null } }],
    ['an unknown sort key', { ...EMPTY_SEARCH_FILTER, sort: { key: 'salary', direction: 'asc' } }],
    ['a zero limit', { ...EMPTY_SEARCH_FILTER, limit: 0 }],
    ['a missing field', { ...EMPTY_SEARCH_FILTER, levels: undefined }],
  ])('rejects a filter with %s', async (_label, filter) => {
    fetchMock.mockResolvedValue(Response.json({ filter }))
    await expect(interpretSearchQuery('x')).rejects.toMatchObject({ kind: 'validation' })
  })
})
