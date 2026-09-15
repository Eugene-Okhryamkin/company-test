import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReconnectingSocket, type ConnectionStatus } from '@/shared/lib/live/reconnecting-socket'
import { FakeWebSocket } from '@/test/fake-web-socket'

let statuses: ConnectionStatus[]
let messages: string[]
const created: ReconnectingSocket[] = []

function createSocket(options: Partial<ConstructorParameters<typeof ReconnectingSocket>[0]> = {}) {
  const socket = new ReconnectingSocket({
    url: 'ws://test/api/live',
    createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
    onMessage: (data) => messages.push(data),
    onStatusChange: (status) => statuses.push(status),
    random: () => 0.5, // no jitter
    ...options,
  })
  created.push(socket)
  return socket
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeWebSocket.reset()
  statuses = []
  messages = []
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})
afterEach(() => {
  // Stop every socket so window listeners and timers never leak into the next test.
  created.splice(0).forEach((socket) => socket.stop())
  vi.useRealTimers()
})

describe('ReconnectingSocket', () => {
  it('connects on start and reports connecting → open', () => {
    const socket = createSocket()
    socket.start()

    expect(FakeWebSocket.latest.url).toBe('ws://test/api/live')
    expect(socket.status).toEqual({ state: 'connecting' })

    FakeWebSocket.latest.open()
    expect(socket.status).toEqual({ state: 'open' })
    expect(statuses.map((s) => s.state)).toEqual(['connecting', 'open'])
  })

  it('forwards text messages', () => {
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.open()

    FakeWebSocket.latest.receive({ type: 'hello' })
    expect(messages).toEqual(['{"type":"hello"}'])
  })

  it('reconnects with exponential backoff after the connection drops', () => {
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.drop()

    expect(socket.status).toMatchObject({ state: 'reconnecting', attempt: 1, retryInMs: 500 })
    vi.advanceTimersByTime(499)
    expect(FakeWebSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(2)

    FakeWebSocket.latest.drop()
    expect(socket.status).toMatchObject({ state: 'reconnecting', attempt: 2, retryInMs: 1000 })
    vi.advanceTimersByTime(1000)
    FakeWebSocket.latest.drop()
    expect(socket.status).toMatchObject({ attempt: 3, retryInMs: 2000 })
  })

  it('resets the backoff after a successful connection', () => {
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.drop()
    vi.advanceTimersByTime(500)
    FakeWebSocket.latest.drop()
    vi.advanceTimersByTime(1000)

    FakeWebSocket.latest.open()
    FakeWebSocket.latest.drop()

    expect(socket.status).toMatchObject({ state: 'reconnecting', attempt: 1, retryInMs: 500 })
  })

  it('exposes the moment of the next attempt', () => {
    vi.setSystemTime(new Date('2026-09-15T10:00:00.000Z'))
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.drop()

    expect(socket.status).toMatchObject({ retryAt: Date.parse('2026-09-15T10:00:00.500Z') })
  })

  it('closes a silent connection after the heartbeat timeout and reconnects', () => {
    const socket = createSocket({ heartbeatTimeoutMs: 1000 })
    socket.start()
    FakeWebSocket.latest.open()

    vi.advanceTimersByTime(900)
    FakeWebSocket.latest.receive({ type: 'heartbeat' })
    vi.advanceTimersByTime(900)
    expect(socket.status.state).toBe('open')

    vi.advanceTimersByTime(100)
    expect(FakeWebSocket.instances[0]!.closeCalls).toBe(1)
    expect(socket.status.state).toBe('reconnecting')
  })

  it('reconnects after a silent connection even when close() reports asynchronously (real browsers)', () => {
    const socket = createSocket({
      heartbeatTimeoutMs: 1000,
      createSocket: (url) => {
        const fake = new FakeWebSocket(url)
        fake.close = () => {
          fake.closeCalls += 1 // browsers fire onclose later, not inside close()
        }
        return fake as unknown as WebSocket
      },
    })
    socket.start()
    FakeWebSocket.latest.open()

    vi.advanceTimersByTime(1000)

    expect(socket.status.state).toBe('reconnecting')
    vi.advanceTimersByTime(500)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('abandons an attempt that does not open in time (e.g. a proxy waiting for a dead upstream) and retries', () => {
    const socket = createSocket({ connectTimeoutMs: 5000 })
    socket.start()

    vi.advanceTimersByTime(4999)
    expect(socket.status.state).toBe('connecting')

    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances[0]!.closeCalls).toBe(1)
    expect(socket.status).toMatchObject({ state: 'reconnecting', attempt: 1 })

    vi.advanceTimersByTime(500)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('uses a 10 s connect timeout by default', () => {
    const socket = createSocket()
    socket.start()
    vi.advanceTimersByTime(9999)
    expect(socket.status.state).toBe('connecting')
    vi.advanceTimersByTime(1)
    expect(socket.status.state).toBe('reconnecting')
  })

  it('lets the heartbeat timeout be adjusted (e.g. from the server hello)', () => {
    const socket = createSocket({ heartbeatTimeoutMs: 1000 })
    socket.start()
    FakeWebSocket.latest.open()

    socket.setHeartbeatTimeout(5000)
    vi.advanceTimersByTime(4000)
    expect(socket.status.state).toBe('open')
    vi.advanceTimersByTime(1000)
    expect(socket.status.state).toBe('reconnecting')
  })

  it('waits for the network when the browser is offline, then reconnects immediately', () => {
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.open()

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    window.dispatchEvent(new Event('offline'))
    expect(socket.status).toEqual({ state: 'offline' })
    vi.advanceTimersByTime(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
    window.dispatchEvent(new Event('online'))
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(socket.status).toEqual({ state: 'connecting' })
  })

  it('reconnectNow skips the remaining backoff delay', () => {
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.drop()
    vi.advanceTimersByTime(100)

    socket.reconnectNow()

    expect(FakeWebSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(10_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('stops for good: closes the socket, cancels timers and listeners', () => {
    const socket = createSocket({ heartbeatTimeoutMs: 1000 })
    socket.start()
    FakeWebSocket.latest.drop()

    socket.stop()
    vi.advanceTimersByTime(60_000)
    window.dispatchEvent(new Event('online'))

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(socket.status).toEqual({ state: 'closed' })
  })

  it('closes an open connection on stop without reconnecting', () => {
    const socket = createSocket()
    socket.start()
    const first = FakeWebSocket.latest
    first.open()

    socket.stop()

    expect(first.closeCalls).toBe(1)
    vi.advanceTimersByTime(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('ignores events from a socket it has already replaced', () => {
    const socket = createSocket()
    socket.start()
    const stale = FakeWebSocket.latest
    stale.drop()
    socket.reconnectNow()

    stale.receive({ type: 'late' })
    stale.onclose?.(new CloseEvent('close'))

    expect(messages).toEqual([])
    expect(socket.status).toEqual({ state: 'connecting' })
  })

  it('treats a socket error as a dropped connection', () => {
    const socket = createSocket()
    socket.start()
    FakeWebSocket.latest.onerror?.(new Event('error'))
    expect(socket.status.state).toBe('reconnecting')
  })

  it('does not start twice', () => {
    const socket = createSocket()
    socket.start()
    socket.start()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('reports a failure to construct the socket as a retry', () => {
    const socket = createSocket({
      createSocket: () => {
        throw new Error('bad url')
      },
    })
    socket.start()
    expect(socket.status).toMatchObject({ state: 'reconnecting', attempt: 1 })
  })
})
