import { computeBackoffDelay, DEFAULT_BACKOFF, type BackoffOptions } from '@/shared/lib/live/backoff'

export type ConnectionStatus =
  | { state: 'connecting' }
  | { state: 'open' }
  | { state: 'reconnecting'; attempt: number; retryInMs: number; retryAt: number }
  | { state: 'offline' }
  | { state: 'closed' }

export interface ReconnectingSocketOptions {
  url: string
  onMessage: (data: string) => void
  onStatusChange?: (status: ConnectionStatus) => void
  createSocket?: (url: string) => WebSocket
  backoff?: BackoffOptions
  random?: () => number
  /** Close the connection if nothing arrives for this long (server heartbeats keep it alive). */
  heartbeatTimeoutMs?: number
  /** Abandon an attempt that has not opened after this long (e.g. a proxy waiting for a dead upstream). */
  connectTimeoutMs?: number
}

const DEFAULT_HEARTBEAT_TIMEOUT_MS = 45_000
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000

/**
 * WebSocket that stays connected:
 * - exponential backoff with jitter between attempts, reset after a successful connection;
 * - watchdog: an attempt that does not open in time, or a connection that goes silent
 *   (no messages, no heartbeats), is closed and retried;
 * - pauses while the browser is offline and reconnects immediately when it is back online.
 */
export class ReconnectingSocket {
  private readonly options: ReconnectingSocketOptions
  private socket: WebSocket | null = null
  private attempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimeoutMs: number
  private started = false
  private currentStatus: ConnectionStatus = { state: 'closed' }

  constructor(options: ReconnectingSocketOptions) {
    this.options = options
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS
  }

  get status(): ConnectionStatus {
    return this.currentStatus
  }

  start(): void {
    if (this.started) return
    this.started = true
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    this.connect()
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    this.clearTimers()
    this.teardownSocket()
    this.setStatus({ state: 'closed' })
  }

  /** Skip the remaining backoff delay and try right away. */
  reconnectNow(): void {
    if (!this.started) return
    this.clearTimers()
    this.teardownSocket()
    this.connect()
  }

  setHeartbeatTimeout(ms: number): void {
    this.heartbeatTimeoutMs = ms
    if (this.currentStatus.state === 'open') this.armWatchdog()
  }

  private connect(): void {
    this.setStatus({ state: 'connecting' })
    let socket: WebSocket
    try {
      socket = (this.options.createSocket ?? ((url) => new WebSocket(url)))(this.options.url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.socket = socket
    this.armWatchdog(this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS)

    socket.onopen = () => {
      if (socket !== this.socket) return
      this.attempt = 0
      this.setStatus({ state: 'open' })
      this.armWatchdog()
    }
    socket.onmessage = (event: MessageEvent) => {
      if (socket !== this.socket) return
      this.armWatchdog()
      if (typeof event.data === 'string') this.options.onMessage(event.data)
    }
    socket.onerror = () => {
      if (socket === this.socket) this.handleDisconnect()
    }
    socket.onclose = () => {
      if (socket === this.socket) this.handleDisconnect()
    }
  }

  private handleDisconnect(): void {
    this.teardownSocket()
    this.clearTimers()
    if (!this.started) return
    if (!navigator.onLine) {
      this.setStatus({ state: 'offline' })
      return
    }
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    const delay = computeBackoffDelay(this.attempt, this.options.backoff ?? DEFAULT_BACKOFF, this.options.random)
    this.attempt += 1
    this.setStatus({ state: 'reconnecting', attempt: this.attempt, retryInMs: delay, retryAt: Date.now() + delay })
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, delay)
  }

  private armWatchdog(timeoutMs: number = this.heartbeatTimeoutMs): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer)
    this.watchdogTimer = setTimeout(() => {
      this.watchdogTimer = null
      // Silent connection: close it; onclose schedules the reconnect.
      const socket = this.socket
      socket?.close()
      if (socket === this.socket) this.handleDisconnect()
    }, timeoutMs)
  }

  private teardownSocket(): void {
    const socket = this.socket
    if (!socket) return
    this.socket = null
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) socket.close()
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer)
    this.retryTimer = null
    this.watchdogTimer = null
  }

  private readonly handleOnline = (): void => {
    if (this.started && this.currentStatus.state !== 'open' && this.currentStatus.state !== 'connecting') {
      this.reconnectNow()
    }
  }

  private readonly handleOffline = (): void => {
    if (!this.started) return
    this.clearTimers()
    this.teardownSocket()
    this.setStatus({ state: 'offline' })
  }

  private setStatus(status: ConnectionStatus): void {
    this.currentStatus = status
    this.options.onStatusChange?.(status)
  }
}
