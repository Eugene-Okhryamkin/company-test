import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { orgTreeQueryKey } from '@/entities/org-node/api/org-tree.query'
import * as aggregateModule from '@/entities/org-node/lib/aggregate-org-tree'
import { createQueryClient } from '@/shared/api/query-client'
import { OrgDashboard, SPLIT_VIEW_MEDIA_QUERY } from '@/widgets/org-dashboard/org-dashboard'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'
import { mockMatchMedia, resizeViewport } from '@/test/match-media'
import { inlineStyled, renderWithProviders } from '@/test/render'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  // @ts-expect-error jsdom does not implement scrollIntoView
  delete Element.prototype.scrollIntoView
})

const tree = () => screen.queryByRole('tree', { name: 'Оргструктура' })
const grid = () => screen.queryByRole('grid', { name: 'Аналитика по подразделениям' })
const viewButton = (name: 'Дерево' | 'Таблица') => screen.getByRole('button', { name })

describe('OrgDashboard — data states', () => {
  it('shows a loading state, then the content', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    renderWithProviders(<OrgDashboard />)

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем оргструктуру…')
    expect(await screen.findByRole('tree')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/org-tree', expect.anything())
  })

  it('shows an empty state for an empty response', async () => {
    fetchMock.mockResolvedValue(Response.json([]))
    renderWithProviders(<OrgDashboard />)

    expect(await screen.findByText('Подразделений пока нет')).toBeInTheDocument()
    expect(tree()).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Режим отображения' })).not.toBeInTheDocument()
  })

  it('shows an error state for a failed request and recovers on retry', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: 'Internal Server Error' }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(sampleOrgNodes))
    renderWithProviders(<OrgDashboard />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить оргструктуру')
    expect(alert).toHaveTextContent('Сервер вернул ошибку (500).')

    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByRole('tree')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the loading state again while retrying after an error', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockReturnValueOnce(new Promise(() => {}))
    renderWithProviders(<OrgDashboard />)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Загружаем оргструктуру…')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('treats a response that fails schema validation as an error', async () => {
    fetchMock.mockResolvedValue(Response.json([makeOrgNode({ headcount: -5 })]))
    renderWithProviders(<OrgDashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер вернул данные в неожиданном формате.')
    expect(tree()).not.toBeInTheDocument()
  })

  it('keeps showing cached data and warns when a background revalidation fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const client = createQueryClient()
    client.setQueryData(orgTreeQueryKey, sampleOrgNodes, { updatedAt: Date.now() - 5_000 })

    renderWithProviders(<OrgDashboard />, { client })

    expect(tree()).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось обновить данные')
    expect(tree()).toBeInTheDocument()
  })

  it('aborts the request when unmounted', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { unmount } = renderWithProviders(<OrgDashboard />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const { signal } = fetchMock.mock.calls[0]![1] as RequestInit

    unmount()

    await waitFor(() => expect(signal?.aborted).toBe(true))
  })
})

describe('OrgDashboard — layout', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
  })

  it('uses a 1280px breakpoint for the split view', () => {
    expect(SPLIT_VIEW_MEDIA_QUERY).toBe('(min-width: 1280px)')
  })

  it('below 1280px shows one view at a time with a Tree/Table switch (tree first)', async () => {
    const user = userEvent.setup()
    mockMatchMedia({ width: 1024 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('tree')

    expect(screen.getByRole('group', { name: 'Режим отображения' })).toBeInTheDocument()
    expect(viewButton('Дерево')).toHaveAttribute('aria-pressed', 'true')
    expect(grid()).not.toBeInTheDocument()

    await user.click(viewButton('Таблица'))

    expect(viewButton('Таблица')).toHaveAttribute('aria-pressed', 'true')
    expect(viewButton('Дерево')).toHaveAttribute('aria-pressed', 'false')
    expect(grid()).toBeInTheDocument()
    expect(tree()).not.toBeInTheDocument()
  })

  it('from 1280px shows tree and table side by side without the switch', async () => {
    mockMatchMedia({ width: 1280 })
    renderWithProviders(<OrgDashboard />)

    expect(await screen.findByRole('tree')).toBeInTheDocument()
    expect(grid()).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Режим отображения' })).not.toBeInTheDocument()
  })

  it('adapts when the window is resized', async () => {
    mockMatchMedia({ width: 1440 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('grid')

    resizeViewport(1000)
    expect(grid()).not.toBeInTheDocument()
    expect(tree()).toBeInTheDocument()

    resizeViewport(1600)
    expect(grid()).toBeInTheDocument()
  })

  it('uses no inline CSS', async () => {
    mockMatchMedia({ width: 1440 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('grid')
    expect(inlineStyled()).toHaveLength(0)
  })
})

describe('OrgDashboard — table ↔ tree', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
  })

  it('in split view, clicking a table row selects and reveals the node in the tree', async () => {
    const user = userEvent.setup()
    mockMatchMedia({ width: 1440 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('grid')

    await user.click(within(grid()!).getByRole('gridcell', { name: 'Core API' }))

    expect(within(tree()!).getByRole('treeitem', { selected: true })).toHaveAccessibleName('Core API')
    expect(within(grid()!).getByRole('row', { selected: true })).toHaveTextContent('Core API')
  })

  it('in switch mode, the selection made in the table is shown when switching to the tree', async () => {
    const user = userEvent.setup()
    mockMatchMedia({ width: 1024 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('tree')

    await user.click(viewButton('Таблица'))
    await user.click(screen.getByRole('gridcell', { name: 'Маркетинг' }))
    await user.click(viewButton('Дерево'))

    expect(screen.getByRole('treeitem', { selected: true })).toHaveAccessibleName('Маркетинг')
  })

  it('in split view, clicking a tree node highlights its table row', async () => {
    const user = userEvent.setup()
    mockMatchMedia({ width: 1440 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('grid')

    await user.click(within(tree()!).getByRole('button', { name: 'Дизайн' }))

    expect(within(grid()!).getByRole('row', { selected: true })).toHaveTextContent('Дизайн')
    expect(within(tree()!).getByRole('treeitem', { selected: true })).toHaveAccessibleName('Дизайн')
  })

  it('in switch mode, the selection made in the tree is shown when switching to the table', async () => {
    const user = userEvent.setup()
    mockMatchMedia({ width: 1024 })
    renderWithProviders(<OrgDashboard />)
    await screen.findByRole('tree')

    await user.click(screen.getByRole('button', { name: 'Маркетинг' }))
    await user.click(viewButton('Таблица'))

    expect(within(grid()!).getByRole('row', { selected: true })).toHaveTextContent('Маркетинг')
  })

  it('computes aggregates once for tree and table together', async () => {
    const aggregate = vi.spyOn(aggregateModule, 'aggregateOrgTree')
    mockMatchMedia({ width: 1440 })
    renderWithProviders(<OrgDashboard />)

    await screen.findByRole('grid')
    expect(aggregate).toHaveBeenCalledTimes(1)
  })
})
