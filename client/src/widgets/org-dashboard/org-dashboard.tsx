import { useState } from 'react'
import { useOrgTreeModelQuery } from '@/entities/org-node/api/org-tree.query'
import type { OrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { getErrorMessage } from '@/shared/api/get-error-message'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorState } from '@/shared/ui/error-state'
import { LoadingState } from '@/shared/ui/loading-state'
import { Panel, PanelBody, PanelHeading } from '@/shared/ui/panel'
import { SplitLayout, Stack, Switch, SwitchButton, Toolbar } from '@/widgets/org-dashboard/org-dashboard.styles'
import { OrgTable } from '@/widgets/org-table/org-table'
import { OrgTree } from '@/widgets/org-tree/org-tree'

/** From this width tree and table are shown side by side. */
export const SPLIT_VIEW_MEDIA_QUERY = '(min-width: 1280px)'

type View = 'tree' | 'table'

const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'tree', label: 'Дерево' },
  { value: 'table', label: 'Таблица' },
]

export function OrgDashboard() {
  const { data: model, error, isError, isFetching, refetch } = useOrgTreeModelQuery()
  const retry = () => {
    void refetch()
  }

  if (model === undefined) {
    return (
      <Panel aria-labelledby="org-dashboard-heading">
        <PanelHeading id="org-dashboard-heading">Оргструктура</PanelHeading>
        {isError && !isFetching ? (
          <ErrorState title="Не удалось загрузить оргструктуру" description={getErrorMessage(error)} onRetry={retry} />
        ) : (
          <LoadingState label="Загружаем оргструктуру…" />
        )}
      </Panel>
    )
  }

  return (
    <Stack>
      {isError && (
        <ErrorState variant="inline" title="Не удалось обновить данные" description={getErrorMessage(error)} onRetry={retry} />
      )}
      {model.rows.length === 0 ? (
        <Panel aria-labelledby="org-dashboard-heading">
          <PanelHeading id="org-dashboard-heading">Оргструктура</PanelHeading>
          <EmptyState title="Подразделений пока нет" description="Сервер вернул пустую оргструктуру." />
        </Panel>
      ) : (
        <DashboardContent model={model} />
      )}
    </Stack>
  )
}

function DashboardContent({ model }: { model: OrgTreeModel }) {
  const isSplitView = useMediaQuery(SPLIT_VIEW_MEDIA_QUERY)
  const [view, setView] = useState<View>('tree')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const treePanel = (
    <Panel aria-labelledby="org-tree-heading">
      <PanelHeading id="org-tree-heading">Оргструктура</PanelHeading>
      <PanelBody>
        <OrgTree model={model} selectedId={selectedId} onSelect={setSelectedId} />
      </PanelBody>
    </Panel>
  )

  const tablePanel = (
    <Panel aria-labelledby="org-table-heading">
      <PanelHeading id="org-table-heading">Аналитика</PanelHeading>
      <PanelBody>
        <OrgTable rows={model.rows} selectedId={selectedId} onSelect={setSelectedId} />
      </PanelBody>
    </Panel>
  )

  if (isSplitView) {
    return (
      <SplitLayout>
        {treePanel}
        {tablePanel}
      </SplitLayout>
    )
  }

  return (
    <>
      <Toolbar>
        <Switch role="group" aria-label="Режим отображения">
          {VIEWS.map(({ value, label }) => (
            <SwitchButton key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)}>
              {label}
            </SwitchButton>
          ))}
        </Switch>
      </Toolbar>
      {view === 'tree' ? treePanel : tablePanel}
    </>
  )
}
