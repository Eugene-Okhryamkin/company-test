import { describe, expect, it } from 'vitest';
import { loadConfig, parsePort } from '@/config.js';

describe('parsePort', () => {
  it('returns the port from a valid string', () => {
    expect(parsePort('3000')).toBe(3000);
  });

  it.each([undefined, '', 'abc', '0', '-1', '65536', '80.5'])(
    'falls back to 8080 for invalid value %s',
    (value) => {
      expect(parsePort(value)).toBe(8080);
    },
  );
});

describe('loadConfig', () => {
  it('uses defaults for an empty environment', () => {
    expect(loadConfig({})).toEqual({
      port: 8080,
      host: undefined,
      env: 'development',
      liveUpdates: { enabled: true, intervalMs: 3000, maxNodesPerTick: 3, heartbeatIntervalMs: 15000 },
      aiSearch: {
        apiKey: undefined,
        model: 'gpt-5.6-luna',
        baseUrl: 'https://api.openai.com/v1',
        timeoutMs: 15000,
      },
    });
  });

  it('reads PORT, HOST, NODE_ENV and live update settings', () => {
    expect(
      loadConfig({
        PORT: '9000',
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        LIVE_UPDATES_ENABLED: 'false',
        LIVE_UPDATE_INTERVAL_MS: '1000',
        LIVE_UPDATE_MAX_NODES: '5',
        LIVE_HEARTBEAT_INTERVAL_MS: '20000',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_MODEL: 'gpt-test',
        OPENAI_BASE_URL: 'http://llm.local/v1',
        AI_SEARCH_TIMEOUT_MS: '5000',
      }),
    ).toEqual({
      port: 9000,
      host: '127.0.0.1',
      env: 'production',
      liveUpdates: { enabled: false, intervalMs: 1000, maxNodesPerTick: 5, heartbeatIntervalMs: 20000 },
      aiSearch: { apiKey: 'sk-test', model: 'gpt-test', baseUrl: 'http://llm.local/v1', timeoutMs: 5000 },
    });
  });

  it.each([
    [{ LIVE_UPDATE_INTERVAL_MS: 'soon' }, 'intervalMs', 3000],
    [{ LIVE_UPDATE_INTERVAL_MS: '10' }, 'intervalMs', 250],
    [{ LIVE_UPDATE_MAX_NODES: '0' }, 'maxNodesPerTick', 1],
    [{ LIVE_HEARTBEAT_INTERVAL_MS: '-5' }, 'heartbeatIntervalMs', 15000],
  ] as const)('sanitises %j', (env, key, expected) => {
    expect(loadConfig(env).liveUpdates[key]).toBe(expected);
  });
});

describe('loadConfig aiSearch', () => {
  it('treats a blank API key and model as not set', () => {
    const { aiSearch } = loadConfig({ OPENAI_API_KEY: '  ', OPENAI_MODEL: '' });
    expect(aiSearch.apiKey).toBeUndefined();
    expect(aiSearch.model).toBe('gpt-5.6-luna');
  });

  it('keeps the AI timeout sane', () => {
    expect(loadConfig({ AI_SEARCH_TIMEOUT_MS: 'fast' }).aiSearch.timeoutMs).toBe(15000);
    expect(loadConfig({ AI_SEARCH_TIMEOUT_MS: '10' }).aiSearch.timeoutMs).toBe(1000);
  });
});
