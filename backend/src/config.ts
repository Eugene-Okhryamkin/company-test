const DEFAULT_PORT = 8080;

export interface LiveUpdatesConfig {
  /** Run the change simulator (the mock "real-time" data source). */
  enabled: boolean;
  /** How often the simulator changes data, ms. */
  intervalMs: number;
  /** Upper bound of nodes changed per tick. */
  maxNodesPerTick: number;
  /** How often the gateway pings clients and sends a heartbeat message, ms. */
  heartbeatIntervalMs: number;
}

export interface AppConfig {
  port: number;
  /** undefined → listen on "::" (IPv4 + IPv6), Node falls back to 0.0.0.0. */
  host: string | undefined;
  env: string;
  liveUpdates: LiveUpdatesConfig;
}

export function parsePort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return DEFAULT_PORT;
  const port = Number(value);
  return port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

/** Positive integer from env; invalid → fallback; below `min` → min. */
function parsePositiveInt(value: string | undefined, fallback: number, min = 1): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  return Math.max(Number(value), min);
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    port: parsePort(env.PORT),
    host: env.HOST || undefined,
    env: env.NODE_ENV || 'development',
    liveUpdates: {
      enabled: env.LIVE_UPDATES_ENABLED !== 'false',
      intervalMs: parsePositiveInt(env.LIVE_UPDATE_INTERVAL_MS, 3000, 250),
      maxNodesPerTick: parsePositiveInt(env.LIVE_UPDATE_MAX_NODES, 3),
      heartbeatIntervalMs: parsePositiveInt(env.LIVE_HEARTBEAT_INTERVAL_MS, 15000),
    },
  };
}
