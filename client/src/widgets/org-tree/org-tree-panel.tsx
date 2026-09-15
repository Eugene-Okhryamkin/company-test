import styled from 'styled-components'
import { useOrgTreeQuery } from '@/entities/org-node/api/org-tree.query'
import { getErrorMessage } from '@/shared/api/get-error-message'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorState } from '@/shared/ui/error-state'
import { LoadingState } from '@/shared/ui/loading-state'
import { OrgTree } from '@/widgets/org-tree/org-tree'

const Panel = styled.section`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
`

const Heading = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
`

export function OrgTreePanel() {
  const { data, error, isError, isFetching, refetch } = useOrgTreeQuery()
  const retry = () => {
    void refetch()
  }

  const renderContent = () => {
    if (data === undefined) {
      return isError && !isFetching ? (
        <ErrorState title="Не удалось загрузить оргструктуру" description={getErrorMessage(error)} onRetry={retry} />
      ) : (
        <LoadingState label="Загружаем оргструктуру…" />
      )
    }
    if (data.length === 0) {
      return <EmptyState title="Подразделений пока нет" description="Сервер вернул пустую оргструктуру." />
    }
    return <OrgTree nodes={data} />
  }

  return (
    <Panel aria-labelledby="org-tree-heading">
      <Heading id="org-tree-heading">Оргструктура</Heading>
      {isError && data !== undefined && (
        <ErrorState variant="inline" title="Не удалось обновить данные" description={getErrorMessage(error)} onRetry={retry} />
      )}
      {renderContent()}
    </Panel>
  )
}
