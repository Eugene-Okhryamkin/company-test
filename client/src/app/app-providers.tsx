import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'
import { queryClient as defaultQueryClient } from '@/app/query-client'
import { GlobalStyle } from '@/shared/styles/global-style'
import { theme } from '@/shared/styles/theme'

interface AppProvidersProps {
  children: ReactNode
  client?: QueryClient
}

export function AppProviders({ children, client = defaultQueryClient }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
