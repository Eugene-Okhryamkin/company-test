import styled from 'styled-components'
import { AppProviders } from '@/app/app-providers'
import { OrgTreePanel } from '@/widgets/org-tree/org-tree-panel'

const Header = styled.header`
  display: flex;
  align-items: baseline;
  gap: 12px;
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
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
`

export function App() {
  return (
    <AppProviders>
      <Header>
        <Title>Staff Pulse</Title>
        <Subtitle>мониторинг оргструктуры</Subtitle>
      </Header>
      <Main>
        <OrgTreePanel />
      </Main>
    </AppProviders>
  )
}
