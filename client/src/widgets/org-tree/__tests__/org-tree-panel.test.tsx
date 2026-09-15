import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orgTreeQueryKey } from '@/entities/org-node/api/org-tree.query'
import { OrgTreePanel } from '@/widgets/org-tree/org-tree-panel'
import { createQueryClient } from '@/shared/api/query-client'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'
import { inlineStyled, renderWithProviders } from '@/test/render'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('OrgTreePanel', () => {
  it('shows a loading state, then the tree', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    renderWithProviders(<OrgTreePanel />)

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем оргструктуру…')
    expect(await screen.findByRole('tree')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/org-tree', expect.anything())
  })

  it('shows an empty state for an empty response', async () => {
    fetchMock.mockResolvedValue(Response.json([]))
    renderWithProviders(<OrgTreePanel />)

    expect(await screen.findByText('Подразделений пока нет')).toBeInTheDocument()
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
  })

  it('shows an error state for a failed request and recovers on retry', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: 'Internal Server Error' }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(sampleOrgNodes))
    renderWithProviders(<OrgTreePanel />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Не удалось загрузить оргструктуру')
    expect(alert).toHaveTextContent('Сервер вернул ошибку (500).')

    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByRole('tree')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('treats a response that fails schema validation as an error', async () => {
    fetchMock.mockResolvedValue(Response.json([makeOrgNode({ headcount: -5 })]))
    renderWithProviders(<OrgTreePanel />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер вернул данные в неожиданном формате.')
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
  })

  it('keeps showing cached data and warns when a background revalidation fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    renderWithProviders(<OrgTreePanel />, {
      client: (() => {
        const client = createQueryClient()
        client.setQueryData(orgTreeQueryKey, sampleOrgNodes, { updatedAt: Date.now() - 5_000 })
        return client
      })(),
    })

    expect(screen.getByRole('tree')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось обновить данные')
    expect(screen.getByRole('tree')).toBeInTheDocument()
  })

  it('shows the loading state again while retrying after an error', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockReturnValueOnce(new Promise(() => {}))
    renderWithProviders(<OrgTreePanel />)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Загружаем оргструктуру…')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('aborts the request when unmounted', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { unmount } = renderWithProviders(<OrgTreePanel />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const { signal } = fetchMock.mock.calls[0]![1] as RequestInit

    unmount()

    await waitFor(() => expect(signal?.aborted).toBe(true))
  })

  it('uses no inline CSS in any state', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    renderWithProviders(<OrgTreePanel />)
    expect(inlineStyled()).toHaveLength(0)
    await screen.findByRole('tree')
    expect(inlineStyled()).toHaveLength(0)
  })
})
