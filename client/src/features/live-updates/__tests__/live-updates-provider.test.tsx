import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { orgTreeQueryKey, useOrgTreeQuery } from '@/entities/org-node/api/org-tree.query'
import { getDataVersion } from '@/entities/org-node/live/data-version'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'
import { LiveUpdatesProvider } from '@/features/live-updates/live-updates-provider'
import { getLiveUpdatesUrl, HEARTBEAT_TIMEOUT_FACTOR } from '@/features/live-updates/live-url'
import { useLiveStatus } from '@/features/live-updates/use-live-status'
import { createQueryClient } from '@/shared/api/query-client'
import { ReconnectingSocket } from '@/shared/lib/live/reconnecting-socket'
import { FakeWebSocket } from '@/test/fake-web-socket'
import { sampleOrgNodes } from '@/test/fixtures'

const fetchMock = vi.fn<typeof fetch>()
let client: QueryClient

function Probe() {
  const status = useLiveStatus()
  const { data } = useOrgTreeQuery()
  return (
    <>
      <output data-testid="status">{status.state}</output>
      <output data-testid="headcount">{data?.find((n) => n.id === 'd1-1')?.headcount ?? '-'}</output>
    </>
  )
}

const renderProvider = () =>
  render(
    <QueryClientProvider client={client}>
      <LiveUpdatesProvider createSocket={(url) => new FakeWebSocket(url) as unknown as WebSocket}>
        <Probe />
      </LiveUpdatesProvider>
    </QueryClientProvider>,
  )

const snapshot = (version: number) => Response.json(sampleOrgNodes, { headers: { 'X-Data-Version': String(version) } })
const send = (message: unknown) => act(() => FakeWebSocket.latest.receive(message))
const patchD11 = (version: number, headcount: number) => ({
  type: 'patch',
  version,
  nodes: [{ id: 'd1-1', headcount, budget: 1_000_000, performance: 65, updatedAt: '2026-09-15T10:00:00.000Z' }],
})

async function renderConnected(version = 5) {
  fetchMock.mockResolvedValue(snapshot(version))
  const view = renderProvider()
  await waitFor(() => expect(screen.getByTestId('headcount')).toHaveTextContent('3'))
  act(() => FakeWebSocket.latest.open())
  fetchMock.mockClear()
  return view
}

beforeEach(() => {
  FakeWebSocket.reset()
  client = createQueryClient()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('LiveUpdatesProvider', () => {
  it('derives the WebSocket URL from the page location (ws/wss)', () => {
    expect(getLiveUpdatesUrl(new URL('http://example.com/dashboard'))).toBe('ws://example.com/api/live')
    expect(getLiveUpdatesUrl(new URL('https://example.com:8443/'))).toBe('wss://example.com:8443/api/live')
  })

  it('connects on mount and exposes the connection status', async () => {
    fetchMock.mockResolvedValue(snapshot(1))
    renderProvider()

    expect(FakeWebSocket.latest.url).toBe(getLiveUpdatesUrl(new URL(window.location.href)))
    expect(screen.getByTestId('status')).toHaveTextContent('connecting')

    act(() => FakeWebSocket.latest.open())
    expect(screen.getByTestId('status')).toHaveTextContent('open')
  })

  it('applies a patch into the cached data without refetching', async () => {
    await renderConnected(5)

    send(patchD11(6, 42))

    expect(getDataVersion(client.getQueryData<OrgNode[]>(orgTreeQueryKey)!)).toBe(6)
    // TanStack Query notifies observers on the next tick.
    await waitFor(() => expect(screen.getByTestId('headcount')).toHaveTextContent('42'))
    expect(getDataVersion(client.getQueryData<OrgNode[]>(orgTreeQueryKey)!)).toBe(6)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refetches the snapshot once when patches were missed', async () => {
    await renderConnected(5)
    fetchMock.mockResolvedValue(snapshot(8))

    send(patchD11(8, 42))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it('does not refetch on hello when the snapshot is up to date', async () => {
    await renderConnected(5)
    send({ type: 'hello', version: 5, heartbeatIntervalMs: 15000 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resyncs on (re)connect when the server version differs from the snapshot', async () => {
    await renderConnected(5)
    fetchMock.mockResolvedValue(snapshot(9))

    send({ type: 'hello', version: 9, heartbeatIntervalMs: 15000 })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(getDataVersion(client.getQueryData<OrgNode[]>(orgTreeQueryKey)!)).toBe(9))
  })

  it('resyncs when a heartbeat reveals a newer version', async () => {
    await renderConnected(5)
    fetchMock.mockResolvedValue(snapshot(6))

    send({ type: 'heartbeat', version: 6 })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it('marks the data fresh on a matching heartbeat, so it is not refetched on focus while live', async () => {
    await renderConnected(5)
    const before = client.getQueryState(orgTreeQueryKey)!.dataUpdatedAt
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(before + 60_000)

    send({ type: 'heartbeat', version: 5 })

    expect(client.getQueryState(orgTreeQueryKey)!.dataUpdatedAt).toBe(before + 60_000)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores live messages until the first snapshot has loaded', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderProvider()
    act(() => FakeWebSocket.latest.open())

    send({ type: 'hello', version: 3, heartbeatIntervalMs: 15000 })
    send(patchD11(4, 1))

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ignores malformed messages', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await renderConnected(5)

    send('not json')
    send({ type: 'patch', version: 6, nodes: [{ id: 'd1-1' }] })

    expect(screen.getByTestId('headcount')).toHaveTextContent('3')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
  })

  it('derives the silent-connection timeout from the server heartbeat interval', async () => {
    const setTimeoutSpy = vi.spyOn(ReconnectingSocket.prototype, 'setHeartbeatTimeout')
    await renderConnected(5)

    send({ type: 'hello', version: 5, heartbeatIntervalMs: 10_000 })

    expect(setTimeoutSpy).toHaveBeenCalledWith(10_000 * HEARTBEAT_TIMEOUT_FACTOR)
  })

  it('closes the connection on unmount', async () => {
    const view = await renderConnected(5)
    const socket = FakeWebSocket.latest

    view.unmount()

    expect(socket.closeCalls).toBe(1)
  })
})

describe('useLiveStatus', () => {
  it('reports "closed" outside of a provider', () => {
    function Outside() {
      return <output>{useLiveStatus().state}</output>
    }
    render(<Outside />)
    expect(screen.getByRole('status')).toHaveTextContent('closed')
  })
})
