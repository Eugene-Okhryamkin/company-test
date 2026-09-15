import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorState } from '@/shared/ui/error-state'
import { LoadingState } from '@/shared/ui/loading-state'
import { renderWithProviders } from '@/test/render'

describe('LoadingState', () => {
  it('announces loading politely', () => {
    renderWithProviders(<LoadingState label="Загружаем структуру…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Загружаем структуру…')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })
})

describe('ErrorState', () => {
  it('shows the title and description as an alert', () => {
    renderWithProviders(<ErrorState title="Ошибка" description="Сервер недоступен" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка')
    expect(screen.getByRole('alert')).toHaveTextContent('Сервер недоступен')
  })

  it('calls onRetry when the retry button is pressed', async () => {
    const onRetry = vi.fn()
    renderWithProviders(<ErrorState title="Ошибка" onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has no retry button without a handler', () => {
    renderWithProviders(<ErrorState title="Ошибка" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('shows the title and description', () => {
    renderWithProviders(<EmptyState title="Пусто" description="Нет подразделений" />)
    expect(screen.getByText('Пусто')).toBeInTheDocument()
    expect(screen.getByText('Нет подразделений')).toBeInTheDocument()
  })
})
