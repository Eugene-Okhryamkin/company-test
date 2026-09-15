import type { QueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { AppProviders } from '@/app/app-providers'
import { LiveUpdatesProvider } from '@/features/live-updates/live-updates-provider'
import { ConnectionIndicator } from '@/features/live-updates/ui/connection-indicator'
import { OrgDashboard } from '@/widgets/org-dashboard/org-dashboard'

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  padding: 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
`

const Subtitle = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`

const Main = styled.main`
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
`

interface AppProps {
  /** Injection point for tests; the app-wide client is used by default. */
  queryClient?: QueryClient
}

export function App({ queryClient }: AppProps) {
  return (
    <AppProviders client={queryClient}>
      <LiveUpdatesProvider>
        <Header>
          <Title>Staff Pulse</Title>
          <Subtitle>мониторинг оргструктуры</Subtitle>
          <ConnectionIndicator />
        </Header>
        <Main>
          <OrgDashboard />
        </Main>
      </LiveUpdatesProvider>
    </AppProviders>
  )
}
