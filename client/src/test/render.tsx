import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'
import { createQueryClient } from '@/shared/api/query-client'
import { theme } from '@/shared/styles/theme'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  client?: QueryClient
}

/** Fresh production-configured QueryClient per test, so the cache never leaks between tests. */
export function renderWithProviders(ui: ReactElement, { client = createQueryClient(), ...options }: Options = {}) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) }
}

/** Elements carrying inline CSS. The project forbids them. */
export const inlineStyled = (root: ParentNode = document.body) => root.querySelectorAll('[style]')
