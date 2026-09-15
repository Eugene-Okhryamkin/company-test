import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { EMPTY_SEARCH_FILTER, type SearchFilter } from '@/features/ai-search/model/search-filter.schema'
import { OrgTable } from '@/widgets/org-table/org-table'
import { sampleOrgNodes } from '@/test/fixtures'
import { inlineStyled, renderWithProviders } from '@/test/render'

const { rows } = buildOrgTreeModel(sampleOrgNodes)

const fetchMock = vi.fn<typeof fetch>()
const interpretCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/search/interpret')

function routeFetch({
  aiEnabled = true,
  interpret = async () => Response.json({ filter: EMPTY_SEARCH_FILTER }),
}: { aiEnabled?: boolean; interpret?: (query: string) => Promise<Response> } = {}) {
  fetchMock.mockImplementation(async (url, init) => {
    if (url === '/api/search/status') return Response.json({ aiEnabled })
    if (url === '/api/search/interpret') return interpret(JSON.parse(String(init?.body)).query)
    throw new Error(`unexpected request ${String(url)}`)
  })
}

const table = () => screen.getByRole('grid', { name: 'Аналитика по подразделениям' })
const rowNames = () =>
  within(table())
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('gridcell')[0]!.textContent)
const searchbox = () => screen.getByRole('searchbox', { name: 'Поиск подразделений' })
const aiButton = () => screen.findByRole('button', { name: 'AI-поиск' })
const appliedFilter = () => screen.queryByRole('region', { name: 'AI-фильтр' })

const renderTable = () => renderWithProviders(<OrgTable rows={rows} selectedId={null} onSelect={vi.fn()} />)

const topDepartments: SearchFilter = {
  ...EMPTY_SEARCH_FILTER,
  levels: [2],
  sort: { key: 'totalHeadcount', direction: 'desc' },
  limit: 2,
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('OrgTable AI search', () => {
  it('offers AI search when the backend has it enabled', async () => {
    routeFetch()
    renderTable()

    // Nothing to interpret yet.
    expect(await aiButton()).toBeDisabled()
    await userEvent.setup().type(searchbox(), 'отделы')
    expect(await aiButton()).toBeEnabled()
    expect(searchbox()).toHaveAttribute('placeholder', expect.stringContaining('естественном языке'))
  })

  it('turns a natural-language query into a structured filter applied to the table', async () => {
    const user = userEvent.setup()
    routeFetch({ interpret: async () => Response.json({ filter: topDepartments }) })
    renderTable()
    await aiButton()

    await user.type(searchbox(), 'два крупнейших отдела{Enter}')

    await waitFor(() => expect(rowNames()).toEqual(['Платформа', 'Дизайн']))
    expect(interpretCalls()).toHaveLength(1)
    expect(JSON.parse(String(interpretCalls()[0]![1]?.body))).toEqual({ query: 'два крупнейших отдела' })
    expect(screen.getByRole('columnheader', { name: /Всего сотрудников/ })).toHaveAttribute('aria-sort', 'descending')
    expect(within(appliedFilter()!).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Уровень: отделы',
      'Сортировка: сотрудники ↓',
      'Первые 2',
    ])
    expect(screen.getByText('Показано 2 из 6')).toBeInTheDocument()
    expect(inlineStyled()).toHaveLength(0)
  })

  it('submits with the AI button as well', async () => {
    const user = userEvent.setup()
    routeFetch({ interpret: async () => Response.json({ filter: { ...EMPTY_SEARCH_FILTER, levels: [3] } }) })
    renderTable()

    await user.type(searchbox(), 'команды')
    await user.click(await aiButton())

    await waitFor(() => expect(rowNames()).toEqual(['Core API']))
  })

  it('shows progress while the query is being interpreted', async () => {
    const user = userEvent.setup()
    routeFetch({ interpret: () => new Promise(() => {}) })
    renderTable()
    await aiButton()

    await user.type(searchbox(), 'отделы{Enter}')

    const busy = await screen.findByRole('button', { name: 'Думаю…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
  })

  it('goes back to text search as soon as the query is edited', async () => {
    const user = userEvent.setup()
    routeFetch({ interpret: async () => Response.json({ filter: topDepartments }) })
    renderTable()
    await aiButton()
    await user.type(searchbox(), 'отделы{Enter}')
    await waitFor(() => expect(appliedFilter()).toBeInTheDocument())

    await user.clear(searchbox())
    await user.type(searchbox(), 'марк')

    expect(appliedFilter()).not.toBeInTheDocument()
    await waitFor(() => expect(rowNames()).toEqual(['Маркетинг']))
  })

  it('resets the query and the AI filter', async () => {
    const user = userEvent.setup()
    routeFetch({ interpret: async () => Response.json({ filter: topDepartments }) })
    renderTable()
    await aiButton()
    await user.type(searchbox(), 'отделы{Enter}')
    await waitFor(() => expect(appliedFilter()).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(searchbox()).toHaveValue('')
    expect(appliedFilter()).not.toBeInTheDocument()
    await waitFor(() => expect(rowNames()).toHaveLength(6))
  })

  it.each([
    ['the backend reports an error', async () => Response.json({ error: 'AI search failed' }, { status: 502 })],
    ['the answer breaks the contract', async () => Response.json({ filter: { levels: 'teams' } })],
    ['the network fails', async () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('falls back to text search with a notice when %s', async (_label, interpret) => {
    const user = userEvent.setup()
    routeFetch({ interpret })
    renderTable()
    await aiButton()

    await user.type(searchbox(), 'Дизайн{Enter}')

    expect(await screen.findByRole('status')).toHaveTextContent('AI-поиск недоступен — показаны результаты поиска по названию')
    await waitFor(() => expect(rowNames()).toEqual(['Дизайн']))
    expect(appliedFilter()).not.toBeInTheDocument()
  })

  it('ignores an answer that arrives after the query has changed', async () => {
    const user = userEvent.setup()
    let answer!: (response: Response) => void
    routeFetch({ interpret: () => new Promise((resolve) => (answer = resolve)) })
    renderTable()
    await aiButton()

    await user.type(searchbox(), 'отделы{Enter}')
    await user.type(searchbox(), ' и команды')
    answer(Response.json({ filter: topDepartments }))

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(appliedFilter()).not.toBeInTheDocument()
  })

  it('keeps plain text search when AI search is disabled on the backend', async () => {
    const user = userEvent.setup()
    routeFetch({ aiEnabled: false })
    renderTable()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/search/status', expect.anything()))

    await user.type(searchbox(), 'Дизайн{Enter}')

    await waitFor(() => expect(rowNames()).toEqual(['Дизайн']))
    expect(screen.queryByRole('button', { name: 'AI-поиск' })).not.toBeInTheDocument()
    expect(searchbox()).toHaveAttribute('placeholder', 'Поиск по названию…')
    expect(interpretCalls()).toHaveLength(0)
  })

  it('does not ask again for a query that is already applied', async () => {
    const user = userEvent.setup()
    routeFetch({ interpret: async () => Response.json({ filter: topDepartments }) })
    renderTable()
    await aiButton()
    await user.type(searchbox(), 'отделы{Enter}')
    await waitFor(() => expect(appliedFilter()).toBeInTheDocument())

    await user.type(searchbox(), '{Enter}')

    expect(interpretCalls()).toHaveLength(1)
  })
})
