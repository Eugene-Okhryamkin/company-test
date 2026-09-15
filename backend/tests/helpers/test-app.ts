import { asValue } from 'awilix';
import { createApp } from '@/app.js';
import { loadConfig } from '@/config.js';
import { createAppContainer, type Cradle } from '@/di/container.js';

/** Builds the real app with the real container; selected registrations can be replaced by values. */
export function createTestApp(overrides: Partial<Cradle> = {}) {
  const container = createAppContainer(loadConfig({}));
  for (const [name, value] of Object.entries(overrides)) {
    container.register(name, asValue(value));
  }
  return { app: createApp(container), container };
}
