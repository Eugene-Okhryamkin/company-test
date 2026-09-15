import { act, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/app'
import { createQueryClient } from '@/shared/api/query-client'
import { FakeWebSocket } from '@/test/fake-web-socket'
import { sampleOrgNodes } from '@/test/fixtures'
import { mockMatchMedia } from '@/test/match-media'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  FakeWebSocket.reset()
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => Response.json(sampleOrgNodes, { headers: { 'X-Data-Version': '5' } }))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('WebSocket', FakeWebSocket)
  Element.prototype.scrollIntoView = vi.fn()
})

describe('App', () => {
  it('renders the dashboard shell with a connection indicator in the header', async () => {
    render(<App queryClient={createQueryClient()} />)

    const header = screen.getByRole('banner')
    expect(header).toHaveTextContent('Staff Pulse')
    expect(within(header).getByRole('status', { name: 'Соединение с сервером' })).toHaveTextContent('Подключение…')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByRole('tree', { name: 'Оргструктура' })).toBeInTheDocument()

    act(() => FakeWebSocket.latest.open())
    expect(within(header).getByRole('status')).toHaveTextContent('Онлайн')
  })

  it('applies live patches to the tree and the table without refetching', async () => {
    mockMatchMedia({ width: 1440 })
    render(<App queryClient={createQueryClient()} />)
    const grid = await screen.findByRole('grid')
    act(() => FakeWebSocket.latest.open())
    fetchMock.mockClear()

    act(() =>
      FakeWebSocket.latest.receive({
        type: 'patch',
        version: 6,
        nodes: [{ id: 'd2-1', headcount: 12, budget: 1_000_000, performance: 75, updatedAt: '2026-09-15T10:00:00.000Z' }],
      }),
    )

    const salesRow = within(grid).getByRole('gridcell', { name: 'Продажи' }).closest('tr')!
    await waitFor(() => expect(within(salesRow).getAllByRole('gridcell')[2]).toHaveTextContent('15'))
    expect(within(screen.getByRole('tree')).getByText('12 чел.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
