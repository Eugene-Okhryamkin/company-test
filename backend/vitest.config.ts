import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors "paths" in tsconfig.json / tsconfig.test.json.
    alias: {
      '@tests': fromRoot('./tests'),
      '@': fromRoot('./src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // index.ts is the process bootstrap; models and DTOs are type-only.
      exclude: ['src/index.ts', 'src/models/**', 'src/dto/**'],
      reporter: ['text', 'html'],
    },
  },
});
