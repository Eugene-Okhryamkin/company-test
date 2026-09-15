const DEFAULT_PORT = 8080;

export interface AppConfig {
  port: number;
  /** undefined → listen on "::" (IPv4 + IPv6), Node falls back to 0.0.0.0. */
  host: string | undefined;
  env: string;
}

export function parsePort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return DEFAULT_PORT;
  const port = Number(value);
  return port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    port: parsePort(env.PORT),
    host: env.HOST || undefined,
    env: env.NODE_ENV || 'development',
  };
}
