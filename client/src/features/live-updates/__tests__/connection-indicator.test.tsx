import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectionIndicator } from '@/features/live-updates/ui/connection-indicator'
import { LiveStatusContext } from '@/features/live-updates/live-status-context'
import type { ConnectionStatus } from '@/shared/lib/live/reconnecting-socket'
import { inlineStyled, renderWithProviders } from '@/test/render'

const renderIndicator = (status: ConnectionStatus, reconnectNow = vi.fn()) => ({
  reconnectNow,
  ...renderWithProviders(
    <LiveStatusContext value={{ status, reconnectNow }}>
      <ConnectionIndicator />
    </LiveStatusContext>,
  ),
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ConnectionIndicator', () => {
  it.each<[ConnectionStatus, string, string]>([
    [{ state: 'open' }, 'Онлайн', 'online'],
    [{ state: 'connecting' }, 'Подключение…', 'pending'],
    [{ state: 'offline' }, 'Нет сети', 'offline'],
    [{ state: 'closed' }, 'Отключено', 'offline'],
  ])('%j → "%s"', (status, text, tone) => {
    renderIndicator(status)

    const indicator = screen.getByRole('status', { name: 'Соединение с сервером' })
    expect(indicator).toHaveTextContent(text)
    expect(indicator).toHaveAttribute('data-tone', tone)
  })

  it('counts down to the next reconnect attempt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T10:00:00.000Z'))
    renderIndicator({ state: 'reconnecting', attempt: 3, retryInMs: 4000, retryAt: Date.now() + 4000 })

    expect(screen.getByRole('status')).toHaveTextContent('Нет связи · повтор через 4 с')
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('status')).toHaveTextContent('повтор через 3 с')
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('status')).toHaveTextContent('повтор через 0 с')
  })

  it('offers to reconnect immediately while waiting', async () => {
    const user = userEvent.setup()
    const { reconnectNow } = renderIndicator({ state: 'reconnecting', attempt: 1, retryInMs: 500, retryAt: Date.now() + 500 })

    await user.click(screen.getByRole('button', { name: 'Переподключиться' }))
    expect(reconnectNow).toHaveBeenCalledTimes(1)
  })

  it('shows no reconnect button when connected', () => {
    renderIndicator({ state: 'open' })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses no inline CSS', () => {
    renderIndicator({ state: 'open' })
    expect(inlineStyled()).toHaveLength(0)
  })
})
