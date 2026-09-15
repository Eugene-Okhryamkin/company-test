import { describe, expect, it } from 'vitest'
import { createQueryClient, QUERY_STALE_TIME } from '@/shared/api/query-client'

describe('createQueryClient', () => {
  it('treats data as fresh for 5 seconds', () => {
    expect(QUERY_STALE_TIME).toBe(5_000)
    expect(createQueryClient().getDefaultOptions().queries?.staleTime).toBe(5_000)
  })

  it('does not retry automatically: the UI offers an explicit retry', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(false)
  })

  it('revalidates stale data when the window regains focus', () => {
    expect(createQueryClient().getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true)
  })

  it('keeps structural sharing on, so unchanged data keeps its reference', () => {
    expect(createQueryClient().getDefaultOptions().queries?.structuralSharing).toBe(true)
  })

  it('creates independent caches', () => {
    expect(createQueryClient().getQueryCache()).not.toBe(createQueryClient().getQueryCache())
  })
})
