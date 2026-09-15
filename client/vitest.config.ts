import { fileURLToPath, URL } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      // styled-components ships a separate browser build via the legacy "browser" field, which Vitest
      // does not apply; its Node build never injects createGlobalStyle into the DOM.
      alias: [
        {
          find: /^styled-components$/,
          replacement: fileURLToPath(
            new URL('./node_modules/styled-components/dist/styled-components.browser.esm.js', import.meta.url),
          ),
        },
      ],
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts', 'src/vite-env.d.ts'],
        reporter: ['text', 'html'],
      },
    },
  }),
)
