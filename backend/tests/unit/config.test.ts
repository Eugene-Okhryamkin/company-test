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
    expect(loadConfig({})).toEqual({ port: 8080, host: undefined, env: 'development' });
  });

  it('reads PORT, HOST and NODE_ENV', () => {
    expect(loadConfig({ PORT: '9000', HOST: '127.0.0.1', NODE_ENV: 'production' })).toEqual({
      port: 9000,
      host: '127.0.0.1',
      env: 'production',
    });
  });
});
