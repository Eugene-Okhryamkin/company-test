export const LIVE_UPDATES_PATH = '/api/live'

/** A connection is considered dead after this many missed server heartbeats. */
export const HEARTBEAT_TIMEOUT_FACTOR = 2.5

/** ws://host/api/live for http pages, wss:// for https — same origin as the app (nginx / Vite proxy). */
export function getLiveUpdatesUrl(location: URL): string {
  const url = new URL(LIVE_UPDATES_PATH, location)
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
