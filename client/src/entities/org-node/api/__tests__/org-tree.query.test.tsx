import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orgTreeQueryKey, useOrgTreeQuery } from '@/entities/org-node/api/org-tree.query'
import { ApiError } from '@/shared/api/http-client'
import { createQueryClient } from '@/shared/api/query-client'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'

const fetchMock = vi.fn<typeof fetch>()
let client: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)
const strictWrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </StrictMode>
)
const requestsTo = (url: string) => fetchMock.mock.calls.filter(([input]) => input === url).length

beforeEach(() => {
  client = createQueryClient()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('useOrgTreeQuery', () => {
  it('uses a stable query key', () => {
    expect(orgTreeQueryKey).toEqual(['org-tree'])
  })

  it('loads and validates the org tree: pending → success', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    const { result } = renderHook(() => useOrgTreeQuery(), { wrapper })

    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(sampleOrgNodes)
    expect(requestsTo('/api/org-tree')).toBe(1)
  })

  it('exposes an invalid response as a validation error without retrying', async () => {
    fetchMock.mockResolvedValue(Response.json([makeOrgNode({ performance: 101 })]))
    const { result } = renderHook(() => useOrgTreeQuery(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error).toMatchObject({ kind: 'validation' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends a single request under StrictMode double mounting', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    const { result } = renderHook(() => useOrgTreeQuery(), { wrapper: strictWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves fresh cached data on remount without a new request', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    const first = renderHook(() => useOrgTreeQuery(), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()

    const second = renderHook(() => useOrgTreeQuery(), { wrapper })

    expect(second.result.current).toMatchObject({ isSuccess: true, isFetching: false, data: sampleOrgNodes })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows stale data immediately and revalidates it in the background', async () => {
    const updated = sampleOrgNodes.map((n) => ({ ...n, headcount: n.headcount + 1 }))
    client.setQueryData(orgTreeQueryKey, sampleOrgNodes, { updatedAt: Date.now() - 5_000 })
    fetchMock.mockResolvedValue(Response.json(updated))

    const { result } = renderHook(() => useOrgTreeQuery(), { wrapper })

    expect(result.current).toMatchObject({ data: sampleOrgNodes, isFetching: true })
    await waitFor(() => expect(result.current).toMatchObject({ data: updated, isFetching: false }))
  })

  it('keeps the data reference when a refetch returns identical data', async () => {
    fetchMock.mockImplementation(async () => Response.json(sampleOrgNodes))
    const { result } = renderHook(() => useOrgTreeQuery(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const before = result.current.data

    await act(() => result.current.refetch())
    await waitFor(() => expect(client.getQueryState(orgTreeQueryKey)?.dataUpdateCount).toBe(2))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(client.getQueryData(orgTreeQueryKey)).toBe(before)
    expect(result.current.data).toBe(before)
  })

  it('does not re-render a component that reads only data when identical data arrives', async () => {
    fetchMock.mockImplementation(async () => Response.json(sampleOrgNodes))
    let renders = 0
    const { result } = renderHook(
      () => {
        renders += 1
        return useOrgTreeQuery().data
      },
      { wrapper },
    )
    await waitFor(() => expect(result.current).toBeDefined())
    const rendersAfterLoad = renders

    await act(() => client.refetchQueries({ queryKey: orgTreeQueryKey }))
    await waitFor(() => expect(client.getQueryState(orgTreeQueryKey)?.dataUpdateCount).toBe(2))
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))

    expect(renders).toBe(rendersAfterLoad)
  })

  it('replaces only changed nodes when a refetch returns different data', async () => {
    const changed = sampleOrgNodes.map((n) => (n.id === 'd1-1' ? { ...n, headcount: 99 } : n))
    fetchMock
      .mockResolvedValueOnce(Response.json(sampleOrgNodes))
      .mockResolvedValueOnce(Response.json(changed))
    const { result } = renderHook(() => useOrgTreeQuery(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const before = result.current.data!

    await act(() => result.current.refetch())
    await waitFor(() => expect(result.current.data).not.toBe(before))
    const after = result.current.data!

    expect(after.find((n) => n.id === 'd1-1')).toMatchObject({ headcount: 99 })
    expect(after.find((n) => n.id === 'd1-1')).not.toBe(before.find((n) => n.id === 'd1-1'))
    expect(after.find((n) => n.id === 'd2')).toBe(before.find((n) => n.id === 'd2'))
  })

  it('aborts the in-flight request when the component unmounts', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { unmount } = renderHook(() => useOrgTreeQuery(), { wrapper })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const { signal } = fetchMock.mock.calls[0]![1] as RequestInit

    unmount()

    await waitFor(() => expect(signal?.aborted).toBe(true))
  })
})
